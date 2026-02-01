import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { MVP_STATUS_ORDER, getStatusLabel } from '../orderStatus'
import type { MvpOrderStatus } from '../orderStatus'

export function OrderTimeline({
  currentStatus,
  lang = 'ar',
}: {
  currentStatus: string | null | undefined
  lang?: 'ar' | 'en'
}) {
  const upper = String(currentStatus || '').toUpperCase()
  const isCancelled = upper === 'CANCELLED'
  const current = (MVP_STATUS_ORDER as string[]).includes(upper) ? (upper as MvpOrderStatus) : null
  const idx = current ? MVP_STATUS_ORDER.indexOf(current) : -1
  const steps = [...MVP_STATUS_ORDER, 'CANCELLED'] as const

  return (
    <View>
      <Text style={styles.title}>{lang === 'en' ? 'Order status' : 'حالة الطلب'}</Text>
      <View style={{ marginTop: 10 }}>
        {steps.map((s, i) => {
          const active = (current === s && !isCancelled) || (isCancelled && s === 'CANCELLED')
          const done = !isCancelled ? i <= idx && i !== steps.length - 1 : s !== 'CANCELLED'
          return (
            <View key={s} style={styles.row}>
              <View style={styles.dotWrap}>
                <View style={[styles.dot, done || active ? styles.dotOn : styles.dotOff]} />
                {i < steps.length - 1 ? <View style={styles.line} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, active ? styles.labelActive : null]}>{getStatusLabel(s, lang)}</Text>
              </View>
              {active ? <Text style={styles.now}>{lang === 'en' ? 'Now' : 'الآن'}</Text> : null}
            </View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '900', color: '#111827' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  dotWrap: { width: 14, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 10 },
  dotOn: { backgroundColor: '#10B981' },
  dotOff: { backgroundColor: '#E5E7EB' },
  line: { width: 2, flex: 1, backgroundColor: '#E5E7EB', marginTop: 6, borderRadius: 2, minHeight: 14 },
  label: { fontSize: 13, fontWeight: '800', color: '#374151' },
  labelActive: { color: '#111827' },
  now: { fontSize: 12, fontWeight: '900', color: '#111827', backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
})

