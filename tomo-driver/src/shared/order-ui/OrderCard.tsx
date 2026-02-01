import React from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { StatusBadge } from './StatusBadge'
import type { OrderListItem } from '../types/order'

export function OrderCard({
  order,
  lang = 'ar',
  onPress,
  right,
}: {
  order: OrderListItem
  lang?: 'ar' | 'en'
  onPress?: () => void
  right?: React.ReactNode
}) {
  const Container = onPress ? Pressable : View
  return (
    <Container style={({ pressed }: any) => [styles.card, pressed && onPress ? styles.cardPressed : null]} onPress={onPress}>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1 }}>
          <View style={styles.rowWrap}>
            <Text style={styles.id}>#{order.id}</Text>
            <StatusBadge status={order.status} lang={lang} />
          </View>
          {!!order.customer_name && <Text style={styles.secondary} numberOfLines={1}>{order.customer_name}</Text>}
          {!!order.delivery_address && <Text style={styles.muted} numberOfLines={1}>{order.delivery_address}</Text>}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.total}>
            {Number(order.total_amount || 0).toFixed(2)} {lang === 'en' ? 'SAR' : 'ريال'}
          </Text>
          <Text style={styles.muted} numberOfLines={1}>
            {new Date(order.created_at).toLocaleString(lang === 'en' ? 'en-US' : 'ar-SA')}
          </Text>
        </View>
      </View>
      {right ? <View style={{ marginTop: 10 }}>{right}</View> : null}
    </Container>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardPressed: { opacity: 0.92 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  id: { fontSize: 14, fontWeight: '900', color: '#111827' },
  total: { fontSize: 14, fontWeight: '900', color: '#111827' },
  secondary: { marginTop: 6, fontSize: 13, fontWeight: '700', color: '#374151' },
  muted: { marginTop: 4, fontSize: 12, color: '#6B7280' },
})

