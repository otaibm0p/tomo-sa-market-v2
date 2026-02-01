import React from 'react'
import { ActivityIndicator, View, Text, StyleSheet, ScrollView, Pressable } from 'react-native'
import { useHistoryOrders, useOrders } from '../../shared/orders/OrdersProvider'
import { OrderCard } from '../../shared/order-ui/OrderCard'

export function HistoryOrdersScreen({ navigation }: any) {
  const history = useHistoryOrders()
  const { loading, error, refresh, socketConnected } = useOrders()

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>السجل</Text>
        <Pressable onPress={() => refresh()} style={styles.refreshBtn}>
          <Text style={styles.refreshText}>{loading ? '...' : 'تحديث'}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }}>
        {!socketConnected ? (
          <View style={styles.bannerOffline}>
            <Text style={styles.bannerText}>غير متصل</Text>
            <Pressable onPress={() => refresh()} style={styles.bannerBtn}>
              <Text style={styles.bannerBtnText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={styles.centerText}>جاري التحميل...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>فشل تحميل الطلبات</Text>
            <Text style={styles.errorSub}>{error}</Text>
            <Pressable onPress={() => refresh()} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : history.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>لا يوجد سجل بعد</Text>
            <Text style={styles.emptySub}>الطلبات التي تم تسليمها ستظهر هنا.</Text>
          </View>
        ) : (
          history.slice(0, 50).map((o) => (
            <OrderCard key={o.id} order={o} onPress={() => navigation.navigate('OrderDetails', { orderId: o.id })} />
          ))
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingTop: 16, paddingHorizontal: 14, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '900', color: '#111827' },
  refreshBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#111827' },
  refreshText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  bannerOffline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  bannerText: { fontWeight: '900', color: '#92400E' },
  bannerBtn: { backgroundColor: '#111827', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12 },
  bannerBtnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  center: { padding: 18, alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#F3F4F6' },
  centerText: { fontSize: 12, color: '#6B7280', fontWeight: '800' },
  errorCard: { padding: 18, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#FEE2E2' },
  errorTitle: { fontSize: 14, fontWeight: '900', color: '#991B1B' },
  errorSub: { marginTop: 6, fontSize: 12, color: '#7F1D1D' },
  retryBtn: { marginTop: 12, backgroundColor: '#111827', borderRadius: 14, paddingVertical: 10, alignItems: 'center' },
  retryText: { color: '#fff', fontWeight: '900' },
  empty: { padding: 18, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#F3F4F6' },
  emptyTitle: { fontSize: 15, fontWeight: '900', color: '#111827' },
  emptySub: { marginTop: 6, fontSize: 12, color: '#6B7280' },
})

