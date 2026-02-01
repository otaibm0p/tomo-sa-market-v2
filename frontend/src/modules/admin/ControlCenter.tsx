import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import api from '../../utils/api'
import { authAPI } from '../../utils/api'
import { useLanguage } from '../../context/LanguageContext'
import { useAdminPermissions } from '../../hooks/useAdminPermissions'
import { formatNumber, parseNumber, formatAdminNumber, cleanDecimalInput } from '../../utils/numberFormat'
import { StatCard } from '../../shared/admin/ui/components/StatCard'
import { Button } from '../../shared/admin/ui/components/Button'
import { cx, getAdminTheme, applyAdminTheme, type AdminThemeMode } from '../../shared/admin/ui/tokens'
import { Zap, AlertTriangle, Clock, Pause, Play, ExternalLink, LayoutDashboard, Sun, Moon, Users } from 'lucide-react'

export interface FeaturesFlags {
  customer_portal_enabled: boolean
  store_portal_enabled: boolean
  driver_portal_enabled: boolean
  modules_enabled: {
    marketing: boolean
    accounting: boolean
    support: boolean
    users_roles: boolean
    exports: boolean
    settlements: boolean
    campaigns: boolean
    coupons: boolean
    ops_console: boolean
  }
}

interface ControlSettings {
  store_status: 'open' | 'closed'
  minimum_order_value: number
  delivery_fee_base: number
  delivery_fee_per_km: number
  free_shipping_threshold: number
  auto_dispatch_enabled: boolean
  auto_assign_on_payment: boolean
  auto_select_nearest_rider: boolean
  max_assign_distance: number // Maximum distance in km for rider assignment
  max_orders_per_rider: number
  assignment_timeout_seconds: number
}

interface Rider {
  id: number
  name: string
  rider_status: 'available' | 'busy' | 'offline'
  active_orders_count: number
  phone: string
}

interface AutomationStats {
  total_auto_assignments: number
  today_auto_assignments: number
  average_assignment_time: number
  success_rate: number
}

const DEFAULT_FEATURES: FeaturesFlags = {
  customer_portal_enabled: true,
  store_portal_enabled: true,
  driver_portal_enabled: true,
  modules_enabled: {
    marketing: false,
    accounting: false,
    support: false,
    users_roles: false,
    exports: false,
    settlements: false,
    campaigns: false,
    coupons: false,
    ops_console: true,
  },
}

