import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../utils/api'
import { useLanguage } from '../context/LanguageContext'
import { useOrderTracking } from '../hooks/useOrderTracking'
import { OrderTracker } from '../components/orders/OrderTracker'
import { LiveTimer } from '../components/orders/LiveTimer'
import { OrderCardSkeleton } from '../components/ui/Skeletons'
import { getStatusLabel as getMvpStatusLabel } from '../shared/orderStatus'
import { spacing } from '../shared/ui/tokens'
import { useCart } from '../context/CartContext'
import { Button } from '../shared/ui/components/Button'

interface OrderItem {
  id: number
  product_id: number
  product_name: string
  quantity: number
  qty?: number
  unit_price: string
  line_total?: number
  product_name_ar?: string
  product_name_en?: string
  product_image?: string
  unit?: string
  status?: 'active' | 'substituted' | 'removed'
}

interface Order {
  id: number
  public_code?: string
  customer_id?: number
  user_id?: number
  store_id?: number
  zone_id?: number
  address_id?: number
  status: string // MVP statuses: CREATED, ACCEPTED, PREPARING, READY, ASSIGNED, PICKED_UP, DELIVERED, CANCELLED
  total_amount: string
  total?: number
  subtotal?: number
  delivery_fee?: number
  service_fee?: number
  discount?: number
  currency?: string
  payment_status?: 'unpaid' | 'paid' | 'failed' | 'refunded'
  payment_method?: string
  notes_customer?: string
  created_at: string
  paid_at?: string | null
  accepted_at?: string | null
  packed_at?: string | null
  picked_up_at?: string | null
  delivered_at?: string | null
  cancelled_at?: string | null
  items: OrderItem[]
  eta_minutes?: number
}

