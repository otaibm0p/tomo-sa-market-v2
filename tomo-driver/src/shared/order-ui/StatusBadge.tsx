import React from 'react'
import { Text, View, StyleSheet } from 'react-native'
import { getStatusLabel } from '../orderStatus'
import type { MvpOrderStatus } from '../orderStatus'

function toneFor(status: string | null | undefined) {
  const s = String(status || '').toUpperCase()
  const key = s as MvpOrderStatus
  switch (key) {
    case 'CREATED':
      return { bg: '#FEF9C3', fg: '#854D0E' }
    case 'ACCEPTED':
      return { bg: '#DBEAFE', fg: '#1E40AF' }
    case 'PREPARING':
      return { bg: '#EDE9FE', fg: '#5B21B6' }
    case 'READY':
      return { bg: '#D1FAE5', fg: '#065F46' }
    case 'ASSIGNED':
      return { bg: '#E0E7FF', fg: '#3730A3' }
    case 'PICKED_UP':
      return { bg: '#FFEDD5', fg: '#9A3412' }
    case 'DELIVERED':
      return { bg: '#DCFCE7', fg: '#166534' }
    case 'CANCELLED':
      return { bg: '#FEE2E2', fg: '#991B1B' }
    default:
      return { bg: '#F3F4F6', fg: '#374151' }
  }
}

export function StatusBadge({
  status,
  lang = 'ar',
}: {
  status: string | null | undefined
  lang?: 'ar' | 'en'
}) {
  const tone = toneFor(status)
  return (
    <View style={[styles.badge, { backgroundColor: tone.bg }]}>
      <View style={[styles.dot, { backgroundColor: tone.fg }]} />
      <Text style={[styles.text, { color: tone.fg }]} numberOfLines={1}>
        {getStatusLabel(status, lang)}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  dot: { width: 8, height: 8, borderRadius: 999 },
  text: { fontSize: 12, fontWeight: '800' },
})

