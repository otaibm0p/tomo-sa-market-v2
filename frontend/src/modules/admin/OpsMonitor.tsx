import { useEffect, useMemo, useRef, useState } from 'react'
import api from '../../utils/api'
import { useLanguage } from '../../context/LanguageContext'
import { addDecision, listDecisions } from '../../shared/decisionLog'

type CheckStatus = 'ok' | 'warn' | 'fail'

type CheckResult = {
  id: string
  title: string
  endpoint: string
  status: CheckStatus
  httpStatus?: number
  latencyMs?: number
  detail?: string
}

type Snapshot = {
  ts: string
  okCount: number
  warnCount: number
  failCount: number
  latencyP95Ms?: number
  productsCount?: number
  adminOrdersCount?: number
  activeRidersCount?: number
}

const SNAPSHOT_KEY = 'tomo_ops_monitor_snapshot_v1'

function pct95(values: number[]) {
  if (!values.length) return undefined
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))
  return sorted[idx]
}

function classifyLatency(ms?: number): CheckStatus {
  if (ms == null) return 'fail'
  if (ms >= 2500) return 'warn'
  return 'ok'
}

function chipTone(s: CheckStatus) {
  if (s === 'ok') return 'bg-emerald-50 text-emerald-800 border-emerald-200'
  if (s === 'warn') return 'bg-yellow-50 text-yellow-800 border-yellow-200'
  return 'bg-red-50 text-red-800 border-red-200'
}

function dotTone(s: CheckStatus) {
  if (s === 'ok') return 'bg-emerald-600'
  if (s === 'warn') return 'bg-yellow-600'
  return 'bg-red-600'
}

function safeReadSnapshot(): Snapshot | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Snapshot
  } catch {
    return null
  }
}

function safeWriteSnapshot(s: Snapshot) {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(s))
  } catch {
    // ignore
  }
}

function logOnce10Min(key: string, severity: 'low' | 'med' | 'high', title: string, detail: string) {
  const TEN_MIN = 10 * 60 * 1000
  const now = Date.now()
  const existing = listDecisions()
  const recent = existing.find((d) => {
    if (d.source !== 'ops') return false
    if (d.title !== title) return false
    const ts = Date.parse(d.ts)
    if (!Number.isFinite(ts)) return false
    return now - ts <= TEN_MIN && d.detail.includes(key)
  })
  if (recent) return
  addDecision({ type: 'NOTE', severity, title, detail: `${detail}\nkey=${key}`, source: 'ops' })
}

