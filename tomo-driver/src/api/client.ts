import { API_BASE_URL } from './config'
import { clearAuthUser, clearToken, getToken } from './authStorage'

export type ApiError = {
  status?: number
  message: string
  raw?: any
}

let unauthorizedHandler: null | (() => void) = null
let unauthorizedFired = false

export function setUnauthorizedHandler(fn: null | (() => void)) {
  unauthorizedHandler = fn
}

export function resetUnauthorizedFired() {
  unauthorizedFired = false
}

async function buildHeaders(extra?: Record<string, string>) {
  const token = await getToken()
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra || {}),
  }
}

export async function apiFetch<T>(
  path: string,
  opts?: { method?: string; body?: any; headers?: Record<string, string> }
): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`
  const res = await fetch(url, {
    method: opts?.method || 'GET',
    headers: await buildHeaders(opts?.headers),
    body: opts?.body != null ? JSON.stringify(opts.body) : undefined,
  })

  let data: any = null
  const text = await res.text()
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }

  if (res.status === 401) {
    // Clear any stale credentials immediately
    try {
      await clearToken()
      await clearAuthUser()
    } catch {
      // ignore
    }
    if (unauthorizedHandler && !unauthorizedFired) {
      unauthorizedFired = true
      try {
        unauthorizedHandler()
      } catch {
        // ignore
      }
    }
    throw new Error('UNAUTHORIZED')
  }

  if (!res.ok) {
    const err: ApiError = {
      status: res.status,
      message: (data && (data.message || data.error)) || `HTTP ${res.status}`,
      raw: data,
    }
    throw err
  }

  return data as T
}

