import { create } from 'zustand'
import * as api from '@/lib/api'

type Driver = { id: number; name: string; phone: string; email?: string }

type AuthState = {
  token: string | null
  driver: Driver | null
  hydrated: boolean
  isOnline: boolean
  isAvailable: boolean
  lastSeen: string | null
  setLastSeen: (v: string | null) => void
  setOnline: (v: boolean) => void
  setAvailable: (v: boolean) => void
  login: (phone: string, password: string) => Promise<void>
  fetchMe: () => Promise<void>
  logout: () => Promise<void>
  clearSession: () => void
  hydrate: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  hydrated: false,
  token: null,
  driver: null,
  isOnline: false,
  isAvailable: true,
  lastSeen: null,

  setLastSeen: (v) => set({ lastSeen: v }),
  setOnline: (v) => set({ isOnline: v }),
  setAvailable: (v) => set({ isAvailable: v }),

  login: async (phone, password) => {
    const res = await api.loginDriver({ phone, password })
    await api.setStoredToken(res.token)
    set({
      token: res.token,
      driver: res.driver ? { id: res.driver.id, name: res.driver.name, phone: res.driver.phone } : null,
    })
  },

  fetchMe: async () => {
    const me = await api.getDriverMe()
    set({ driver: { id: me.id, name: me.name, phone: me.phone, email: me.email } })
  },

  logout: async () => {
    await api.clearStoredToken()
    set({ token: null, driver: null, isOnline: false, isAvailable: true, lastSeen: null })
  },

  clearSession: () => {
    set({ token: null, driver: null, isOnline: false, isAvailable: true, lastSeen: null })
  },

  hydrate: async () => {
    const token = await api.getStoredToken()
    if (!token) {
      set({ token: null, driver: null, hydrated: true })
      return
    }
    set({ token, hydrated: false })
    try {
      const me = await api.getDriverMe()
      set({ driver: { id: me.id, name: me.name, phone: me.phone, email: me.email }, hydrated: true })
    } catch {
      set({ token: null, driver: null, hydrated: true })
    }
  },
}))