export default function OpsMonitor() {
  const { language } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [auto, setAuto] = useState(true)
  const [results, setResults] = useState<CheckResult[]>([])
  const [snapshot, setSnapshot] = useState<Snapshot | null>(() => safeReadSnapshot())
  const timerRef = useRef<number | null>(null)

  const title = language === 'ar' ? 'Ops Monitor' : 'Ops Monitor'

  const runChecks = async () => {
    setLoading(true)
    const startedAt = new Date().toISOString()

    const check = async (
      id: string,
      title: string,
      endpoint: string,
      parseMeta?: (data: any) => Partial<Snapshot>
    ): Promise<{ r: CheckResult; meta?: Partial<Snapshot> }> => {
      const t0 = performance.now()
      try {
        const res = await api.get(endpoint, { params: { _t: Date.now() } })
        const t1 = performance.now()
        const latencyMs = Math.round(t1 - t0)
        const status = classifyLatency(latencyMs)
        const meta = parseMeta ? parseMeta(res.data) : undefined
        return {
          r: {
            id,
            title,
            endpoint,
            status,
            httpStatus: res.status,
            latencyMs,
          },
          meta,
        }
      } catch (e: any) {
        const t1 = performance.now()
        const latencyMs = Math.round(t1 - t0)
        const httpStatus = e?.response?.status
        const detail =
          httpStatus === 401 || httpStatus === 403
            ? language === 'ar'
              ? 'صلاحيات غير كافية / تسجيل دخول'
              : 'Auth/permissions'
            : language === 'ar'
              ? 'فشل الاتصال'
              : 'Request failed'
        return {
          r: {
            id,
            title,
            endpoint,
            status: 'fail',
            httpStatus,
            latencyMs,
            detail,
          },
        }
      }
    }

    const items = await Promise.all([
      check('health', language === 'ar' ? 'Health' : 'Health', '/api/health'),
      check('products', language === 'ar' ? 'Products' : 'Products', '/api/products', (data) => {
        const arr = Array.isArray(data) ? data : Array.isArray(data?.products) ? data.products : []
        return { productsCount: arr.length }
      }),
      check('admin_orders', language === 'ar' ? 'Admin Orders' : 'Admin Orders', '/api/admin/orders', (data) => {
        const arr = Array.isArray(data) ? data : Array.isArray(data?.orders) ? data.orders : []
        return { adminOrdersCount: arr.length }
      }),
      check('riders', language === 'ar' ? 'Active Riders' : 'Active Riders', '/api/admin/riders', (data) => {
        const arr = Array.isArray(data?.riders) ? data.riders : []
        const active = arr.filter((x: any) => x && x.is_active).length
        return { activeRidersCount: active }
      }),
      check('ops_digest', language === 'ar' ? 'Ops Digest' : 'Ops Digest', '/api/admin/ops-digest'),
    ])

    const nextResults = items.map((x) => x.r)
    setResults(nextResults)

    const latencies = nextResults.map((r) => r.latencyMs).filter((x): x is number => typeof x === 'number' && Number.isFinite(x))
    const p95 = pct95(latencies)

    const meta = items.reduce<Partial<Snapshot>>((acc, x) => ({ ...acc, ...(x.meta || {}) }), {})

    const okCount = nextResults.filter((r) => r.status === 'ok').length
    const warnCount = nextResults.filter((r) => r.status === 'warn').length
    const failCount = nextResults.filter((r) => r.status === 'fail').length

    const nextSnapshot: Snapshot = {
      ts: startedAt,
      okCount,
      warnCount,
      failCount,
      latencyP95Ms: p95,
      ...meta,
    }

    // Intelligent + safe local notes (no server writes)
    const prev = safeReadSnapshot()
    if (failCount > 0) {
      logOnce10Min(
        'ops_monitor_fail',
        failCount >= 2 ? 'high' : 'med',
        language === 'ar' ? 'Ops Monitor: فشل في بعض الفحوصات' : 'Ops Monitor: some checks failed',
        language === 'ar'
          ? `عدد الفشل: ${failCount}. راجع الفحوصات الحمراء.`
          : `Failures: ${failCount}. Review red checks.`
      )
    }
    if ((p95 ?? 0) >= 2500) {
      logOnce10Min(
        'ops_monitor_slow',
        'med',
        language === 'ar' ? 'Ops Monitor: بطء ملحوظ' : 'Ops Monitor: elevated latency',
        language === 'ar' ? `P95 latency ≈ ${p95}ms` : `P95 latency ≈ ${p95}ms`
      )
    }
    if (prev?.productsCount != null && nextSnapshot.productsCount != null) {
      const before = prev.productsCount
      const after = nextSnapshot.productsCount
      if (before > 0 && after === 0) {
        logOnce10Min(
          'ops_monitor_products_zero',
          'high',
          language === 'ar' ? 'Ops Monitor: المنتجات أصبحت 0' : 'Ops Monitor: products dropped to 0',
          language === 'ar' ? 'تحقق من قاعدة البيانات/الفلترة/الواجهة.' : 'Check DB/filtering/API.'
        )
      }
      const delta = Math.abs(after - before)
      if (before > 0 && delta / before >= 0.3) {
        logOnce10Min(
          'ops_monitor_products_spike',
          'med',
          language === 'ar' ? 'Ops Monitor: تغير كبير بعدد المنتجات' : 'Ops Monitor: big products count change',
          language === 'ar'
            ? `قبل: ${before} / الآن: ${after}`
            : `Before: ${before} / Now: ${after}`
        )
      }
    }

    safeWriteSnapshot(nextSnapshot)
    setSnapshot(nextSnapshot)
    setLoading(false)
  }

  useEffect(() => {
    runChecks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!auto) return
    if (timerRef.current) window.clearInterval(timerRef.current)
    timerRef.current = window.setInterval(() => runChecks(), 30000)
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto])

  const summary = useMemo(() => {
    const ok = results.filter((r) => r.status === 'ok').length
    const warn = results.filter((r) => r.status === 'warn').length
    const fail = results.filter((r) => r.status === 'fail').length
    return { ok, warn, fail }
  }, [results])

  const reportText = useMemo(() => {
    const lines: string[] = []
    lines.push(`Ops Monitor @ ${new Date().toISOString()}`)
    if (snapshot?.latencyP95Ms != null) lines.push(`P95 latency: ${snapshot.latencyP95Ms}ms`)
    if (snapshot?.productsCount != null) lines.push(`Products: ${snapshot.productsCount}`)
    if (snapshot?.adminOrdersCount != null) lines.push(`Admin orders: ${snapshot.adminOrdersCount}`)
    if (snapshot?.activeRidersCount != null) lines.push(`Active riders: ${snapshot.activeRidersCount}`)
    lines.push(`Checks: ok=${summary.ok} warn=${summary.warn} fail=${summary.fail}`)
    for (const r of results) {
      lines.push(
        `- ${r.title} (${r.endpoint}) => ${r.status.toUpperCase()} ${r.httpStatus ?? ''} ${r.latencyMs ?? ''}ms ${r.detail ?? ''}`.trim()
      )
    }
    return lines.join('\n')
  }, [results, snapshot, summary.fail, summary.ok, summary.warn])

  return (
    <div className="min-h-screen bg-gray-50 font-['Tajawal'] p-4 md:p-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">{title}</h1>
            <p className="text-sm text-gray-600">
              {language === 'ar'
                ? 'فحوصات تشغيل آمنة (قراءة فقط) + Latency. لا يوجد WebSocket.'
                : 'Safe read-only checks + latency. No WebSocket.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAuto((x) => !x)}
              className={`px-4 py-2 rounded-xl font-bold border ${
                auto ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-white text-gray-800 border-gray-200'
              }`}
            >
              {auto ? (language === 'ar' ? 'Auto ON' : 'Auto ON') : language === 'ar' ? 'Auto OFF' : 'Auto OFF'}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={runChecks}
              className="px-4 py-2 rounded-xl font-bold bg-gray-900 text-white disabled:opacity-50"
            >
              {loading ? '...' : language === 'ar' ? 'تحديث' : 'Refresh'}
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(reportText)
                  logOnce10Min(
                    'ops_monitor_copied',
                    'low',
                    language === 'ar' ? 'Ops Monitor: تم نسخ تقرير' : 'Ops Monitor: report copied',
                    language === 'ar' ? 'تم نسخ التقرير إلى الحافظة.' : 'Report copied to clipboard.'
                  )
                } catch {
                  // ignore
                }
              }}
              className="px-4 py-2 rounded-xl font-bold bg-white text-gray-800 border border-gray-200"
            >
              {language === 'ar' ? 'نسخ تقرير' : 'Copy report'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="text-xs font-bold text-gray-500">{language === 'ar' ? 'OK' : 'OK'}</div>
            <div className="mt-2 text-2xl font-extrabold text-gray-900" dir="ltr">
              {summary.ok}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="text-xs font-bold text-gray-500">{language === 'ar' ? 'WARN' : 'WARN'}</div>
            <div className="mt-2 text-2xl font-extrabold text-gray-900" dir="ltr">
              {summary.warn}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="text-xs font-bold text-gray-500">{language === 'ar' ? 'FAIL' : 'FAIL'}</div>
            <div className="mt-2 text-2xl font-extrabold text-gray-900" dir="ltr">
              {summary.fail}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="text-xs font-bold text-gray-500">{language === 'ar' ? 'P95 Latency' : 'P95 Latency'}</div>
            <div className="mt-2 text-2xl font-extrabold text-gray-900" dir="ltr">
              {snapshot?.latencyP95Ms != null ? `${snapshot.latencyP95Ms}ms` : '—'}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="text-lg font-extrabold text-gray-900">{language === 'ar' ? 'الفحوصات' : 'Checks'}</div>
          <div className="mt-4 space-y-3">
            {results.map((r) => (
              <div key={r.id} className="rounded-xl border border-gray-100 p-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-extrabold text-gray-900">{r.title}</div>
                    <div className="text-xs text-gray-500" dir="ltr">
                      {r.endpoint}
                    </div>
                    {r.detail ? <div className="mt-2 text-sm text-gray-700">{r.detail}</div> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-extrabold border rounded-full ${chipTone(r.status)}`}>
                      <span className={`w-2 h-2 rounded-full ${dotTone(r.status)}`} />
                      {r.status.toUpperCase()}
                    </span>
                    <span className="text-xs font-bold text-gray-600" dir="ltr">
                      {r.httpStatus ?? '—'}
                    </span>
                    <span className="text-xs font-bold text-gray-600" dir="ltr">
                      {r.latencyMs != null ? `${r.latencyMs}ms` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {results.length === 0 ? (
              <div className="text-sm text-gray-600">{language === 'ar' ? 'لا توجد نتائج بعد' : 'No results yet'}</div>
            ) : null}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="text-lg font-extrabold text-gray-900">{language === 'ar' ? 'لقطة محلية' : 'Local snapshot'}</div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="text-gray-700">
              <span className="font-bold">{language === 'ar' ? 'آخر تحديث' : 'Last run'}:</span>{' '}
              <span dir="ltr">{snapshot?.ts ? new Date(snapshot.ts).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US') : '—'}</span>
            </div>
            <div className="text-gray-700" dir="ltr">
              <span className="font-bold">{language === 'ar' ? 'Products' : 'Products'}:</span> {snapshot?.productsCount ?? '—'}
            </div>
            <div className="text-gray-700" dir="ltr">
              <span className="font-bold">{language === 'ar' ? 'Admin orders' : 'Admin orders'}:</span> {snapshot?.adminOrdersCount ?? '—'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