const OrderCard = ({ order, expanded, onToggle, slaSettings }: { 
  order: Order; 
  expanded: boolean; 
  onToggle: () => void;
  slaSettings?: {
    target_minutes?: number
    yellow_threshold?: number
    red_threshold?: number
  }
}) => {
  const { language, t } = useLanguage()
  const navigate = useNavigate()
  const { currentStep, timeLeft, elapsedTime, isActive, isCancelled, isCompleted, timerColor } = useOrderTracking(
    order.status,
    order.created_at,
    order.eta_minutes || 45,
    order.paid_at,
    order.delivered_at,
    slaSettings
  )

  const getStatusLabel = (status: string) => {
    return getMvpStatusLabel(status, language === 'ar' ? 'ar' : 'en')
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      layout
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
    >
      {/* Header - Clickable */}
      <div 
        className="p-5 border-b border-gray-100 flex flex-col items-center bg-white text-center cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => navigate(`/orders/${order.id}`)}
      >
        {isActive && (
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`w-full rounded-2xl p-6 text-white shadow-lg mb-6 ${
                  timerColor === 'red' ? 'bg-red-600 shadow-red-200' :
                  timerColor === 'yellow' ? 'bg-yellow-500 shadow-yellow-200' :
                  'bg-emerald-600 shadow-emerald-200'
                }`}
            >
                <div className="text-5xl font-bold mb-2 tracking-tighter tabular-nums">
                    {timeLeft} <span className="text-lg font-normal opacity-80">{language === 'ar' ? 'دقيقة' : 'min'}</span>
                </div>
                <p className="text-lg font-bold opacity-95">
                    {timerColor === 'red' 
                      ? (language === 'ar' ? '⚠️ تأخير في التوصيل' : '⚠️ Delivery Delayed')
                      : timerColor === 'yellow'
                      ? (language === 'ar' ? '⏰ قريب من الوقت المستهدف' : '⏰ Approaching Target Time')
                      : (language === 'ar' ? 'قاعدين نجهز طلبك بأقصى سرعة! 🚀' : 'We are preparing your order! 🚀')
                    }
                </p>
                <p className="text-sm opacity-75 mt-1">
                    {language === 'ar' 
                      ? `الوقت المنقضي: ${elapsedTime} دقيقة`
                      : `Elapsed: ${elapsedTime} min`
                    }
                </p>
            </motion.div>
        )}

        <div className="w-full flex justify-between items-start">
            <div className="text-right">
                <div className="flex items-center gap-2 mb-1 justify-end">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    isCancelled ? 'bg-red-100 text-red-700' :
                    isCompleted ? 'bg-emerald-100 text-emerald-700' :
                    'bg-blue-100 text-blue-700'
                    }`}>
                    {getStatusLabel(order.status)}
                    </span>
                    <span className="font-bold text-lg text-gray-900">
                      {order.public_code ? `#${order.public_code}` : `#${order.id}`}
                    </span>
                </div>
                <span className="text-xs text-gray-400 font-medium">
                    {new Date(order.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
        </div>
      </div>

      {/* Tracker */}
      {!isCancelled && (
        <div className="px-4 pt-2">
          <OrderTracker currentStep={currentStep} />
        </div>
      )}

      {/* Item List (Horizontal Flex) */}
      <div className="px-5 pb-5">
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {order.items?.map((item, idx) => (
            <div key={idx} className="flex-shrink-0 flex flex-col items-center gap-2 w-20">
              <div className="w-16 h-16 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden">
                {item.product_image ? (
                  <img src={item.product_image} alt={item.product_name} className="w-full h-full object-contain" />
                ) : (
                  <span className="text-xl">📦</span>
                )}
              </div>
              <div className="text-center w-full">
                <span className="text-xs font-bold text-gray-800 block truncate w-full" title={language === 'ar' ? item.product_name_ar || item.product_name : item.product_name_en || item.product_name}>
                  {language === 'ar' ? item.product_name_ar || item.product_name : item.product_name_en || item.product_name}
                </span>
                <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md mt-1 inline-block">x{item.quantity}</span>
              </div>
            </div>
          ))}
        </div>
        
        {/* Expand/Collapse Details */}
        <div className="mt-2 border-t border-gray-50 pt-3">
          <button 
            onClick={onToggle}
            className="flex items-center justify-between w-full text-sm font-bold text-gray-700 hover:text-emerald-600 transition-colors"
          >
            <span>{language === 'ar' ? 'تفاصيل الفاتورة' : 'Bill Details'}</span>
            <motion.svg 
              animate={{ rotate: expanded ? 180 : 0 }}
              className="w-4 h-4" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </motion.svg>
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-2 text-sm bg-gray-50 p-4 rounded-xl">
                  <div className="flex justify-between text-gray-600">
                    <span>{language === 'ar' ? 'حالة الدفع' : 'Payment Status'}</span>
                    <span className="font-bold text-emerald-600">{language === 'ar' ? 'مدفوع' : 'Paid'}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-200">
                    <span>{language === 'ar' ? 'الإجمالي' : 'Total'}</span>
                    <span>{Number(order.total_amount).toFixed(2)} {t('currency')}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const { language } = useLanguage()
  const navigate = useNavigate()
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null)
  const { items: cartItems, addToCart, updateQuantity } = useCart()
  const [slaSettings, setSlaSettings] = useState<{
    target_minutes?: number
    yellow_threshold?: number
    red_threshold?: number
  }>({})

  useEffect(() => {
    loadOrders()
    loadSlaSettings()
    const interval = setInterval(loadOrders, 10000)
    return () => clearInterval(interval)
  }, [])

  const loadSlaSettings = async () => {
    try {
      const res = await api.get('/api/site/settings/public')
      if (res.data?.operations_sla) {
        setSlaSettings(res.data.operations_sla)
      }
    } catch (err) {
      console.warn('Failed to load SLA settings:', err)
    }
  }

  const loadOrders = async () => {
    try {
      const res = await api.get('/api/orders')
      setOrders(res.data?.orders || res.data || [])
    } catch (err) {
      console.error('Error loading orders:', err)
    } finally {
      setLoading(false)
    }
  }

  const lastOrder = useMemo(() => {
    if (!orders.length) return null
    const sorted = [...orders].sort((a, b) => {
      const ta = new Date(a.created_at).getTime()
      const tb = new Date(b.created_at).getTime()
      return tb - ta
    })
    return sorted[0] || null
  }, [orders])

  const canReorder = useMemo(() => {
    if (!lastOrder) return false
    if (!Array.isArray(lastOrder.items) || lastOrder.items.length === 0) return false
    return lastOrder.items.every((it) => Number.isFinite(Number(it.product_id)) && Number.isFinite(Number(it.quantity ?? it.qty ?? 0)) && it.unit_price != null)
  }, [lastOrder])

  const onReorder = () => {
    if (!lastOrder) return
    const list = Array.isArray(lastOrder.items) ? lastOrder.items : []
    for (const it of list) {
      const pid = Number(it.product_id)
      const qty = Number(it.quantity ?? it.qty ?? 0)
      const unitPrice = Number(it.unit_price)
      if (!Number.isFinite(pid) || !Number.isFinite(qty) || qty <= 0) continue
      if (!Number.isFinite(unitPrice)) continue

      const existing = (cartItems || []).find((c) => Number((c as any).product?.id) == pid)
      const existingQty = existing ? Number((existing as any).quantity || 0) : 0

      const prod: any = {
        id: pid,
        name: it.product_name || it.product_name_en || it.product_name_ar || `#${pid}`,
        name_ar: it.product_name_ar,
        name_en: it.product_name_en,
        price: unitPrice,
        unit: it.unit || 'piece',
        image_url: it.product_image || undefined,
      }

      if (existingQty <= 0) {
        addToCart(prod)
        updateQuantity(pid, qty)
      } else {
        updateQuantity(pid, existingQty + qty)
      }
    }
    navigate('/cart')
  }

  return (
    <div className="min-h-screen bg-gray-50 font-['Tajawal'] pb-20" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className={spacing.pageMax}>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-24">
        <div className="flex items-end justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{language === 'ar' ? 'طلباتي' : 'My Orders'}</h1>
          {canReorder ? (
            <Button variant="secondary" size="sm" onClick={onReorder}>
              {language === 'ar' ? 'إعادة الطلب' : 'Reorder'}
            </Button>
          ) : null}
        </div>

        {loading ? (
          <div className="space-y-4">
             {[1, 2].map(i => <OrderCardSkeleton key={i} />)}
          </div>
        ) : orders.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-sm p-10 text-center"
          >
            <span className="text-6xl block mb-4">📦</span>
            <h3 className="text-lg font-bold text-gray-800 mb-2">{language === 'ar' ? 'لا توجد طلبات' : 'No Orders Yet'}</h3>
            <p className="text-gray-500">{language === 'ar' ? 'لم تقم بطلب أي منتجات بعد.' : 'You haven\'t placed any orders yet.'}</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <OrderCard 
                key={order.id} 
                order={order} 
                expanded={expandedOrderId === order.id}
                onToggle={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                slaSettings={slaSettings}
              />
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
