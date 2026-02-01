import { useMemo, useState } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import { askCopilot, type CopilotAskResponse, type CopilotCard } from '../../utils/copilot'

function severityTone(s: CopilotCard['severity']) {
  switch (s) {
    case 'high':
      return { chip: 'bg-red-100 text-red-800 border-red-200', dot: 'bg-red-600' }
    case 'med':
      return { chip: 'bg-yellow-100 text-yellow-800 border-yellow-200', dot: 'bg-yellow-600' }
    default:
      return { chip: 'bg-gray-100 text-gray-800 border-gray-200', dot: 'bg-gray-600' }
  }
}

const DEFAULT_PROMPTS = [
  'كم عدد الطلبات الجاهزة بدون مندوب؟',
  'ما هو معدل الإلغاء اليوم؟',
  'كم عدد الطلبات في آخر ساعة؟',
  'هل التوزيع (Dispatch) صحي الآن؟',
  'اعطني أقدم طلبات READY بدون مندوب',
  'كم عدد المناديب Online الآن؟',
  'ما هي متوسطات أوقات التجهيز والتوصيل اليوم؟',
  'هل يوجد مخزون منخفض؟',
  'كم إيراد اليوم؟',
  'ماذا أفعل الآن؟',
]

export default function AdminCopilot() {
  const { language } = useLanguage()
  const [panelOpen, setPanelOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [resp, setResp] = useState<CopilotAskResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isRTL = language === 'ar'
  const title = language === 'ar' ? 'Admin Copilot' : 'Admin Copilot'

  const prompts = useMemo(() => {
    // Backend may also return suggestions, but keep local defaults always
    const server = resp?.suggestions?.filter(Boolean) || []
    const merged = [...server, ...DEFAULT_PROMPTS]
    // Dedup
    const out: string[] = []
    const seen = new Set<string>()
    for (const p of merged) {
      const key = String(p).trim()
      if (!key) continue
      if (seen.has(key)) continue
      seen.add(key)
      out.push(key)
      if (out.length >= 10) break
    }
    return out
  }, [resp?.suggestions])

  const runAsk = async () => {
    const q = question.trim()
    if (!q) return
    try {
      setLoading(true)
      setError(null)
      const data = await askCopilot(q)
      setResp(data)
    } catch (e: any) {
      setResp(null)
      setError(language === 'ar' ? 'تعذر الحصول على إجابة الآن. جرّب سؤالاً من المقترحات.' : 'Could not answer right now. Try a suggested prompt.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 font-['Tajawal'] p-4 md:p-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">{title}</h1>
            <p className="text-sm text-gray-600">
              {language === 'ar'
                ? 'Copilot محلي (Rule-based) — قراءة فقط، بدون WebSocket أو AI خارجي.'
                : 'Local rule-based copilot — read-only, no WebSocket, no external AI.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPanelOpen(true)}
              className="px-4 py-2 rounded-xl font-extrabold bg-white text-gray-800 border border-gray-200"
            >
              {language === 'ar' ? 'فتح اللوحة' : 'Open panel'}
            </button>
          </div>
        </div>

        {/* Main Ask Row */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="text-sm font-bold text-gray-700">{language === 'ar' ? 'اسأل سؤالاً' : 'Ask a question'}</div>
          <div className="mt-3 flex flex-col md:flex-row gap-3">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={language === 'ar' ? 'مثال: كم عدد الطلبات الجاهزة بدون مندوب؟' : 'Example: ready orders without driver?'}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            <button
              type="button"
              disabled={loading || !question.trim()}
              onClick={runAsk}
              className="px-5 py-3 rounded-xl font-extrabold bg-gray-900 text-white disabled:opacity-50"
            >
              {loading ? '...' : language === 'ar' ? 'Ask' : 'Ask'}
            </button>
          </div>
          {error ? <div className="mt-3 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-xl p-3">{error}</div> : null}
          {resp ? (
            <div className="mt-3 text-xs text-gray-500" dir="ltr">
              intent: {resp.intent}
            </div>
          ) : null}
        </div>

        {/* Results */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="text-lg font-extrabold text-gray-900">{language === 'ar' ? 'النتائج' : 'Results'}</div>
          <div className="mt-4 space-y-3">
            {resp?.cards?.length ? (
              resp.cards.map((c) => {
                const tone = severityTone(c.severity)
                return (
                  <div key={c.id} className="rounded-2xl border border-gray-100 p-5">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-extrabold text-gray-900">{c.title}</div>
                        {c.value != null ? (
                          <div className="mt-2 text-2xl font-extrabold text-gray-900" dir="ltr">
                            {c.value}
                          </div>
                        ) : null}
                      </div>
                      <span className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-extrabold border rounded-full ${tone.chip}`}>
                        <span className={`w-2 h-2 rounded-full ${tone.dot}`} />
                        {c.severity.toUpperCase()}
                      </span>
                    </div>

                    {c.evidence?.length ? (
                      <div className="mt-4">
                        <div className="text-xs font-bold text-gray-500">{language === 'ar' ? 'Evidence' : 'Evidence'}</div>
                        <ul className="mt-2 text-sm text-gray-700 space-y-1 list-disc list-inside">
                          {c.evidence.map((e, idx) => (
                            <li key={idx}>{e}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {c.actions?.length ? (
                      <div className="mt-4">
                        <div className="text-xs font-bold text-gray-500">{language === 'ar' ? 'Actions' : 'Actions'}</div>
                        <ul className="mt-2 text-sm text-gray-900 space-y-1 list-disc list-inside">
                          {c.actions.map((a, idx) => (
                            <li key={idx}>{a}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                )
              })
            ) : (
              <div className="text-sm text-gray-600">
                {language === 'ar' ? 'اختر سؤالاً من اللوحة أو اكتب سؤالاً ثم Ask.' : 'Pick a prompt from the panel or type a question and Ask.'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drawer / Panel (page-only) */}
      {panelOpen ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPanelOpen(false)} />
          <div
            className={`absolute top-0 h-full w-[92%] sm:w-[420px] bg-white shadow-2xl p-5 overflow-y-auto ${
              isRTL ? 'left-0' : 'right-0'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-extrabold text-gray-900">{language === 'ar' ? 'لوحة Copilot' : 'Copilot panel'}</div>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="px-3 py-2 rounded-xl font-extrabold bg-gray-900 text-white"
              >
                {language === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              {language === 'ar'
                ? 'اختر سؤالاً سريعاً (Rule-based).'
                : 'Pick a quick rule-based prompt.'}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2">
              {prompts.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setQuestion(p)
                  }}
                  className="text-right px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 font-bold text-gray-900"
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="mt-6">
              <button
                type="button"
                disabled={loading || !question.trim()}
                onClick={async () => {
                  await runAsk()
                  setPanelOpen(false)
                }}
                className="w-full px-5 py-3 rounded-xl font-extrabold bg-emerald-600 text-white disabled:opacity-50"
              >
                {loading ? '...' : language === 'ar' ? 'Ask' : 'Ask'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

