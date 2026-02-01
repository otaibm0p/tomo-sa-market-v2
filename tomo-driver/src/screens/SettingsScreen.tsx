import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView, Switch } from 'react-native'
import { API_BASE_URL, SOCKET_URL } from '../api/config'
import { getAuthUser } from '../api/authStorage'
import { getSocket } from '../socket/socketClient'
import { useAuth } from '../shared/auth/AuthContext'
import { showToast } from '../shared/ui/toast'
import { getLiveTrackingEnabled, setLiveTrackingEnabled } from '../location/liveTrackingSettings'

export function SettingsScreen({ navigation }: any) {
  const { logout } = useAuth()
  const [driverId, setDriverId] = useState<number | null>(null)
  const [socketConnected, setSocketConnected] = useState<boolean>(false)
  const [liveTracking, setLiveTracking] = useState<boolean>(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const u = await getAuthUser()
      if (!cancelled) setDriverId(u?.id || null)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const enabled = await getLiveTrackingEnabled()
      if (!cancelled) setLiveTracking(enabled)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const s = getSocket()
    setSocketConnected(!!s.connected)

    const onConnect = () => setSocketConnected(true)
    const onDisconnect = () => setSocketConnected(false)
    s.on('connect', onConnect)
    s.on('disconnect', onDisconnect)
    return () => {
      s.off('connect', onConnect)
      s.off('disconnect', onDisconnect)
    }
  }, [])

  const statusText = useMemo(() => (socketConnected ? 'connected' : 'disconnected'), [socketConnected])

  const onLogout = async () => {
    showToast('تم تسجيل الخروج')
    await logout({ reason: 'manual' })
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 14, gap: 12 }}>
      <View style={styles.card}>
        <Text style={styles.h1}>Settings</Text>
        <Text style={styles.label}>API_BASE_URL</Text>
        <Text style={styles.value} selectable>{API_BASE_URL}</Text>
        <Text style={styles.label}>SOCKET_URL</Text>
        <Text style={styles.value} selectable>{SOCKET_URL}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>driverId</Text>
        <Text style={styles.value}>{driverId ?? '—'}</Text>
        <Text style={styles.label}>socket status</Text>
        <Text style={[styles.value, socketConnected ? styles.ok : styles.bad]}>{statusText}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h1}>Live Tracking</Text>
        <Text style={styles.subtle}>Send location only when you have active orders.</Text>
        <View style={styles.row}>
          <Text style={styles.value}>Live Tracking</Text>
          <Switch
            value={liveTracking}
            onValueChange={async (v) => {
              setLiveTracking(v)
              await setLiveTrackingEnabled(v)
              showToast(v ? 'Live Tracking: ON' : 'Live Tracking: OFF')
            }}
          />
        </View>
      </View>

      <Pressable style={styles.logoutBtn} onPress={onLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#F3F4F6' },
  h1: { fontSize: 18, fontWeight: '900', color: '#111827' },
  subtle: { marginTop: 6, fontSize: 12, fontWeight: '700', color: '#6B7280' },
  row: { marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { marginTop: 10, fontSize: 12, fontWeight: '900', color: '#6B7280' },
  value: { marginTop: 6, fontSize: 13, fontWeight: '800', color: '#111827' },
  ok: { color: '#065F46' },
  bad: { color: '#991B1B' },
  logoutBtn: { backgroundColor: '#991B1B', borderRadius: 16, paddingVertical: 12, alignItems: 'center' },
  logoutText: { color: '#fff', fontWeight: '900' },
})

