import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import { useLanguage } from '../../context/LanguageContext'
import { usePublicSettings } from '../../hooks/usePublicSettings'
import { LayoutGrid, Eye, Send, Copy, Filter, Search } from 'lucide-react'
import { StatusBadge } from '../../shared/order-ui/StatusBadge'
import { SlaTimerBadge } from '../../shared/order-ui/SlaTimerBadge'
import { getOrderSlaStartAt, computeSlaCycle, slaCycleVariant, copyToClipboard } from '../../shared/order-ui/orderUiUtils'

interface OrderRow {
  id: number
  status: string
  customer_name: string
  customer_email?: string
  customer_phone?: string
  total_amount: number
  delivery_address: string | null
  driver_id: number | null
  driver_name: string | null
  store_id: number | null
  created_at: string
  sla_start_at?: string | null
  payment_received_at?: string | null
  paid_at?: string | null
  distance_km?: number | null
  eta_minutes?: number | null
}

const ACTIVE_STATUSES = ['CREATED', 'ACCEPTED', 'PREPARING', 'READY', 'ASSIGNED', 'PICKED_UP']

function kpiClass(v: 'success' | 'warn' | 'danger' | 'info') {
  const map = { success: 'border-emerald-200 bg-emerald-50/80 text-emerald-800', warn: 'border-amber-200 bg-amber-50/80 text-amber-800', danger: 'border-red-200 bg-red-50/80 text-red-800', info: 'border-blue-200 bg-blue-50/80 text-blue-800' }
  return map[v] || map.info
}

