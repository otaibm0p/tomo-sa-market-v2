import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutGrid,
  Zap,
  ClipboardList,
  Users,
  Store,
  Clock,
  ChevronDown,
  ChevronUp,
  Activity,
  AlertTriangle,
} from 'lucide-react'
import api from '../../utils/api'
import { useLanguage } from '../../context/LanguageContext'
import { Button } from '../../shared/admin/ui/components/Button'
import { StatCard } from '../../shared/admin/ui/components/StatCard'
import { adminTokens, statusClasses, cx, type StatusVariant } from '../../shared/admin/ui/tokens'

interface DashboardStats {
  totalOrders: number
  todayOrders: number
  pendingOrders: number
  activeOrders: number
  totalRiders: number
  activeRiders: number
  readyWithoutDriver: number
  cancelledToday: number
  ordersLastHour: number
}

type HealthStatus = 'online' | 'slow' | 'offline'
type DispatchMode = 'AUTO_ASSIGN' | 'OFFER_ACCEPT'

interface AlertSlot {
  id: string
  labelKey: string
  count: number
  variant: StatusVariant
  actionPath?: string
}

const formatNumber = (num: number, opts?: { minimumFractionDigits?: number; maximumFractionDigits?: number }): string =>
  new Intl.NumberFormat('ar-SA', { minimumFractionDigits: 0, maximumFractionDigits: opts?.maximumFractionDigits ?? 2, useGrouping: true, ...opts }).format(num)

