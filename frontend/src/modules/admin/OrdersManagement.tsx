import { useState, useEffect, useRef } from 'react'
import { orderAPI } from '../../utils/api'
import api from '../../utils/api'
import type { Socket } from 'socket.io-client'
import { normalizeOrderStatus } from '../../shared/orderStatus'
import { getSocket } from '../../shared/socketClient'
import { debounce } from '../../shared/ui/tokens'
import { getOrderSlaStartAt } from '../../shared/order-ui/orderUiUtils'
import { computeSlaCycle } from '../../shared/order-ui/orderUiUtils'
import { usePublicSettings } from '../../hooks/usePublicSettings'
import type { OrderListItem } from '../../shared/types/order'
import { adminTokens, cx } from '../../shared/admin/ui/tokens'
import { OrderRow, type OrderRowOrder } from '../../shared/admin/ui/components/OrderRow'
import { useLanguage } from '../../context/LanguageContext'

type Order = OrderListItem & {
  user_id?: number
  delivery_address?: string | null
  delivery_latitude?: number | null
  delivery_longitude?: number | null
  driver_id?: number | null
  driver_name?: string | null
  customer_name?: string | null
  customer_phone?: string | null
  store_name?: string | null
  store_id?: number | null
  paid_at?: string | null
  payment_received_at?: string | null
  created_at: string
}

interface Driver {
  id: number
  name: string
  is_active: boolean
}

