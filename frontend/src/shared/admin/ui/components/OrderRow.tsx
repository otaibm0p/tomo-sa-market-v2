import { useNavigate } from 'react-router-dom'
import type { OrderListItem } from '../../../types/order'
import { normalizeOrderStatus } from '../../../orderStatus'
import { getOrderSlaStartAt } from '../../../order-ui/orderUiUtils'
import { computeSlaCycle } from '../../../order-ui/orderUiUtils'
import { SlaTimerBadge } from '../../../order-ui/SlaTimerBadge'
import { StatusBadge } from '../../../order-ui/StatusBadge'
import { Button } from './Button'
import { adminTokens, cx } from '../tokens'

export type OrderRowOrder = OrderListItem & {
  driver_id?: number | null
  driver_name?: string | null
  store_name?: string | null
  store_id?: number | null
}

export interface OrderRowProps {
  order: OrderRowOrder
  slaLimitMinutes: number
  lang: 'ar' | 'en'
  storeLabel: string
}

/** One smart action per row: تعيين مندوب | عرض الطلب | متابعة | تصعيد */
function getSmartAction(
  order: OrderRowOrder,
  slaLimitMinutes: number,
  lang: 'ar' | 'en'
): { label: string; path: string; variant: 'primary' | 'secondary' } {
  const status = normalizeOrderStatus(order.status)
  const hasDriver = !!(order.driver_id || order.driver_name)
  const slaStart = getOrderSlaStartAt(order)
  const cycleLimitSec = slaLimitMinutes * 60
  const now = Date.now()
  const { cycleNumber, cycleElapsedSec } = slaStart
    ? computeSlaCycle(slaStart, now, cycleLimitSec)
    : { cycleNumber: 1, cycleElapsedSec: 0 }
  const isLateSla = cycleNumber > 1 || cycleElapsedSec >= cycleLimitSec

  if (['DELIVERED', 'CANCELLED'].includes(status || '')) {
    return {
      label: lang === 'ar' ? 'تصعيد' : 'Escalate',
      path: `/admin/orders/${order.id}`,
      variant: 'secondary',
    }
  }
  if (isLateSla) {
    return {
      label: lang === 'ar' ? 'عرض الطلب' : 'View order',
      path: `/admin/orders/${order.id}`,
      variant: 'primary',
    }
  }
  if (!hasDriver && ['READY', 'CREATED', 'ACCEPTED', 'PREPARING'].includes(status || '')) {
    return {
      label: lang === 'ar' ? 'تعيين مندوب' : 'Assign driver',
      path: '/admin/ops/live-dispatch',
      variant: 'primary',
    }
  }
  if (['ASSIGNED', 'PICKED_UP'].includes(status || '')) {
    return {
      label: lang === 'ar' ? 'متابعة' : 'Track',
      path: `/admin/orders/${order.id}`,
      variant: 'secondary',
    }
  }
  return {
    label: lang === 'ar' ? 'عرض الطلب' : 'View order',
    path: `/admin/orders/${order.id}`,
    variant: 'secondary',
  }
}

export function OrderRow({ order, slaLimitMinutes, lang, storeLabel }: OrderRowProps) {
  const navigate = useNavigate()
  const status = normalizeOrderStatus(order.status)
  const driverLabel = order.driver_name || order.driver_id ? String(order.driver_name || `#${order.driver_id}`) : (lang === 'ar' ? 'غير معيّن' : 'Unassigned')
  const isTerminal = ['DELIVERED', 'CANCELLED'].includes(status || '')
  const action = getSmartAction(order, slaLimitMinutes, lang)

  return (
    <tr
      className={cx(
        'border-b border-gray-100 hover:bg-gray-50/80 transition-colors',
        adminTokens.text.body
      )}
    >
      <td className="px-4 py-3">
        <span className="font-bold tabular-nums" dir="ltr">#{order.id}</span>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={order.status} lang={lang} showDot />
      </td>
      <td className="px-4 py-3">
        {!isTerminal && getOrderSlaStartAt(order) ? (
          <span title={lang === 'ar' ? 'الوقت منذ الدفع' : 'Time since payment'}>
            <SlaTimerBadge
              slaStartAt={getOrderSlaStartAt(order)}
              paymentReceivedAt={null}
              limitMinutes={slaLimitMinutes}
              hideWhenNoStart
              lang={lang}
              fullBlock={false}
              className="inline-flex"
            />
          </span>
        ) : (
          <span className={cx('text-xs', adminTokens.color.muted)}>—</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm">{storeLabel}</td>
      <td className={cx('px-4 py-3 text-sm', !order.driver_id && !order.driver_name && adminTokens.color.muted)}>
        {driverLabel}
      </td>
      <td className="px-4 py-3">
        <Button
          variant={action.variant}
          size="sm"
          onClick={() => navigate(action.path)}
          className="font-bold whitespace-nowrap"
        >
          {action.label}
        </Button>
      </td>
    </tr>
  )
}
