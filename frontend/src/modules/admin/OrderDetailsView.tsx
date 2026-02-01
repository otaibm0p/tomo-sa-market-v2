import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import { usePublicSettings } from '../../hooks/usePublicSettings'
import { useLanguage } from '../../context/LanguageContext'
import { SlaTimerBadge } from '../../shared/order-ui/SlaTimerBadge'
import { getOrderSlaStartAt, computeSlaCycle, slaCycleVariant } from '../../shared/order-ui/orderUiUtils'
import { copyToClipboard } from '../../shared/order-ui/orderUiUtils'
import { StatusBadge } from '../../shared/order-ui/StatusBadge'
import { normalizeOrderStatus } from '../../shared/orderStatus'
import { adminTokens, cx } from '../../shared/admin/ui/tokens'
import { CardModern } from '../../shared/admin/ui/components/CardModern'
import { TableModern, TableModernHead, TableModernTh, TableModernBody, TableModernRow, TableModernTd } from '../../shared/admin/ui/components/TableModern'
import { Button } from '../../shared/admin/ui/components/Button'
import { showToast } from '../../shared/toast'

interface OrderItem {
  id: number
  product_id: number
  product_name_ar: string
  product_name_en?: string
  quantity: number
  unit_price: number
  unit?: string
}

interface Rider {
  id: number
  name: string
  phone: string
  rider_status: 'available' | 'busy' | 'offline'
}

interface ActivityLog {
  id: number
  status: string
  created_at: string
  notes?: string
}

interface OrderDetails {
  id: number
  user_id?: number
  total_amount: number
  status: string
  created_at: string
  delivery_address: string
  delivery_latitude?: number
  delivery_longitude?: number
  delivery_notes?: string
  driver_id: number | null
  driver_name?: string
  customer_name: string
  customer_email?: string
  customer_phone?: string
  payment_method: string
  payment_status?: string
  delivery_fee?: number
  payment_received_at?: string | null
  paid_at?: string | null
  items: OrderItem[]
  rider?: Rider
  activity_log: ActivityLog[]
  store_name?: string | null
  store_id?: number | null
  zone?: string | null
}

const TIMELINE_STEPS = [
  { key: 'paid', labelAr: 'مدفوع', statusMatch: null },
  { key: 'accepted', labelAr: 'مقبول', statusMatch: 'ACCEPTED' },
  { key: 'picked', labelAr: 'تم الاستلام', statusMatch: 'PICKED_UP' },
  { key: 'delivering', labelAr: 'قيد التوصيل', statusMatch: 'ASSIGNED' },
  { key: 'delivered', labelAr: 'تم التوصيل', statusMatch: 'DELIVERED' },
] as const

function getStepReached(status: string | null): number {
  if (!status) return 0
  const idx = TIMELINE_STEPS.findIndex((s) => s.statusMatch === status)
  if (idx >= 0) return idx + 1
  if (['CREATED', 'PREPARING', 'READY'].includes(status)) return 1
  return 0
}

