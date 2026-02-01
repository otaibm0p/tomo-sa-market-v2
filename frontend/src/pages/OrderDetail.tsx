import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { authAPI, orderAPI } from '../utils/api'
import { useLanguage } from '../context/LanguageContext'
import { OrderCardSkeleton } from '../components/ui/Skeletons'
import { getStatusLabel as getMvpStatusLabel, normalizeOrderStatus } from '../shared/orderStatus'
import { OrderTimeline } from '../shared/order-ui/OrderTimeline'
import LiveDriverMap, { type LivePoint } from '../components/orders/LiveDriverMap'
import { getSocket } from '../shared/socketClient'
import { estimateEtaMinutes, estimateSpeedMps, haversineMeters } from '../shared/geo/eta'

interface OrderItem {
  id: number
  product_id: number
  product_name: string
  product_name_ar?: string
  product_name_en?: string
  quantity: number
  unit_price: string
  product_image?: string
  unit?: string
}

interface Order {
  id: number
  public_code?: string
  status: string
  total_amount: string
  subtotal?: number
  delivery_fee?: number
  delivery_address?: string
  payment_method?: string
  payment_status?: string
  created_at: string
  accepted_at?: string | null
  picked_up_at?: string | null
  delivered_at?: string | null
  cancelled_at?: string | null
  items: OrderItem[]
  delivery_latitude?: number | string | null
  delivery_longitude?: number | string | null
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { language, t } = useLanguage()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [points, setPoints] = useState<LivePoint[]>([])

  useEffect(() => {
    // Cleanup on orderId change
    setPoints([])
  }, [id])

  useEffect(() => {
    if (id) {
      loadOrder()
      const interval = setInterval(loadOrder, 10000) // Refresh every 10s
      return () => clearInterval(interval)
    }
  }, [id])

  useEffect(() => {
    if (!id) return
    if (!order) return

    const status = normalizeOrderStatus(order.status) || ''
    const trackable = status === 'ASSIGNED' || status === 'PICKED_UP' || status === 'IN_DELIVERY'
    if (!trackable) {
      setPoints([])
      return
    }

    const orderId = Number(id)
    if (!Number.isFinite(orderId)) return

    const socket = getSocket()
    const userId = authAPI.getCurrentUser()?.id
    if (userId) socket.emit('join-customer', userId)
    socket.emit('join-order', orderId)

    const pushPoint = (lat: number, lng: number, ts: number) => {
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
      setPoints((prev) => {
        const last = prev[prev.length - 1]
        if (last && Math.abs(last.lat - lat) < 0.000001 && Math.abs(last.lng - lng) < 0.000001) return prev
        const next = [...prev, { lat, lng, ts }]
        return next.length > 30 ? next.slice(next.length - 30) : next
      })
    }

    const onRiderLocationUpdated = (p: any) => {
      const oid = p?.order_id ?? p?.orderId
      if (oid != null && Number(oid) !== orderId) return
      const lat = Number(p?.latitude)
      const lng = Number(p?.longitude)
      const ts = (() => {
        const raw = p?.timestamp
        const parsed = raw ? Date.parse(raw) : NaN
        return Number.isFinite(parsed) ? parsed : Date.now()
      })()
      pushPoint(lat, lng, ts)
    }

    const onDriverLocationUpdated = (p: any) => {
      const lat = Number(p?.latitude)
      const lng = Number(p?.longitude)
      const ts = (() => {
        const raw = p?.timestamp
        const parsed = raw ? Date.parse(raw) : NaN
        return Number.isFinite(parsed) ? parsed : Date.now()
      })()
      pushPoint(lat, lng, ts)
    }

    socket.on('rider-location-updated', onRiderLocationUpdated)
    socket.on('driver-location-updated', onDriverLocationUpdated)

    return () => {
      socket.off('rider-location-updated', onRiderLocationUpdated)
      socket.off('driver-location-updated', onDriverLocationUpdated)
      setPoints([])
    }
  }, [id, order?.status, order])

  const loadOrder = async () => {
    try {
      const res = await orderAPI.getById(Number(id))
      setOrder(res.order || res)
      setError(null)
    } catch (err: any) {
      console.error('Error loading order:', err)
      setError(err.userMessage || (language === 'ar' ? 'حدث خطأ في تحميل الطلب' : 'Error loading order'))
    } finally {
      setLoading(false)
    }
  }

  const getStatusLabel = (status: string): string => {
    const normalized = normalizeOrderStatus(status)
    if (!normalized) console.warn(`Unknown order status: ${status}`)
    return getMvpStatusLabel(status, language === 'ar' ? 'ar' : 'en')
  }

