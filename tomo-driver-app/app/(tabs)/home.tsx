import { useEffect, useState } from 'react'
import { View, Text, Switch, StyleSheet } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { ScreenContainer } from '@/components/ScreenContainer'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { useAuthStore } from '@/store/authStore'
import { getDriverMe, postDriverStatus } from '@/lib/api'
import { startLocationUpdates, stopLocationUpdates } from '@/lib/location'
import { t, isRTL } from '@/lib/i18n'
import { colors } from '@/constants/colors'
import { typography } from '@/constants/typography'

export default function HomeScreen() {
  const rtl = isRTL()
  const { isOnline, isAvailable, setOnline, setAvailable, lastSeen, setLastSeen } = useAuthStore()
  const [connectionOk, setConnectionOk] = useState(true)

  const { data: me, isSuccess } = useQuery({
    queryKey: ['driver', 'me'],
    queryFn: getDriverMe,
    staleTime: 60_000,
  })

  useEffect(() => {
    if (isSuccess && me) setLastSeen(new Date().toISOString())
  }, [isSuccess, me, setLastSeen])

  useEffect(() => {
    if (isOnline) startLocationUpdates()
    else stopLocationUpdates()
    return () => stopLocationUpdates()
  }, [isOnline])

  const onOnlineChange = async (value: boolean) => {
    setOnline(value)
    try {
      await postDriverStatus({ online: value })
      setConnectionOk(true)
    } catch {
      setConnectionOk(false)
    }
  }

  const onAvailableChange = async (value: boolean) => {
    setAvailable(value)
    try {
      await postDriverStatus({ available: value })
      setConnectionOk(true)
    } catch {
      setConnectionOk(false)
    }
  }

  return (
    <ScreenContainer>
      <View style={[styles.section, rtl && styles.sectionRtl]}>
        <Text style={styles.sectionTitle}>{t('online')}</Text>
        <Switch value={isOnline} onValueChange={onOnlineChange} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
      </View>

      <Card style={styles.card}>
        <View style={[styles.row, rtl && styles.rowRtl]}>
          <Text style={styles.label}>{t('available')}</Text>
          <Switch value={isAvailable} onValueChange={onAvailableChange} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
        </View>
        <View style={[styles.row, rtl && styles.rowRtl]}>
          <Text style={styles.label}>{t('lastSeen')}</Text>
          <Text style={styles.value}>{lastSeen ? new Date(lastSeen).toLocaleString(rtl ? 'ar-SA' : 'en-US') : '—'}</Text>
        </View>
        <View style={[styles.row, rtl && styles.rowRtl]}>
          <Text style={styles.label}>{t('connectionOk')}</Text>
          <Badge variant={connectionOk ? 'success' : 'danger'}>{connectionOk ? t('connectionOk') : t('connectionFail')}</Badge>
        </View>
      </Card>

      {me && (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>{t('driverInfo')}</Text>
          <Text style={styles.body}>{me.name}</Text>
          <Text style={styles.caption}>{me.phone}</Text>
        </Card>
      )}
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 16 },
  sectionRtl: { flexDirection: 'row-reverse' },
  sectionTitle: { ...typography.title2, color: colors.text },
  card: { marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  rowRtl: { flexDirection: 'row-reverse' },
  label: { ...typography.bodyBold, color: colors.textSecondary },
  value: { ...typography.body, color: colors.text },
  cardTitle: { ...typography.title2, color: colors.text, marginBottom: 12 },
  body: { ...typography.body, color: colors.text, marginBottom: 4 },
  caption: { ...typography.caption, color: colors.textMuted },
})
