import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { ScreenContainer } from '@/components/ScreenContainer'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { useAuthStore } from '@/store/authStore'
import { t, isRTL } from '@/lib/i18n'
import { showToast } from '@/lib/toast'
import { colors } from '@/constants/colors'
import { typography } from '@/constants/typography'

export default function LoginScreen() {
  const router = useRouter()
  const login = useAuthStore((s) => s.login)
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    setError('')
    if (!phone.trim() || !password.trim()) {
      setError(t('loginError'))
      return
    }
    setLoading(true)
    try {
      await login(phone.trim(), password)
      router.replace('/(tabs)/home')
    } catch (e: any) {
      const msg = e.response?.data?.message ?? t('loginError')
      setError(msg)
      showToast(msg)
    } finally {
      setLoading(false)
    }
  }

  const rtl = isRTL()

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={60}
      >
        <View style={[styles.header, rtl && styles.headerRtl]}>
          <Text style={styles.title}>{t('login')}</Text>
        </View>

        <Card style={styles.card}>
          <Text style={styles.label}>{t('phone')}</Text>
          <TextInput
            style={[styles.input, rtl && styles.inputRtl]}
            value={phone}
            onChangeText={setPhone}
            placeholder="+966 5xxxxxxxx"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            autoCapitalize="none"
            editable={!loading}
          />

          <Text style={styles.label}>{t('password')}</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput, rtl && styles.inputRtl, rtl && styles.passwordInputRtl]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              editable={!loading}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((v) => !v)}
              style={[styles.eye, rtl && styles.eyeRtl]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel={showPassword ? t('hidePassword') : t('showPassword')}
            >
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button onPress={handleLogin} loading={loading} style={styles.btn}>
            {t('login')}
          </Button>
        </Card>
      </KeyboardAvoidingView>
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  kav: { flex: 1 },
  header: { marginTop: 48, marginBottom: 24 },
  headerRtl: { alignItems: 'flex-end' },
  title: {
    ...typography.title,
    fontSize: 26,
    color: colors.text,
  },
  card: { marginTop: 8 },
  label: {
    ...typography.captionBold,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    color: colors.text,
    marginBottom: 20,
  },
  inputRtl: { textAlign: 'right' },
  passwordRow: { position: 'relative', marginBottom: 20 },
  passwordInput: { paddingRight: 52 },
  passwordInputRtl: { paddingRight: 16, paddingLeft: 52 },
  eye: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  eyeRtl: { right: undefined, left: 0 },
  error: {
    ...typography.caption,
    color: colors.danger,
    marginBottom: 12,
  },
  btn: { marginTop: 8 },
})
