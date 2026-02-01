import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../../context/LanguageContext'
import { authAPI, productAPI, type Product } from '../../utils/api'
import api from '../../utils/api'
import { Package, CheckCircle, Clock, Truck } from 'lucide-react'
import { STATUS_GROUPS, normalizeOrderStatus } from '../../shared/orderStatus'
import { showToast } from '../../shared/toast'
import { getSocket } from '../../shared/socketClient'
import { AppShell } from '../../shared/ui/AppShell'
import { chipClass, debounce } from '../../shared/ui/tokens'
import { OrderCard } from '../../shared/order-ui/OrderCard'
import { OrderActions } from '../../shared/order-ui/OrderActions'
import { SlaTimerBadge } from '../../shared/order-ui/SlaTimerBadge'
import { getOrderSlaStartAt } from '../../shared/order-ui/orderUiUtils'
import { usePublicSettings } from '../../hooks/usePublicSettings'
import type { OrderDetails } from '../../shared/types/order'
import { isLowStockOrUnavailable, suggestSmartSubstitutions } from '../../shared/substitutions/smartSubstitutions'
import { EmptyState, LoadingState } from '../../shared/order-ui/States'
import { copyToClipboard } from '../../shared/order-ui/orderUiUtils'
import { AnimatePresence, motion } from 'framer-motion'

