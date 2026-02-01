import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { fetchOrderDetails } from '../api/orders'
import type { OrderDetails } from '../shared/types/order'
import { OrderTimeline } from '../shared/order-ui/OrderTimeline'

export function OrderDetailsScreen({ route }: any) {
  const orderId: number = route?.params?.orderId
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const res = await fetchOrderDetails(orderId)
        if (cancelled) return
        setOrder((res as any)?.order || (res as any))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [orderId])

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>...</Text>
      </View>
    )
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>لم يتم العثور على الطلب</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 14, gap: 12 }}>
      <View style={styles.card}>
        <Text style={styles.h1}>طلب #{order.public_code || order.id}</Text>
        <Text style={styles.muted}>{order.delivery_address || ''}</Text>
        <Text style={styles.total}>الإجمالي: {Number(order.total_amount || 0).toFixed(2)} ريال</Text>
      </View>

      <View style={styles.card}>
        <OrderTimeline currentStatus={order.status} />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#F3F4F6' },
  h1: { fontSize: 18, fontWeight: '900', color: '#111827' },
  title: { fontSize: 16, fontWeight: '900', color: '#111827', padding: 14 },
  muted: { marginTop: 6, fontSize: 12, color: '#6B7280' },
  total: { marginTop: 10, fontSize: 13, fontWeight: '900', color: '#111827' },
})

