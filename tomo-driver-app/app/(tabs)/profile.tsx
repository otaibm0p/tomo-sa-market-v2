import { View, Text, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { ScreenContainer } from '@/components/ScreenContainer'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { useAuthStore } from '@/store/authStore'
import { getDriverMe } from '@/lib/api'
import { t, isRTL } from '@/lib/i18n'
import { colors } from '@/constants/colors'
import { typography } from '@/constants/typography'

export default function ProfileScreen() {
  const router = useRouter()
  const rtl = isRTL()
  const logout = useAuthStore((s) => s.logout)

  const { data: me } = useQuery({
    queryKey: ['driver', 'me'],
    queryFn: getDriverMe,
    staleTime: 60_000,
  })

  const handleLogout = async () => {
    await logout()
    router.replace('/login')
  }

  return (
    <ScreenContainer>
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>{t('driverInfo')}</Text>
        {me ? (
          <>
            <View style={[styles.row, rtl && styles.rowRtl]}>
              <Text style={styles.label}>{t('name')}</Text>
              <Text style={styles.value}>{me.name}</Text>
            </View>
            <View style={[styles.row, rtl && styles.rowRtl]}>
              <Text style={styles.label}>{t('phoneLabel')}</Text>
              <Text style={styles.value}>{me.phone}</Text>
            </View>
            {me.email && (
              <View style={[styles.row, rtl && styles.rowRtl]}>
                <Text style={styles.label}>{t('email')}</Text>
                <Text style={styles.value}>{me.email}</Text>
              </View>
            )}
          </>
        ) : (
          <Text style={styles.placeholder}>{t('loading')}</Text>
        )}
      </Card>

      <Button variant="danger" onPress={handleLogout} style={styles.logoutBtn}>
        {t('logout')}
      </Button>
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  card: { marginBottom: 24 },
  cardTitle: { ...typography.title2, color: colors.text, marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  rowRtl: { flexDirection: 'row-reverse' },
  label: { ...typography.captionBold, color: colors.textSecondary },
  value: { ...typography.body, color: colors.text },
  placeholder: { ...typography.body, color: colors.textMuted },
  logoutBtn: { marginTop: 8 },
})