  const isCancelled = order?.status.toUpperCase() === 'CANCELLED'
  const isDelivered = order?.status.toUpperCase() === 'DELIVERED'

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 font-['Tajawal'] pb-20" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="max-w-3xl mx-auto px-4 py-6">
          <OrderCardSkeleton />
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 font-['Tajawal'] pb-20 flex items-center justify-center" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {language === 'ar' ? 'لم يتم العثور على الطلب' : 'Order Not Found'}
          </h2>
          <p className="text-gray-500 mb-6">{error || (language === 'ar' ? 'الطلب غير موجود أو تم حذفه' : 'Order not found or deleted')}</p>
          <button
            onClick={() => navigate('/orders')}
            className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors"
          >
            {language === 'ar' ? 'العودة للطلبات' : 'Back to Orders'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 font-['Tajawal'] pb-20" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/orders')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-6 h-6 ${language === 'ar' ? '' : 'rotate-180'}`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {language === 'ar' ? 'تفاصيل الطلب' : 'Order Details'}
            </h1>
            <p className="text-sm text-gray-500">
              {order.public_code ? `#${order.public_code}` : `#${order.id}`}
            </p>
          </div>
        </div>

        {/* Status Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
        >
          <OrderTimeline currentStatus={order.status} />
        </motion.div>

        {/* Live Driver Tracking */}
        {(() => {
          const s = normalizeOrderStatus(order.status) || ''
          const trackable = s === 'ASSIGNED' || s === 'PICKED_UP' || s === 'IN_DELIVERY'
          if (!trackable) return null

          const rawLat = (order as any)?.delivery_latitude ?? (order as any)?.deliveryLatitude
          const rawLng = (order as any)?.delivery_longitude ?? (order as any)?.deliveryLongitude
          const destLat = rawLat != null ? Number(rawLat) : NaN
          const destLng = rawLng != null ? Number(rawLng) : NaN
          const hasDest = Number.isFinite(destLat) && Number.isFinite(destLng)

          const etaInfo = (() => {
            if (!hasDest) return null
            if (points.length < 2) return null
            const last = points[points.length - 1]
            if (!last) return null
            const distanceM = haversineMeters({ lat: last.lat, lng: last.lng }, { lat: destLat, lng: destLng })
            const speed = estimateSpeedMps(points) ?? 6 // fallback
            const etaMin = estimateEtaMinutes(distanceM, speed)
            return { etaMin, distanceM }
          })()

          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
            >
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-bold text-gray-900">{language === 'ar' ? 'تتبع المندوب' : 'Driver tracking'}</h2>
                {points.length ? (
                  <a
                    className="text-sm font-bold text-emerald-700 hover:text-emerald-800"
                    href={`https://www.google.com/maps?q=${points[points.length - 1].lat},${points[points.length - 1].lng}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {language === 'ar' ? 'فتح على الخريطة' : 'Open in Maps'}
                  </a>
                ) : null}
              </div>

              {etaInfo ? (
                <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                  <div className="text-sm font-bold text-emerald-900">
                    {language === 'ar' ? `وقت الوصول التقريبي: ~ ${etaInfo.etaMin} دقيقة` : `Estimated arrival: ~ ${etaInfo.etaMin} min`}
                  </div>
                  <div className="mt-1 text-xs font-bold text-emerald-800/80" dir="ltr">
                    {language === 'ar'
                      ? `المسافة الحالية: ${(etaInfo.distanceM / 1000).toFixed(1)} كم`
                      : `Current distance: ${(etaInfo.distanceM / 1000).toFixed(1)} km`}
                  </div>
                </div>
              ) : null}

              {points.length ? (
                <LiveDriverMap points={points} height={320} />
              ) : (
                <div className="text-sm text-gray-600 bg-gray-50 border border-gray-100 rounded-xl p-4">
                  {language === 'ar' ? 'بانتظار موقع المندوب…' : 'Waiting for driver location…'}
                </div>
              )}
            </motion.div>
          )
        })()}

        {/* Order Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
        >
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            {language === 'ar' ? 'المنتجات' : 'Products'}
          </h2>
          <div className="space-y-3">
            {order.items?.map((item, idx) => (
              <div key={idx} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                <div className="w-16 h-16 rounded-lg bg-white border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {item.product_image ? (
                    <img
                      src={item.product_image}
                      alt={item.product_name}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-2xl">📦</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">
                    {language === 'ar' ? item.product_name_ar || item.product_name : item.product_name_en || item.product_name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {item.quantity} × {Number(item.unit_price).toFixed(2)} {t('currency')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-600">
                    {(Number(item.unit_price) * item.quantity).toFixed(2)} {t('currency')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Order Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
        >
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            {language === 'ar' ? 'ملخص الطلب' : 'Order Summary'}
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between text-gray-600">
              <span>{language === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}</span>
              <span className="font-bold text-gray-900">
                {(order.subtotal || Number(order.total_amount) - (order.delivery_fee || 0)).toFixed(2)} {t('currency')}
              </span>
            </div>
            {order.delivery_fee !== undefined && order.delivery_fee > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>{language === 'ar' ? 'رسوم التوصيل' : 'Delivery Fee'}</span>
                <span className="font-bold text-gray-900">
                  {order.delivery_fee.toFixed(2)} {t('currency')}
                </span>
              </div>
            )}
            <div className="pt-3 border-t border-gray-200 flex justify-between">
              <span className="text-lg font-bold text-gray-900">{language === 'ar' ? 'الإجمالي' : 'Total'}</span>
              <span className="text-xl font-bold text-emerald-600">
                {Number(order.total_amount).toFixed(2)} {t('currency')}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Delivery Info */}
        {order.delivery_address && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
          >
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {language === 'ar' ? 'معلومات التوصيل' : 'Delivery Information'}
            </h2>
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <span className="text-2xl">📍</span>
                <div>
                  <p className="text-sm text-gray-500 mb-1">{language === 'ar' ? 'العنوان' : 'Address'}</p>
                  <p className="font-bold text-gray-900">{order.delivery_address}</p>
                </div>
              </div>
              {order.payment_method && (
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💳</span>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">{language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}</p>
                    <p className="font-bold text-gray-900">
                      {order.payment_method === 'cod' 
                        ? (language === 'ar' ? 'دفع عند الاستلام' : 'Cash on Delivery')
                        : (language === 'ar' ? 'دفع إلكتروني' : 'Online Payment')
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/orders')}
            className="flex-1 bg-white border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50 transition-colors"
          >
            {language === 'ar' ? 'العودة للطلبات' : 'Back to Orders'}
          </button>
          {!isDelivered && !isCancelled && (
            <button
              onClick={() => navigate('/')}
              className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors"
            >
              {language === 'ar' ? 'طلب جديد' : 'New Order'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
