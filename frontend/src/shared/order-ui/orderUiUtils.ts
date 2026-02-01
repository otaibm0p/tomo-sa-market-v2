export function formatMoney(value: any, currency: string, lang: 'ar' | 'en') {
  const n = Number(value)
  if (!Number.isFinite(n)) return lang === 'ar' ? 'غير متاح' : 'N/A'
  const fixed = n.toFixed(2)
  return lang === 'ar' ? `${fixed} ${currency}` : `${currency} ${fixed}`
}

export function formatTimeAgo(isoOrDate: string | number | Date | null | undefined, lang: 'ar' | 'en') {
  if (!isoOrDate) return ''
  const ts = typeof isoOrDate === 'number' ? isoOrDate : isoOrDate instanceof Date ? isoOrDate.getTime() : Date.parse(String(isoOrDate))
  if (!Number.isFinite(ts)) return ''
  const diffSec = Math.floor((Date.now() - ts) / 1000)

  const abs = Math.abs(diffSec)
  const mins = Math.floor(abs / 60)
  const hrs = Math.floor(abs / 3600)
  const days = Math.floor(abs / 86400)

  if (days >= 1) return lang === 'ar' ? `قبل ${days} يوم` : `${days}d ago`
  if (hrs >= 1) return lang === 'ar' ? `قبل ${hrs} ساعة` : `${hrs}h ago`
  if (mins >= 1) return lang === 'ar' ? `قبل ${mins} دقيقة` : `${mins}m ago`
  return lang === 'ar' ? 'الآن' : 'Just now'
}

/** Format milliseconds as "Xm Ys" or "Xh Ym" for timeline durations */
export function formatDurationMs(ms: number, lang: 'ar' | 'en'): string {
  if (!Number.isFinite(ms) || ms < 0) return lang === 'ar' ? '—' : '—'
  const sec = Math.floor(ms / 1000)
  const min = Math.floor(sec / 60)
  const hr = Math.floor(min / 60)
  if (hr >= 1) return lang === 'ar' ? `${hr} س ${min % 60} د` : `${hr}h ${min % 60}m`
  if (min >= 1) return lang === 'ar' ? `${min} د ${sec % 60} ث` : `${min}m ${sec % 60}s`
  return lang === 'ar' ? `${sec} ث` : `${sec}s`
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (!text) return false
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
    return false
  } catch {
    return false
  }
}

/** Default SLA cycle length in seconds (30 minutes) */
const DEFAULT_CYCLE_SEC = 30 * 60
/** At-risk threshold: 20 minutes into the cycle */
const AT_RISK_SEC = 20 * 60

/**
 * Compute SLA rolling cycle from start time.
 * totalElapsedSec = now - slaStartAt
 * cycleElapsedSec = totalElapsedSec % cycleSec
 * cycleNumber = floor(totalElapsedSec / cycleSec) + 1
 */
export function computeSlaCycle(
  slaStartAtIsoOrMs: string | number | Date | null | undefined,
  nowMs: number = Date.now(),
  cycleSec: number = DEFAULT_CYCLE_SEC
): { totalElapsedSec: number; cycleElapsedSec: number; cycleNumber: number } {
  if (!slaStartAtIsoOrMs) {
    return { totalElapsedSec: 0, cycleElapsedSec: 0, cycleNumber: 1 }
  }
  const startMs =
    typeof slaStartAtIsoOrMs === 'number'
      ? slaStartAtIsoOrMs
      : slaStartAtIsoOrMs instanceof Date
        ? slaStartAtIsoOrMs.getTime()
        : Date.parse(String(slaStartAtIsoOrMs))
  if (!Number.isFinite(startMs)) {
    return { totalElapsedSec: 0, cycleElapsedSec: 0, cycleNumber: 1 }
  }
  const totalElapsedSec = Math.max(0, Math.floor((nowMs - startMs) / 1000))
  const cycleElapsedSec = totalElapsedSec % cycleSec
  const cycleNumber = Math.floor(totalElapsedSec / cycleSec) + 1
  return { totalElapsedSec, cycleElapsedSec, cycleNumber }
}

/** Variant for SLA: on-time (success), at-risk >= 20m (warn), late >= cycle (danger) */
export function slaCycleVariant(
  cycleElapsedSec: number,
  cycleNumber: number,
  cycleSec: number = DEFAULT_CYCLE_SEC
): 'success' | 'warn' | 'danger' {
  if (cycleNumber > 1) return 'danger'
  const atRiskSec = Math.min(AT_RISK_SEC, Math.floor(cycleSec * (20 / 30)))
  if (cycleElapsedSec >= atRiskSec) return 'warn'
  if (cycleElapsedSec >= cycleSec) return 'danger'
  return 'success'
}

/**
 * Derive SLA start timestamp for an order (no pricing/order logic changes).
 * Prefer: order.paid_at → order.payment_received_at → first CONFIRMED/ACCEPTED (accepted_at) → order.created_at.
 */
export function getOrderSlaStartAt(order: {
  created_at: string
  paid_at?: string | null
  payment_received_at?: string | null
  sla_start_at?: string | null
  accepted_at?: string | null
}): string | null {
  const o = order as any
  const paid = o?.paid_at ?? o?.payment_received_at
  if (paid && typeof paid === 'string') return paid
  const explicit = o?.sla_start_at
  if (explicit && typeof explicit === 'string') return explicit
  const accepted = o?.accepted_at
  if (accepted && typeof accepted === 'string') return accepted
  const created = o?.created_at
  if (created && typeof created === 'string') return created
  return null
}

/** Format seconds as mm:ss */
export function formatCycleMmSs(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Format total seconds as hh:mm:ss */
export function formatTotalHhMmSs(totalSec: number): string {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h >= 1) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}
