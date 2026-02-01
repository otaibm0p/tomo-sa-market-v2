import { useEffect, useMemo, useState } from 'react'
import api from '../../utils/api'
import { useLanguage } from '../../context/LanguageContext'
import { Card } from '../../shared/admin/ui/components/Card'
import { SectionHeader } from '../../shared/admin/ui/components/SectionHeader'
import { Badge } from '../../shared/admin/ui/components/Badge'
import { logAdminEvent } from '../../shared/admin/activityLog'

type ProfitGuardItem = {
  productId: number
  name: string
  category: string
  price: number
  cost: number | null
  marginPct: number | null
  flags: string[]
  suggestedActions: string[]
}

type ProfitGuardResponse = { items: ProfitGuardItem[] }

type FilterKey = 'all' | 'low' | 'neg' | 'nocost' | 'oos'

function flagTone(flag: string) {
  if (flag === 'NEGATIVE_MARGIN') return 'danger'
  if (flag === 'LOW_MARGIN') return 'warning'
  if (flag === 'OUT_OF_STOCK') return 'info'
  return 'neutral' // NO_COST_DATA or unknown
}

function flagLabel(flag: string, lang: 'ar' | 'en') {
  const dict: Record<string, { ar: string; en: string }> = {
    NO_COST_DATA: { ar: 'لا توجد تكلفة', en: 'No cost' },
    LOW_MARGIN: { ar: 'هامش منخفض', en: 'Low margin' },
    NEGATIVE_MARGIN: { ar: 'هامش سلبي', en: 'Negative' },
    OUT_OF_STOCK: { ar: 'نفد المخزون', en: 'Out of stock' },
  }
  return dict[flag]?.[lang] || flag
}

function chipClass(active: boolean) {
  return active
    ? 'rounded-full px-3 py-1 text-xs font-extrabold bg-gray-900 text-white'
    : 'rounded-full px-3 py-1 text-xs font-extrabold bg-white border border-gray-200 text-gray-900 hover:bg-gray-50'
}

