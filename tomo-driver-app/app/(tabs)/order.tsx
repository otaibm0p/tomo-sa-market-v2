import { useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ScreenContainer } from '@/components/ScreenContainer'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { getDriverOrdersActive, postDriverOrderStatus } from '@/lib/api'
import { t, isRTL } from '@/lib/i18n'
import { colors } from '@/constants/colors'
import { typography } from '@/constants/typography'

type OrderStatus = 'picked_up' | 'delivering' | 'delivered'

const STEPS: { key: OrderStatus; labelKey: string }[] = [
  { key: 'picked_up', labelKey: 'pickedUp' },
  { key: 'delivering', labelKey: 'delivering' },
  { key: 'delivered', labelKey: 'delivered' },
]

export default function OrderScreen() {
  const rtl = isRTL()
  const queryClient = useQueryClient()
  const [updating, setUpdating] = useState<string | null>(null)

  const { data: orders, isLoading } = useQuery({
    queryKey: ['driver', 'orders', 'active'],
    queryFn: getDriverOrdersActive,
    staleTime: 30_000,
  })

  const activeOrder = Array.isArray(orders) && orders.length > 0 ? orders[0] : null

  const handleStep = async (step: OrderStatus) => {
    if (!activeOrder) return
    setUpdating(step)
    try {
      await postDriverOrderStatus(activeOrder.id, step.toUpperCase())
      await queryClient.invalidateQueries({ queryKey: ['driver', 'orders', 'active'] })
    } catch {
      // stub: backend may not have endpoint
    } finally {
      setUpdating(null)
    }
  }

  if (isLoading) {
    return (
      <ScreenContainer>
        <Text style={styles.placeholder}>{t('loading')}</Text>
      </ScreenContainer>
    )
  }

  if (!activeOrder) {
    return (
      <ScreenContainer>
        <Card style={styles.centeredCard}>
          <Text style={styles.placeholder}>{t('noActiveOrder')}</Text>
        </Card>
      </ScreenContainer>
    )
  }

  return (
    <ScreenContainer>
      <Card style={styles.card}>
        <View style={[styles.row, rtl && styles.rowRtl]}>
          <Text style={styles.label}>{t('activeOrder')}</Text>
          <Badge variant="info">#{activeOrder.id}</Badge>
        </View>
        {(activeOrder as any).customer_name && (
          <Text style={styles.body}>{(activeOrder as any).customer_name}</Text>
        )}
        {(activeOrder as any).delivery_address && (
          <Text style={styles.caption}>{(activeOrder as any).delivery_address}</Text>
        )}
        {(activeOrder as any).total_amount != null && (
          <Text style={styles.caption}>{(activeOrder as any).total_amount} ر.س</Text>
        )}
      </Card>

      <View style={styles.steps}>
        {STEPS.map(({ key, labelKey }) => (
          <Button
            key={key}
            variant="outline"
            onPress={() => handleStep(key)}
            loading={updating === key}
            disabled={!!updating}
            style={styles.stepBtn}
          >
            {t(labelKey)}
          </Button>
        ))}
      </View>
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  card: { marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  rowRtl: { flexDirection: 'row-reverse' },
  label: { ...typography.title2, color: colors.text },
  body: { ...typography.body, color: colors.text, marginBottom: 4 },
  caption: { ...typography.caption, color: colors.textMuted, marginBottom: 4 },
  steps: { gap: 12 },
  stepBtn: { marginBottom: 8 },
  placeholder: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: 24 },
  centeredCard: { alignItems: 'center', justifyContent: 'center', minHeight: 120 },
})
