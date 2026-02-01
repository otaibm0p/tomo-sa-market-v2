import React, { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { loginWithEmail } from '../api/auth'
import { useAuth } from '../shared/auth/AuthContext'
import { resetUnauthorizedFired } from '../api/client'
import { showToast } from '../shared/ui/toast'

export function DriverLoginScreen({ navigation }: any) {
  const { setAuthed } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await loginWithEmail(email.trim(), password)
      if (res?.user?.role && res.user.role !== 'driver') {
        setError('بيانات الدخول غير صحيحة لـ Rider')
        setAuthed(false)
        return
      }
      resetUnauthorizedFired()
      setAuthed(true)
      showToast('تم تسجيل الدخول')
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] })
    } catch (e: any) {
      setError(e?.message === 'UNAUTHORIZED' ? 'انتهت الجلسة، حاول مرة أخرى' : e?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>TOMO Driver</Text>
          <Text style={styles.subtitle}>سجل الدخول للوصول إلى مهام التوصيل</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="driver@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            style={styles.input}
          />

          <Pressable disabled={loading} style={[styles.btn, loading ? { opacity: 0.6 } : null]} onPress={onSubmit}>
            <Text style={styles.btnText}>{loading ? '...' : 'تسجيل الدخول'}</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: { width: '100%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#F3F4F6' },
  title: { fontSize: 22, fontWeight: '900', color: '#111827', textAlign: 'center' },
  subtitle: { marginTop: 6, fontSize: 13, color: '#6B7280', textAlign: 'center' },
  label: { marginTop: 14, fontSize: 12, fontWeight: '800', color: '#374151' },
  input: { marginTop: 8, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  btn: { marginTop: 16, backgroundColor: '#111827', paddingVertical: 12, borderRadius: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '900' },
  error: { marginTop: 10, color: '#B91C1C', fontWeight: '800' },
})

