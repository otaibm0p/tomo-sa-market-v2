import { useState, useEffect } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import api from '../../utils/api'
import {
  Package,
  MapPin,
  User,
  Truck,
  Clock,
  Eye,
  Send,
  RefreshCw,
  X,
  ChevronDown,
} from 'lucide-react'
import { StatusBadge } from '../../shared/order-ui/StatusBadge'
import { formatTimeAgo } from '../../shared/order-ui/orderUiUtils'

interface OrderRow {
  id: number
  status: string
  total_amount: number
  delivery_address?: string | null
  customer_name?: string | null
  driver_id: number | null
  driver_name: string | null
  store_id?: number | null
  created_at: string
}

interface SettingsRes {
  dispatchMode?: 'AUTO_ASSIGN' | 'OFFER_ACCEPT'
}

export default function OpsLiveDispatch() {
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [dispatchMode, setDispatchMode] = useState<'AUTO_ASSIGN' | 'OFFER_ACCEPT'>('AUTO_ASSIGN')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterDriver, setFilterDriver] = useState<string>('')
  const [drawerOrderId, setDrawerOrderId] = useState<number | null>(null)
  const [drawerOrder, setDrawerOrder] = useState<any>(null)
  const [drawerItems, setDrawerItems] = useState<any[]>([])
  const [resendOfferOrderId, setResendOfferOrderId] = useState<number | null>(null)
  const [resendLoading, setResendLoading] = useState(false)

  const loadOrders = async () => {
    try {
      setLoading(true)
      const [ordersRes, settingsRes] = await Promise.all([
        api.get('/api/admin/orders'),
        api.get('/api/settings').catch(() => ({ data: {} })),
      ])
      const list = ordersRes.data?.orders || []
      setOrders(Array.isArray(list) ? list : [])
      const dm = (settingsRes?.data?.dispatchMode || 'AUTO_ASSIGN') as string
      setDispatchMode(dm === 'OFFER_ACCEPT' ? 'OFFER_ACCEPT' : 'AUTO_ASSIGN')
    } catch (err) {
      console.error(err)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
    const interval = setInterval(loadOrders, 15000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!drawerOrderId) {
      setDrawerOrder(null)
      setDrawerItems([])
      return
    }
    api
      .get(`/api/admin/orders/${drawerOrderId}`)
      .then((r) => setDrawerOrder(r.data?.order || null))
      .catch(() => setDrawerOrder(null))
    api
      .get(`/api/admin/orders/${drawerOrderId}/items`)
      .then((r) => setDrawerItems(r.data?.items || []))
      .catch(() => setDrawerItems([]))
  }, [drawerOrderId])

  const filtered = orders.filter((o) => {
    if (filterStatus && o.status !== filterStatus) return false
    if (filterDriver && (!o.driver_name || !String(o.driver_name).toLowerCase().includes(filterDriver.toLowerCase()))) return false
    return true
  })

  const statuses = Array.from(new Set(orders.map((o) => o.status).filter(Boolean))) as string[]
  const orderAge = (created_at: string) => {
    const ms = Date.now() - new Date(created_at).getTime()
    const mins = Math.floor(ms / 60000)
    if (mins < 60) return `${mins}m`
    const h = Math.floor(mins / 60)
    return `${h}h`
  }

  const handleResendOffer = async (orderId: number) => {
    setResendLoading(true)
    try {
      const driversRes = await api.get('/api/admin/drivers').catch(() => ({ data: { drivers: [] } }))
      const drivers = driversRes.data?.drivers || []
      const activeDriverIds = drivers.filter((d: any) => d.is_active && d.is_approved).map((d: any) => d.id).slice(0, 5)
      if (activeDriverIds.length === 0) {
        alert(isAr ? 'لا يوجد مندوبون متاحون' : 'No available riders')
        return
      }
      await api.post(`/api/admin/orders/${orderId}/offer`, { driverIds: activeDriverIds, expiresInSeconds: 60 })
      setResendOfferOrderId(null)
      loadOrders()
    } catch (err: any) {
      alert(err.response?.data?.message || (isAr ? 'فشل إعادة الإرسال' : 'Re-send failed'))
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isAr ? 'وحدة التوزيع المباشر' : 'Ops Live Dispatch'}
        </h1>
        <button
          type="button"
          onClick={() => loadOrders()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          {isAr ? 'تحديث' : 'Refresh'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-xl text-sm"
        >
          <option value="">{isAr ? 'كل الحالة' : 'All status'}</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder={isAr ? 'بحث بالمندوب...' : 'Filter by driver...'}
          value={filterDriver}
          onChange={(e) => setFilterDriver(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-xl text-sm w-40"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8 text-center text-gray-600">
          {isAr ? 'لا توجد طلبات تطابق الفلتر' : 'No orders match the filter'}
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">{isAr ? 'الطلب' : 'Order'}</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">{isAr ? 'العميل' : 'Customer'}</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">{isAr ? 'المندوب' : 'Driver'}</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">{isAr ? 'العمر' : 'Age'}</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">{isAr ? 'المبلغ' : 'Total'}</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">{isAr ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">#{o.id}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={o.status} lang={isAr ? 'ar' : 'en'} />
                    </td>
                    <td className="px-4 py-3 text-gray-700">{o.customer_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{o.driver_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{orderAge(o.created_at)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{Number(o.total_amount).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => setDrawerOrderId(o.id)}
                          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-700"
                        >
                          <Eye className="w-4 h-4" />
                          {isAr ? 'عرض' : 'View'}
                        </button>
                        {dispatchMode === 'OFFER_ACCEPT' && !o.driver_id && (
                          <button
                            type="button"
                            onClick={() => setResendOfferOrderId(o.id)}
                            disabled={resendLoading}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                          >
                            <Send className="w-4 h-4" />
                            {isAr ? 'إعادة عرض' : 'Re-send offer'}
                          </button>
                        )}
                        <span className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-gray-100 bg-gray-50 text-gray-500 text-xs" title={isAr ? 'قريباً' : 'Coming soon'}>
                          {isAr ? 'اقتراح إعادة تعيين' : 'Suggest reassign'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View drawer */}
      {drawerOrderId != null && (
        <div
          className="fixed inset-0 z-[200] flex flex-col justify-end"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOrderId(null)}
            aria-label="Close"
          />
          <div className="relative max-h-[85vh] overflow-y-auto bg-white rounded-t-2xl shadow-xl">
            <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b bg-white">
              <h2 className="text-lg font-bold">#{drawerOrderId} {isAr ? 'تفاصيل الطلب' : 'Order details'}</h2>
              <button type="button" onClick={() => setDrawerOrderId(null)} className="p-2 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {drawerOrder && (
                <>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={drawerOrder.status} lang={isAr ? 'ar' : 'en'} />
                    <span className="font-bold text-gray-900">{Number(drawerOrder.total_amount).toFixed(2)} {isAr ? 'ريال' : 'SAR'}</span>
                  </div>
                  {drawerOrder.delivery_address && (
                    <p className="text-sm text-gray-700">{drawerOrder.delivery_address}</p>
                  )}
                  {drawerItems.length > 0 && (
                    <ul className="text-sm text-gray-700 space-y-1">
                      {drawerItems.slice(0, 10).map((item: any, i: number) => (
                        <li key={i}>
                          {item.product_name_ar || item.product_name_en || item.product_name} × {item.quantity}
                        </li>
                      ))}
                    </ul>
                  )}
                  <a
                    href={drawerOrder.delivery_latitude && drawerOrder.delivery_longitude
                      ? `https://www.google.com/maps/search/?api=1&query=${drawerOrder.delivery_latitude},${drawerOrder.delivery_longitude}`
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(drawerOrder.delivery_address || '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700"
                  >
                    <MapPin className="w-4 h-4" />
                    {isAr ? 'فتح الخريطة' : 'Open in Maps'}
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Re-send offer confirm */}
      {resendOfferOrderId != null && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <p className="text-gray-800 font-medium mb-4">
              {isAr ? `إعادة إرسال عرض للطلب #${resendOfferOrderId}؟` : `Re-send offer for order #${resendOfferOrderId}?`}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setResendOfferOrderId(null)}
                className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => handleResendOffer(resendOfferOrderId)}
                disabled={resendLoading}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50"
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
