import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { isLoggedIn, logout as apiLogout } from '../../api/auth'
import { resetUnauthorizedFired, setUnauthorizedHandler } from '../../api/client'
import { navigationRef } from '../../navigation/navigationRef'
import { showToast } from '../ui/toast'
import { stopLocationTracking } from '../../location/locationTracker'

type AuthContextValue = {
  authed: boolean
  ready: boolean
  refreshAuth: () => Promise<void>
  setAuthed: (v: boolean) => void
  logout: (opts?: { reason?: 'unauthorized' | 'manual' }) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [ready, setReady] = useState(false)
  const [authed, setAuthed] = useState(false)
  const loggingOutRef = useRef(false)

  const refreshAuth = async () => {
    const ok = await isLoggedIn()
    setAuthed(ok)
    setReady(true)
  }

  const logout = async (opts?: { reason?: 'unauthorized' | 'manual' }) => {
    if (loggingOutRef.current) return
    loggingOutRef.current = true
    try {
      await stopLocationTracking()
      await apiLogout()
    } finally {
      setAuthed(false)
      setReady(true)
      loggingOutRef.current = false
    }

    if (opts?.reason === 'unauthorized') {
      showToast('انتهت الجلسة، سجل دخول مرة أخرى')
    }

    if (navigationRef.isReady()) {
      navigationRef.reset({ index: 0, routes: [{ name: 'Login' }] })
    }
  }

  useEffect(() => {
    refreshAuth().catch(() => setReady(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // Register a single global 401 handler for apiFetch
    setUnauthorizedHandler(() => {
      logout({ reason: 'unauthorized' }).catch(() => {})
    })
    return () => setUnauthorizedHandler(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (authed) resetUnauthorizedFired()
  }, [authed])

  const value = useMemo<AuthContextValue>(() => ({ authed, ready, refreshAuth, setAuthed, logout }), [authed, ready])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

