import { useMemo, useState } from 'react'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { clearDecisions, listDecisions, markReviewed, type DecisionLogEntry } from '../../shared/decisionLog'
import { useLanguage } from '../../context/LanguageContext'

type Filter = 'all' | 'unreviewed' | 'reviewed'

function severityTone(s: DecisionLogEntry['severity']) {
  switch (s) {
    case 'high':
      return { chip: 'bg-red-100 text-red-800 border-red-200', dot: 'bg-red-600' }
    case 'med':
      return { chip: 'bg-yellow-100 text-yellow-800 border-yellow-200', dot: 'bg-yellow-600' }
    default:
      return { chip: 'bg-gray-100 text-gray-800 border-gray-200', dot: 'bg-gray-600' }
  }
}

export default function DecisionLog() {
  const { language } = useLanguage()
  const [filter, setFilter] = useState<Filter>('unreviewed')
  const [confirmClear, setConfirmClear] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const items = useMemo(() => {
    const all = listDecisions()
    if (filter === 'reviewed') return all.filter((x) => x.acknowledged)
    if (filter === 'unreviewed') return all.filter((x) => !x.acknowledged)
    return all
  }, [filter, refreshKey])

  return (
    <div className="min-h-screen bg-gray-50 font-['Tajawal'] p-4 md:p-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">
              {language === 'ar' ? 'Decision Log' : 'Decision Log'}
            </h1>
            <p className="text-sm text-gray-600">
              {language === 'ar'
                ? 'سجل محلي لقرارات وتشخيصات التشغيل (محفوظ في المتصفح).'
                : 'Local log for ops decisions and detections (stored in the browser).'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="px-4 py-2 rounded-xl font-bold bg-white text-gray-800 border border-gray-200"
            >
              {language === 'ar' ? 'مسح السجل' : 'Clear log'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-sm font-bold text-gray-700">{language === 'ar' ? 'تصفية' : 'Filter'}</div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: 'all', label: language === 'ar' ? 'الكل' : 'All' },
                { id: 'unreviewed', label: language === 'ar' ? 'غير مُراجع' : 'Unreviewed' },
                { id: 'reviewed', label: language === 'ar' ? 'مُراجع' : 'Reviewed' },
              ] as const
            ).map((x) => {
              const active = filter === x.id
              return (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => setFilter(x.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-extrabold border ${
                    active ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-800 border-gray-200'
                  }`}
                >
                  {x.label}
                </button>
              )
            })}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
            <div className="font-extrabold text-gray-900">{language === 'ar' ? 'لا يوجد سجل حالياً' : 'No log entries yet'}</div>
            <div className="mt-1 text-sm text-gray-600">
              {language === 'ar'
                ? 'سيتم إضافة عناصر تلقائياً عند ظهور تجاوزات في Ops Digest.'
                : 'Entries will be added automatically when guardrail alerts appear in Ops Digest.'}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((e) => {
              const tone = severityTone(e.severity)
              const ts = (() => {
                try {
                  return new Date(e.ts).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')
                } catch {
                  return e.ts
                }
              })()
              return (
                <div key={e.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-extrabold border rounded-full ${tone.chip}`}>
                          <span className={`w-2 h-2 rounded-full ${tone.dot}`} />
                          {e.severity.toUpperCase()}
                        </span>
                        <span className="text-xs font-bold text-gray-500">{e.type}</span>
                        <span className="text-xs font-bold text-gray-500">{e.source}</span>
                        <span className="text-xs text-gray-500" dir="ltr">
                          {ts}
                        </span>
                        {e.acknowledged ? (
                          <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                            {language === 'ar' ? 'مُراجع' : 'Reviewed'}
                          </span>
                        ) : (
                          <span className="text-xs font-extrabold text-gray-700 bg-gray-50 border border-gray-200 px-3 py-1 rounded-full">
                            {language === 'ar' ? 'غير مُراجع' : 'Unreviewed'}
                          </span>
                        )}
                      </div>
                      <div className="mt-3 font-extrabold text-gray-900">{e.title}</div>
                      <div className="mt-2 text-sm text-gray-700">{e.detail}</div>
                    </div>

                    {!e.acknowledged ? (
                      <div className="flex items-center gap-2 md:justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            markReviewed(e.id)
                            setRefreshKey((x) => x + 1)
                          }}
                          className="px-4 py-2 rounded-xl font-extrabold bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          {language === 'ar' ? 'Mark as reviewed' : 'Mark as reviewed'}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmClear}
        title={language === 'ar' ? 'مسح سجل القرارات؟' : 'Clear decision log?'}
        description={
          language === 'ar'
            ? 'سيتم حذف جميع العناصر المحفوظة محلياً من المتصفح.'
            : 'This will remove all locally stored entries from this browser.'
        }
        confirmText={language === 'ar' ? 'مسح' : 'Clear'}
        cancelText={language === 'ar' ? 'إلغاء' : 'Cancel'}
        variant="danger"
        onClose={() => setConfirmClear(false)}
        onConfirm={() => {
          clearDecisions()
          setConfirmClear(false)
          setRefreshKey((x) => x + 1)
        }}
      />
    </div>
  )
}