export default function StoreDashboard() {
  const { language, t } = useLanguage()
  const navigate = useNavigate()
  const { settings: publicSettings } = usePublicSettings()
  const slaTimerEnabled = publicSettings?.features?.sla_timer_enabled !== false
  const slaLimitMinutes = publicSettings?.features?.sla_timer_limit_minutes ?? 30
  const storeId =
    Number((authAPI.getCurrentUser() as any)?.store_id || (authAPI.getCurrentUser() as any)?.storeId || localStorage.getItem('store_id') || '') ||
    null
  const [orders, setOrders] = useState<OrderDetails[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoaded, setProductsLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<number | null>(null)
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null)
  const [activeFilter, setActiveFilter] = useState<
    'new' | 'toPrepare' | 'ready' | 'inDelivery' | 'completed' | 'cancelled'
  >('new')
  const [query, setQuery] = useState('')
  const [socketConnected, setSocketConnected] = useState<boolean>(() => {
    try {
      return getSocket()?.connected === true
    } catch {
      return true
    }
  })
  const socketConnectedRef = useRef(true)
  const [stats, setStats] = useState({
    pending: 0,
    preparing: 0,
    ready: 0,
    completed: 0
  })

  useEffect(() => {
    if (!authAPI.isAuthenticated()) {
      navigate('/store')
      return
    }
    
    const user = authAPI.getCurrentUser()
    if (user?.role !== 'store') {
      authAPI.logout()
      navigate('/store')
      return
    }
    
    loadOrders()
    loadProductsOnce()

    const socket = getSocket()
    if (storeId) socket.emit('join-store', storeId)

    const debouncedRefresh = debounce(() => loadOrders(), 700)
    const onOrderUpdated = (p: any) => {
      const sid = p?.storeId ?? p?.store_id
      // Tight filtering: ignore if payload does not explicitly include storeId
      if (sid == null) return
      if (storeId && String(sid) === String(storeId)) {
        debouncedRefresh()
      }
    }
    socket.on('order.updated', onOrderUpdated)

    const onConnect = () => {
      socketConnectedRef.current = true
      setSocketConnected(true)
      loadOrders()
    }
    const onDisconnect = () => {
      socketConnectedRef.current = false
      setSocketConnected(false)
    }
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)

    // Polling fallback only when socket disconnected
    const interval = setInterval(() => {
      if (socketConnectedRef.current) return
      loadOrders()
    }, 10000)
    return () => {
      clearInterval(interval)
      socket.off('order.updated', onOrderUpdated)
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      debouncedRefresh.cancel()
    }
  }, [navigate, storeId])

  const loadProductsOnce = async () => {
    if (productsLoaded) return
    try {
      const list = await productAPI.getAll(storeId || undefined)
      setProducts(Array.isArray(list) ? list : [])
    } catch {
      // ignore (suggestions are assist-only)
    } finally {
      setProductsLoaded(true)
    }
  }

  const loadOrders = async () => {
    try {
      const res = await api.get('/api/store/orders', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('tomo_token')}`
        }
      })
      const ordersData = res.data.orders || []
      setOrders(ordersData)
      
      // MVP: Calculate stats with new statuses
      setStats({
        pending: ordersData.filter((o: OrderDetails) => normalizeOrderStatus(o.status) === 'CREATED').length,
        preparing: ordersData.filter((o: OrderDetails) => {
          const s = normalizeOrderStatus(o.status)
          return s === 'ACCEPTED' || s === 'PREPARING'
        }).length,
        ready: ordersData.filter((o: OrderDetails) => normalizeOrderStatus(o.status) === 'READY').length,
        completed: ordersData.filter((o: OrderDetails) => normalizeOrderStatus(o.status) === 'DELIVERED').length
      })
    } catch (err: any) {
      console.error('Error loading orders:', err)
      if (err.response?.status === 401 || err.response?.status === 403) {
        authAPI.logout()
        navigate('/store')
      } else {
        showToast(err.userMessage || (language === 'en' ? 'Failed to load orders' : 'فشل تحميل الطلبات'), 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (orderId: number, status: string) => {
    setUpdating(orderId)
    try {
      await api.put(`/api/store/orders/${orderId}/status`, { status }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('tomo_token')}`
        }
      })
      await loadOrders()
      showToast(language === 'en' ? 'Order updated' : 'تم تحديث الطلب', 'success')
    } catch (err: any) {
      showToast(err.response?.data?.message || err.userMessage || (language === 'en' ? 'Failed to update order' : 'فشل تحديث الطلب'), 'error')
    } finally {
      setUpdating(null)
    }
  }

  // MVP: Accept/Reject order
  const acceptOrder = async (orderId: number) => {
    setUpdating(orderId)
    try {
      await api.post(`/api/store/orders/${orderId}/accept`, {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('tomo_token')}`
        }
      })
      await loadOrders()
      showToast(language === 'en' ? 'Order accepted' : 'تم قبول الطلب', 'success')
    } catch (err: any) {
      showToast(err.response?.data?.message || err.userMessage || (language === 'en' ? 'Failed to accept order' : 'فشل قبول الطلب'), 'error')
    } finally {
      setUpdating(null)
    }
  }

  const rejectOrder = async (orderId: number) => {
    setUpdating(orderId)
    try {
      await api.post(`/api/store/orders/${orderId}/reject`, {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('tomo_token')}`
        }
      })
      await loadOrders()
      showToast(language === 'en' ? 'Order cancelled' : 'تم إلغاء الطلب', 'success')
    } catch (err: any) {
      showToast(err.response?.data?.message || err.userMessage || (language === 'en' ? 'Failed to cancel order' : 'فشل إلغاء الطلب'), 'error')
    } finally {
      setUpdating(null)
    }
  }

  const cancelOrder = async (order: OrderDetails) => {
    const normalized = normalizeOrderStatus(order.status)
    if (!normalized) {
      showToast(language === 'en' ? 'Unknown order status' : 'حالة طلب غير معروفة', 'error')
      return
    }
    if (normalized === 'DELIVERED' || normalized === 'CANCELLED') return

    // For CREATED, use reject endpoint (inventory release).
    if (normalized === 'CREATED') {
      await rejectOrder(order.id)
      return
    }
    // For other non-final statuses, attempt status update to CANCELLED.
    await updateOrderStatus(order.id, 'CANCELLED')
  }

  const filteredOrders = useMemo(() => {
    const q = String(query || '').trim().toLowerCase()
    return orders.filter((o: OrderDetails) => {
      const s = normalizeOrderStatus(o.status)
      if (!s) return false
      const group = STATUS_GROUPS[activeFilter]
      if (group && !group.includes(s)) return false
      if (!q) return true
      const id = String(o.id || '').toLowerCase()
      const phone = String((o as any)?.customer_phone || (o as any)?.customerPhone || '').toLowerCase()
      return id.includes(q) || phone.includes(q)
    })
  }, [orders, activeFilter, query])

  const productById = useMemo(() => {
    const m = new Map<number, any>()
    for (const p of products as any[]) {
      const id = Number((p as any)?.id)
      if (Number.isFinite(id)) m.set(id, p)
    }
    return m
  }, [products])

  const handleSetStatus = async (order: OrderDetails, next: any) => {
    const current = normalizeOrderStatus(order.status)
    if (next === 'ACCEPTED' && current === 'CREATED') {
      await acceptOrder(order.id)
      return
    }
    if (next === 'CANCELLED') {
      await cancelOrder(order)
      return
    }
    await updateOrderStatus(order.id, next)
  }

  if (loading) return <LoadingState title={t('loading') || (language === 'ar' ? 'جاري التحميل...' : 'Loading...')} />

  return (
    <AppShell
      title={t('store.dashboard.title') || (language === 'ar' ? 'طلبات المتجر' : 'Store orders')}
      role="store"
      topActions={
        <div className="flex flex-col gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('store.search.placeholder') || (language === 'ar' ? 'بحث برقم الطلب أو رقم العميل…' : 'Search by order id or customer phone…')}
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold outline-none"
            dir={language === 'ar' ? 'rtl' : 'ltr'}
          />
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'new', label: t('store.tabs.new') || (language === 'ar' ? 'جديد' : 'New') },
              { key: 'toPrepare', label: t('store.tabs.toPrepare') || (language === 'ar' ? 'للتجهيز' : 'To prepare') },
              { key: 'ready', label: t('store.tabs.ready') || (language === 'ar' ? 'جاهز' : 'Ready') },
              { key: 'inDelivery', label: t('store.tabs.inDelivery') || (language === 'ar' ? 'قيد التوصيل' : 'In delivery') },
              { key: 'completed', label: t('store.tabs.completed') || (language === 'ar' ? 'مكتمل' : 'Completed') },
              { key: 'cancelled', label: t('store.tabs.cancelled') || (language === 'ar' ? 'ملغي' : 'Cancelled') },
            ].map((f) => (
              <button key={f.key} onClick={() => setActiveFilter(f.key as any)} className={chipClass(activeFilter === (f.key as any))}>
                {f.label}
              </button>
            ))}
          </div>
          {!socketConnected ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-extrabold text-amber-900">
              {language === 'ar' ? 'غير متصل — سيتم التحديث عند عودة الاتصال' : 'Offline — updates will resume when back online'}
            </div>
          ) : null}
        </div>
      }
    >
        {/* Orders List */}
        <div className="space-y-3">
          {filteredOrders.length === 0 ? (
            <EmptyState title={t('store.empty.title') || (language === 'ar' ? 'لا توجد طلبات' : 'No orders')} subtitle={t('store.empty.subtitle') || ''} />
          ) : (
            filteredOrders.map((order) => (
              <div key={order.id}>
                <OrderCard
                  orderId={order.id}
                  status={order.status}
                  total={order.total_amount}
                  currency={language === 'en' ? 'SAR' : 'ريال'}
                  createdAt={order.created_at}
                  customerName={order.customer_name}
                  customerPhone={order.customer_phone || null}
                  subtitle={order.delivery_address ? order.delivery_address : null}
                  meta={
                    Array.isArray(order.items)
                      ? `${t('store.details.items') || (language === 'ar' ? 'المنتجات' : 'Items')}: ${order.items.reduce((s: number, it: any) => s + Number(it.quantity ?? it.qty ?? 0), 0) || order.items.length}`
                      : null
                  }
                  slaBlock={
                    slaTimerEnabled && !['DELIVERED', 'CANCELLED'].includes(normalizeOrderStatus(order.status) || '')
                      ? (
                          <SlaTimerBadge
                            slaStartAt={getOrderSlaStartAt(order)}
                            hideWhenNoStart
                            lang={language === 'ar' ? 'ar' : 'en'}
                            limitMinutes={slaLimitMinutes}
                          />
                        )
                      : undefined
                  }
                  actions={
                    <div className="flex flex-col gap-3">
                      <OrderActions
                        status={order.status}
                        disabled={updating === order.id}
                        allowedTargets={['ACCEPTED', 'PREPARING', 'READY', 'CANCELLED']}
                        layout="stack"
                        onSetStatus={(next) => handleSetStatus(order, next)}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                          className="flex-1 px-3 py-2 rounded-xl font-extrabold bg-white border border-gray-200 text-gray-800 hover:bg-gray-50"
                        >
                          {expandedOrderId === order.id
                            ? (t('store.actions.hideDetails') || (language === 'ar' ? 'إخفاء التفاصيل' : 'Hide details'))
                            : (t('store.actions.viewDetails') || (language === 'ar' ? 'عرض التفاصيل' : 'View details'))}
                        </button>
                        {order.delivery_address ? (
                          <button
                            type="button"
                            onClick={async () => {
                              const ok = await copyToClipboard(String(order.delivery_address || ''))
                              if (ok) showToast(t('store.actions.copied') || (language === 'ar' ? 'تم النسخ' : 'Copied'), 'success')
                            }}
                            className="px-3 py-2 rounded-xl font-extrabold bg-white border border-gray-200 text-gray-800 hover:bg-gray-50"
                          >
                            {t('store.actions.copyAddress') || (language === 'ar' ? 'نسخ العنوان' : 'Copy address')}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  }
                />

                <AnimatePresence>
                  {expandedOrderId === order.id && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/35 z-[250]"
                        onClick={() => setExpandedOrderId(null)}
                      />
                      <motion.div
                        initial={{ y: 24, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 24, opacity: 0 }}
                        className="fixed inset-x-0 bottom-0 z-[260] p-3"
                        role="dialog"
                        aria-modal="true"
                      >
                        <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden">
                          <div className="p-4 flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-extrabold text-gray-900">{t('store.details.title') || (language === 'ar' ? 'تفاصيل الطلب' : 'Order details')} #{order.id}</div>
                              {order.delivery_address ? (
                                <div className="mt-1 text-sm font-bold text-gray-700 line-clamp-2">{order.delivery_address}</div>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              onClick={() => setExpandedOrderId(null)}
                              className="px-3 py-2 rounded-xl font-extrabold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                            >
                              {t('close') || (language === 'ar' ? 'إغلاق' : 'Close')}
                            </button>
                          </div>

                          <div className="px-4 pb-4 space-y-3">
                            {order.delivery_notes ? (
                              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                                <div className="text-xs font-extrabold text-gray-900">{t('store.details.notes') || (language === 'ar' ? 'ملاحظات' : 'Notes')}</div>
                                <div className="mt-1 text-sm font-bold text-gray-700">{order.delivery_notes}</div>
                              </div>
                            ) : null}

                            {Array.isArray(order.items) && order.items.length > 0 ? (
                              <div className="rounded-2xl border border-gray-100 bg-white p-3">
                                <div className="text-xs font-extrabold text-gray-900 mb-2">{t('store.details.items') || (language === 'ar' ? 'المنتجات' : 'Items')}</div>
                                <div className="space-y-2">
                                  {order.items.map((it: any, idx: number) => {
                              const pid = Number(it?.product_id ?? it?.productId)
                              const prod = Number.isFinite(pid) ? productById.get(pid) : null
                              const stockInfo = prod ? isLowStockOrUnavailable(prod, 3) : null
                              const needsHelp = !!stockInfo && (stockInfo.out || stockInfo.low)

                              const suggestions =
                                needsHelp && prod
                                  ? suggestSmartSubstitutions({
                                      targetProduct: prod,
                                      allProducts: products as any[],
                                      limit: 3,
                                    })
                                  : []

                              const name =
                                language === 'en'
                                  ? it.product_name_en || it.product_name || it.name || '—'
                                  : it.product_name_ar || it.product_name || it.name || '—'

                              return (
                                <div key={idx} className="py-2 border-b border-gray-50 last:border-b-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="text-sm font-extrabold text-gray-900 truncate">{name}</div>
                                      <div className="mt-1 text-xs font-bold text-gray-600">
                                        {(language === 'ar' ? 'الكمية' : 'Qty')}: {it.quantity ?? it.qty ?? 1}
                                      </div>
                                    </div>
                                  </div>

                                  {needsHelp ? (
                                    <div className="mt-2 rounded-xl border border-amber-100 bg-amber-50 p-3">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="font-extrabold text-amber-900">
                                          {t('store.subs.title') || (language === 'ar' ? 'بدائل مقترحة' : 'Suggested substitutions')}
                                        </div>
                                        <div className="text-[11px] font-bold text-amber-800/80">
                                          {t('store.subs.note') || (language === 'ar' ? 'اقتراح — لا يتم التغيير تلقائيًا' : 'Suggestion — no automatic changes')}
                                        </div>
                                      </div>

                                      <div className="mt-2 text-[11px] font-bold text-amber-800/90">
                                        {stockInfo?.out
                                          ? (t('store.subs.out') || (language === 'ar' ? 'غير متوفر' : 'Out of stock'))
                                          : `${t('store.subs.low') || (language === 'ar' ? 'مخزون منخفض' : 'Low stock')} (${stockInfo?.qty ?? 0})`}
                                      </div>

                                      {suggestions.length ? (
                                        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                                          {suggestions.map((sp: any) => {
                                            const spName =
                                              language === 'en'
                                                ? sp?.name_en || sp?.name || '—'
                                                : sp?.name_ar || sp?.name || '—'
                                            const spPrice = Number(sp?.price_per_unit || sp?.price || 0)
                                            const spStock = (sp as any)?.available_quantity ?? (sp as any)?.stock_quantity ?? (sp as any)?.quantity
                                            return (
                                              <div key={sp.id} className="rounded-xl border border-gray-100 bg-white p-3">
                                                <div className="text-xs font-extrabold text-gray-900 line-clamp-2">{spName}</div>
                                                <div className="mt-1 flex items-center justify-between gap-2">
                                                  <div className="text-xs font-bold text-emerald-700">
                                                    {Number.isFinite(spPrice) ? spPrice.toFixed(2) : '—'} {language === 'en' ? 'SAR' : 'ريال'}
                                                  </div>
                                                  {spStock != null ? (
                                                    <div className="text-[11px] font-bold text-gray-500">{language === 'en' ? 'stock:' : 'المخزون:'} {spStock}</div>
                                                  ) : null}
                                                </div>
                                                <a
                                                  href={`/product/${sp.id}`}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="mt-2 inline-flex items-center justify-center w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-extrabold text-gray-900 hover:bg-gray-50"
                                                >
                                                  {language === 'en' ? 'View product' : 'عرض المنتج'}
                                                </a>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      ) : (
                                        <div className="mt-2 text-xs text-amber-900/80">
                                          {t('store.subs.none') || (language === 'ar' ? 'لم يتم العثور على بدائل قريبة.' : 'No close alternatives found.')}
                                        </div>
                                      )}
                                    </div>
                                  ) : null}
                                </div>
                              )
                                  })}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ))
          )}
        </div>
    </AppShell>
  )
}

