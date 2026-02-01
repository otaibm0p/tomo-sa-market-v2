import { useEffect, useRef } from 'react'
import { Stack } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { isRTL } from '@/lib/i18n'
import { I18nManager } from 'react-native'
import { setOnUnauthorized } from '@/lib/api'

const queryClient = new QueryClient()

function RootLayoutNav() {
  const hydrate = useAuthStore((s) => s.hydrate)
  const clearSession = useAuthStore((s) => s.clearSession)
  const unsubRef = useRef(false)

  useEffect(() => {
    if (unsubRef.current) return
    unsubRef.current = true
    setOnUnauthorized(() => {
      clearSession()
    })
    return () => {
      setOnUnauthorized(null)
    }
  }, [clearSession])

  useEffect(() => {
    hydrate()
  }, [hydrate])

  useEffect(() => {
    const rtl = isRTL()
    if (I18nManager.isRTL !== rtl) {
      I18nManager.allowRTL(rtl)
      I18nManager.forceRTL(rtl)
    }
  }, [])

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootLayoutNav />
    </QueryClientProvider>
  )
}
