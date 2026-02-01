import axios, { AxiosError } from 'axios'
import * as SecureStore from 'expo-secure-store'

/** Single source of truth: __DEV__ ? localhost : EXPO_PUBLIC or production fallback */
export function getApiBase(): string {
  const env = process.env.EXPO_PUBLIC_API_URL
  if (env && env.trim()) return env.trim()
  if (typeof __DEV__ !== 'undefined' && __DEV__) return 'http://localhost:3000'
  return 'https://api.tomo-sa.com'
}

const API_BASE = getApiBase()

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

const TOKEN_KEY = 'tomo_driver_jwt'

export async function getStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY)
  } catch {
    return null
  }
}

export async function setStoredToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token)
}

export async function clearStoredToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY)
}

api.interceptors.request.use(
  async (config) => {
    const token = await getStoredToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (err) => Promise.reject(err)
)

let onUnauthorized: (() => void) | null = null
export function setOnUnauthorized(fn: (() => void) | null): void {
  onUnauthorized = fn
}

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    if (err.response?.status === 401) {
      await clearStoredToken()
      try { onUnauthorized?.() } catch (_) {}
    }
    return Promise.reject(err)
  }
)

// --- Endpoints (stubs if backend missing) ---

export type LoginPayload = { phone: string; password: string }
export type LoginResponse = { token: string; driver?: { id: number; name: string; phone: string } }

export async function loginDriver(payload: LoginPayload): Promise<LoginResponse> {
  try {
    const { data } = await api.post<LoginResponse>('/api/driver/auth/login', payload)
    return data
  } catch (e: any) {
    if (e.response?.status === 404 || e.code === 'ERR_NETWORK') {
      return { token: 'mock_token_' + Date.now(), driver: { id: 1, name: 'مندوب تجريبي', phone: payload.phone } }
    }
    throw e
  }
}

export type DriverMe = { id: number; name: string; phone: string; email?: string; status?: string }

export async function getDriverMe(): Promise<DriverMe> {
  try {
    const { data } = await api.get<DriverMe>('/api/driver/me')
    return data
  } catch (e: any) {
    if (e.response?.status === 404 || e.code === 'ERR_NETWORK') {
      return { id: 1, name: 'مندوب تجريبي', phone: '+966500000000', status: 'available' }
    }
    throw e
  }
}

export async function postDriverStatus(status: { online?: boolean; available?: boolean }): Promise<void> {
  try {
    await api.post('/api/driver/status', status)
  } catch (e: any) {
    if (e.response?.status === 404 || e.code === 'ERR_NETWORK') return
    throw e
  }
}

export async function postDriverLocation(lat: number, lng: number): Promise<void> {
  try {
    await api.post('/api/driver/location', { latitude: lat, longitude: lng })
  } catch (e: any) {
    if (e.response?.status === 404 || e.code === 'ERR_NETWORK') return
    throw e
  }
}

export type ActiveOrder = {
  id: number
  status: string
  customer_name?: string
  delivery_address?: string
  total_amount?: number
}

export async function getDriverOrdersActive(): Promise<ActiveOrder[]> {
  try {
    const { data } = await api.get<{ orders?: ActiveOrder[] }>('/api/driver/orders/active')
    const list = Array.isArray(data) ? data : (data as any)?.orders ?? []
    return list
  } catch (e: any) {
    if (e.response?.status === 404 || e.code === 'ERR_NETWORK') return []
    throw e
  }
}

/** Update order status (stub: no-op if backend has no endpoint) */
export async function postDriverOrderStatus(orderId: number, status: string): Promise<void> {
  try {
    await api.post(`/api/driver/orders/${orderId}/status`, { status })
  } catch (e: any) {
    if (e.response?.status === 404 || e.code === 'ERR_NETWORK') return
    throw e
  }
}
