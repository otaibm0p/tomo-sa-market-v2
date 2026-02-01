import { useEffect, useMemo, useState } from 'react'
import api from '../../utils/api'
import { useLanguage } from '../../context/LanguageContext'
import { getOpsDigestEnabled, setOpsDigestEnabled } from '../../shared/featureFlags'
import { getGuardrails } from '../../shared/guardrails'
import { addDecision, listDecisions } from '../../shared/decisionLog'

type Severity = 'low' | 'med' | 'high'

type OpsDigestResponse = {
  ts: string
  kpis: {
    ordersToday: number
    ordersLastHour: number
    avgOrderValueToday: number | null
    avgPrepTimeMin: number | null
    readyWithoutDriverCount: number
    cancelledTodayCount: number
    activeDriversCount: number | null
  }
  alerts: Array<{
    id: string
    severity: Severity
    title: string
    detail: string
    suggestedAction: string
  }>
  recommendations: Array<{
    id: string
    title: string
    steps: string[]
  }>
}

function severityTone(s: Severity) {
  switch (s) {
    case 'high':
      return { chip: 'bg-red-100 text-red-800 border-red-200', dot: 'bg-red-600' }
    case 'med':
      return { chip: 'bg-yellow-100 text-yellow-800 border-yellow-200', dot: 'bg-yellow-600' }
    default:
      return { chip: 'bg-gray-100 text-gray-800 border-gray-200', dot: 'bg-gray-600' }
  }
}

function fmt(v: number | null | undefined, suffix = '') {
  if (v == null || Number.isNaN(v)) return '—'
  const n = typeof v === 'number' ? v : Number(v)
  return `${n.toFixed(1)}${suffix}`
}