export default function OpsBoardPage() {
  const { language, t } = useLanguage()
  const navigate = useNavigate()
  const isAr = language === 'ar'
  const { settings: publicSettings } = usePublicSettings()
  const slaTimerEnabled = publicSettings?.features?.sla_timer_enabled !== false
  const slaLimitMinutes = publicSettings?.features?.sla_timer_limit_minutes ?? 30
  const cycleSec = slaLimitMinutes * 60

  const [orders, setOrders] = useState<OrderRow[]>([])
  const [riders, setRiders] = useState<{ id: number; name: string; rider_status?: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterRider, setFilterRider] = useState('')
  const [filterStore, setFilterStore] = useState('')
  const [filterSla, setFilterSla] = useState<'on-time' | 'at-risk' | 'late' | ''>('')
  const [search, setSearch] = useState('')
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const load = async () => {
      try {
        const [ordersRes, ridersRes] = await Promise.all([
          api.get('/api/admin/orders'),
          api.get('/api/admin/riders').catch(() => ({ data: { riders: [] } })),
        ])
        setOrders(ordersRes.data?.orders || [])
        setRiders(ridersRes.data?.riders || [])
      } catch (e) {
        setOrders([])
        setRiders([])
      } finally {
        setLoading(false)
      }
    }
    load()
    const t = setInterval(load, 5000)
    const tick = setInterval(() => setNow(Date.now()), 1000)
    return () => { clearInterval(t); clearInterval(tick) }
  }, [])

  const activeOrders = useMemo(() => orders.filter((o) => ACTIVE_STATUSES.includes(String(o.status).toUpperCase())), [orders])
  const availableRidersCount = useMemo(() => riders.filter((r) => r.rider_status === 'available' || r.rider_status === 'online').length, [riders])

  const lateCount = useMemo(() => {
    if (!slaTimerEnabled) return 0
    return activeOrders.filter((o) => {
      const start = getOrderSlaStartAt(o)
      if (!start) return false
      const { cycleElapsedSec, cycleNumber } = computeSlaCycle(start, now, cycleSec)
      return slaCycleVariant(cycleElapsedSec, cycleNumber, cycleSec) === 'danger'
    }).length
  }, [activeOrders, now, slaTimerEnabled, cycleSec])

  const filtered = useMemo(() => {
    let list = activeOrders
    if (filterStatus) list = list.filter((o) => String(o.status).toLowerCase() === filterStatus.toLowerCase())
    if (filterRider) list = list.filter((o) => (o.driver_name || '').toLowerCase().includes(filterRider.toLowerCase()))
    if (filterStore) {
      const id = parseInt(filterStore, 10)
      if (!isNaN(id)) list = list.filter((o) => o.store_id === id)
    }
    if (filterSla && slaTimerEnabled) {
      list = list.filter((o) => {
        const start = getOrderSlaStartAt(o)
        if (!start) return filterSla === 'on-time'
        const { cycleElapsedSec, cycleNumber } = computeSlaCycle(start, now, cycleSec)
        const v = slaCycleVariant(cycleElapsedSec, cycleNumber, cycleSec)
        if (filterSla === 'late') return v === 'danger'
        if (filterSla === 'at-risk') return v === 'warn'
        return v === 'success'
      })
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((o) =>
        String(o.id).includes(q) ||
        (o.customer_name || '').toLowerCase().includes(q) ||
        (o.customer_email || '').toLowerCase().includes(q) ||
        (o.customer_phone || '').toLowerCase().includes(q) ||
        (o.delivery_address || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [activeOrders, filterStatus, filterRider, filterStore, filterSla, search, now, slaTimerEnabled])

  const handleCopy = async (text: string) => {
    await copyToClipboard(text)
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
          <LayoutGrid className="w-7 h-7 text-emerald-600" />
          {t('opsBoard.title')}
        </h1>
        <button
          type="button"
          onClick={() => navigate('/admin/ops/live-dispatch')}
          className="px-4 py-2 rounded-xl border border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-bold text-sm"
        >
          {t('opsBoard.liveDispatch')}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className={`rounded-xl border p-4 ${kpiClass('info')}`}>
          <div className="text-xs font-bold opacity-90">{t('opsBoard.activeOrders')}</div>
          <div className="text-2xl font-extrabold mt-1" dir="ltr">{activeOrders.length}</div>
        </div>
        <div className={`rounded-xl border p-4 ${kpiClass(lateCount > 0 ? 'danger' : 'success')}`}>
          <div className="text-xs font-bold opacity-90">{t('opsBoard.lateOrders')}</div>
          <div className="text-2xl font-extrabold mt-1" dir="ltr">{lateCount}</div>
        </div>
        <div className={`rounded-xl border p-4 ${kpiClass(availableRidersCount === 0 ? 'danger' : availableRidersCount < 3 ? 'warn' : 'success')}`}>
          <div className="text-xs font-bold opacity-90">{t('opsBoard.availableRiders')}</div>
          <div className="text-2xl font-extrabold mt-1" dir="ltr">{availableRidersCount}</div>
        </div>
        <div className={`rounded-xl border p-4 ${kpiClass('info')}`}>
          <div className="text-xs font-bold opacity-90">{t('opsBoard.avgEta')}</div>
          <div className="text-2xl font-extrabold mt-1">—</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('opsBoard.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-sm"
          />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-xl text-sm">
          <option value="">{t('opsBoard.filterStatus')}</option>
          {[...new Set(activeOrders.map((o) => o.status))].sort().map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          type="text"
          value={filterRider}
          onChange={(e) => setFilterRider(e.target.value)}
          placeholder={t('opsBoard.filterRider')}
          className="w-32 px-3 py-2 border border-gray-300 rounded-xl text-sm"
        />
        <select value={filterStore} onChange={(e) => setFilterStore(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-xl text-sm">
          <option value="">{t('opsBoard.filterStore')}</option>
          {[...new Set(activeOrders.map((o) => o.store_id).filter(Boolean))].sort((a, b) => (a as number) - (b as number)).map((id) => (
            <option key={id} value={id}>#{id}</option>
          ))}
        </select>
        {slaTimerEnabled && (
          <select value={filterSla} onChange={(e) => setFilterSla(e.target.value as any)} className="px-3 py-2 border border-gray-300 rounded-xl text-sm">
            <option value="">{t('opsBoard.filterSla')}</option>
            <option value="on-time">{t('sla.onTime')}</option>
            <option value="at-risk">{t('sla.atRisk')}</option>
            <option value="late">{t('sla.late')}</option>
          </select>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-right font-bold text-gray-700">{t('opsBoard.tableOrder')}</th>
                <th className="px-4 py-3 text-right font-bold text-gray-700">{t('opsBoard.tableStatus')}</th>
                {slaTimerEnabled && <th className="px-4 py-3 text-right font-bold text-gray-700">SLA</th>}
                <th className="px-4 py-3 text-right font-bold text-gray-700">{t('opsBoard.tableStore')}</th>
                <th className="px-4 py-3 text-right font-bold text-gray-700">{t('opsBoard.tableRider')}</th>
                <th className="px-4 py-3 text-right font-bold text-gray-700">{t('opsBoard.tableDistanceEta')}</th>
                <th className="px-4 py-3 text-right font-bold text-gray-700">{t('opsBoard.tableTotal')}</th>
                <th className="px-4 py-3 text-right font-bold text-gray-700">{t('opsBoard.tableActions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={slaTimerEnabled ? 8 : 7} className="px-4 py-8 text-center text-gray-500">{t('opsBoard.noActiveOrders')}</td></tr>
              ) : (
                filtered.map((o) => (
                  <tr key={o.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono font-bold text-gray-900">#{o.id}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    {slaTimerEnabled && (
                      <td className="px-4 py-3">
                        <SlaTimerBadge
                          slaStartAt={getOrderSlaStartAt(o)}
                          hideWhenNoStart
                          lang={isAr ? 'ar' : 'en'}
                          limitMinutes={slaLimitMinutes}
                          isTerminal={false}
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 text-gray-700">{o.store_id != null ? `#${o.store_id}` : '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{o.driver_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-700 tabular-nums">
                      {o.distance_km != null ? `${o.distance_km} km` : o.eta_minutes != null ? `~${o.eta_minutes}m` : '—'}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900" dir="ltr">{o.total_amount} SAR</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => navigate(`/admin/orders/${o.id}`)} className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold">
                          <Eye className="w-3.5 h-3.5" />{t('opsBoard.view')}
                        </button>
                        <button type="button" onClick={() => navigate('/admin/ops/live-dispatch')} className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs font-bold">
                          <Send className="w-3.5 h-3.5" />{t('opsBoard.assign')}
                        </button>
                        <button type="button" onClick={() => handleCopy(`${o.id} ${o.delivery_address || ''}`)} className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold">
                          <Copy className="w-3.5 h-3.5" />{t('opsBoard.copy')}
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
    </div>
  )
}
