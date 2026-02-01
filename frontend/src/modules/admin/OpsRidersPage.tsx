import { useState, useEffect, useMemo } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import api from '../../utils/api'
import { Users, MapPin, List, Map as MapIcon, Eye, Pause, Radio } from 'lucide-react'
import { formatTimeAgo } from '../../shared/order-ui/orderUiUtils'
import { InternalNotesPanel } from '../../shared/notes/InternalNotesPanel'

interface RiderRow {
  id: number
  user_id: number
  name: string
  email: string
  phone?: string
  rider_status: string
  last_seen: string | null
  last_location_update: string | null
  current_latitude: number | null
  current_longitude: number | null
  active_orders_count?: number
}

export default function OpsRidersPage() {
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const [riders, setRiders] = useState<RiderRow[]>([])
  const [locations, setLocations] = useState<{ id: number; driver_name: string; latitude: number; longitude: number; last_location_update: string | null; last_seen: string | null; active_orders: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  const [selectedRider, setSelectedRider] = useState<RiderRow | null>(null)
  const [activeOrder, setActiveOrder] = useState<{ id: number; status: string; total_amount: number; delivery_address: string | null } | null>(null)
  const [opsActionSending, setOpsActionSending] = useState<string | null>(null)

  useEffect(() => {
    loadRiders()
    const t = setInterval(loadRiders, 15000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (viewMode === 'map') loadLocations()
  }, [viewMode])

  const loadRiders = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/admin/drivers')
      setRiders(res.data?.drivers || [])
    } catch (err) {
      console.error('Ops riders load error:', err)
      setRiders([])
    } finally {
      setLoading(false)
    }
  }

  const loadLocations = async () => {
    try {
      const res = await api.get('/api/admin/drivers/locations')
      setLocations(res.data?.drivers || [])
    } catch (err) {
      console.error('Ops riders locations error:', err)
      setLocations([])
    }
  }

  const logOpsAction = async (action: string, riderId: number, details?: object) => {
    const key = `${action}-${riderId}`
    setOpsActionSending(key)
    try {
      await api.post('/api/admin/ops-action', { action, entityType: 'rider', entityId: riderId, details })
    } catch {
      // non-blocking
    } finally {
      setOpsActionSending(null)
    }
  }

  const openRiderDrawer = async (rider: RiderRow) => {
    setSelectedRider(rider)
    setActiveOrder(null)
    try {
      const res = await api.get('/api/admin/orders')
      const orders = res.data?.orders || []
      const active = orders.find((o: { driver_id: number | null; status: string }) => o.driver_id === rider.id && ['ASSIGNED', 'PICKED_UP', 'assigned', 'picked_up'].includes(String(o.status)))
      if (active) setActiveOrder({ id: active.id, status: active.status, total_amount: active.total_amount, delivery_address: active.delivery_address })
    } catch {
      setActiveOrder(null)
    }
  }

  const onlineCount = useMemo(() => riders.filter((r) => (r.rider_status || '').toLowerCase() !== 'offline').length, [riders])

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[300px]">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-7 h-7 text-emerald-600" />
          {isAr ? 'Riders مباشر' : 'Riders Live'}
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {isAr ? 'متصل' : 'Online'}: <strong className="text-emerald-600">{onlineCount}</strong> / {riders.length}
          </span>
          <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${viewMode === 'list' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <List className="w-4 h-4" />
              {isAr ? 'قائمة' : 'List'}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${viewMode === 'map' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <MapIcon className="w-4 h-4" />
              {isAr ? 'خريطة' : 'Map'}
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-bold text-gray-700">{isAr ? 'السائق' : 'Rider'}</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-700">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-700">{isAr ? 'آخر ظهور' : 'Last ping'}</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-700">{isAr ? 'آخر موقع' : 'Last location'}</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-700">{isAr ? 'طلب نشط' : 'Active order'}</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-700">{isAr ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {riders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      {isAr ? 'لا يوجد riders.' : 'No riders.'}
                    </td>
                  </tr>
                ) : (
                  riders.map((r) => (
                    <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{r.name}</div>
                        <div className="text-xs text-gray-500">{r.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${
                          (r.rider_status || '').toLowerCase() === 'offline' ? 'bg-gray-100 text-gray-600' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {(r.rider_status || 'offline').toLowerCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{formatTimeAgo(r.last_seen, isAr ? 'ar' : 'en') || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{formatTimeAgo(r.last_location_update, isAr ? 'ar' : 'en') || '—'}</td>
                      <td className="px-4 py-3 text-gray-700">{r.active_orders_count ? String(r.active_orders_count) : '—'}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => openRiderDrawer(r)}
                          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {isAr ? 'عرض' : 'View'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-[500px] flex items-center justify-center">
          <div className="text-center text-gray-500 p-8">
            <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">{isAr ? 'عرض الخريطة' : 'Map view'}</p>
            <p className="text-sm mt-1">
              {locations.length === 0
                ? isAr ? 'لا توجد مواقع متاحة حالياً.' : 'No locations available.'
                : isAr ? `${locations.length} rider على الخريطة.` : `${locations.length} rider(s) on map.`}
            </p>
            {locations.length > 0 && (
              <p className="text-xs mt-2 text-gray-400">
                {isAr ? 'انقر على Rider في القائمة لرؤية التفاصيل والطلب النشط.' : 'Click a rider in the list to see details and active order.'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Rider drawer */}
      {selectedRider && (
        <div className="fixed inset-0 z-[200] flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedRider(null)} aria-hidden />
          <div className="relative w-full max-w-md bg-white shadow-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">{selectedRider.name}</h3>
              <button type="button" onClick={() => setSelectedRider(null)} className="text-gray-500 hover:text-gray-900 text-2xl leading-none">×</button>
            </div>
            <div className="p-4 space-y-4">
              <p><span className="text-gray-500">{isAr ? 'البريد' : 'Email'}</span> {selectedRider.email}</p>
              {selectedRider.phone && <p><span className="text-gray-500">{isAr ? 'الهاتف' : 'Phone'}</span> <span dir="ltr">{selectedRider.phone}</span></p>}
              <p>
                <span className="text-gray-500">{isAr ? 'الحالة' : 'Status'}</span>{' '}
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${
                  (selectedRider.rider_status || '').toLowerCase() === 'offline' ? 'bg-gray-100 text-gray-600' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {(selectedRider.rider_status || 'offline').toLowerCase()}
                </span>
              </p>
              <p><span className="text-gray-500">{isAr ? 'آخر ظهور' : 'Last ping'}</span> {formatTimeAgo(selectedRider.last_seen, isAr ? 'ar' : 'en') || '—'}</p>
              <p><span className="text-gray-500">{isAr ? 'آخر موقع' : 'Last location'}</span> {formatTimeAgo(selectedRider.last_location_update, isAr ? 'ar' : 'en') || '—'}</p>
              {activeOrder ? (
                <div className="border border-gray-200 rounded-xl p-3">
                  <h4 className="font-bold text-gray-900 mb-2">{isAr ? 'الطلب النشط' : 'Active order'}</h4>
                  <p><span className="text-gray-500">#</span>{activeOrder.id} — {activeOrder.status}</p>
                  <p className="text-sm text-gray-600 mt-1" dir="ltr">{activeOrder.total_amount} SAR</p>
                  {activeOrder.delivery_address && <p className="text-xs text-gray-500 mt-1">{activeOrder.delivery_address}</p>}
                </div>
              ) : (
                <p className="text-sm text-gray-500">{isAr ? 'لا يوجد طلب نشط.' : 'No active order.'}</p>
              )}
              <div className="border-t border-gray-200 pt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!!opsActionSending}
                  onClick={() => logOpsAction('OPS_PAUSE_OFFERS', selectedRider.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-200 text-amber-800 bg-amber-50 hover:bg-amber-100 text-sm font-bold disabled:opacity-50"
                >
                  <Pause className="w-4 h-4" />
                  {opsActionSending === `OPS_PAUSE_OFFERS-${selectedRider.id}` ? (isAr ? 'جاري...' : 'Logging...') : (isAr ? 'إيقاف العروض' : 'Pause offers')}
                </button>
                <button
                  type="button"
                  disabled={!!opsActionSending}
                  onClick={() => logOpsAction('OPS_PING_RIDER', selectedRider.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-bold disabled:opacity-50"
                >
                  <Radio className="w-4 h-4" />
                  {opsActionSending === `OPS_PING_RIDER-${selectedRider.id}` ? (isAr ? 'جاري...' : 'Logging...') : (isAr ? 'تنبيه Rider' : 'Ping rider')}
                </button>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <InternalNotesPanel
                  entityType="rider"
                  entityId={selectedRider.id}
                  canAdd={true}
                  lang={isAr ? 'ar' : 'en'}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
