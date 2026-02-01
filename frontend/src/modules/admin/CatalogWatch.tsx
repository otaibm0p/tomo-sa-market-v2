import { useEffect, useMemo, useState } from 'react'
import { productAPI, type Product } from '../../utils/api'
import { useLanguage } from '../../context/LanguageContext'
import { addDecision, listDecisions } from '../../shared/decisionLog'

type Finding = {
  id: string
  severity: 'low' | 'med' | 'high'
  title: string
  detail: string
  productId?: number
}

type PriceSnapshot = {
  ts: string
  byId: Record<string, number>
}

const SNAPSHOT_KEY = 'tomo_catalog_watch_prices_v1'

function toNum(v: any): number | null {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

function normalizeName(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

function safeReadSnapshot(): PriceSnapshot | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PriceSnapshot
  } catch {
    return null
  }
}

function safeWriteSnapshot(s: PriceSnapshot) {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(s))
  } catch {
    // ignore
  }
}

function logOnce10Min(key: string, severity: Finding['severity'], title: string, detail: string) {
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

function severityTone(s: Finding['severity']) {
  switch (s) {
    case 'high':
      return { chip: 'bg-red-100 text-red-800 border-red-200', dot: 'bg-red-600' }
    case 'med':
      return { chip: 'bg-yellow-100 text-yellow-800 border-yellow-200', dot: 'bg-yellow-600' }
    default:
      return { chip: 'bg-gray-100 text-gray-800 border-gray-200', dot: 'bg-gray-600' }
  }
}

export default function CatalogWatch() {
  const { language } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [error, setError] = useState<string | null>(null)
  const [maxScan, setMaxScan] = useState(2000)

  const title = language === 'ar' ? 'Catalog Watch' : 'Catalog Watch'

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const all = await productAPI.getAll()
      setProducts(all)
    } catch (e: any) {
      setError(language === 'ar' ? 'تعذر تحميل المنتجات حالياً' : 'Failed to load products')
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const scanned = useMemo(() => products.slice(0, Math.max(0, maxScan)), [maxScan, products])

  const analysis = useMemo(() => {
    const findings: Finding[] = []
    const nameCount = new Map<string, number>()
    const prices: Array<{ id: number; price: number }> = []

    for (const p of scanned) {
      const name = String(p.name || '')
      const nn = normalizeName(name)
      if (nn) nameCount.set(nn, (nameCount.get(nn) || 0) + 1)

      const price = toNum(p.price)
      if (price == null || price <= 0) {
        findings.push({
          id: `bad_price_${p.id}`,
          severity: 'high',
          title: language === 'ar' ? 'سعر غير صالح' : 'Invalid price',
          detail: language === 'ar' ? `المنتج #${p.id} (${name}) سعره غير صالح: ${String(p.price)}` : `#${p.id} (${name}) invalid price: ${String(p.price)}`,
          productId: p.id,
        })
      } else {
        prices.push({ id: p.id, price })
      }

      const img = String(p.image_url || '').trim()
      const hasImage = !!img && !img.includes('placeholder') && !img.endsWith('/')
      if (!hasImage) {
        findings.push({
          id: `missing_img_${p.id}`,
          severity: 'med',
          title: language === 'ar' ? 'صورة مفقودة' : 'Missing image',
          detail: language === 'ar' ? `المنتج #${p.id} (${name}) بدون صورة` : `#${p.id} (${name}) has no usable image`,
          productId: p.id,
        })
      }

      const dp = toNum((p as any).discount_price)
      if (dp != null && price != null) {
        if (dp <= 0 || dp >= price) {
          findings.push({
            id: `bad_discount_${p.id}`,
            severity: 'med',
            title: language === 'ar' ? 'خصم غير منطقي' : 'Suspicious discount',
            detail:
              language === 'ar'
                ? `المنتج #${p.id} (${name}) خصم غير منطقي: price=${price} discount=${dp}`
                : `#${p.id} (${name}) discount suspicious: price=${price} discount=${dp}`,
            productId: p.id,
          })
        }
      }
    }

    for (const [nn, c] of nameCount.entries()) {
      if (c >= 3) {
        findings.push({
          id: `dup_${nn}`,
          severity: 'low',
          title: language === 'ar' ? 'اسم مكرر' : 'Duplicate name',
          detail: language === 'ar' ? `هناك ${c} منتجات باسم متشابه: "${nn}"` : `${c} products with similar name: "${nn}"`,
        })
      }
    }

    // Price change vs local snapshot
    const prev = safeReadSnapshot()
    const nowById: Record<string, number> = {}
    const bigMoves: Array<{ id: number; before: number; after: number; pct: number }> = []

    for (const x of prices) {
      nowById[String(x.id)] = x.price
      const before = prev?.byId?.[String(x.id)]
      if (before != null && Number.isFinite(before) && before > 0) {
        const pct = (x.price - before) / before
        if (Math.abs(pct) >= 0.35) {
          bigMoves.push({ id: x.id, before, after: x.price, pct })
        }
      }
    }

    bigMoves.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
    for (const m of bigMoves.slice(0, 30)) {
      findings.push({
        id: `price_move_${m.id}`,
        severity: Math.abs(m.pct) >= 0.75 ? 'high' : 'med',
        title: language === 'ar' ? 'تغير كبير في السعر' : 'Large price change',
        detail:
          language === 'ar'
            ? `المنتج #${m.id}: ${m.before} -> ${m.after} (${(m.pct * 100).toFixed(0)}%)`
            : `#${m.id}: ${m.before} -> ${m.after} (${(m.pct * 100).toFixed(0)}%)`,
        productId: m.id,
      })
    }

    // Save snapshot (safe local)
    safeWriteSnapshot({ ts: new Date().toISOString(), byId: nowById })

    return {
      total: products.length,
      scanned: scanned.length,
      findings,
      bigMovesCount: bigMoves.length,
      prevTs: prev?.ts || null,
    }
  }, [language, products.length, scanned])

  useEffect(() => {
    // Add one calm note if there are many high findings (deduped)
    const highCount = analysis.findings.filter((f) => f.severity === 'high').length
    if (highCount >= 5) {
      logOnce10Min(
        'catalog_watch_many_high',
        'med',
        language === 'ar' ? 'Catalog Watch: مشاكل حرجة متعددة' : 'Catalog Watch: multiple critical issues',
        language === 'ar' ? `عدد المشاكل الحرجة: ${highCount}` : `Critical findings: ${highCount}`
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis.findings])

  const groups = useMemo(() => {
    const order = { high: 0, med: 1, low: 2 } as const
    return [...analysis.findings].sort((a, b) => order[a.severity] - order[b.severity])
  }, [analysis.findings])

  return (
    <div className="min-h-screen bg-gray-50 font-['Tajawal'] p-4 md:p-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">{title}</h1>
            <p className="text-sm text-gray-600">
              {language === 'ar'
                ? 'تحليل محلي آمن (قراءة فقط) لاكتشاف مشاكل الصور/الأسعار/التغيرات الكبيرة.'
                : 'Safe local analysis (read-only) for images/prices/large changes.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={load}
              className="px-4 py-2 rounded-xl font-bold bg-gray-900 text-white disabled:opacity-50"
            >
              {loading ? '...' : language === 'ar' ? 'تحديث' : 'Refresh'}
            </button>
          </div>
        </div>

        {error ? (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
            <div className="font-extrabold text-gray-900">{error}</div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="text-xs font-bold text-gray-500">{language === 'ar' ? 'الإجمالي' : 'Total'}</div>
            <div className="mt-2 text-2xl font-extrabold text-gray-900" dir="ltr">
              {analysis.total}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="text-xs font-bold text-gray-500">{language === 'ar' ? 'تم فحص' : 'Scanned'}</div>
            <div className="mt-2 text-2xl font-extrabold text-gray-900" dir="ltr">
              {analysis.scanned}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="text-xs font-bold text-gray-500">{language === 'ar' ? 'مشاكل' : 'Findings'}</div>
            <div className="mt-2 text-2xl font-extrabold text-gray-900" dir="ltr">
              {analysis.findings.length}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="text-xs font-bold text-gray-500">{language === 'ar' ? 'تغيرات أسعار كبيرة' : 'Big price moves'}</div>
            <div className="mt-2 text-2xl font-extrabold text-gray-900" dir="ltr">
              {analysis.bigMovesCount}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="text-lg font-extrabold text-gray-900">{language === 'ar' ? 'الإعدادات' : 'Settings'}</div>
            <div className="text-xs text-gray-500" dir="ltr">
              {analysis.prevTs ? `prev snapshot: ${analysis.prevTs}` : ''}
            </div>
          </div>
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="text-sm font-bold text-gray-700">
              {language === 'ar' ? 'حد الفحص' : 'Scan limit'}
            </label>
            <input
              type="number"
              min={100}
              step={100}
              value={maxScan}
              onChange={(e) => setMaxScan(Number(e.target.value) || 0)}
              className="w-40 px-4 py-2 border rounded-xl"
            />
            <div className="text-xs text-gray-500">
              {language === 'ar' ? 'لتقليل الحمل في الكتالوج الكبير.' : 'To reduce load on large catalogs.'}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="text-lg font-extrabold text-gray-900">{language === 'ar' ? 'النتائج' : 'Results'}</div>
          <div className="mt-4 space-y-3">
            {groups.length ? (
              groups.map((f) => {
                const tone = severityTone(f.severity)
                return (
                  <div key={f.id} className="rounded-xl border border-gray-100 p-4">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-extrabold text-gray-900">
                          {f.title}
                          {f.productId ? <span className="text-xs text-gray-500 mr-2" dir="ltr">#{f.productId}</span> : null}
                        </div>
                        <div className="mt-2 text-sm text-gray-700">{f.detail}</div>
                      </div>
                      <span className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-extrabold border rounded-full ${tone.chip}`}>
                        <span className={`w-2 h-2 rounded-full ${tone.dot}`} />
                        {f.severity.toUpperCase()}
                      </span>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-sm text-gray-600">{language === 'ar' ? 'لا توجد مشاكل مكتشفة' : 'No findings'}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

