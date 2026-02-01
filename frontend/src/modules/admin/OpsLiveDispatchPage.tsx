import { useState, useEffect, useMemo } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import api from '../../utils/api'
import { Zap, Eye, Send, UserPlus, Filter } from 'lucide-react'
import { StatusBadge } from '../../shared/order-ui/StatusBadge'
import { getOrderSlaStartAt, formatTimeAgo } from '../../shared/order-ui/orderUiUtils'
import { InternalNotesPanel } from '../../shared/notes/InternalNotesPanel'
import { OrderTimeline, type CanonicalTimelineEvent } from '../../shared/order-ui/OrderTimeline'
import { SlaTimerBadge } from '../../shared/order-ui/SlaTimerBadge'
import { usePublicSettings } from '../../hooks/usePublicSettings'

interface OrderRow {
  id: number
  status: string
  customer_name: string
  total_amount: number
  delivery_address: string | null
  driver_id: number | null
  driver_name: string | null
  store_id: number | null
  created_at: string
  payment_received_at?: string | null
  paid_at?: string | null
}

interface OrderDetail {
  order: OrderRow & { payment_received_at?: string | null }
  timeline: CanonicalTimelineEvent[]
}

export default function OpsLiveDispatchPage() {
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [dispatchMode, setDispatchMode] = useState<'AUTO_ASSIGN' | 'OFFER_ACCEPT'>('AUTO_ASSIGN')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterStore, setFilterStore] = useState<string>('')
  const [filterDriver, setFilterDriver] = useState<string>('')
  const [filterAge, setFilterAge] = useState<string>('') // '' | '24h' | '7d'
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null)
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<OrderDetail | null>(null)
  const [offerModal, setOfferModal] = useState<{ orderId: number } | null>(null)
  const [resendLoading, setResendLoading] = useState(false)
  const [drivers, setDrivers] = useState<{ id: number; name: string }[]>([])
  const [selectedDriverId, setSelectedDriverId] = useState<number | ''>('')
  const [opsActionSending, setOpsActionSending] = useState<number | null>(null)
  const { settings: publicSettings } = usePublicSettings()
  const slaTimerEnabled = publicSettings?.features?.sla_timer_enabled !== false
  const slaLimitMinutes = publicSettings?.features?.sla_timer_limit_minutes ?? 30

  useEffect(() => {
    loadOrders()
    loadSettings()
    const t = setInterval(loadOrders, 15000)
    return () => clearInterval(t)
  }, [])

  const loadSettings = async () => {
    try {
      const res = await api.get('/api/settings')
      const dm = (res.data?.dispatchMode || 'AUTO_ASSIGN') as string
      setDispatchMode(dm === 'OFFER_ACCEPT' ? 'OFFER_ACCEPT' : 'AUTO_ASSIGN')
    } catch {
      setDispatchMode('AUTO_ASSIGN')
    }
  }

  const loadOrders = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/admin/orders')
      setOrders(res.data?.orders || [])
    } catch (err) {
      console.error('Ops live dispatch load error:', err)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!offerModal) return
    api.get('/api/admin/drivers').then((res) => {
      const list = (res.data?.drivers || []).map((d: { id: number; name?: string }) => ({ id: d.id, name: d.name || `#${d.id}` }))
      setDrivers(list)
      setSelectedDriverId(list[0]?.id ?? '')
    }).catch(() => setDrivers([]))
  }, [offerModal])

  useEffect(() => {
    if (!selectedOrder) {
      setSelectedOrderDetail(null)
      return
    }
    api.get(`/api/admin/orders/${selectedOrder.id}`).then((res) => {
      const data = res.data
      setSelectedOrderDetail({
        order: data.order || selectedOrder,
        timeline: Array.isArray(data.timeline) ? data.timeline : [],
      })
    }).catch(() => setSelectedOrderDetail({ order: selectedOrder, timeline: [] }))
  }, [selectedOrder?.id])

  const filtered = useMemo(() => {
    let list = [...orders]
    if (filterStatus) {
      const s = filterStatus.toLowerCase()
      list = list.filter((o) => String(o.status || '').toLowerCase().includes(s))
    }
    if (filterStore) {
      const id = parseInt(filterStore, 10)
      if (!isNaN(id)) list = list.filter((o) => o.store_id === id)
    }
    if (filterDriver) {
      const q = filterDriver.toLowerCase()
      list = list.filter((o) => (o.driver_name || '').toLowerCase().includes(q))
    }
    if (filterAge) {
      const now = Date.now()
      const cut = filterAge === '24h' ? now - 24 * 60 * 60 * 1000 : now - 7 * 24 * 60 * 60 * 1000
      list = list.filter((o) => new Date(o.created_at).getTime() >= cut)
    }
    return list
  }, [orders, filterStatus, filterStore, filterDriver, filterAge])

  const statusOptions = useMemo(() => {
    const set = new Set(orders.map((o) => o.status).filter(Boolean))
    return Array.from(set).sort()
  }, [orders])

  const storeOptions = useMemo(() => {
    const set = new Set(orders.map((o) => o.store_id).filter((id): id is number => id != null))
    return Array.from(set).sort((a, b) => a - b)
  }, [orders])

  const logOpsAction = async (action: string, entityType: string, entityId: number, details?: object) => {
    setOpsActionSending(entityId)
    try {
      await api.post('/api/admin/ops-action', { action, entityType, entityId, details })
    } catch {
      // non-blocking
    } finally {
      setOpsActionSending(null)
    }
  }

  const handleResendOffer = async (orderId: number, driverIds: number[]) => {
    if (!driverIds.length) return
    setResendLoading(true)
    try {
      await api.post(`/api/admin/orders/${orderId}/offer`, { driverIds })
      setOfferModal(null)
      loadOrders()
    } catch (err: any) {
      alert(err.response?.data?.message || (isAr ? 'فشل إرسال العرض' : 'Failed to send offer'))
    } finally {
      setResendLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[300px]">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Zap className="w-7 h-7 text-emerald-600" />
          {isAr ? 'لوحة الإرسال المباشر' : 'Live Dispatch Console'}
        </h1>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Filter className="w-5 h-5 text-gray-500" />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-xl text-sm"
        >
          <option value="">{isAr ? 'كل الحالات' : 'All statuses'}</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={filterStore}
          onChange={(e) => setFilterStore(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-xl text-sm"
        >
          <option value="">{isAr ? 'كل المتاجر' : 'All stores'}</option>
          {storeOptions.map((id) => (
            <option key={id} value={id}>{isAr ? 'متجر' : 'Store'} #{id}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder={isAr ? 'بحث بالسائق...' : 'Filter by driver...'}
          value={filterDriver}
          onChange={(e) => setFilterDriver(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-xl text-sm w-40"
        />
        <select
          value={filterAge}
          onChange={(e) => setFilterAge(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-xl text-sm"
        >
          <option value="">{isAr ? 'كل الأعمار' : 'All time'}</option>
          <option value="24h">{isAr ? 'آخر 24 ساعة' : 'Last 24h'}</option>
          <option value="7d">{isAr ? 'آخر 7 أيام' : 'Last 7 days'}</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-bold text-gray-700">{isAr ? 'الطلب' : 'Order'}</th>
                <th className="text-left px-4 py-3 font-bold text-gray-700">{isAr ? 'الحالة' : 'Status'}</th>
                <th className="text-left px-4 py-3 font-bold text-gray-700">{isAr ? 'المتجر' : 'Store'}</th>
                <th className="text-left px-4 py-3 font-bold text-gray-700">{isAr ? 'السائق' : 'Driver'}</th>
                <th className="text-left px-4 py-3 font-bold text-gray-700">{isAr ? 'العمر' : 'Age'}</th>
                <th className="text-left px-4 py-3 font-bold text-gray-700">{isAr ? 'المبلغ' : 'Total'}</th>
                {slaTimerEnabled && <th className="text-left px-4 py-3 font-bold text-gray-700">{isAr ? 'SLA' : 'SLA'}</th>}
                <th className="text-left px-4 py-3 font-bold text-gray-700">{isAr ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={slaTimerEnabled ? 8 : 7} className="px-4 py-8 text-center text-gray-500">
                    {isAr ? 'لا توجد طلبات تطابق الفلتر.' : 'No orders match the filter.'}
                  </td>
                </tr>
              ) : (
                filtered.map((o) => (
                  <tr key={o.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">#{o.id}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-700">{o.store_id != null ? `#${o.store_id}` : '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{o.driver_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{formatTimeAgo(o.created_at, isAr ? 'ar' : 'en')}</td>
                    <td className="px-4 py-3 font-medium text-gray-900" dir="ltr">{o.total_amount} SAR</td>
                    {slaTimerEnabled && (
                      <td className="px-4 py-3">
                        <SlaTimerBadge
                          slaStartAt={getOrderSlaStartAt(o)}
                          limitMinutes={slaLimitMinutes}
                          hideWhenNoStart
                          lang={isAr ? 'ar' : 'en'}
                          isTerminal={['DELIVERED', 'CANCELLED'].includes(String(o.status).toUpperCase())}
                        />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(o)}
                          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {isAr ? 'عرض' : 'View'}
                        </button>
                        {dispatchMode === 'OFFER_ACCEPT' && !o.driver_id && (
                          <button
                            type="button"
                            onClick={() => setOfferModal({ orderId: o.id })}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs font-bold"
                          >
                            <Send className="w-3.5 h-3.5" />
                            {isAr ? 'إعادة عرض' : 'Re-send offer'}
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={opsActionSending === o.id}
                          title={isAr ? 'تسجيل طلب إعادة تعيين' : 'Log reassign request'}
                          onClick={() => logOpsAction('OPS_SUGGEST_REASSIGN', 'order', o.id)}
                          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold disabled:opacity-50"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          {opsActionSending === o.id ? (isAr ? 'جاري...' : 'Logging...') : (isAr ? 'اقتراح إعادة تعيين' : 'Suggest reassign')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View drawer (simple slide panel) */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[200] flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedOrder(null)} aria-hidden />
          <div className="relative w-full max-w-md bg-white shadow-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">#{selectedOrder.id}</h3>
              <button type="button" onClick={() => setSelectedOrder(null)} className="text-gray-500 hover:text-gray-900">×</button>
            </div>
            <div className="p-4 space-y-4">
              <p><span className="text-gray-500">{isAr ? 'الحالة' : 'Status'}</span> <StatusBadge status={selectedOrder.status} /></p>
              {slaTimerEnabled && selectedOrderDetail?.order && (
                <p>
                  <span className="text-gray-500">{isAr ? 'SLA' : 'SLA'}</span>{' '}
                  <SlaTimerBadge
                    slaStartAt={getOrderSlaStartAt(selectedOrderDetail.order)}
                    limitMinutes={slaLimitMinutes}
                    lang={isAr ? 'ar' : 'en'}
                    isTerminal={['DELIVERED', 'CANCELLED'].includes(String(selectedOrder.status).toUpperCase())}
                  />
                </p>
              )}
              <p><span className="text-gray-500">{isAr ? 'العنوان' : 'Address'}</span> {selectedOrder.delivery_address || '—'}</p>
              <p><span className="text-gray-500">{isAr ? 'المبلغ' : 'Total'}</span> <span dir="ltr">{selectedOrder.total_amount} SAR</span></p>
              {selectedOrderDetail?.timeline && selectedOrderDetail.timeline.length > 0 && (
                <div className="border-t border-gray-200 pt-3">
                  <OrderTimeline canonicalEvents={selectedOrderDetail.timeline} lang={isAr ? 'ar' : 'en'} showDurations />
                </div>
              )}
              <div className="border-t border-gray-200 pt-3">
                <InternalNotesPanel
                  entityType="order"
                  entityId={selectedOrder.id}
                  canAdd={true}
                  lang={isAr ? 'ar' : 'en'}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Re-send offer modal */}
      {offerModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOfferModal(null)} aria-hidden />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h4 className="font-bold text-gray-900 mb-3">{isAr ? 'إعادة إرسال عرض' : 'Re-send offer'}</h4>
            <p className="text-sm text-gray-600 mb-3">{isAr ? 'اختر سائقاً لإرسال العرض له.' : 'Select a driver to send the offer to.'}</p>
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm mb-4"
            >
              <option value="">—</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOfferModal(null)} className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={resendLoading || selectedDriverId === ''}
                onClick={() => selectedDriverId !== '' && handleResendOffer(offerModal.orderId, [selectedDriverId])}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {resendLoading ? (isAr ? 'جاري...' : 'Sending...') : (isAr ? 'إرسال' : 'Send')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
