import { useLanguage } from '../../context/LanguageContext'
import { MVP_STATUS_ORDER, getStatusLabel, normalizeOrderStatus } from '../orderStatus'
import { cx, getStatusTone } from '../ui/tokens'
import { formatDurationMs } from './orderUiUtils'

export type OrderTimelineEvent = { status: string; at?: string }

/** Canonical timeline event from backend: type, at, actor, meta */
export type CanonicalTimelineEvent = {
  type: string
  at: string
  actor: 'system' | 'admin' | 'store' | 'driver'
  meta?: { note?: string; actor_id?: number }
}

const CANONICAL_TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  created: { ar: 'إنشاء الطلب', en: 'Order created' },
  payment_confirmed: { ar: 'تأكيد الدفع', en: 'Payment confirmed' },
  dispatch_assigned: { ar: 'تعيين السائق', en: 'Driver assigned' },
  offer_sent: { ar: 'إرسال عرض', en: 'Offer sent' },
  offer_accepted: { ar: 'قبول العرض', en: 'Offer accepted' },
  store_started: { ar: 'بدء التحضير', en: 'Store started' },
  store_ready: { ar: 'جاهز من المتجر', en: 'Store ready' },
  picked_up: { ar: 'تم الاستلام', en: 'Picked up' },
  out_for_delivery: { ar: 'في الطريق', en: 'Out for delivery' },
  delivered: { ar: 'تم التوصيل', en: 'Delivered' },
  cancelled: { ar: 'ملغي', en: 'Cancelled' },
  status_change: { ar: 'تغيير الحالة', en: 'Status change' },
}

function getCanonicalLabel(type: string, lang: 'ar' | 'en'): string {
  const t = CANONICAL_TYPE_LABELS[type] ?? CANONICAL_TYPE_LABELS.status_change
  return lang === 'ar' ? t.ar : t.en
}

function getActorLabel(actor: string, lang: 'ar' | 'en'): string {
  const map: Record<string, { ar: string; en: string }> = {
    system: { ar: 'النظام', en: 'System' },
    admin: { ar: 'الإدارة', en: 'Admin' },
    store: { ar: 'المتجر', en: 'Store' },
    driver: { ar: 'السائق', en: 'Driver' },
  }
  const t = map[actor] ?? map.system
  return lang === 'ar' ? t.ar : t.en
}

export interface OrderTimelineProps {
  currentStatus?: string | null
  events?: OrderTimelineEvent[]
  /** Canonical events from API (unified timeline); when set, durations + total are shown */
  canonicalEvents?: CanonicalTimelineEvent[]
  lang?: 'ar' | 'en'
  showDurations?: boolean
}

export function OrderTimeline({
  currentStatus,
  events,
  canonicalEvents,
  lang,
  showDurations = true,
}: OrderTimelineProps) {
  const ctx = useLanguage()
  const resolvedLang = (lang ?? (ctx?.language === 'en' ? 'en' : 'ar')) as 'ar' | 'en'

  // Unified canonical timeline (Admin / Store / Driver)
  if (canonicalEvents && canonicalEvents.length > 0) {
    const sorted = [...canonicalEvents].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
    const firstAt = new Date(sorted[0].at).getTime()

    return (
      <div className="w-full">
        <div className="text-sm font-extrabold text-gray-900 mb-3">
          {resolvedLang === 'en' ? 'Order timeline' : 'الجدول الزمني للطلب'}
        </div>
        <div className="space-y-2">
          {sorted.map((ev, i) => {
            const atMs = new Date(ev.at).getTime()
            const prevAt = i === 0 ? atMs : new Date(sorted[i - 1].at).getTime()
            const durationMs = atMs - prevAt
            const totalMs = atMs - firstAt

            return (
              <div key={`${ev.type}-${ev.at}-${i}`} className="flex items-start gap-3">
                <div className="relative mt-0.5">
                  <div className="w-3.5 h-3.5 rounded-full border border-emerald-500 bg-emerald-100" />
                  {i < sorted.length - 1 && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-px h-6 bg-gray-200" />
                  )}
                </div>
                <div className="min-w-0 flex-1 pb-2">
                  <div className="text-sm font-bold text-gray-900">
                    {getCanonicalLabel(ev.type, resolvedLang)}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {new Date(ev.at).toLocaleString(resolvedLang === 'en' ? 'en-US' : 'ar-SA')}
                    {' · '}
                    {getActorLabel(ev.actor, resolvedLang)}
                  </div>
                  {showDurations && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      {i === 0
                        ? resolvedLang === 'en' ? 'Start' : 'بداية'
                        : `${resolvedLang === 'en' ? '+' : ''}${formatDurationMs(durationMs, resolvedLang)}`}
                      {i > 0 && (
                        <span className="ml-1">
                          ({resolvedLang === 'en' ? 'total' : 'الإجمالي'} {formatDurationMs(totalMs, resolvedLang)})
                        </span>
                      )}
                    </div>
                  )}
                  {ev.meta?.note && (
                    <p className="text-xs text-gray-600 mt-1 italic">{ev.meta.note}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        {showDurations && sorted.length > 1 && (
          <div className="mt-2 pt-2 border-t border-gray-200 text-xs font-bold text-gray-600">
            {resolvedLang === 'en' ? 'Total time' : 'الوقت الإجمالي'}:{' '}
            {formatDurationMs(new Date(sorted[sorted.length - 1].at).getTime() - firstAt, resolvedLang)}
          </div>
        )}
      </div>
    )
  }

  // Legacy: status-based steps with optional event timestamps
  const normalized = normalizeOrderStatus(currentStatus)
  const isCancelled = String(currentStatus || '').toUpperCase() === 'CANCELLED'
  const idx = normalized ? MVP_STATUS_ORDER.indexOf(normalized) : -1
  const steps = [...MVP_STATUS_ORDER, 'CANCELLED'] as const
  const eventMap = new Map<string, string>()
  ;(events || []).forEach((e) => {
    const s = normalizeOrderStatus(e.status)
    if (!s) return
    if (e.at) eventMap.set(s, e.at)
  })

  return (
    <div className="w-full">
      <div className="text-sm font-extrabold text-gray-900 mb-3">
        {resolvedLang === 'en' ? 'Order status' : 'حالة الطلب'}
      </div>
      <div className="space-y-3">
        {steps.map((s, i) => {
          const active = normalized === s || (isCancelled && s === 'CANCELLED')
          const completed = !isCancelled ? i <= idx && i !== steps.length - 1 : s !== 'CANCELLED'
          const tone = getStatusTone(s)
          const at = eventMap.get(String(s))

          return (
            <div key={s} className="flex items-start gap-3">
              <div className="relative mt-0.5">
                <div
                  className={cx(
                    'w-3.5 h-3.5 rounded-full border',
                    completed || active ? tone.dot : 'bg-white',
                    completed || active ? 'border-transparent' : 'border-gray-300'
                  )}
                />
                {i < steps.length - 1 && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 w-px h-6 bg-gray-200" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className={cx('text-sm font-bold', active ? 'text-gray-900' : 'text-gray-700')}>
                  {getStatusLabel(s, resolvedLang)}
                </div>
                {at && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    {new Date(at).toLocaleString(resolvedLang === 'en' ? 'en-US' : 'ar-SA')}
                  </div>
                )}
              </div>
              {active && (
                <div
                  className={cx(
                    'text-xs font-extrabold px-2 py-1 rounded-full',
                    tone.subtleBg,
                    'text-gray-800'
                  )}
                >
                  {resolvedLang === 'en' ? 'Now' : 'الآن'}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
