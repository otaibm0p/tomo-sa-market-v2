import { useEffect, useMemo, useState } from 'react'
import api from '../../utils/api'
import { useLanguage } from '../../context/LanguageContext'
import { DEFAULT_GUARDRAILS, getGuardrails, resetGuardrailsToDefaults, setGuardrails, type GuardrailsConfig } from '../../shared/guardrails'

type OpsDigestKpis = {
  ordersToday: number
  ordersLastHour: number
  readyWithoutDriverCount: number
  cancelledTodayCount: number
}

type OpsDigestResponseLite = {
  ts?: string
  kpis?: Partial<OpsDigestKpis>
}

function numInput(v: string, fallback: number) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

export default function Guardrails() {
  const { language } = useLanguage()
  const [form, setForm] = useState<GuardrailsConfig>(() => getGuardrails())
  const [saved, setSaved] = useState(false)

  const [digestLoading, setDigestLoading] = useState(false)
  const [digestOk, setDigestOk] = useState(false)
  const [digest, setDigest] = useState<OpsDigestResponseLite | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setDigestLoading(true)
        const res = await api.get('/api/admin/ops-digest')
        if (cancelled) return
        setDigest(res.data)
        setDigestOk(true)
      } catch {
        if (cancelled) return
        setDigest(null)
        setDigestOk(false)
      } finally {
        if (!cancelled) setDigestLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const status = useMemo(() => {
    if (!digestOk) return { hasData: false as const, breaches: [] as Array<{ id: string; title: string; detail: string }> }

    const k = digest?.kpis || {}
    const ordersToday = Number(k.ordersToday || 0)
    const ordersLastHour = Number(k.ordersLastHour || 0)
    const readyWithoutDriverCount = Number(k.readyWithoutDriverCount || 0)
    const cancelledTodayCount = Number(k.cancelledTodayCount || 0)

    const cancelRate = ordersToday > 0 ? cancelledTodayCount / ordersToday : 0

    const breaches: Array<{ id: string; title: string; detail: string }> = []

    if (readyWithoutDriverCount > form.MAX_READY_WITHOUT_DRIVER) {
      breaches.push({
        id: 'ready_without_driver',
        title: language === 'ar' ? 'طلبات جاهزة بدون مندوب' : 'Ready orders without driver',
        detail:
          language === 'ar'
            ? `الحالي: ${readyWithoutDriverCount} / الحد: ${form.MAX_READY_WITHOUT_DRIVER}`
            : `Now: ${readyWithoutDriverCount} / Limit: ${form.MAX_READY_WITHOUT_DRIVER}`,
      })
    }

    if (ordersLastHour > form.MAX_ORDERS_LAST_HOUR) {
      breaches.push({
        id: 'orders_last_hour',
        title: language === 'ar' ? 'ارتفاع عدد الطلبات في آخر ساعة' : 'High orders in last hour',
        detail:
          language === 'ar'
            ? `الحالي: ${ordersLastHour} / الحد: ${form.MAX_ORDERS_LAST_HOUR}`
            : `Now: ${ordersLastHour} / Limit: ${form.MAX_ORDERS_LAST_HOUR}`,
      })
    }

    if (cancelRate > form.MAX_CANCEL_RATE) {
      breaches.push({
        id: 'cancel_rate',
        title: language === 'ar' ? 'ارتفاع معدل الإلغاءات' : 'High cancellation rate',
        detail:
          language === 'ar'
            ? `الحالي: ${(cancelRate * 100).toFixed(1)}% / الحد: ${(form.MAX_CANCEL_RATE * 100).toFixed(1)}%`
            : `Now: ${(cancelRate * 100).toFixed(1)}% / Limit: ${(form.MAX_CANCEL_RATE * 100).toFixed(1)}%`,
      })
    }

    return { hasData: true as const, breaches }
  }, [digest, digestOk, form.MAX_CANCEL_RATE, form.MAX_ORDERS_LAST_HOUR, form.MAX_READY_WITHOUT_DRIVER, language])

  return (
    <div className="min-h-screen bg-gray-50 font-['Tajawal'] p-4 md:p-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">
              {language === 'ar' ? 'Ops Guardrails' : 'Ops Guardrails'}
            </h1>
            <p className="text-sm text-gray-600">
              {language === 'ar'
                ? 'حدود تشغيل محلية (قراءة فقط) محفوظة في المتصفح.'
                : 'Local operational thresholds (read-only) stored in the browser.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              resetGuardrailsToDefaults()
              setForm(DEFAULT_GUARDRAILS)
              setSaved(false)
            }}
            className="px-4 py-2 rounded-xl font-bold bg-white text-gray-800 border border-gray-200"
          >
            {language === 'ar' ? 'إعادة الضبط' : 'Reset defaults'}
          </button>
        </div>

        {!status.hasData ? (
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
        ) : status.breaches.length === 0 ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-900">
            <div className="font-extrabold">{language === 'ar' ? 'ضمن الحدود' : 'Within guardrails'}</div>
            <div className="text-sm mt-1">{language === 'ar' ? 'لا توجد تجاوزات حالياً.' : 'No threshold breaches detected.'}</div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-yellow-900">
            <div className="font-extrabold">{language === 'ar' ? 'تجاوز الحدود' : 'Guardrails exceeded'}</div>
            <div className="mt-2 space-y-2">
              {status.breaches.map((b) => (
                <div key={b.id} className="text-sm">
                  <div className="font-bold">{b.title}</div>
                  <div className="text-yellow-800">{b.detail}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="text-lg font-extrabold text-gray-900">{language === 'ar' ? 'الإعدادات' : 'Settings'}</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <div className="text-xs font-bold text-gray-500">MAX_ASSIGN_DISTANCE_KM</div>
              <input
                inputMode="decimal"
                type="number"
                min={0}
                step={0.1}
                value={form.MAX_ASSIGN_DISTANCE_KM}
                onChange={(e) => setForm((p) => ({ ...p, MAX_ASSIGN_DISTANCE_KM: numInput(e.target.value, p.MAX_ASSIGN_DISTANCE_KM) }))}
                className="mt-2 w-full px-4 py-2 border rounded-xl"
              />
            </label>

            <label className="block">
              <div className="text-xs font-bold text-gray-500">MAX_READY_WITHOUT_DRIVER</div>
              <input
                inputMode="numeric"
                type="number"
                min={0}
                step={1}
                value={form.MAX_READY_WITHOUT_DRIVER}
                onChange={(e) => setForm((p) => ({ ...p, MAX_READY_WITHOUT_DRIVER: numInput(e.target.value, p.MAX_READY_WITHOUT_DRIVER) }))}
                className="mt-2 w-full px-4 py-2 border rounded-xl"
              />
            </label>

            <label className="block">
              <div className="text-xs font-bold text-gray-500">MAX_CANCEL_RATE</div>
              <input
                inputMode="decimal"
                type="number"
                min={0}
                step={0.01}
                value={form.MAX_CANCEL_RATE}
                onChange={(e) => setForm((p) => ({ ...p, MAX_CANCEL_RATE: numInput(e.target.value, p.MAX_CANCEL_RATE) }))}
                className="mt-2 w-full px-4 py-2 border rounded-xl"
              />
            </label>

            <label className="block">
              <div className="text-xs font-bold text-gray-500">MAX_ORDERS_LAST_HOUR</div>
              <input
                inputMode="numeric"
                type="number"
                min={0}
                step={1}
                value={form.MAX_ORDERS_LAST_HOUR}
                onChange={(e) => setForm((p) => ({ ...p, MAX_ORDERS_LAST_HOUR: numInput(e.target.value, p.MAX_ORDERS_LAST_HOUR) }))}
                className="mt-2 w-full px-4 py-2 border rounded-xl"
              />
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setGuardrails(form)
                setSaved(true)
                setTimeout(() => setSaved(false), 1200)
              }}
              className="px-5 py-2.5 rounded-xl font-extrabold bg-gray-900 text-white"
            >
              {language === 'ar' ? 'حفظ' : 'Save'}
            </button>
            {saved ? <div className="text-sm font-bold text-emerald-700">{language === 'ar' ? 'تم الحفظ' : 'Saved'}</div> : null}
            {digestLoading ? <div className="text-sm text-gray-500">{language === 'ar' ? '...تحميل البيانات' : 'Loading data...'}</div> : null}
          </div>
        </div>
      </div>
    </div>
  )
}

