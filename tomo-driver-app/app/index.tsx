import { useEffect } from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuthStore } from '@/store/authStore'
import { colors } from '@/constants/colors'

export default function Index() {
  const router = useRouter()
  const hydrated = useAuthStore((s) => s.hydrated)
  const token = useAuthStore((s) => s.token)

  useEffect(() => {
    if (!hydrated) return
    if (token) router.replace('/(tabs)/home')
    else router.replace('/login')
  }, [hydrated, token, router])

  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  )
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
})
