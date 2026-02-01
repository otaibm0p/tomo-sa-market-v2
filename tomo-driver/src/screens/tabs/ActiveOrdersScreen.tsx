import React from 'react'
import { ActivityIndicator, View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native'
import { useActiveOrders, useOrders } from '../../shared/orders/OrdersProvider'
import { OrderCard } from '../../shared/order-ui/OrderCard'
import { OrderActions } from '../../shared/order-ui/OrderActions'

export function ActiveOrdersScreen({ navigation }: any) {
  const active = useActiveOrders()
  const { loading, error, refresh, setStatus, socketConnected } = useOrders()

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>الطلبات النشطة</Text>
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
        ) : active.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>لا توجد توصيلات نشطة</Text>
            <Text style={styles.emptySub}>ستظهر الطلبات المخصصة لك هنا.</Text>
          </View>
        ) : (
          active.map((o) => {
            const mapsUrl =
              o.delivery_latitude != null && o.delivery_longitude != null
                ? `https://www.google.com/maps/search/?api=1&query=${o.delivery_latitude},${o.delivery_longitude}`
                : o.delivery_address
                  ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.delivery_address)}`
                  : null

            return (
              <OrderCard
                key={o.id}
                order={o}
                onPress={() => navigation.navigate('OrderDetails', { orderId: o.id })}
                right={
                  <View style={{ gap: 10 }}>
                    <OrderActions
                      status={o.status}
                      allowedTargets={['PICKED_UP', 'DELIVERED']}
                      onSetStatus={(next) => setStatus(o.id, next)}
                    />
                    {mapsUrl ? (
                      <Pressable
                        style={styles.mapsBtn}
                        onPress={() => Linking.openURL(mapsUrl)}
                      >
                        <Text style={styles.mapsText}>فتح في خرائط Google</Text>
                      </Pressable>
                    ) : null}
                  </View>
                }
              />
            )
          })
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
  mapsBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, paddingVertical: 10, alignItems: 'center' },
  mapsText: { fontWeight: '900', color: '#111827', fontSize: 12 },
})

