import { useState, useEffect, useMemo } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import api from '../../utils/api'
import { Users, Eye, Search } from 'lucide-react'
import { formatTimeAgo } from '../../shared/order-ui/orderUiUtils'
import { adminTokens, cx, statusClasses, type StatusVariant } from '../../shared/admin/ui/tokens'
import { StatCard } from '../../shared/admin/ui/components/StatCard'
import { CardModern } from '../../shared/admin/ui/components/CardModern'
import { Button } from '../../shared/admin/ui/components/Button'
import { RiderDetailsDrawer, type RiderRow } from './RiderDetailsDrawer'

export default function RidersConsole() {
  const { t, language } = useLanguage()
  const isAr = language === 'ar'
  const [riders, setRiders] = useState<RiderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [search, setSearch] = useState('')
  const [filterZone, setFilterZone] = useState<string>('')
  const [selectedRider, setSelectedRider] = useState<RiderRow | null>(null)
  const [activeOrder, setActiveOrder] = useState<{ id: number; status: string; total_amount: number; delivery_address: string | null } | null>(null)

  const loadRiders = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await api.get('/api/admin/drivers')
      setRiders(res.data?.drivers || [])
    } catch (e: any) {
      setError(e?.message || (isAr ? 'فشل تحميل المندوبين' : 'Failed to load riders'))
      setRiders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRiders()
    const interval = setInterval(loadRiders, 15000)
    return () => clearInterval(interval)
  }, [])

  const openRiderDrawer = async (rider: RiderRow) => {
    setSelectedRider(rider)
    setActiveOrder(null)
    try {
      const res = await api.get('/api/admin/orders')
      const orders = res.data?.orders || []
      const active = orders.find(
        (o: { driver_id: number | null; status: string }) =>
          o.driver_id === rider.id && ['ASSIGNED', 'PICKED_UP', 'assigned', 'picked_up'].includes(String(o.status))
      )
      if (active) setActiveOrder({ id: active.id, status: active.status, total_amount: active.total_amount, delivery_address: active.delivery_address })
    } catch {
      setActiveOrder(null)
    }
  }

  const statusVariant = (s: string): StatusVariant => {
    const v = (s || '').toLowerCase()
    if (v === 'offline') return 'danger'
    if (v === 'available' || v === 'online') return 'success'
    if (v === 'busy') return 'warn'
    return 'info'
  }

  const connectedCount = useMemo(() => riders.filter((r) => (r.rider_status || '').toLowerCase() !== 'offline').length, [riders])
  const availableCount = useMemo(() => riders.filter((r) => (r.rider_status || '').toLowerCase() === 'available').length, [riders])
  const busyCount = useMemo(() => riders.filter((r) => (r.rider_status || '').toLowerCase() === 'busy').length, [riders])
  const offlineCount = useMemo(() => riders.filter((r) => (r.rider_status || '').toLowerCase() === 'offline').length, [riders])

  const zones = useMemo(() => {
    const set = new Set<string>()
    riders.forEach((r) => {
      const z = (r as RiderRow & { zone?: string }).zone
      if (z && String(z).trim()) set.add(String(z).trim())
    })
    return Array.from(set).sort()
  }, [riders])

  const filtered = useMemo(() => {
    let list = riders
    if (filterStatus) {
      if (filterStatus === 'connected') list = list.filter((r) => (r.rider_status || '').toLowerCase() !== 'offline')
      else list = list.filter((r) => (r.rider_status || '').toLowerCase() === filterStatus.toLowerCase())
    }
    if (filterZone) list = list.filter((r) => String((r as RiderRow & { zone?: string }).zone || '').trim() === filterZone)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (r) =>
          (r.name || '').toLowerCase().includes(q) ||
          (r.phone || '').toLowerCase().includes(q) ||
          (r.email || '').toLowerCase().includes(q) ||
          String(r.id).includes(q)
      )
    }
    return list
  }, [riders, filterStatus, filterZone, search])

  if (loading && riders.length === 0) {
    return (
      <div className={cx('p-6 max-w-6xl mx-auto', adminTokens.color.page)} dir={isAr ? 'rtl' : 'ltr'}>
        <div className="animate-pulse space-y-4">
          <div className={cx('h-8 rounded w-1/3', adminTokens.color.neutral)} />
          <div className={cx('h-12 rounded w-full', adminTokens.color.neutral)} />
          <div className={cx('h-64 rounded-xl', adminTokens.color.neutral)} />
        </div>
      </div>
    )
  }

  return (
    <div className={cx('min-h-screen', adminTokens.color.page, adminTokens.text.body)} dir={isAr ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto space-y-6 pb-10">
        <div>
          <h1 className={cx(adminTokens.text.h1, adminTokens.color.text)}>
            <span className="inline-flex items-center gap-2">
              <Users className="w-7 h-7 text-[#047857]" />
              {t('riders.console.title') || (isAr ? 'وحدة المندوبين' : 'Riders Console')}
            </span>
          </h1>
          <p className={cx('mt-1 text-sm', adminTokens.color.muted)}>{isAr ? 'المندوبون المتصلون والحالة' : 'Connected riders and status'}</p>
        </div>

        {error && (
          <div className={cx('rounded-xl border px-4 py-3 flex items-center justify-between gap-3', adminTokens.status.danger.bg, adminTokens.status.danger.border)}>
            <span className={cx('text-sm font-bold', adminTokens.status.danger.text)}>{error}</span>
            <Button variant="secondary" size="sm" onClick={() => loadRiders()}>
              {t('riders.console.retry') || (isAr ? 'إعادة المحاولة' : 'Retry')}
            </Button>
          </div>
        )}

        {/* KPIs row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label={isAr ? 'متصلون' : 'Connected'}
            value={connectedCount}
            statusVariant={connectedCount > 0 ? 'success' : 'danger'}
            subtitle={`/ ${riders.length}`}
          />
          <StatCard
            label={isAr ? 'متاحون' : 'Available'}
            value={availableCount}
            statusVariant={availableCount > 0 ? 'success' : 'info'}
          />
          <StatCard
            label={isAr ? 'مشغولون' : 'Busy'}
            value={busyCount}
            statusVariant={busyCount > 0 ? 'warn' : 'info'}
          />
          <StatCard
            label={isAr ? 'غير متصلين' : 'Offline'}
            value={offlineCount}
            statusVariant={offlineCount > 0 ? 'danger' : 'success'}
          />
        </div>

        {/* Filters */}
        <CardModern>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={cx('px-3 py-2 border rounded-xl bg-white text-sm font-bold', adminTokens.borders.strong, adminTokens.focus.ring)}
            >
              <option value="">{isAr ? 'الحالة: الكل' : 'Status: All'}</option>
              <option value="connected">{isAr ? 'متصل' : 'Connected'}</option>
              <option value="available">{isAr ? 'متاح' : 'Available'}</option>
              <option value="busy">{isAr ? 'مشغول' : 'Busy'}</option>
              <option value="offline">{isAr ? 'غير متصل' : 'Offline'}</option>
            </select>
            {zones.length > 0 && (
              <select
                value={filterZone}
                onChange={(e) => setFilterZone(e.target.value)}
                className={cx('px-3 py-2 border rounded-xl bg-white text-sm font-bold', adminTokens.borders.strong, adminTokens.focus.ring)}
              >
                <option value="">{isAr ? 'المنطقة: الكل' : 'Zone: All'}</option>
                {zones.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            )}
            <div className="relative flex-1 min-w-[200px]">
              <Search className={cx('absolute top-1/2 -translate-y-1/2 w-4 h-4', adminTokens.color.muted)} style={isAr ? { right: 12 } : { left: 12 }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isAr ? 'بحث: الاسم أو الهاتف' : 'Search: name or phone'}
                className={cx('w-full py-2 border rounded-xl bg-white text-sm font-bold', adminTokens.borders.strong, adminTokens.focus.ring, isAr ? 'pr-10 pl-4' : 'pl-10 pr-4')}
              />
            </div>
          </div>
        </CardModern>

        {/* Rider cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length === 0 ? (
            <div className={cx('col-span-full py-12 text-center', adminTokens.color.muted)}>
              {t('riders.console.noRiders') || (isAr ? 'لا يوجد مندوبون' : 'No riders')}
            </div>
          ) : (
            filtered.map((r) => (
              <CardModern key={r.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className={cx('font-bold', adminTokens.color.text)}>{r.name || '—'}</p>
                    <p className={cx('text-sm', adminTokens.color.muted)} dir="ltr">{r.phone || r.email || '—'}</p>
                  </div>
                  <span className={cx('inline-flex px-2 py-1 rounded-full text-xs font-bold border shrink-0', statusClasses(statusVariant(r.rider_status)))}>
                    {(r.rider_status || 'offline').toLowerCase()}
                  </span>
                </div>
                <p className={cx('text-xs', adminTokens.color.muted)}>
                  {isAr ? 'آخر ظهور: ' : 'Last seen: '}{formatTimeAgo(r.last_seen, isAr ? 'ar' : 'en') || '—'}
                </p>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <Button variant="secondary" size="sm" className="w-full font-bold" onClick={() => openRiderDrawer(r)}>
                    <Eye className="w-4 h-4" />
                    {isAr ? 'عرض' : 'View'}
                  </Button>
                </div>
              </CardModern>
            ))
          )}
        </div>

        <RiderDetailsDrawer
          open={!!selectedRider}
          onClose={() => setSelectedRider(null)}
          rider={selectedRider}
          activeOrder={activeOrder}
        />
      </div>
    </div>
  )
}