export default function Dashboard() {
  const { language, t } = useLanguage()
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    todayOrders: 0,
    pendingOrders: 0,
    activeOrders: 0,
    totalRiders: 0,
    activeRiders: 0,
    readyWithoutDriver: 0,
    cancelledToday: 0,
    ordersLastHour: 0,
  })
  const [healthStatus, setHealthStatus] = useState<HealthStatus>('offline')
  const [healthLatency, setHealthLatency] = useState<number | null>(null)
  const [dispatchMode, setDispatchMode] = useState<DispatchMode>('AUTO_ASSIGN')
  const [portals, setPortals] = useState({ customer: true, store: true, driver: true })
  const [localTime, setLocalTime] = useState(() => new Date())
  const [loading, setLoading] = useState(true)
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [opsAlerts, setOpsAlerts] = useState<Array<{ id: string; severity: 'low' | 'med' | 'high'; title: string; detail: string; suggestedAction: string }>>([])

  useEffect(() => {
    const ping = async () => {
      const start = Date.now()
      try {
        await fetch('/api/health', { method: 'GET' })
        const ms = Date.now() - start
        setHealthLatency(ms)
        setHealthStatus(ms < 800 ? 'online' : ms < 2500 ? 'slow' : 'offline')
      } catch {
        setHealthStatus('offline')
        setHealthLatency(null)
      }
    }
    ping()
    const healthInterval = setInterval(ping, 30000)
    return () => clearInterval(healthInterval)
  }, [])

  useEffect(() => {
    const tick = setInterval(() => setLocalTime(new Date()), 1000)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    loadDashboardData()
    const interval = setInterval(loadDashboardData, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [statsRes, productsRes, usersRes, ridersRes, recentRes, opsRes, settingsRes] = await Promise.allSettled([
        api.get('/api/admin/orders/stats'),
        api.get('/api/products'),
        api.get('/api/admin/users/count'),
        api.get('/api/admin/riders'),
        api.get('/api/admin/orders/recent?limit=5'),
        api.get('/api/admin/ops-digest'),
        api.get('/api/settings'),
      ])

      const ordersData = statsRes.status === 'fulfilled' ? (statsRes.value.data || { total: 0, today: 0, pending: 0 }) : { total: 0, today: 0, pending: 0 }
      const ridersData = ridersRes.status === 'fulfilled' ? (ridersRes.value?.data || { riders: [] }) : { riders: [] }
      const riders = ridersData?.riders ?? []
      const ops = opsRes.status === 'fulfilled' ? opsRes.value.data : null
      const settings = settingsRes.status === 'fulfilled' ? settingsRes.value.data : {}

      const dm = settings?.dispatchMode ?? settings?.dispatch_mode ?? 'AUTO_ASSIGN'
      setDispatchMode(dm === 'OFFER_ACCEPT' ? 'OFFER_ACCEPT' : 'AUTO_ASSIGN')
      const f = settings?.features
      if (f && typeof f === 'object') {
        setPortals({
          customer: f.customer_portal_enabled !== false,
          store: f.store_portal_enabled !== false,
          driver: f.driver_portal_enabled !== false,
        })
      }

      const activeRidersCount = riders.filter((r: any) => (r.rider_status || '').toLowerCase() !== 'offline').length
      const readyNoDriver = ops?.kpis?.readyWithoutDriverCount ?? 0
      const cancelledToday = ops?.kpis?.cancelledTodayCount ?? 0
      const ordersLastHour = ops?.kpis?.ordersLastHour ?? 0

      setStats({
        totalOrders: ordersData?.total ?? 0,
        todayOrders: ordersData?.today ?? 0,
        pendingOrders: ordersData?.pending ?? 0,
        activeOrders: ordersData?.pending ?? 0,
        totalRiders: riders.length,
        activeRiders: activeRidersCount,
        readyWithoutDriver: readyNoDriver,
        cancelledToday,
        ordersLastHour,
      })
      setOpsAlerts(ops?.alerts ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const isAr = language === 'ar'

  if (loading) {
    return (
      <div className={cx('flex items-center justify-center min-h-[50vh]', adminTokens.color.page)} dir={isAr ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <div className={cx('inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4')} />
          <div className={cx('text-lg font-bold', adminTokens.color.muted)}>{t('admin.dashboard.loading')}</div>
        </div>
      </div>
    )
  }

  const lateCount = stats.readyWithoutDriver
  const atRiskCount = stats.pendingOrders > 0 ? Math.min(stats.pendingOrders, 99) : 0
  const unassignedCount = stats.readyWithoutDriver
  const noRiders = stats.activeRiders === 0 ? 1 : 0
  const apiDegraded = healthStatus === 'slow' || healthStatus === 'offline' ? 1 : 0

  const alertSlots: AlertSlot[] = [
    { id: 'lateSla', labelKey: 'admin.alerts.lateSla', count: lateCount, variant: lateCount > 0 ? 'danger' : 'success', actionPath: '/admin/orders' },
    { id: 'atRisk', labelKey: 'admin.alerts.atRisk', count: atRiskCount, variant: atRiskCount > 0 ? 'warn' : 'success', actionPath: '/admin/ops/board' },
    { id: 'unassigned', labelKey: 'admin.alerts.unassigned', count: unassignedCount, variant: unassignedCount > 0 ? 'warn' : 'success', actionPath: '/admin/ops/live-dispatch' },
    { id: 'noRiders', labelKey: 'admin.alerts.noRiders', count: noRiders, variant: noRiders > 0 ? 'danger' : 'success', actionPath: '/admin/riders' },
    { id: 'storeBacklog', labelKey: 'admin.alerts.storeBacklog', count: 0, variant: 'info', actionPath: '/admin/stores' },
    { id: 'apiDegraded', labelKey: 'admin.alerts.apiDegraded', count: apiDegraded, variant: apiDegraded > 0 ? 'danger' : 'success' },
  ]

  const hasAnyAlert = alertSlots.some((a) => a.count > 0)

  const activeOrdersVariant: StatusVariant = stats.activeOrders > 10 ? 'warn' : stats.activeOrders > 0 ? 'info' : 'success'
  const lateOrdersVariant: StatusVariant = lateCount > 0 ? 'danger' : 'success'
  const ridersVariant: StatusVariant = stats.activeRiders === 0 ? 'danger' : stats.activeRiders < 3 ? 'warn' : 'success'
  const avgEta = 25
  const avgEtaVariant: StatusVariant = avgEta > 40 ? 'warn' : avgEta > 25 ? 'info' : 'success'

  const healthVariant: StatusVariant = healthStatus === 'online' ? 'success' : healthStatus === 'slow' ? 'warn' : 'danger'

  return (
    <div className={cx('min-h-screen', adminTokens.color.page, adminTokens.text.body)} dir={isAr ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto space-y-8 pb-10">
        {/* A) Top Status Bar - sticky, read-only */}
        <div className="admin-mission-bar sticky top-0 z-10 -mx-4 md:-mx-6 px-4 md:px-6 py-3 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm transition-colors duration-150">
          <div className="flex flex-wrap items-center gap-3 md:gap-4">
            <span className={cx('text-xs font-bold uppercase tracking-wide font-medium', adminTokens.color.textMuted, 'admin-mission-bar-label')}>
              {t('admin.missionControl.systemHealth')}
            </span>
            <span className={cx('inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold font-medium border', adminTokens.status[healthVariant].bg, adminTokens.status[healthVariant].border, adminTokens.status[healthVariant].text)}>
              <span className={cx('w-2 h-2 rounded-full', adminTokens.status[healthVariant].dot)} />
              {healthStatus === 'online' ? t('admin.missionControl.connected') : healthStatus === 'slow' ? t('admin.missionControl.slow') : t('admin.missionControl.offline')}
              {healthLatency != null && healthStatus !== 'offline' && <span className="opacity-80" dir="ltr">({healthLatency}ms)</span>}
            </span>
            <span className={cx('text-xs font-bold uppercase tracking-wide font-medium', adminTokens.color.textMuted, 'admin-mission-bar-label')}>{t('admin.missionControl.dispatchMode')}</span>
            <span className={cx('inline-flex px-3 py-1.5 rounded-full text-sm font-bold font-medium border', dispatchMode === 'OFFER_ACCEPT' ? [adminTokens.status.info.bg, adminTokens.status.info.border, adminTokens.status.info.text] : 'bg-blue-50 border-blue-200 text-blue-800')}>
              {dispatchMode === 'OFFER_ACCEPT' ? t('admin.missionControl.offerAccept') : t('admin.missionControl.autoAssign')}
            </span>
            <span className={cx('text-xs font-bold uppercase tracking-wide font-medium', adminTokens.color.textMuted, 'admin-mission-bar-label')}>{t('admin.missionControl.portals')}</span>
            <div className="flex flex-wrap gap-2">
              {portals.customer && <span className={cx('px-2.5 py-1 rounded-lg text-xs font-bold font-medium border', adminTokens.status.success.bg, adminTokens.status.success.border, adminTokens.status.success.text)}>{t('admin.missionControl.customer')}</span>}
              {portals.store && <span className={cx('px-2.5 py-1 rounded-lg text-xs font-bold font-medium border', adminTokens.status.success.bg, adminTokens.status.success.border, adminTokens.status.success.text)}>{t('admin.missionControl.store')}</span>}
              {portals.driver && <span className={cx('px-2.5 py-1 rounded-lg text-xs font-bold font-medium border', adminTokens.status.success.bg, adminTokens.status.success.border, adminTokens.status.success.text)}>{t('admin.missionControl.driver')}</span>}
            </div>
            <span className={cx('ms-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold font-medium bg-gray-100 text-gray-700 border border-gray-100 admin-mission-bar-time')} dir="ltr">
              <Clock className="w-4 h-4" />
              {localTime.toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Page title */}
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900">{t('admin.missionControl.title')}</h1>
          <p className="mt-1 text-sm text-slate-600 font-medium">{t('admin.missionControl.subtitle')}</p>
        </div>

        {/* B) Alerts — top, strong emphasis, read + act (click to go) */}
        <section className={cx('rounded-2xl border border-gray-100 bg-white shadow-sm p-5 md:p-6')}>
          <h2 className="flex items-center gap-2 mb-4 text-[1.125rem] font-bold text-slate-900">
            <AlertTriangle className={cx('w-5 h-5', adminTokens.status.warn.text)} />
            {t('admin.alerts.title')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {alertSlots.map((slot) => {
              const actionable = slot.count > 0 && slot.actionPath
              return (
                <div
                  key={slot.id}
                  role={actionable ? 'button' : undefined}
                  onClick={actionable ? () => navigate(slot.actionPath!) : undefined}
                  className={cx(
                    'rounded-xl border p-4 flex items-center justify-between transition-colors',
                    adminTokens.status[slot.variant].bg,
                    adminTokens.status[slot.variant].border,
                    actionable && 'cursor-pointer hover:opacity-90'
                  )}
                >
                  <span className={cx('text-sm font-bold', adminTokens.status[slot.variant].text)}>{t(slot.labelKey)}</span>
                  {slot.count > 0 ? (
                    <span className={cx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-extrabold border tabular-nums', adminTokens.status[slot.variant].border, adminTokens.status[slot.variant].text)} dir="ltr">
                      <span className={cx('w-1.5 h-1.5 rounded-full', adminTokens.status[slot.variant].dot)} />
                      {formatNumber(slot.count)}
                    </span>
                  ) : (
                    <span className={cx('text-xs', adminTokens.color.muted)}>{t('admin.alerts.noAlerts')}</span>
                  )}
                </div>
              )
            })}
          </div>
          {!hasAnyAlert && (
            <div className={cx('mt-4 py-5 text-center rounded-xl border border-gray-100 bg-gray-50/80')}>
              <p className={cx('text-sm font-medium', adminTokens.color.muted)}>{t('admin.alerts.noAlerts')}</p>
            </div>
          )}
        </section>

        {/* C) KPIs — visually secondary: lighter background, compact */}
        <section className={cx('rounded-2xl border border-gray-100 bg-gray-50/70 shadow-sm p-4')}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label={t('admin.kpis.activeOrders')}
              value={formatNumber(stats.activeOrders)}
              statusVariant={activeOrdersVariant}
              subtitle={t('admin.kpis.targetToday')}
            />
            <StatCard
              label={t('admin.kpis.lateOrders')}
              value={formatNumber(lateCount)}
              statusVariant={lateOrdersVariant}
              subtitle={`${t('admin.kpis.minutes')}`}
            />
            <StatCard
              label={t('admin.kpis.onlineRiders')}
              value={formatNumber(stats.activeRiders)}
              statusVariant={ridersVariant}
              subtitle={`/ ${formatNumber(stats.totalRiders)}`}
            />
            <StatCard
              label={t('admin.kpis.avgEta')}
              value={`${avgEta} ${t('admin.kpis.minutes')}`}
              statusVariant={avgEtaVariant}
              subtitle={t('admin.kpis.targetToday')}
            />
          </div>
        </section>

        {/* D) Quick Actions — one primary (Live Dispatch), rest secondary */}
        <section className={cx('rounded-2xl border border-gray-100 bg-white shadow-sm p-5 md:p-6')}>
          <h2 className="mb-4 text-[1.125rem] font-bold text-slate-900">{t('admin.quickActions.title')}</h2>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" size="md" onClick={() => navigate('/admin/ops/live-dispatch')} className="gap-2 font-bold">
              <Zap className="w-5 h-5" />
              {t('admin.quickActions.liveDispatch')}
            </Button>
            <Button variant="secondary" size="md" onClick={() => navigate('/admin/ops/board')} className="gap-2 font-bold">
              <LayoutGrid className="w-5 h-5" />
              {t('admin.quickActions.opsBoard')}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate('/admin/orders')} className="gap-1.5 font-medium">
              <ClipboardList className="w-4 h-4" />
              {t('admin.quickActions.orders')}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate('/admin/riders')} className="gap-1.5 font-medium">
              <Users className="w-4 h-4" />
              {t('admin.quickActions.ridersConsole')}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate('/admin/stores')} className="gap-1.5 font-medium">
              <Store className="w-4 h-4" />
              {t('admin.quickActions.stores')}
            </Button>
          </div>
        </section>

        {/* Collapsed Analytics — secondary, insight only */}
        <section className={cx('rounded-2xl border border-gray-100 overflow-hidden bg-gray-50/60 shadow-sm')}>
          <button
            type="button"
            onClick={() => setAnalyticsOpen(!analyticsOpen)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-[1.125rem] font-bold text-slate-900"
          >
            <span className="flex items-center gap-2">
              <Activity className={cx('w-5 h-5', adminTokens.color.textMuted)} />
              {t('admin.missionControl.analytics')}
            </span>
            {analyticsOpen ? <ChevronUp className={cx('w-5 h-5', adminTokens.color.muted)} /> : <ChevronDown className={cx('w-5 h-5', adminTokens.color.muted)} />}
          </button>
          {analyticsOpen && (
            <div className={cx('border-t border-gray-100 p-4 bg-white')}>
              <p className={cx('text-xs mb-3', adminTokens.color.muted)}>{t('admin.missionControl.analyticsCollapsed')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className={cx('rounded-xl border border-gray-100 p-4 shadow-sm', stats.readyWithoutDriver > 0 ? statusClasses('warn') : statusClasses('success'))}>
                  <div className={cx('text-xs font-medium', adminTokens.color.muted)}>{t('admin.dashboard.readyNoDriver')}</div>
                  <div className={cx('mt-1 text-xl font-extrabold tabular-nums', adminTokens.status[stats.readyWithoutDriver > 0 ? 'warn' : 'success'].text)} dir="ltr">{stats.readyWithoutDriver}</div>
                </div>
                <div className={cx('rounded-xl border border-gray-100 p-4 shadow-sm', stats.cancelledToday > 0 ? statusClasses('danger') : statusClasses('info'))}>
                  <div className={cx('text-xs font-medium', adminTokens.color.muted)}>{t('admin.dashboard.cancelledToday')}</div>
                  <div className={cx('mt-1 text-xl font-extrabold tabular-nums', stats.cancelledToday > 0 ? adminTokens.status.danger.text : adminTokens.status.info.text)} dir="ltr">{stats.cancelledToday}</div>
                </div>
                <div className={cx('rounded-xl border border-gray-100 p-4 shadow-sm', statusClasses('info'))}>
                  <div className={cx('text-xs font-medium', adminTokens.color.muted)}>{t('admin.dashboard.ordersLastHour')}</div>
                  <div className={cx('mt-1 text-xl font-extrabold tabular-nums', adminTokens.status.info.text)} dir="ltr">{stats.ordersLastHour}</div>
                </div>
              </div>
              {opsAlerts.length > 0 && (
                <div className="mt-4 space-y-2">
                  {opsAlerts.slice(0, 3).map((a) => (
                    <div key={a.id} className={cx('rounded-xl border border-gray-100 p-3 bg-gray-50/80')}>
                      <div className="font-bold text-gray-800">{a.title}</div>
                      <div className="mt-1 text-sm text-gray-500">{a.detail}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