export default function ProfitGuard() {
  const { language } = useLanguage()
  const lang = language === 'ar' ? 'ar' : 'en'

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<ProfitGuardItem[]>([])
  const [hasData, setHasData] = useState(true)
  const [filter, setFilter] = useState<FilterKey>('all')

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      setHasData(true)
      const res = await api.get<ProfitGuardResponse>('/api/admin/profit-guard')
      setItems(Array.isArray(res.data?.items) ? res.data.items : [])
      setHasData(true)
    } catch {
      setItems([])
      setError(null)
      setHasData(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        setHasData(true)
        const res = await api.get<ProfitGuardResponse>('/api/admin/profit-guard')
        if (cancelled) return
        setItems(Array.isArray(res.data?.items) ? res.data.items : [])
        setHasData(true)
      } catch (e: any) {
        if (cancelled) return
        // Graceful fallback: no scary error UI, keep chips usable
        setItems([])
        setError(null)
        setHasData(false)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [lang])

  const filtered = useMemo(() => {
    const has = (it: ProfitGuardItem, flag: string) => Array.isArray(it.flags) && it.flags.includes(flag)
    if (filter === 'all') return items
    if (filter === 'low') return items.filter((it) => has(it, 'LOW_MARGIN'))
    if (filter === 'neg') return items.filter((it) => has(it, 'NEGATIVE_MARGIN'))
    if (filter === 'nocost') return items.filter((it) => has(it, 'NO_COST_DATA'))
    if (filter === 'oos') return items.filter((it) => has(it, 'OUT_OF_STOCK'))
    return items
  }, [items, filter])

  const counts = useMemo(() => {
    const c = { low: 0, neg: 0, nocost: 0, oos: 0 }
    for (const it of items) {
      if (it.flags?.includes('LOW_MARGIN')) c.low++
      if (it.flags?.includes('NEGATIVE_MARGIN')) c.neg++
      if (it.flags?.includes('NO_COST_DATA')) c.nocost++
      if (it.flags?.includes('OUT_OF_STOCK')) c.oos++
    }
    return c
  }, [items])

  return (
    <div className="max-w-7xl mx-auto space-y-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <SectionHeader
        title={lang === 'ar' ? 'Profit Guard' : 'Profit Guard'}
        description={lang === 'ar' ? 'قراءة فقط — كشف المخاطر على الهامش' : 'Read-only — margin risk checks'}
      />

      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          <button className={chipClass(filter === 'all')} onClick={() => setFilter('all')}>
            {lang === 'ar' ? 'الكل' : 'All'} ({items.length})
          </button>
          <button className={chipClass(filter === 'low')} onClick={() => setFilter('low')}>
            {lang === 'ar' ? 'هامش منخفض' : 'Low margin'} ({counts.low})
          </button>
          <button className={chipClass(filter === 'neg')} onClick={() => setFilter('neg')}>
            {lang === 'ar' ? 'هامش سلبي' : 'Negative'} ({counts.neg})
          </button>
          <button className={chipClass(filter === 'nocost')} onClick={() => setFilter('nocost')}>
            {lang === 'ar' ? 'بدون تكلفة' : 'No cost'} ({counts.nocost})
          </button>
          <button className={chipClass(filter === 'oos')} onClick={() => setFilter('oos')}>
            {lang === 'ar' ? 'نفد المخزون' : 'Out of stock'} ({counts.oos})
          </button>
        </div>

        <div className="mt-3 text-xs text-gray-600">
          {lang === 'ar' ? 'اقتراحات نصية فقط — لا يتم تنفيذ أي تعديل تلقائياً.' : 'Text suggestions only — no automatic changes.'}
        </div>
      </Card>

      {loading ? (
        <Card className="p-4">
          <div className="text-sm font-bold text-gray-600">{lang === 'ar' ? 'جاري التحميل…' : 'Loading…'}</div>
        </Card>
      ) : (
        <>
          {hasData === false ? (
            <Card className="p-4 border border-blue-100 bg-blue-50">
              <div className="text-sm font-extrabold text-gray-900">{lang === 'ar' ? 'لا توجد بيانات ربحية حالياً' : 'No profitability data right now'}</div>
              <div className="mt-1 text-sm text-gray-700">
                {lang === 'ar'
                  ? 'ستعمل هذه الصفحة تلقائياً عند توفر بيانات المنتجات والتكلفة'
                  : 'This page will work automatically once product + cost data is available.'}
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => {
                    logAdminEvent('retry', lang === 'ar' ? 'Profit Guard' : 'Profit Guard', { page: 'profit-guard' })
                    load()
                  }}
                  className="px-4 py-2 rounded-xl font-extrabold border border-gray-200 bg-white text-gray-900 hover:bg-gray-50"
                >
                  {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
                </button>
              </div>
            </Card>
          ) : null}

          {/* Mobile cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filtered.map((it) => (
              <Card key={it.productId} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-gray-900 truncate">{it.name}</div>
                    <div className="mt-1 text-xs font-bold text-gray-500 truncate">{it.category || (lang === 'ar' ? '—' : '—')}</div>
                  </div>
                  <a
                    href={`/admin/products`}
                    className="text-xs font-extrabold text-emerald-700 hover:text-emerald-800"
                  >
                    {lang === 'ar' ? 'فتح المنتجات' : 'Open products'}
                  </a>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-gray-500 font-bold">{lang === 'ar' ? 'السعر' : 'Price'}</div>
                    <div className="mt-1 font-extrabold text-gray-900" dir="ltr">
                      {Number(it.price || 0).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 font-bold">{lang === 'ar' ? 'التكلفة' : 'Cost'}</div>
                    <div className="mt-1 font-extrabold text-gray-900" dir="ltr">
                      {it.cost == null ? '—' : Number(it.cost).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 font-bold">{lang === 'ar' ? 'الهامش' : 'Margin'}</div>
                    <div className="mt-1 font-extrabold text-gray-900" dir="ltr">
                      {it.marginPct == null ? '—' : `${it.marginPct.toFixed(1)}%`}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {it.flags?.map((f) => (
                    <Badge key={f} tone={flagTone(f) as any}>
                      {flagLabel(f, lang)}
                    </Badge>
                  ))}
                </div>

                <div className="mt-3 space-y-1">
                  {it.suggestedActions?.map((a, idx) => (
                    <div key={idx} className="text-xs text-gray-700">
                      - {a}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop table */}
          <Card className="hidden md:block p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr className="text-left">
                    <th className="px-4 py-3 text-xs font-extrabold text-gray-600">{lang === 'ar' ? 'المنتج' : 'Product'}</th>
                    <th className="px-4 py-3 text-xs font-extrabold text-gray-600">{lang === 'ar' ? 'التصنيف' : 'Category'}</th>
                    <th className="px-4 py-3 text-xs font-extrabold text-gray-600">{lang === 'ar' ? 'السعر' : 'Price'}</th>
                    <th className="px-4 py-3 text-xs font-extrabold text-gray-600">{lang === 'ar' ? 'التكلفة' : 'Cost'}</th>
                    <th className="px-4 py-3 text-xs font-extrabold text-gray-600">{lang === 'ar' ? 'الهامش %' : 'Margin %'}</th>
                    <th className="px-4 py-3 text-xs font-extrabold text-gray-600">{lang === 'ar' ? 'Flags' : 'Flags'}</th>
                    <th className="px-4 py-3 text-xs font-extrabold text-gray-600">{lang === 'ar' ? 'اقتراحات' : 'Suggestions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((it) => (
                    <tr key={it.productId} className="border-b border-gray-100 last:border-b-0">
                      <td className="px-4 py-3">
                        <div className="font-extrabold text-gray-900">{it.name}</div>
                        <div className="text-xs text-gray-500">#{it.productId}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{it.category || '—'}</td>
                      <td className="px-4 py-3 font-extrabold text-gray-900" dir="ltr">
                        {Number(it.price || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 font-extrabold text-gray-900" dir="ltr">
                        {it.cost == null ? '—' : Number(it.cost).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 font-extrabold text-gray-900" dir="ltr">
                        {it.marginPct == null ? '—' : `${it.marginPct.toFixed(1)}%`}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {it.flags?.map((f) => (
                            <Badge key={f} tone={flagTone(f) as any}>
                              {flagLabel(f, lang)}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1 text-xs text-gray-700">
                          {it.suggestedActions?.map((a, idx) => (
                            <div key={idx}>- {a}</div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