export default function OpsDigest() {
  const { language } = useLanguage()
  const [enabled, setEnabled] = useState<boolean>(() => getOpsDigestEnabled())
  const [loading, setLoading] = useState(false)
  const [showNoDataBanner, setShowNoDataBanner] = useState(false)
  const [data, setData] = useState<OpsDigestResponse | null>(null)

  const title = language === 'ar' ? 'AI Ops Digest' : 'AI Ops Digest'

  const reload = async () => {
    if (!enabled) return
    try {
      setLoading(true)
      setShowNoDataBanner(false)
      const res = await api.get('/api/admin/ops-digest')
      setData(res.data)
    } catch (e: any) {
      // Graceful fallback:
      // - no scary "server error" message
      // - keep KPIs as 0 / null via UI defaults
      // - show calm banner to explain that data isn't available (local / no DB / network)
      setShowNoDataBanner(true)
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  const kpiCards = useMemo(() => {
    const k = data?.kpis
    return [
      { id: 'ordersToday', label: language === 'ar' ? 'طلبات اليوم' : 'Orders Today', value: k?.ordersToday ?? 0 },
      { id: 'ordersLastHour', label: language === 'ar' ? 'طلبات آخر ساعة' : 'Orders Last Hour', value: k?.ordersLastHour ?? 0 },
      { id: 'avgOrderValueToday', label: language === 'ar' ? 'متوسط قيمة الطلب (اليوم)' : 'Avg Order Value (Today)', value: k?.avgOrderValueToday == null ? '—' : fmt(k?.avgOrderValueToday, '') },
      { id: 'avgPrepTimeMin', label: language === 'ar' ? 'متوسط وقت التجهيز (دقيقة)' : 'Avg Prep Time (min)', value: k?.avgPrepTimeMin == null ? '—' : fmt(k?.avgPrepTimeMin, '') },
      { id: 'readyNoDriver', label: language === 'ar' ? 'جاهز بدون مندوب' : 'Ready w/o Driver', value: k?.readyWithoutDriverCount ?? 0 },
      { id: 'cancelledToday', label: language === 'ar' ? 'ملغي اليوم' : 'Cancelled Today', value: k?.cancelledTodayCount ?? 0 },
      { id: 'activeDrivers', label: language === 'ar' ? 'مناديب نشطون' : 'Active Drivers', value: data?.kpis.activeDriversCount ?? '—' },
    ]
  }, [data, language])

  const guardrailsAlerts = useMemo(() => {
    if (!data?.kpis) return []
    const g = getGuardrails()

    const ordersToday = Number(data.kpis.ordersToday || 0)
    const ordersLastHour = Number(data.kpis.ordersLastHour || 0)
    const readyWithoutDriverCount = Number(data.kpis.readyWithoutDriverCount || 0)
    const cancelledTodayCount = Number(data.kpis.cancelledTodayCount || 0)
    const cancelRate = ordersToday > 0 ? cancelledTodayCount / ordersToday : 0

    const out: OpsDigestResponse['alerts'] = []

    if (readyWithoutDriverCount > g.MAX_READY_WITHOUT_DRIVER) {
      out.push({
        id: 'guardrails_ready_without_driver',
        severity: 'high',
        title: language === 'ar' ? 'تجاوز: جاهز بدون مندوب' : 'Exceeded: Ready w/o driver',
        detail:
          language === 'ar'
            ? `الحالي ${readyWithoutDriverCount} أعلى من الحد ${g.MAX_READY_WITHOUT_DRIVER}.`
            : `Now ${readyWithoutDriverCount} is above limit ${g.MAX_READY_WITHOUT_DRIVER}.`,
        suggestedAction: language === 'ar' ? 'فعّل توزيع أسرع أو زد عدد المناديب المتاحين.' : 'Dispatch faster or increase available drivers.',
      })
    }

    if (ordersLastHour > g.MAX_ORDERS_LAST_HOUR) {
      out.push({
        id: 'guardrails_orders_last_hour',
        severity: 'med',
        title: language === 'ar' ? 'تجاوز: طلبات آخر ساعة' : 'Exceeded: Orders last hour',
        detail:
          language === 'ar'
            ? `الحالي ${ordersLastHour} أعلى من الحد ${g.MAX_ORDERS_LAST_HOUR}.`
            : `Now ${ordersLastHour} is above limit ${g.MAX_ORDERS_LAST_HOUR}.`,
        suggestedAction: language === 'ar' ? 'راقب الضغط وفعّل خطة دعم/تجهيز.' : 'Monitor load and enable staffing/prep support.',
      })
    }

    if (cancelRate > g.MAX_CANCEL_RATE) {
      out.push({
        id: 'guardrails_cancel_rate',
        severity: 'med',
        title: language === 'ar' ? 'تجاوز: معدل الإلغاءات' : 'Exceeded: Cancellation rate',
        detail:
          language === 'ar'
            ? `الحالي ${(cancelRate * 100).toFixed(1)}% أعلى من الحد ${(g.MAX_CANCEL_RATE * 100).toFixed(1)}%.`
            : `Now ${(cancelRate * 100).toFixed(1)}% is above limit ${(g.MAX_CANCEL_RATE * 100).toFixed(1)}%.`,
        suggestedAction: language === 'ar' ? 'راجع أسباب الإلغاء (تأخير/نفاد مخزون) وحسّن التواصل.' : 'Review cancellation reasons and improve communication.',
      })
    }

    return out
  }, [data, language])

  const alertsToRender = useMemo(() => {
    const base = data?.alerts || []
    // Overlay (client-side) guardrails alerts without modifying server data shape.
    return [...base, ...guardrailsAlerts]
  }, [data, guardrailsAlerts])

  useEffect(() => {
    // Decision Log: record guardrails alert breaches (client-side), deduped for 10 minutes by title+severity.
    if (!enabled) return
    if (showNoDataBanner) return
    if (!guardrailsAlerts.length) return

    const now = Date.now()
    const TEN_MIN = 10 * 60 * 1000
    const existing = listDecisions()

    for (const a of guardrailsAlerts) {
      const key = `${a.title}__${a.severity}`
      const recent = existing.find((d) => {
        if (`${d.title}__${d.severity}` !== key) return false
        const ts = Date.parse(d.ts)
        if (!Number.isFinite(ts)) return false
        return now - ts <= TEN_MIN
      })
      if (recent) continue

      addDecision({
        type: 'ALERT',
        severity: a.severity,
        title: a.title,
        detail: a.detail,
        source: 'guardrails',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guardrailsAlerts, enabled, showNoDataBanner])

  return (
    <div className="min-h-screen bg-gray-50 font-['Tajawal'] p-4 md:p-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">{title}</h1>
            <p className="text-sm text-gray-600">
              {language === 'ar'
                ? 'ملخص تشغيل آمن (قراءة فقط) يعتمد على قواعد بسيطة.'
                : 'Safe, read-only operations digest based on simple rules.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const next = !enabled
                setOpsDigestEnabled(next)
                setEnabled(next)
              }}
              className={`px-4 py-2 rounded-xl font-bold border ${
                enabled ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-white text-gray-800 border-gray-200'
              }`}
            >
              {enabled ? (language === 'ar' ? 'مفعل' : 'Enabled') : (language === 'ar' ? 'معطل' : 'Disabled')}
            </button>

            <button
              type="button"
              disabled={!enabled || loading}
              onClick={reload}
              className="px-4 py-2 rounded-xl font-bold bg-gray-900 text-white disabled:opacity-50"
            >
              {loading ? '...' : language === 'ar' ? 'تحديث' : 'Refresh'}
            </button>
          </div>
        </div>

        {!enabled ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="font-extrabold text-gray-900">{language === 'ar' ? 'الميزة معطلة' : 'Feature disabled'}</div>
            <div className="text-sm text-gray-600 mt-1">
              {language === 'ar'
                ? 'فعّل AI Ops Digest من الزر أعلاه.'
                : 'Enable AI Ops Digest using the toggle above.'}
            </div>
          </div>
        ) : null}

        {enabled && showNoDataBanner ? (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
            <div className="font-extrabold text-gray-900">
              {language === 'ar' ? 'لا توجد بيانات تشغيل محلية حالياً' : 'No local ops data available right now'}
            </div>
            <div className="mt-1 text-sm text-gray-600">
              {language === 'ar'
                ? 'هذه الصفحة تعمل بكامل طاقتها عند توفر بيانات الطلبات'
                : 'This page works best when order data is available.'}
            </div>
          </div>
        ) : null}

        {enabled ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiCards.map((c) => (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="text-xs font-bold text-gray-500">{c.label}</div>
                <div className="mt-2 text-2xl font-extrabold text-gray-900" dir="ltr">
                  {c.value as any}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {enabled ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between">
                <div className="text-lg font-extrabold text-gray-900">{language === 'ar' ? 'التنبيهات' : 'Alerts'}</div>
                <div className="text-xs text-gray-500" dir="ltr">{data?.ts ? new Date(data.ts).toLocaleString() : ''}</div>
              </div>
              <div className="mt-4 space-y-3">
                {alertsToRender.length ? (
                  alertsToRender.map((a) => {
                    const tone = severityTone(a.severity)
                    return (
                      <div key={a.id} className="rounded-xl border border-gray-100 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="font-extrabold text-gray-900">{a.title}</div>
                          <span className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-extrabold border rounded-full ${tone.chip}`}>
                            <span className={`w-2 h-2 rounded-full ${tone.dot}`} />
                            {a.severity.toUpperCase()}
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-gray-700">{a.detail}</div>
                        <div className="mt-2 text-sm font-bold text-gray-900">{a.suggestedAction}</div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-sm text-gray-600">{language === 'ar' ? 'لا توجد تنبيهات حالياً' : 'No alerts right now'}</div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="text-lg font-extrabold text-gray-900">{language === 'ar' ? 'التوصيات' : 'Recommendations'}</div>
              <div className="mt-4 space-y-3">
                {data?.recommendations?.length ? (
                  data.recommendations.map((r) => (
                    <div key={r.id} className="rounded-xl border border-gray-100 p-4">
                      <div className="font-extrabold text-gray-900">{r.title}</div>
                      <ol className="mt-2 space-y-1 text-sm text-gray-700 list-decimal list-inside">
                        {r.steps.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ol>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-600">{language === 'ar' ? 'لا توجد توصيات' : 'No recommendations'}</div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

