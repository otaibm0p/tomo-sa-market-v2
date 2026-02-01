import React from 'react'
import { View, Pressable, Text, StyleSheet, Alert } from 'react-native'
import { canTransition, type MvpOrderStatus, getStatusLabel, normalizeOrderStatus } from '../orderStatus'

export function OrderActions({
  status,
  lang = 'ar',
  onSetStatus,
  allowedTargets = ['PICKED_UP', 'DELIVERED'],
  disabled,
}: {
  status: string | null | undefined
  lang?: 'ar' | 'en'
  onSetStatus: (next: MvpOrderStatus) => Promise<void> | void
  allowedTargets?: MvpOrderStatus[]
  disabled?: boolean
}) {
  const current = normalizeOrderStatus(status)
  if (!current) return null

  const targets = allowedTargets.filter((t) => canTransition(current, t))
  if (targets.length === 0) return null

  return (
    <View style={styles.row}>
      {targets.map((t) => (
        <Pressable
          key={t}
          disabled={disabled}
          style={[styles.btn, disabled ? styles.btnDisabled : null]}
          onPress={() => {
            Alert.alert(
              lang === 'en' ? 'Confirm' : 'تأكيد',
              lang === 'en'
                ? `Change status to: ${getStatusLabel(t, 'en')}`
                : `تغيير الحالة إلى: ${getStatusLabel(t, 'ar')}`,
              [
                { text: lang === 'en' ? 'Cancel' : 'إلغاء', style: 'cancel' },
                { text: lang === 'en' ? 'OK' : 'موافق', style: 'default', onPress: () => onSetStatus(t) },
              ]
            )
          }}
        >
          <Text style={styles.btnText}>{getStatusLabel(t, lang)}</Text>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  btn: {
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
})