export default function OrdersManagement() {
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const [orders, setOrders] = useState<Order[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [filterSla, setFilterSla] = useState<'all' | 'ok' | 'risk' | 'late'>('all')
  const [filterUnassigned, setFilterUnassigned] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const { settings: publicSettings } = usePublicSettings()
  const slaLimitMinutes = publicSettings?.features?.sla_timer_limit_minutes ?? 30

  // Socket.IO Connection
  useEffect(() => {
    const socket = getSocket()

    const debouncedRefresh = debounce(() => loadOrders(), 700)
    const onConnect = () => {
      console.log('✅ Socket.IO connected to Orders Management')
      socket.emit('join-admin-dashboard')
    }

    // تحديث لحظي عند تغيير حالة الطلب
    const onOrderStatusChanged = (data: { order_id: number; status: string; driver_id?: number; driver_name?: string }) => {
      console.log('🔄 Order status changed:', data)
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === data.order_id
            ? { ...order, status: data.status, driver_id: data.driver_id || order.driver_id, driver_name: data.driver_name || order.driver_name }
            : order
        )
      )
    }

    const onNewOrder = (data: { order: Order }) => {
      const newOrder = data.order
      if (normalizeOrderStatus(newOrder.status) === 'READY' && !newOrder.driver_id) {
        handleAutoDispatch(newOrder.id)
      }
      setOrders(prevOrders => [newOrder, ...prevOrders])
    }

    // Unified order updated event (new)
    const onOrderUpdated = (p: any) => {
      // Minimal + safe: refetch to avoid payload shape differences
      console.log('🟦 order.updated:', p)
      debouncedRefresh()
    }

    // تحديث حالة Rider
    const onRiderStatusUpdated = (data: { rider_id: number; status: string }) => {
      console.log('🚴 Rider status updated:', data)
      loadDrivers()
    }

    socketRef.current = socket

    if (socket.connected) onConnect()
    socket.on('connect', onConnect)

    // Old events (compat)
    socket.on('order_status_changed', onOrderStatusChanged)
    socket.on('new_order', onNewOrder)
    socket.on('rider-status-updated', onRiderStatusUpdated)

    // New unified event
    socket.on('order.updated', onOrderUpdated)

    return () => {
      socket.off('connect', onConnect)
      socket.off('order_status_changed', onOrderStatusChanged)
      socket.off('new_order', onNewOrder)
      socket.off('rider-status-updated', onRiderStatusUpdated)
      socket.off('order.updated', onOrderUpdated)
      debouncedRefresh.cancel()
    }
  }, [])

  // Auto-Dispatch: تخصيص تلقائي للطلب
  const handleAutoDispatch = async (orderId: number) => {
    try {
      console.log(`🤖 Auto-Dispatch: تخصيص تلقائي للطلب #${orderId}`)
      const res = await api.post(`/api/orders/${orderId}/auto-assign`)
      if (res.data.success) {
        console.log(`✅ تم تخصيص Rider تلقائياً: ${res.data.assignment.rider_name}`)
        // تحديث الطلب في القائمة
        setOrders(prevOrders =>
          prevOrders.map(order =>
            order.id === orderId
              ? { ...order, driver_id: res.data.assignment.driver_id, driver_name: res.data.assignment.rider_name, status: 'ASSIGNED' }
              : order
          )
        )
      }
    } catch (err) {
      console.error('Auto-Dispatch error:', err)
    }
  }

  useEffect(() => {
    loadOrders()
    loadDrivers()
  }, [])

  const loadDrivers = async () => {
    try {
      const res = await api.get('/api/admin/riders')
      const allDrivers = res.data.riders || []
      setDrivers(allDrivers.filter((d: Driver) => d.is_active))
    } catch (err) {
      console.error('Error loading drivers:', err)
    }
  }

  const loadOrders = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/admin/orders')
      const ordersData = res.data.orders || res.data || []
      setOrders(ordersData)
    } catch (err: any) {
      const data = await orderAPI.getAll()
      setOrders(data.orders || data || [])
    } finally {
      setLoading(false)
    }
  }

  const cycleLimitSec = slaLimitMinutes * 60
  const getSlaVariant = (order: Order): 'ok' | 'risk' | 'late' | null => {
    const start = getOrderSlaStartAt(order)
    if (!start || ['DELIVERED', 'CANCELLED'].includes(normalizeOrderStatus(order.status) || '')) return null
    const { cycleNumber, cycleElapsedSec } = computeSlaCycle(start, Date.now(), cycleLimitSec)
    if (cycleNumber > 1 || cycleElapsedSec >= cycleLimitSec) return 'late'
    const atRiskSec = Math.min(20 * 60, Math.floor(cycleLimitSec * (20 / 30)))
    if (cycleElapsedSec >= atRiskSec) return 'risk'
    return 'ok'
  }

  if (loading) {
    return (
      <div className={cx('flex justify-center items-center min-h-[400px]', adminTokens.color.page)} dir={isAr ? 'rtl' : 'ltr'}>
        <div className={cx('text-lg font-bold', adminTokens.color.muted)}>{isAr ? 'جاري التحميل...' : 'Loading...'}</div>
      </div>
    )
  }

  const q = searchQuery.trim().toLowerCase()
  const filteredOrders = orders.filter((order) => {
    const statusOk = selectedStatus === 'all' ? true : normalizeOrderStatus(order.status) === selectedStatus
    if (!statusOk) return false
    if (filterUnassigned && (order.driver_id || order.driver_name)) return false
    const slaV = getSlaVariant(order)
    if (filterSla !== 'all' && slaV !== filterSla) return false
    if (!q) return true
    const idStr = String(order.id)
    const phone = String(order.customer_phone || '')
    return idStr.includes(q) || phone.toLowerCase().includes(q)
  })

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const slaA = getSlaVariant(a)
    const slaB = getSlaVariant(b)
    const lateA = slaA === 'late' ? 1 : 0
    const lateB = slaB === 'late' ? 1 : 0
    if (lateA !== lateB) return lateB - lateA
    const noDriverA = !a.driver_id && !a.driver_name ? 1 : 0
    const noDriverB = !b.driver_id && !b.driver_name ? 1 : 0
    if (noDriverA !== noDriverB) return noDriverB - noDriverA
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return (
    <div className={cx('w-full max-w-full', adminTokens.color.page, adminTokens.text.body)} dir={isAr ? 'rtl' : 'ltr'}>
      <div className="space-y-4 pb-6">
        <div>
          <h1 className={cx(adminTokens.text.h1, adminTokens.color.text)}>{isAr ? 'الطلبات' : 'Orders'}</h1>
          <p className={cx('mt-1 text-sm', adminTokens.color.muted)}>{isAr ? 'قائمة الطلبات مع SLA وإجراء واحد لكل صف' : 'Order list with SLA and one action per row'}</p>
        </div>

        <div className={cx('rounded-2xl border border-gray-100 bg-white shadow-sm p-4', adminTokens.borders.soft)}>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className={cx('px-3 py-2 border rounded-xl bg-white text-sm font-bold', adminTokens.borders.strong, adminTokens.focus.ring)}
            >
              <option value="all">{isAr ? 'جميع الحالات' : 'All statuses'}</option>
              <option value="CREATED">{isAr ? 'تم إنشاء الطلب' : 'Created'}</option>
              <option value="ACCEPTED">{isAr ? 'تم قبول الطلب' : 'Accepted'}</option>
              <option value="PREPARING">{isAr ? 'جاري التجهيز' : 'Preparing'}</option>
              <option value="READY">{isAr ? 'جاهز للاستلام' : 'Ready'}</option>
              <option value="ASSIGNED">{isAr ? 'تم تعيين مندوب' : 'Assigned'}</option>
              <option value="PICKED_UP">{isAr ? 'تم الاستلام' : 'Picked up'}</option>
              <option value="DELIVERED">{isAr ? 'تم التوصيل' : 'Delivered'}</option>
              <option value="CANCELLED">{isAr ? 'ملغي' : 'Cancelled'}</option>
            </select>
            <select
              value={filterSla}
              onChange={(e) => setFilterSla(e.target.value as 'all' | 'ok' | 'risk' | 'late')}
              className={cx('px-3 py-2 border rounded-xl bg-white text-sm font-bold', adminTokens.borders.strong, adminTokens.focus.ring)}
            >
              <option value="all">{isAr ? 'SLA: الكل' : 'SLA: All'}</option>
              <option value="ok">{isAr ? 'SLA: ضمن الوقت' : 'SLA: OK'}</option>
              <option value="risk">{isAr ? 'SLA: خطر' : 'SLA: Risk'}</option>
              <option value="late">{isAr ? 'SLA: متأخر' : 'SLA: Late'}</option>
            </select>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filterUnassigned}
                onChange={(e) => setFilterUnassigned(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className={cx('text-sm font-bold', adminTokens.color.text)}>{isAr ? 'بدون مندوب فقط' : 'Unassigned only'}</span>
            </label>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'بحث: رقم الطلب أو هاتف' : 'Search: order # or phone'}
              className={cx('flex-1 min-w-[200px] px-3 py-2 border rounded-xl bg-white text-sm font-bold', adminTokens.borders.strong, adminTokens.focus.ring)}
            />
          </div>
        </div>

        <div className={cx('rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden', adminTokens.borders.soft)}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className={cx('admin-table-head-row border-b border-gray-200 bg-gray-50/80', adminTokens.text.sectionTitle, adminTokens.color.text)}>
                  <th className="px-4 py-3 text-right">{isAr ? 'رقم الطلب' : 'Order #'}</th>
                  <th className="px-4 py-3 text-right">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-right">{isAr ? 'SLA' : 'SLA'}</th>
                  <th className="px-4 py-3 text-right">{isAr ? 'المتجر' : 'Store'}</th>
                  <th className="px-4 py-3 text-right">{isAr ? 'المندوب' : 'Driver'}</th>
                  <th className="px-4 py-3 text-right">{isAr ? 'إجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {sortedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={cx('px-4 py-12 text-center', adminTokens.color.muted)}>
                      {isAr ? 'لا توجد طلبات' : 'No orders'}
                    </td>
                  </tr>
                ) : (
                  sortedOrders.map((order) => (
                    <OrderRow
                      key={order.id}
                      order={order as OrderRowOrder}
                      slaLimitMinutes={slaLimitMinutes}
                      lang={isAr ? 'ar' : 'en'}
                      storeLabel={(order as Order).store_name || (order.store_id ? (isAr ? `متجر #${order.store_id}` : `Store #${order.store_id}`) : '—')}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
