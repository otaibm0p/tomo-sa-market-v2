import { useSlaTicker } from './SlaTimerContext'
import {
  formatDurationMs,
  computeSlaCycle,
  slaCycleVariant,
  formatCycleMmSs,
  formatTotalHhMmSs,
} from './orderUiUtils'
import { statusClasses, type StatusVariant } from '../admin/ui/tokens'

export interface SlaTimerBadgeProps {
  /** When payment was confirmed (SLA start). If null, badge shows "—" or hidden */
  paymentReceivedAt?: string | null
  /** Explicit SLA start (prefer over paymentReceivedAt when set) */
  slaStartAt?: string | null
  /** SLA cycle length in minutes (default 30) */
  limitMinutes?: number
  /** If true, hide badge when no start time */
  hideWhenNoStart?: boolean
  lang?: 'ar' | 'en'
  /** Optional: order is delivered/cancelled — show final elapsed only */
  isTerminal?: boolean
  /** If true, show full block (cycle progress bar + total time + cycle badge). If false, compact inline badge */
  fullBlock?: boolean
  className?: string
}

export function SlaTimerBadge({
  paymentReceivedAt,
  slaStartAt,
  limitMinutes = 30,
  hideWhenNoStart = false,
  lang = 'en',
  isTerminal = false,
  fullBlock = false,
  className = '',
}: SlaTimerBadgeProps) {
  const now = useSlaTicker()
  const startRaw = slaStartAt ?? paymentReceivedAt

  if (!startRaw) {
    if (hideWhenNoStart) return null
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500 ${className}`}
      >
        —
      </span>
    )
  }

  const startMs = new Date(startRaw).getTime()
  if (!Number.isFinite(startMs)) {
    if (hideWhenNoStart) return null
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500 ${className}`}
      >
        —
      </span>
    )
  }

  const cycleLimitSec = limitMinutes * 60
  const { totalElapsedSec, cycleElapsedSec, cycleNumber } = computeSlaCycle(startRaw, now, cycleLimitSec)
  const variant: StatusVariant = slaCycleVariant(cycleElapsedSec, cycleNumber, cycleLimitSec)
  const progressPct = Math.min(100, (cycleElapsedSec / cycleLimitSec) * 100)

  const currentCycleLabel =
    lang === 'ar'
      ? `الدورة الحالية: ${formatCycleMmSs(cycleElapsedSec)} / ${formatCycleMmSs(cycleLimitSec)}`
      : `Current cycle: ${formatCycleMmSs(cycleElapsedSec)} / ${formatCycleMmSs(cycleLimitSec)}`
  const totalLabel =
    lang === 'ar' ? `الوقت الكلي: ${formatTotalHhMmSs(totalElapsedSec)}` : `Total time: ${formatTotalHhMmSs(totalElapsedSec)}`
  const cycleBadgeLabel = lang === 'ar' ? `دورة #${cycleNumber}` : `Cycle #${cycleNumber}`

  if (isTerminal) {
    const elapsedMs = totalElapsedSec * 1000
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${statusClasses(variant)} ${className}`}
      >
        {formatDurationMs(elapsedMs, lang)}
      </span>
    )
  }

  if (fullBlock) {
    return (
      <div className={`rounded-xl border p-3 ${statusClasses(variant)} ${className}`}>
        <div className="text-xs font-bold opacity-90">{currentCycleLabel}</div>
        <div className="mt-1 h-2 w-full rounded-full bg-black/10 overflow-hidden">
          <div
            className={`h-full rounded-full ${
              variant === 'danger' ? 'bg-rose-500' : variant === 'warn' ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="mt-1 text-xs font-medium tabular-nums">{totalLabel}</div>
        {cycleNumber > 1 && (
          <span className="mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-black/10">
            {cycleBadgeLabel}
          </span>
        )}
      </div>
    )
  }

  return (
    <span
      className={`inline-flex flex-wrap items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${statusClasses(variant)} ${className}`}
      title={`${currentCycleLabel} · ${totalLabel}${cycleNumber > 1 ? ` · ${cycleBadgeLabel}` : ''}`}
    >
      <span className="tabular-nums">
        {formatCycleMmSs(cycleElapsedSec)} / {formatCycleMmSs(cycleLimitSec)}
      </span>
      {cycleNumber > 1 && (
        <span className="opacity-90">· {cycleBadgeLabel}</span>
      )}
    </span>
  )
}
