export type AdminEventType = 'navigation' | 'retry' | 'orders'

export type AdminEvent = {
  id: string
  ts: number
  type: AdminEventType
  label: string
  meta?: Record<string, any>
}

const KEY = 'admin_activity_log'
const MAX = 250

function safeParse<T>(raw: string | null): T | null {
  try {
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function getAdminEvents(): AdminEvent[] {
  if (typeof window === 'undefined') return []
  const list = safeParse<AdminEvent[]>(localStorage.getItem(KEY))
  return Array.isArray(list) ? list : []
}

export function clearAdminEvents(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(KEY)
}

export function logAdminEvent(type: AdminEventType, label: string, meta?: Record<string, any>): void {
  if (typeof window === 'undefined') return
  const ts = Date.now()
  const id = `${ts}-${Math.random().toString(16).slice(2)}`
  const next: AdminEvent = { id, ts, type, label, meta }

  const prev = getAdminEvents()
  const merged = [next, ...prev].slice(0, MAX)
  try {
    localStorage.setItem(KEY, JSON.stringify(merged))
  } catch {
    // ignore
  }
}