export default function ControlCenter() {
  const { language, t } = useLanguage()
  const user = authAPI.getCurrentUser()
  const { hasAccess } = useAdminPermissions(user != null)
  const isSuperAdmin = user?.role === 'super_admin'
  const canManageUsers = hasAccess('/admin/users')
  const [features, setFeatures] = useState<FeaturesFlags>(DEFAULT_FEATURES)
  const [featuresSaving, setFeaturesSaving] = useState(false)
  const [healthStatus, setHealthStatus] = useState<'online' | 'slow' | 'offline'>('offline')
  const [healthLatency, setHealthLatency] = useState<number | null>(null)
  const [settings, setSettings] = useState<ControlSettings>({
    store_status: 'open',
    minimum_order_value: 0,
    delivery_fee_base: 0,
    delivery_fee_per_km: 0,
    free_shipping_threshold: 150,
    auto_dispatch_enabled: true,
    auto_assign_on_payment: true,
    auto_select_nearest_rider: true,
    max_assign_distance: 10,
    max_orders_per_rider: 3,
    assignment_timeout_seconds: 30,
  })
  const [riders, setRiders] = useState<Rider[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [automationStats, setAutomationStats] = useState<AutomationStats>({
    total_auto_assignments: 0,
    today_auto_assignments: 0,
    average_assignment_time: 0,
    success_rate: 0,
  })
  const [dispatchMode, setDispatchMode] = useState<'AUTO_ASSIGN' | 'OFFER_ACCEPT'>('AUTO_ASSIGN')
  const [localTime, setLocalTime] = useState(() => new Date())
  const [adminThemeMode, setAdminThemeMode] = useState<AdminThemeMode>(() => getAdminTheme())
  const [whatsappSettings, setWhatsappSettings] = useState<{
    enabled: boolean
    token_configured: boolean
    whatsapp_phone_e164?: string
    whatsapp_provider?: string
  }>({ enabled: false, token_configured: false })
  interface OpsAlert {
    id: string
    type: string
    severity: 'low' | 'medium' | 'high'
    message_ar: string
    message_en: string
    meta?: Record<string, unknown>
  }
  const [alerts, setAlerts] = useState<OpsAlert[]>([])
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<string>>(() => new Set())

  const loadAlerts = async () => {
    try {
      const res = await api.get('/api/admin/alerts')
      setAlerts(res.data?.alerts || [])
    } catch {
      setAlerts([])
    }
  }

  const loadWhatsAppSettings = async () => {
    try {
      const res = await api.get('/api/settings')
      const wa = res.data?.whatsapp
      setWhatsappSettings({
        enabled: !!wa?.enabled,
        token_configured: !!wa?.token_configured,
        whatsapp_phone_e164: wa?.whatsapp_phone_e164,
        whatsapp_provider: wa?.whatsapp_provider,
      })
    } catch {
      setWhatsappSettings({ enabled: false, token_configured: false })
    }
  }

  const saveWhatsAppEnabled = async (enabled: boolean) => {
    try {
      const current = await api.get('/api/settings')
      await api.put('/api/settings', {
        ...current.data,
        whatsapp: { ...current.data?.whatsapp, enabled },
      })
      setWhatsappSettings((s) => ({ ...s, enabled }))
    } catch {
      /* keep current */
    }
  }

  useEffect(() => {
    loadSettings()
    loadRiders()
    loadAutomationStats()
    loadFeatures()
    loadAlerts()
    const interval = setInterval(() => {
      loadRiders()
      loadAutomationStats()
      loadAlerts()
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const ping = async () => {
      const start = Date.now()
      try {
        const r = await fetch('/api/health', { method: 'GET' })
        const ms = Date.now() - start
        setHealthLatency(ms)
        setHealthStatus(ms < 800 ? 'online' : ms < 2500 ? 'slow' : 'offline')
      } catch {
        setHealthStatus('offline')
        setHealthLatency(null)
      }
    }
    ping()
    const t = setInterval(ping, 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const tick = setInterval(() => setLocalTime(new Date()), 1000)
    return () => clearInterval(tick)
  }, [])

  const switchDispatchMode = async () => {
    const next = dispatchMode === 'OFFER_ACCEPT' ? 'AUTO_ASSIGN' : 'OFFER_ACCEPT'
    try {
      const current = await api.get('/api/settings')
      await api.put('/api/settings', { ...current.data, dispatchMode: next })
      setDispatchMode(next)
    } catch {
      // keep current
    }
  }

  const loadFeatures = async () => {
    try {
      const res = await api.get('/api/settings')
      const f = res.data?.features
      if (f && typeof f === 'object') {
        setFeatures({
          customer_portal_enabled: f.customer_portal_enabled !== false,
          store_portal_enabled: f.store_portal_enabled !== false,
          driver_portal_enabled: f.driver_portal_enabled !== false,
          modules_enabled: {
            marketing: f.modules_enabled?.marketing === true,
            accounting: f.modules_enabled?.accounting === true,
            support: f.modules_enabled?.support === true,
            users_roles: f.modules_enabled?.users_roles === true,
            exports: f.modules_enabled?.exports === true,
            settlements: f.modules_enabled?.settlements === true,
            campaigns: f.modules_enabled?.campaigns === true,
            coupons: f.modules_enabled?.coupons === true,
            ops_console: f.modules_enabled?.ops_console !== false,
          },
        })
      }
    } catch (_) {
      /* keep defaults */
    }
  }

  const saveFeatures = async (nextFeatures?: FeaturesFlags) => {
    const toSave = nextFeatures ?? features
    setFeaturesSaving(true)
    try {
      const current = await api.get('/api/settings')
      await api.put('/api/settings', { ...current.data, features: toSave })
      if (nextFeatures) setFeatures(nextFeatures)
    } catch (_) {
      /* show error via message if needed */
    } finally {
      setFeaturesSaving(false)
    }
  }

  const enableAllModules = () => {
    const next = {
      ...features,
      modules_enabled: {
        ...features.modules_enabled,
        marketing: true,
        accounting: true,
        support: true,
        exports: true,
        settlements: true,
        campaigns: true,
        coupons: true,
        ops_console: true,
      },
    }
    saveFeatures(next)
  }

  const disableAllModules = () => {
    if (!window.confirm(language === 'ar' ? 'تعطيل جميع الموديولات؟ لن يتمكن المستخدمون من الوصول لها.' : 'Disable all modules? Users will not be able to access them.')) return
    const next = {
      ...features,
      modules_enabled: {
        ...features.modules_enabled,
        marketing: false,
        accounting: false,
        support: false,
        exports: false,
        settlements: false,
        campaigns: false,
        coupons: false,
        ops_console: false,
      },
    }
    saveFeatures(next)
  }

  const restoreDefaultsModules = () => {
    const next = {
      ...features,
      modules_enabled: {
        ...features.modules_enabled,
        ...DEFAULT_FEATURES.modules_enabled,
        users_roles: features.modules_enabled.users_roles,
      },
    }
    saveFeatures(next)
  }

  const loadSettings = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/settings')
      const data = res.data
      setSettings({
        store_status: data.store_status || 'open',
        minimum_order_value: data.minimum_order_value || 0,
        delivery_fee_base: data.delivery_fee_base || 0,
        delivery_fee_per_km: data.delivery_fee_per_km || 0,
        free_shipping_threshold: data.free_shipping_threshold || 150,
        auto_dispatch_enabled: data.auto_dispatch_enabled !== false,
        auto_assign_on_payment: data.auto_assign_on_payment !== false,
        auto_select_nearest_rider: data.auto_select_nearest_rider !== false,
        max_assign_distance: data.max_assign_distance || 10,
        max_orders_per_rider: data.max_orders_per_rider || 3,
        assignment_timeout_seconds: data.assignment_timeout_seconds || 30,
      })
      const dm = data.dispatchMode || data.dispatch_mode || 'AUTO_ASSIGN'
      setDispatchMode(dm === 'OFFER_ACCEPT' ? 'OFFER_ACCEPT' : 'AUTO_ASSIGN')
    } catch (err: any) {
      console.error('Error loading settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadRiders = async () => {
    try {
      const res = await api.get('/api/admin/riders')
      setRiders(res.data.riders || [])
    } catch (err) {
      console.error('Error loading riders:', err)
    }
  }

  const loadAutomationStats = async () => {
    try {
      const res = await api.get('/api/admin/automation/stats').catch(() => ({ data: {} }))
      setAutomationStats(res.data || {
        total_auto_assignments: 0,
        today_auto_assignments: 0,
        average_assignment_time: 0,
        success_rate: 0,
      })
    } catch (err) {
      console.error('Error loading automation stats:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const currentRes = await api.get('/api/settings')
      const currentSettings = currentRes.data

      await api.put('/api/settings', {
        ...currentSettings,
        store_status: settings.store_status,
        minimum_order_value: settings.minimum_order_value,
        delivery_fee_base: settings.delivery_fee_base,
        delivery_fee_per_km: settings.delivery_fee_per_km,
        free_shipping_threshold: settings.free_shipping_threshold,
        auto_dispatch_enabled: settings.auto_dispatch_enabled,
        auto_assign_on_payment: settings.auto_assign_on_payment,
        auto_select_nearest_rider: settings.auto_select_nearest_rider,
        max_assign_distance: settings.max_assign_distance,
        max_orders_per_rider: settings.max_orders_per_rider,
        assignment_timeout_seconds: settings.assignment_timeout_seconds,
      })

      setMessage({ text: language === 'ar' ? 'تم حفظ الإعدادات بنجاح! ✅' : 'Settings saved successfully! ✅', type: 'success' })
    } catch (err: any) {
      setMessage({
        text: err.response?.data?.message || (language === 'ar' ? 'حدث خطأ في حفظ الإعدادات' : 'Error saving settings'),
        type: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  const getRiderStatusInfo = (status: string) => {
    switch (status) {
      case 'available':
        return { text: language === 'ar' ? 'متاح' : 'Available', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: '🟢' }
      case 'busy':
        return { text: language === 'ar' ? 'مشغول' : 'Busy', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: '🟡' }
      case 'offline':
      default:
        return { text: language === 'ar' ? 'غير متصل' : 'Offline', color: 'bg-gray-100 text-gray-800 border-gray-300', icon: '⚫' }
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
          <div className="text-gray-600 font-['Tajawal']">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
        </div>
      </div>
    )
  }

  const visibleAlerts = alerts.filter((a) => !dismissedAlertIds.has(a.id))
  const onlineRiders = riders.filter((r) => (r.rider_status || '').toLowerCase() !== 'offline').length
  const successRateVariant = automationStats.success_rate >= 80 ? 'success' : automationStats.success_rate >= 50 ? 'warn' : 'danger'

  return (
    <div className="min-h-screen bg-gray-100 font-['Tajawal'] p-4 md:p-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-2">
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-1 flex items-center gap-2">
            <LayoutDashboard className="w-8 h-8 text-emerald-600" />
            {language === 'ar' ? 'لوحة العمليات والتحكم' : 'Operations Control Panel'}
          </h1>
          <p className="text-sm text-gray-600">
            {language === 'ar' ? 'حالة النظام والمتجر والتوصيل' : 'System, store, and delivery status'}
          </p>
        </div>

        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </motion.div>
        )}

        {/* A) Top System Status Bar */}
        <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
            {language === 'ar' ? 'الحالة' : 'Status'}
          </span>
          <span
            className={cx(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold border',
              healthStatus === 'online' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : healthStatus === 'slow' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-red-100 text-red-800 border-red-200'
            )}
          >
            <span className={cx('w-2 h-2 rounded-full', healthStatus === 'online' ? 'bg-emerald-500' : healthStatus === 'slow' ? 'bg-amber-500' : 'bg-red-500')} />
            {healthStatus === 'online' ? (language === 'ar' ? 'متصل' : 'Online') : healthStatus === 'slow' ? (language === 'ar' ? 'بطيء' : 'Slow') : (language === 'ar' ? 'غير متصل' : 'Offline')}
            {healthLatency != null && healthStatus !== 'offline' && <span className="opacity-80">({healthLatency}ms)</span>}
          </span>
          <span className={cx(
            'inline-flex px-3 py-1.5 rounded-full text-sm font-bold border',
            dispatchMode === 'OFFER_ACCEPT' ? 'bg-violet-100 text-violet-800 border-violet-200' : 'bg-blue-100 text-blue-800 border-blue-200'
          )}>
            {dispatchMode === 'OFFER_ACCEPT' ? (language === 'ar' ? 'عروض' : 'OFFER') : (language === 'ar' ? 'تلقائي' : 'AUTO')}
          </span>
          <span className={cx(
            'inline-flex px-3 py-1.5 rounded-full text-sm font-bold border',
            settings.store_status === 'open' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-gray-200 text-gray-700 border-gray-300'
          )}>
            {settings.store_status === 'open' ? (language === 'ar' ? 'المتجر مفتوح' : 'Open') : (language === 'ar' ? 'مغلق' : 'Closed')}
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold bg-gray-100 text-gray-700 border border-gray-200" dir="ltr">
            <Clock className="w-4 h-4" />
            {localTime.toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

        {/* C) Operational Alerts (high priority, always show) */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <h2 className="flex items-center gap-2 px-4 py-3 text-base font-bold text-gray-900 border-b border-gray-100 bg-gray-50/80">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            {language === 'ar' ? 'تنبيهات العمليات' : 'Operational Alerts'}
          </h2>
          <div className="p-4">
            {visibleAlerts.length > 0 ? (
              <ul className="space-y-2">
                {visibleAlerts.map((a) => (
                  <li
                    key={a.id}
                    className={cx(
                      'flex items-center justify-between gap-3 p-3 rounded-xl border',
                      a.severity === 'high' ? 'bg-red-50 border-red-200' : a.severity === 'medium' ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'
                    )}
                  >
                    <span className="text-sm font-bold text-gray-900">{language === 'ar' ? a.message_ar : a.message_en}</span>
                    <button
                      type="button"
                      onClick={() => setDismissedAlertIds((prev) => new Set(prev).add(a.id))}
                      className="shrink-0 px-2 py-1 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 text-xs font-bold"
                    >
                      {language === 'ar' ? 'إخفاء' : 'Dismiss'}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-6 text-center text-gray-500">
                <p className="text-sm font-medium">{language === 'ar' ? 'لا توجد تنبيهات نشطة' : 'No active alerts'}</p>
                <p className="text-xs mt-1 max-w-sm mx-auto">
                  {language === 'ar' ? 'يظهر هنا: تجاوز SLA، عدم وجود riders متصلين، طلبات بانتظار التعيين.' : 'Shown here: SLA breaches, no active riders, orders pending assignment.'}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* B) KPI Cards */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label={language === 'ar' ? 'إجمالي التخصيصات' : 'Total Assignments'}
            value={formatNumber(automationStats.total_auto_assignments)}
            statusVariant="info"
            subtitle={language === 'ar' ? 'كل الوقت' : 'All time'}
          />
          <StatCard
            label={language === 'ar' ? 'تخصيصات اليوم' : 'Today'}
            value={formatNumber(automationStats.today_auto_assignments)}
            statusVariant="success"
            subtitle={language === 'ar' ? 'هدف 120' : 'Target 120'}
          />
          <StatCard
            label={language === 'ar' ? 'متوسط وقت التخصيص' : 'Avg Assignment Time'}
            value={`${formatNumber(automationStats.average_assignment_time, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}s`}
            statusVariant="info"
          />
          <StatCard
            label={language === 'ar' ? 'معدل النجاح' : 'Success Rate'}
            value={`${formatNumber(automationStats.success_rate, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`}
            statusVariant={successRateVariant}
            subtitle={language === 'ar' ? 'آخر 30 يوم' : 'Last 30 days'}
          />
        </section>

        {/* D) Action Center (real actions) */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            {language === 'ar' ? 'مركز الإجراءات' : 'Action Center'}
          </h2>
          <div className="flex flex-wrap gap-3">
            {isSuperAdmin && (
              <Button variant="secondary" size="sm" onClick={switchDispatchMode} className="font-bold">
                {dispatchMode === 'OFFER_ACCEPT' ? (language === 'ar' ? 'تبديل إلى تلقائي' : 'Switch to AUTO') : (language === 'ar' ? 'تبديل إلى عروض' : 'Switch to OFFER')}
              </Button>
            )}
            <button
              type="button"
              onClick={() => setSettings((s) => ({ ...s, store_status: s.store_status === 'open' ? 'closed' : 'open' }))}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-800 text-sm font-bold hover:bg-gray-50"
            >
              {settings.store_status === 'open' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {settings.store_status === 'open' ? (language === 'ar' ? 'إيقاف الطلبات' : 'Pause Orders') : (language === 'ar' ? 'استئناف الطلبات' : 'Resume Orders')}
            </button>
            <Link
              to="/admin/ops/live-dispatch"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700"
            >
              <ExternalLink className="w-4 h-4" />
              {language === 'ar' ? 'لوحة الإرسال المباشر' : 'Open Live Dispatch'}
            </Link>
            <Link
              to="/admin/ops/sla"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm font-bold hover:bg-emerald-100"
            >
              <ExternalLink className="w-4 h-4" />
              {language === 'ar' ? 'صفحة SLA' : 'View SLA'}
            </Link>
          </div>
        </section>

        {/* Feature Flags & Integrations — no staff permissions here */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200"
        >
          {/* Page intro: feature flags only, not permissions */}
          <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-sm font-medium text-blue-900">
              {t('admin.control.pageIntro') ||
                (language === 'ar'
                  ? 'هذه الصفحة لإعدادات تشغيل النظام (بوابات/موديولات/تكاملات) فقط، ولا تؤثر على صلاحيات الموظفين.'
                  : 'This page is for system runtime settings (gateways/modules/integrations) only and does not affect staff permissions.')}
            </p>
          </div>

          {/* A) بوابات النظام (Gateways) */}
          <section className="mb-6">
            <h3 className="text-base font-bold text-gray-900 mb-3">
              {language === 'ar' ? 'بوابات النظام (Gateways)' : 'System Gateways'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { key: 'customer_portal_enabled' as const, labelAr: 'بوابة العملاء', labelEn: 'Customer portal' },
                { key: 'store_portal_enabled' as const, labelAr: 'بوابة المتجر', labelEn: 'Store portal' },
                { key: 'driver_portal_enabled' as const, labelAr: 'بوابة المندوب', labelEn: 'Driver portal' },
              ].map(({ key, labelAr, labelEn }) => (
                <label key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-sm font-bold text-gray-800">{language === 'ar' ? labelAr : labelEn}</span>
                  <input
                    type="checkbox"
                    checked={features[key]}
                    onChange={(e) => { setFeatures((f) => ({ ...f, [key]: e.target.checked })); setTimeout(saveFeatures, 0) }}
                    disabled={featuresSaving}
                    className="rounded border-gray-300"
                  />
                </label>
              ))}
            </div>
          </section>

          {/* B) موديولات النظام (Modules) — no users_roles */}
          <section className="mb-6">
            <h3 className="text-base font-bold text-gray-900 mb-3">
              {language === 'ar' ? 'موديولات النظام (Modules)' : 'System Modules'}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { key: 'marketing' as const, labelAr: 'التسويق', labelEn: 'Marketing' },
                { key: 'accounting' as const, labelAr: 'المحاسبة', labelEn: 'Accounting' },
                { key: 'support' as const, labelAr: 'الدعم', labelEn: 'Support' },
                { key: 'exports' as const, labelAr: 'التصدير', labelEn: 'Exports' },
                { key: 'settlements' as const, labelAr: 'التسويات', labelEn: 'Settlements' },
                { key: 'campaigns' as const, labelAr: 'الحملات', labelEn: 'Campaigns' },
                { key: 'coupons' as const, labelAr: 'الكوبونات', labelEn: 'Coupons' },
                { key: 'ops_console' as const, labelAr: 'لوحة العمليات', labelEn: 'Ops Console' },
              ].map(({ key, labelAr, labelEn }) => (
                <label key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-sm font-bold text-gray-800">{language === 'ar' ? labelAr : labelEn}</span>
                  <input
                    type="checkbox"
                    checked={features.modules_enabled[key]}
                    onChange={(e) => {
                      setFeatures((f) => ({
                        ...f,
                        modules_enabled: { ...f.modules_enabled, [key]: e.target.checked },
                      }))
                      setTimeout(saveFeatures, 0)
                    }}
                    disabled={featuresSaving}
                    className="rounded border-gray-300"
                  />
                </label>
              ))}
            </div>
            {isSuperAdmin && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={enableAllModules} disabled={featuresSaving} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50">
                  {language === 'ar' ? 'تفعيل كل الموديولات' : 'Enable All Modules'}
                </button>
                <button type="button" onClick={disableAllModules} disabled={featuresSaving} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50">
                  {language === 'ar' ? 'تعطيل كل الموديولات' : 'Disable All Modules'}
                </button>
                <button type="button" onClick={restoreDefaultsModules} disabled={featuresSaving} className="px-3 py-1.5 rounded-lg border-2 border-gray-400 text-gray-700 text-sm font-bold hover:bg-gray-100 disabled:opacity-50">
                  {language === 'ar' ? 'استعادة الافتراضي' : 'Restore Defaults'}
                </button>
              </div>
            )}
          </section>

          {/* C) تكاملات (Integrations): WhatsApp + Webhook */}
          <section className="mb-6">
            <h3 className="text-base font-bold text-gray-900 mb-3">
              {language === 'ar' ? 'تكاملات (Integrations)' : 'Integrations'}
            </h3>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <h4 className="text-sm font-bold text-gray-800 mb-3">{language === 'ar' ? 'واتساب (التسويق)' : 'WhatsApp (Marketing)'}</h4>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={whatsappSettings.enabled}
                    onChange={(e) => saveWhatsAppEnabled(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-bold text-gray-800">{language === 'ar' ? 'تفعيل واتساب' : 'WhatsApp enabled'}</span>
                </label>
                <span className={cx(
                  'inline-flex px-3 py-1.5 rounded-full text-sm font-bold border',
                  whatsappSettings.token_configured ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                )}>
                  {whatsappSettings.token_configured ? (language === 'ar' ? 'مُعدّ' : 'Configured') : (language === 'ar' ? 'غير مُعدّ' : 'Not configured')}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {language === 'ar' ? 'رمز الوصول يُضبط في WHATSAPP_ACCESS_TOKEN فقط.' : 'Access token via WHATSAPP_ACCESS_TOKEN env only.'}
              </p>
              <p className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-2">
                <span>{language === 'ar' ? 'رابط Webhook:' : 'Webhook URL:'}</span>
                <code className="font-mono text-xs break-all bg-gray-100 px-1 rounded">https://api.tomo-sa.com/api/webhooks/whatsapp</code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText('https://api.tomo-sa.com/api/webhooks/whatsapp')
                    setMessage({ text: language === 'ar' ? 'تم النسخ' : 'Copied', type: 'success' })
                    setTimeout(() => setMessage(null), 2000)
                  }}
                  className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-100"
                >
                  {language === 'ar' ? 'نسخ' : 'Copy'}
                </button>
              </p>
            </div>
          </section>

          {/* D) صلاحيات الموظفين — redirect only */}
          <section className="mb-6">
            <div className="p-4 rounded-xl border-2 border-emerald-200 bg-emerald-50/50">
              <h4 className="text-sm font-bold text-gray-800 mb-1 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-700" />
                {t('admin.control.permissionsCardTitle') || (language === 'ar' ? 'صلاحيات الموظفين' : 'Staff permissions')}
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                {t('admin.control.permissionsCardDesc') || (language === 'ar' ? 'تُدار من صفحة المستخدمين والصلاحيات.' : 'Managed from the Users & Permissions page.')}
              </p>
              {canManageUsers && (
                <Link
                  to="/admin/users"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-[#047857] bg-[#047857] text-white text-sm font-bold hover:bg-[#065f46] transition-colors shadow-sm"
                >
                  <Users className="w-4 h-4" />
                  {t('admin.control.openUsersPermissions') || (language === 'ar' ? 'فتح المستخدمين والصلاحيات' : 'Open Users & Permissions')}
                </Link>
              )}
            </div>
          </section>

          {/* Admin appearance (UI-only) */}
          <section className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <h4 className="text-sm font-bold text-gray-800 mb-2">{language === 'ar' ? 'مظهر لوحة التحكم' : 'Admin appearance'}</h4>
            <p className="text-xs text-gray-500 mb-3">{language === 'ar' ? 'تغيير شكلي فقط — لا يؤثر على التشغيل' : 'Cosmetic only — does not affect operation.'}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => { applyAdminTheme('light'); setAdminThemeMode('light') }}
                className={cx(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-colors',
                  adminThemeMode === 'light' ? 'bg-[#047857] text-white border-[#047857]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                )}
              >
                <Sun className="w-4 h-4" />
                {language === 'ar' ? 'فاتح' : 'Light'}
              </button>
              <button
                type="button"
                onClick={() => { applyAdminTheme('dark_accents'); setAdminThemeMode('dark_accents') }}
                className={cx(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-colors',
                  adminThemeMode === 'dark_accents' ? 'bg-[#047857] text-white border-[#047857]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                )}
              >
                <Moon className="w-4 h-4" />
                {language === 'ar' ? 'داكن فاخر (آمن)' : 'Dark accents (safe)'}
              </button>
            </div>
          </section>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Store Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200"
          >
            <h3 className="text-xl font-bold mb-6 text-gray-900 flex items-center gap-2">
              <span>🏪</span>
              {language === 'ar' ? 'حالة المتجر' : 'Store Status'}
            </h3>
            <div className="flex items-center justify-between gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex-1">
                <h4 className="text-lg font-bold mb-2 text-gray-800">
                  {settings.store_status === 'open' ? '🟢 ' : '🔴 '}
                  {language === 'ar' ? (settings.store_status === 'open' ? 'المتجر مفتوح' : 'المتجر مغلق') : (settings.store_status === 'open' ? 'Store Open' : 'Store Closed')}
                </h4>
                <p className="text-sm text-gray-600">
                  {language === 'ar' 
                    ? (settings.store_status === 'open' ? 'المتجر متاح حالياً لاستقبال الطلبات' : 'المتجر مغلق حالياً - لن يتم قبول طلبات جديدة')
                    : (settings.store_status === 'open' ? 'Store is currently accepting orders' : 'Store is closed - new orders will not be accepted')
                  }
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.store_status === 'open'}
                  onChange={(e) => setSettings({ ...settings, store_status: e.target.checked ? 'open' : 'closed' })}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </motion.div>

          {/* Automation Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100"
          >
            <h3 className="text-xl font-bold mb-6 text-gray-900 flex items-center gap-2">
              <span>🤖</span>
              {language === 'ar' ? 'إعدادات الأتمتة' : 'Automation Settings'}
            </h3>

            <div className="space-y-4">
              {/* Auto Dispatch */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">⚡</span>
                    <h4 className="font-bold text-gray-900">{language === 'ar' ? 'التخصيص التلقائي للمناديب' : 'Auto Dispatch System'}</h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    {language === 'ar' ? 'تخصيص المناديب للطلبات تلقائياً بدون تدخل يدوي' : 'Automatically assign riders to orders without manual intervention'}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    checked={settings.auto_dispatch_enabled}
                    onChange={(e) => setSettings({ ...settings, auto_dispatch_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Auto Select Nearest Rider */}
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">📍</span>
                    <h4 className="font-bold text-gray-900">{language === 'ar' ? 'اختيار المندوب الأقرب تلقائياً' : 'Auto Select Nearest Rider'}</h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    {language === 'ar' ? 'الموقع يختار المندوب الأقرب للطلب تلقائياً بناءً على الموقع' : 'System automatically selects the nearest rider based on location'}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    checked={settings.auto_select_nearest_rider}
                    onChange={(e) => setSettings({ ...settings, auto_select_nearest_rider: e.target.checked })}
                    disabled={!settings.auto_dispatch_enabled}
                    className="sr-only peer"
                  />
                  <div className={`w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600 ${!settings.auto_dispatch_enabled ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                </label>
              </div>

              {/* Auto Assign on Payment */}
              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl border border-purple-200">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">💳</span>
                    <h4 className="font-bold text-gray-900">{language === 'ar' ? 'التخصيص التلقائي عند الدفع' : 'Auto Assign on Payment'}</h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    {language === 'ar' ? 'تخصيص مندوب تلقائياً عند اكتمال عملية الدفع' : 'Automatically assign rider when payment is completed'}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    checked={settings.auto_assign_on_payment}
                    onChange={(e) => setSettings({ ...settings, auto_assign_on_payment: e.target.checked })}
                    disabled={!settings.auto_dispatch_enabled}
                    className="sr-only peer"
                  />
                  <div className={`w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600 ${!settings.auto_dispatch_enabled ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                </label>
              </div>
            </div>

            {/* Advanced Automation Settings */}
            {settings.auto_dispatch_enabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-6 pt-6 border-t border-gray-200 space-y-4"
              >
                <h4 className="font-bold text-gray-900 mb-4">{language === 'ar' ? 'الإعدادات المتقدمة' : 'Advanced Settings'}</h4>

                {/* Max Assignment Distance */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    {language === 'ar' ? 'أقصى مسافة للتخصيص (كم)' : 'Max Assignment Distance (km)'}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    min="1"
                    max="50"
                    value={settings.max_assign_distance === 0 ? '' : formatNumber(settings.max_assign_distance)}
                    onChange={(e) => {
                      const parsed = parseNumber(e.target.value)
                      if (!isNaN(parsed) && parsed >= 1 && parsed <= 50) {
                        setSettings({ ...settings, max_assign_distance: parsed })
                      } else if (e.target.value === '') {
                        setSettings({ ...settings, max_assign_distance: 0 })
                      }
                    }}
                    onBlur={(e) => {
                      const parsed = parseNumber(e.target.value)
                      if (isNaN(parsed) || parsed < 1) {
                        setSettings({ ...settings, max_assign_distance: 1 })
                      } else if (parsed > 50) {
                        setSettings({ ...settings, max_assign_distance: 50 })
                      }
                    }}
                    placeholder="10"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-left"
                    dir="ltr"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {language === 'ar' ? 'الحد الأقصى للمسافة بين المندوب والطلب' : 'Maximum distance between rider and order location'}
                  </p>
                </div>

                {/* Max Orders Per Rider */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    {language === 'ar' ? 'أقصى عدد طلبات لكل مندوب' : 'Max Orders Per Rider'}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    min="1"
                    max="10"
                    value={settings.max_orders_per_rider === 0 ? '' : formatNumber(settings.max_orders_per_rider)}
                    onChange={(e) => {
                      const parsed = parseNumber(e.target.value)
                      if (!isNaN(parsed) && parsed >= 1 && parsed <= 10) {
                        setSettings({ ...settings, max_orders_per_rider: parsed })
                      } else if (e.target.value === '') {
                        setSettings({ ...settings, max_orders_per_rider: 0 })
                      }
                    }}
                    onBlur={(e) => {
                      const parsed = parseNumber(e.target.value)
                      if (isNaN(parsed) || parsed < 1) {
                        setSettings({ ...settings, max_orders_per_rider: 1 })
                      } else if (parsed > 10) {
                        setSettings({ ...settings, max_orders_per_rider: 10 })
                      }
                    }}
                    placeholder="3"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-left"
                    dir="ltr"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {language === 'ar' ? 'الحد الأقصى لعدد الطلبات التي يمكن تخصيصها لمندوب واحد في نفس الوقت' : 'Maximum number of orders that can be assigned to one rider simultaneously'}
                  </p>
                </div>

                {/* Assignment Timeout */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    {language === 'ar' ? 'مهلة التخصيص (ثانية)' : 'Assignment Timeout (seconds)'}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    min="10"
                    max="300"
                    value={settings.assignment_timeout_seconds === 0 ? '' : formatNumber(settings.assignment_timeout_seconds)}
                    onChange={(e) => {
                      const parsed = parseNumber(e.target.value)
                      if (!isNaN(parsed) && parsed >= 10 && parsed <= 300) {
                        setSettings({ ...settings, assignment_timeout_seconds: parsed })
                      } else if (e.target.value === '') {
                        setSettings({ ...settings, assignment_timeout_seconds: 0 })
                      }
                    }}
                    onBlur={(e) => {
                      const parsed = parseNumber(e.target.value)
                      if (isNaN(parsed) || parsed < 10) {
                        setSettings({ ...settings, assignment_timeout_seconds: 10 })
                      } else if (parsed > 300) {
                        setSettings({ ...settings, assignment_timeout_seconds: 300 })
                      }
                    }}
                    placeholder="30"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-left"
                    dir="ltr"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {language === 'ar' ? 'الوقت المحدد قبل إعادة محاولة التخصيص لمندوب آخر' : 'Time before retrying assignment to another rider'}
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Automation Statistics (duplicate KPIs in form context) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-50 rounded-2xl p-6 border border-gray-200"
          >
            <h3 className="text-lg font-bold mb-4 text-gray-900 flex items-center gap-2">
              {language === 'ar' ? 'إحصائيات الأتمتة' : 'Automation Statistics'}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label={language === 'ar' ? 'إجمالي التخصيصات' : 'Total Assignments'} value={formatNumber(automationStats.total_auto_assignments)} statusVariant="info" />
              <StatCard label={language === 'ar' ? 'تخصيصات اليوم' : 'Today'} value={formatNumber(automationStats.today_auto_assignments)} statusVariant="success" />
              <StatCard label={language === 'ar' ? 'متوسط وقت التخصيص' : 'Avg Time'} value={`${formatNumber(automationStats.average_assignment_time, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}s`} statusVariant="info" />
              <StatCard label={language === 'ar' ? 'معدل النجاح' : 'Success Rate'} value={`${formatNumber(automationStats.success_rate, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`} statusVariant={successRateVariant} />
            </div>
          </motion.div>

          {/* Delivery Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200"
          >
            <h3 className="text-xl font-bold mb-6 text-gray-900 flex items-center gap-2">
              <span>🚚</span>
              {language === 'ar' ? 'إعدادات التوصيل' : 'Delivery Settings'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  {language === 'ar' ? 'الحد الأدنى للطلب' : 'Minimum Order Value'} ({t('currency')})
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={settings.minimum_order_value === 0 ? '' : formatAdminNumber(settings.minimum_order_value, 2)}
                  onChange={(e) => {
                    const cleaned = cleanDecimalInput(e.target.value)
                    if (cleaned === '' || cleaned === '.') {
                      setSettings({ ...settings, minimum_order_value: 0 })
                    } else {
                      const parsed = parseNumber(cleaned)
                      if (!isNaN(parsed) && parsed >= 0) {
                        setSettings({ ...settings, minimum_order_value: parsed })
                      }
                    }
                  }}
                  onBlur={(e) => {
                    const parsed = parseNumber(e.target.value)
                    if (isNaN(parsed) || parsed < 0) {
                      setSettings({ ...settings, minimum_order_value: 0 })
                    } else {
                      // Format on blur for clean display
                      setSettings({ ...settings, minimum_order_value: parsed })
                    }
                  }}
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-left font-mono"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  {language === 'ar' ? 'عتبة التوصيل المجاني' : 'Free Shipping Threshold'} ({t('currency')})
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={settings.free_shipping_threshold === 0 ? '' : formatAdminNumber(settings.free_shipping_threshold, 2)}
                  onChange={(e) => {
                    const cleaned = cleanDecimalInput(e.target.value)
                    if (cleaned === '' || cleaned === '.') {
                      setSettings({ ...settings, free_shipping_threshold: 0 })
                    } else {
                      const parsed = parseNumber(cleaned)
                      if (!isNaN(parsed) && parsed >= 0) {
                        setSettings({ ...settings, free_shipping_threshold: parsed })
                      }
                    }
                  }}
                  onBlur={(e) => {
                    const parsed = parseNumber(e.target.value)
                    if (isNaN(parsed) || parsed < 0) {
                      setSettings({ ...settings, free_shipping_threshold: 0 })
                    } else {
                      setSettings({ ...settings, free_shipping_threshold: parsed })
                    }
                  }}
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-left font-mono"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  {language === 'ar' ? 'رسوم التوصيل الأساسية' : 'Base Delivery Fee'} ({t('currency')})
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={settings.delivery_fee_base === 0 ? '' : formatAdminNumber(settings.delivery_fee_base, 2)}
                  onChange={(e) => {
                    const cleaned = cleanDecimalInput(e.target.value)
                    if (cleaned === '' || cleaned === '.') {
                      setSettings({ ...settings, delivery_fee_base: 0 })
                    } else {
                      const parsed = parseNumber(cleaned)
                      if (!isNaN(parsed) && parsed >= 0) {
                        setSettings({ ...settings, delivery_fee_base: parsed })
                      }
                    }
                  }}
                  onBlur={(e) => {
                    const parsed = parseNumber(e.target.value)
                    if (isNaN(parsed) || parsed < 0) {
                      setSettings({ ...settings, delivery_fee_base: 0 })
                    } else {
                      setSettings({ ...settings, delivery_fee_base: parsed })
                    }
                  }}
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-left font-mono"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  {language === 'ar' ? 'رسوم التوصيل لكل كيلومتر' : 'Delivery Fee Per Km'} ({t('currency')})
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={settings.delivery_fee_per_km === 0 ? '' : formatAdminNumber(settings.delivery_fee_per_km, 2)}
                  onChange={(e) => {
                    const cleaned = cleanDecimalInput(e.target.value)
                    if (cleaned === '' || cleaned === '.') {
                      setSettings({ ...settings, delivery_fee_per_km: 0 })
                    } else {
                      const parsed = parseNumber(cleaned)
                      if (!isNaN(parsed) && parsed >= 0) {
                        setSettings({ ...settings, delivery_fee_per_km: parsed })
                      }
                    }
                  }}
                  onBlur={(e) => {
                    const parsed = parseNumber(e.target.value)
                    if (isNaN(parsed) || parsed < 0) {
                      setSettings({ ...settings, delivery_fee_per_km: 0 })
                    } else {
                      setSettings({ ...settings, delivery_fee_per_km: parsed })
                    }
                  }}
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-left font-mono"
                  dir="ltr"
                />
              </div>
            </div>
          </motion.div>

          {/* Active Riders */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-50 rounded-2xl p-6 border border-gray-200"
          >
            <h3 className="text-xl font-bold mb-6 text-gray-900 flex items-center gap-2">
              <span>🚴</span>
              {language === 'ar' ? 'المناديب النشطين' : 'Active Riders'}
              <span className="text-sm font-normal text-gray-500" dir="ltr">({formatNumber(riders.length)})</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {riders.slice(0, 6).map((rider) => {
                const statusInfo = getRiderStatusInfo(rider.rider_status)
                return (
                  <div key={rider.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-gray-900">{rider.name}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold border ${statusInfo.color}`}>
                        {statusInfo.icon} {statusInfo.text}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{rider.phone}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {language === 'ar' ? (
                        <span dir="ltr">{formatNumber(rider.active_orders_count)}</span>
                      ) : (
                        <span dir="ltr">{formatNumber(rider.active_orders_count)}</span>
                      )} {language === 'ar' ? 'طلب نشط' : 'active orders'}
                    </p>
                  </div>
                )
              })}
            </div>
          </motion.div>

          {/* Save Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={saving}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 px-6 rounded-xl font-bold text-lg shadow-lg shadow-emerald-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? '💾 حفظ جميع الإعدادات' : '💾 Save All Settings')}
          </motion.button>
        </form>
      </div>
    </div>
  )
}