export default function OrderDetailsView() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const { settings: publicSettings } = usePublicSettings()
  const slaLimitMinutes = publicSettings?.features?.sla_timer_limit_minutes ?? 30
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSpeedPanel, setShowSpeedPanel] = useState(false)
  const riderCardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (orderId) loadOrderDetails()
  }, [orderId])

  const loadOrderDetails = async () => {
    if (!orderId) return
    try {
      setLoading(true)
      setError(null)
      const orderRes = await api.get(`/api/admin/orders/${orderId}`)
      const orderData = orderRes.data.order || orderRes.data
      const itemsRes = await api.get(`/api/admin/orders/${orderId}/items`)
      const items = itemsRes.data.items || []

      let rider: Rider | undefined
      if (orderData.driver_id) {
        try {
          const riderRes = await api.get(`/api/admin/riders/${orderData.driver_id}`)
          const riderData = riderRes.data.rider || riderRes.data
          rider = {
            id: riderData.id,
            name: riderData.name || orderData.driver_name || (isAr ? 'مندوب' : 'Rider'),
            phone: riderData.phone || '',
            rider_status: riderData.rider_status || 'offline',
          }
        } catch {
          if (orderData.driver_name) {
            rider = {
              id: orderData.driver_id,
              name: orderData.driver_name,
              phone: '',
              rider_status: 'offline',
            }
          }
        }
      }

      let activityLog: ActivityLog[] = []
      try {
        const logRes = await api.get(`/api/admin/orders/${orderId}/activity-log`)
        activityLog = logRes.data.logs || logRes.data || []
      } catch {
        activityLog = [{ id: 1, status: orderData.status, created_at: orderData.created_at, notes: isAr ? 'تم إنشاء الطلب' : 'Order created' }]
      }

      setOrder({
        ...orderData,
        items: items.map((i: OrderItem) => ({ ...i, unit: i.unit || (isAr ? 'قطعة' : 'pc') })),
        rider,
        activity_log: activityLog,
      })
    } catch (err: any) {
      setError(err.response?.data?.message || (isAr ? 'حدث خطأ في جلب تفاصيل الطلب' : 'Failed to load order'))
    } finally {
      setLoading(false)
    }
  }

  const handleCopyPhone = async () => {
    const phone = order?.customer_phone || order?.rider?.phone || ''
    if (phone && (await copyToClipboard(phone))) showToast(isAr ? 'تم نسخ رقم الجوال' : 'Phone copied', 'success')
  }

  const handleCopyAddress = async () => {
    const addr = order?.delivery_address || ''
    if (addr && (await copyToClipboard(addr))) showToast(isAr ? 'تم نسخ العنوان' : 'Address copied', 'success')
  }

  if (loading) {
    return (
      <div className={cx('flex justify-center items-center min-h-[50vh]', adminTokens.color.page)} dir={isAr ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <div className={cx('inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#047857] mb-4')} />
          <p className={cx('text-lg font-bold', adminTokens.color.muted)}>{isAr ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className={cx('flex justify-center items-center min-h-[50vh]', adminTokens.color.page)} dir={isAr ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <p className={cx('text-xl font-bold mb-4', adminTokens.status.danger.text)}>{error || (isAr ? 'الطلب غير موجود' : 'Order not found')}</p>
          <Button variant="primary" onClick={() => navigate('/admin/orders')}>
            {isAr ? 'العودة إلى قائمة الطلبات' : 'Back to orders'}
          </Button>
        </div>
      </div>
    )
  }

  const status = normalizeOrderStatus(order.status)
  const hasDriver = !!(order.driver_id || order.driver_name || order.rider)
  const slaStart = getOrderSlaStartAt(order)
  const cycleLimitSec = slaLimitMinutes * 60
  const { cycleNumber, cycleElapsedSec } = slaStart ? computeSlaCycle(slaStart, Date.now(), cycleLimitSec) : { cycleNumber: 1, cycleElapsedSec: 0 }
  const isLateSla = cycleNumber > 1 || cycleElapsedSec >= cycleLimitSec
  const isTerminal = ['DELIVERED', 'CANCELLED'].includes(status || '')

  const primaryCta = (() => {
    if (!hasDriver && ['READY', 'CREATED', 'ACCEPTED', 'PREPARING'].includes(status || ''))
      return { label: isAr ? 'تعيين مندوب الآن' : 'Assign driver now', action: () => navigate('/admin/ops/live-dispatch') }
    if (isLateSla && !isTerminal) return { label: isAr ? 'تسريع التوصيل' : 'Speed up delivery', action: () => setShowSpeedPanel((v) => !v) }
    if (['ASSIGNED', 'PICKED_UP'].includes(status || ''))
      return { label: isAr ? 'متابعة المندوب' : 'Track driver', action: () => riderCardRef.current?.scrollIntoView({ behavior: 'smooth' }) }
    if (isTerminal) return { label: isAr ? 'تصعيد' : 'Escalate', action: () => {} }
    return { label: isAr ? 'عرض الطلب' : 'View order', action: () => {} }
  })()

  const stepReached = getStepReached(status)
  const storeLabel = (order as OrderDetails).store_name || (order.store_id ? (isAr ? `متجر #${order.store_id}` : `Store #${order.store_id}`) : '—')
  const zoneLabel = (order as OrderDetails).zone || '—'
  const paymentLabel = order.payment_method === 'online' || order.payment_method === 'card' ? (isAr ? 'دفع إلكتروني' : 'Online') : order.payment_method || '—'

  const itemsTotal = order.items.reduce((sum, i) => sum + Number(i.unit_price) * Number(i.quantity), 0)
  const deliveryFee = Number(order.delivery_fee) || 0
  const totalAmount = Number(order.total_amount) || itemsTotal + deliveryFee

  return (
    <div className={cx('min-h-screen', adminTokens.color.page, adminTokens.text.body)} dir={isAr ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto space-y-6 pb-10">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 -mx-4 md:-mx-6 px-4 md:px-6 py-4 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/admin/orders')}
                className={cx('text-sm font-bold', adminTokens.color.primary, 'hover:underline')}
              >
                {isAr ? '← العودة للطلبات' : '← Back to orders'}
              </button>
              <h1 className={cx('text-lg md:text-xl font-extrabold', adminTokens.color.textStrong)}>
                {isAr ? 'طلب' : 'Order'} <span dir="ltr">#{order.id}</span>
              </h1>
              <StatusBadge status={order.status} lang={isAr ? 'ar' : 'en'} showDot />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {!isTerminal && slaStart && (
                <div className="min-w-[200px]" title={isAr ? 'الوقت منذ الدفع' : 'Time since payment'}>
                  <SlaTimerBadge
                    slaStartAt={slaStart}
                    limitMinutes={slaLimitMinutes}
                    lang={isAr ? 'ar' : 'en'}
                    fullBlock
                    className="border-gray-100"
                  />
                </div>
              )}
              <div className={cx('text-sm', adminTokens.color.muted)}>
                <span>{storeLabel}</span>
                <span className="mx-2">·</span>
                <span>{zoneLabel}</span>
                <span className="mx-2">·</span>
                <span>{paymentLabel}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="primary" size="sm" onClick={primaryCta.action} className="font-bold">
                  {primaryCta.label}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => navigate('/admin/ops/board')} className="font-bold">
                  {isAr ? 'فتح لوحة العمليات' : 'Open ops board'}
                </Button>
              </div>
            </div>
          </div>
          {showSpeedPanel && isLateSla && (
            <div className={cx('mt-4 p-4 rounded-xl border', adminTokens.status.warn.bg, adminTokens.status.warn.border)}>
              <p className={cx('text-sm font-bold', adminTokens.status.warn.text)}>
                {isAr ? 'إجراءات تسريع التوصيل (واجهة فقط — لا تغيير في الخادم)' : 'Speed-up actions (UI only — no backend change)'}
              </p>
              <p className={cx('text-xs mt-1', adminTokens.color.muted)}>
                {isAr ? 'التواصل مع المندوب أو فتح لوحة الإرسال المباشر.' : 'Contact driver or open Live Dispatch.'}
              </p>
            </div>
          )}
        </div>

        {/* Decision cards: 3 columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* A) حالة الطلب الآن */}
          <CardModern>
            <h2 className={cx('mb-3', adminTokens.typography.sectionTitle, adminTokens.color.textStrong)}>{isAr ? 'حالة الطلب الآن' : 'Order status'}</h2>
            <ul className="space-y-2">
              {TIMELINE_STEPS.map((step, idx) => {
                const paidReached = !!(order.paid_at || order.payment_received_at) || (status !== 'CREATED' && status !== null)
                const reached = step.key === 'paid' ? paidReached : stepReached > idx
                return (
                  <li key={step.key} className="flex items-center gap-2">
                    <span
                      className={cx(
                        'inline-flex w-6 h-6 rounded-full text-xs font-bold items-center justify-center',
                        reached ? [adminTokens.status.success.bg, adminTokens.status.success.text] : [adminTokens.status.warn.bg, adminTokens.status.warn.text]
                      )}
                    >
                      {reached ? '✓' : '—'}
                    </span>
                    <span className={cx('text-sm font-medium', reached ? adminTokens.color.text : adminTokens.color.muted)}>{step.labelAr}</span>
                  </li>
                )
              })}
            </ul>
          </CardModern>

          {/* B) التخصيص والمندوب */}
          <div ref={riderCardRef}>
          <CardModern className={!hasDriver ? adminTokens.status.danger.bg + ' ' + adminTokens.status.danger.border : ''}>
            <h2 className={cx('mb-3', adminTokens.typography.sectionTitle, adminTokens.color.textStrong)}>{isAr ? 'التخصيص والمندوب' : 'Driver'}</h2>
            {hasDriver && order.rider ? (
              <div>
                <p className={cx('font-bold', adminTokens.color.text)}>{order.rider.name}</p>
                <p className={cx('text-sm mt-1', adminTokens.color.muted)} dir="ltr">{order.rider.phone || '—'}</p>
                <span
                  className={cx(
                    'inline-flex mt-2 px-2 py-1 rounded-lg text-xs font-bold border',
                    order.rider.rider_status === 'available' ? adminTokens.status.success.bg + ' ' + adminTokens.status.success.border + ' ' + adminTokens.status.success.text :
                    order.rider.rider_status === 'busy' ? adminTokens.status.warn.bg + ' ' + adminTokens.status.warn.border + ' ' + adminTokens.status.warn.text :
                    adminTokens.color.muted
                  )}
                >
                  {order.rider.rider_status === 'available' ? (isAr ? 'متاح' : 'Available') : order.rider.rider_status === 'busy' ? (isAr ? 'مشغول' : 'Busy') : isAr ? 'غير متصل' : 'Offline'}
                </span>
              </div>
            ) : hasDriver && order.driver_name ? (
              <div>
                <p className={cx('font-bold', adminTokens.color.text)}>{order.driver_name}</p>
                <p className={cx('text-sm mt-1', adminTokens.color.muted)}>{isAr ? 'لا يوجد هاتف في البيانات' : 'No phone in data'}</p>
              </div>
            ) : (
              <div>
                <p className={cx('text-sm font-bold', adminTokens.status.danger.text)}>{isAr ? 'لم يُعيّن مندوب بعد' : 'No driver assigned'}</p>
                <Button variant="primary" size="sm" className="mt-2 font-bold" onClick={() => navigate('/admin/ops/live-dispatch')}>
                  {isAr ? 'تعيين' : 'Assign'}
                </Button>
              </div>
            )}
          </CardModern>
          </div>

          {/* C) العميل والعنوان */}
          <CardModern>
            <h2 className={cx('mb-3', adminTokens.typography.sectionTitle, adminTokens.color.textStrong)}>{isAr ? 'العميل والعنوان' : 'Customer & address'}</h2>
            <p className={cx(adminTokens.typography.base, 'font-medium', adminTokens.color.textStrong)}>{order.customer_name || '—'}</p>
            <p className={cx(adminTokens.typography.base, 'mt-1', adminTokens.color.textMuted)} dir="ltr">{order.customer_phone || '—'}</p>
            <p className={cx(adminTokens.typography.base, 'mt-2', adminTokens.color.textMuted)}>{order.delivery_address || '—'}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button variant="secondary" size="sm" onClick={handleCopyPhone} className="font-bold">
                {isAr ? 'نسخ رقم الجوال' : 'Copy phone'}
              </Button>
              <Button variant="secondary" size="sm" onClick={handleCopyAddress} className="font-bold">
                {isAr ? 'نسخ العنوان' : 'Copy address'}
              </Button>
            </div>
          </CardModern>
        </div>

        {/* Items */}
        <CardModern>
          <h2 className={cx('mb-4', adminTokens.typography.sectionTitle, adminTokens.color.textStrong)}>{isAr ? 'العناصر' : 'Items'}</h2>
          <TableModern>
            <TableModernHead>
              <TableModernTh>{isAr ? 'المنتج' : 'Product'}</TableModernTh>
              <TableModernTh>{isAr ? 'الكمية' : 'Qty'}</TableModernTh>
              <TableModernTh>{isAr ? 'السعر' : 'Price'}</TableModernTh>
            </TableModernHead>
            <TableModernBody>
              {order.items.map((item) => (
                <TableModernRow key={item.id}>
                  <TableModernTd>{item.product_name_ar || item.product_name_en || '—'}</TableModernTd>
                  <TableModernTd dir="ltr">{Number(item.quantity)} {item.unit || ''}</TableModernTd>
                  <TableModernTd dir="ltr">{(Number(item.unit_price) * Number(item.quantity)).toFixed(2)} {isAr ? 'ريال' : 'SAR'}</TableModernTd>
                </TableModernRow>
              ))}
            </TableModernBody>
          </TableModern>
          <div className={cx('mt-4 p-4 rounded-xl border', adminTokens.status.success.bg, adminTokens.status.success.border)}>
            <div className="flex justify-between items-center">
              <span className={cx('font-bold', adminTokens.status.success.text)}>{isAr ? 'الإجمالي المدفوع' : 'Total paid'}</span>
              <span className={cx('font-extrabold text-lg tabular-nums', adminTokens.status.success.text)} dir="ltr">{totalAmount.toFixed(2)} {isAr ? 'ريال' : 'SAR'}</span>
            </div>
          </div>
        </CardModern>

        {/* Ops Notes placeholder */}
        <CardModern className={cx(adminTokens.surfaces.subtle)}>
          <p className={cx('text-sm', adminTokens.color.muted)}>
            {isAr ? 'قريبًا: ملاحظات التشغيل ستُفعّل عند جاهزية النظام' : 'Coming soon: Ops notes will be enabled when the system is ready'}
          </p>
        </CardModern>
      </div>
    </div>
  )
}
