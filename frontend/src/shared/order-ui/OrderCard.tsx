import { type ReactNode } from 'react'
import { cx, cardClass } from '../ui/tokens'
import { StatusBadge } from './StatusBadge'
import { formatMoney, formatTimeAgo } from './orderUiUtils'
import { useLanguage } from '../../context/LanguageContext'

export function OrderCard({
  orderId,
  status,
  total,
  currency = 'SAR',
  createdAt,
  customerName,
  customerPhone,
  subtitle,
  actions,
  meta,
  slaBlock,
  onClick,
  className,
}: {
  orderId: number | string
  status: string | null | undefined
  total?: number | string | null
  currency?: string
  createdAt?: string | null
  customerName?: string | null
  customerPhone?: string | null
  subtitle?: ReactNode
  actions?: ReactNode
  meta?: ReactNode
  /** Optional SLA timer block (e.g. SlaTimerBadge) when feature enabled */
  slaBlock?: ReactNode
  onClick?: () => void
  className?: string
}) {
  const { language } = useLanguage()
  const lang = language === 'en' ? 'en' : 'ar'
  const when = createdAt ? formatTimeAgo(createdAt, lang) : ''

  return (
    <div className={cx(cardClass(), 'p-4', onClick && 'cursor-pointer', className)} onClick={onClick}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-sm font-extrabold text-gray-900 truncate">#{orderId}</div>
            <StatusBadge status={status} />
          </div>
          {subtitle && <div className="text-sm font-bold text-gray-700 mt-2 line-clamp-2">{subtitle}</div>}
          {meta ? <div className="mt-2 text-xs font-bold text-gray-600">{meta}</div> : null}
          {customerName && <div className="text-xs font-bold text-gray-600 mt-2 truncate">{customerName}</div>}
          {customerPhone && (
            <div className="text-xs text-gray-500 mt-0.5" dir="ltr">
              {customerPhone}
            </div>
          )}
        </div>

        <div className="text-right shrink-0">
          {total != null && (
            <div className="text-sm font-extrabold text-gray-900">
              <span dir="ltr">{formatMoney(total, currency, lang)}</span>
            </div>
          )}
          {when ? <div className="text-xs text-gray-500 mt-1">{when}</div> : null}
          {slaBlock ? <div className="mt-2">{slaBlock}</div> : null}
        </div>
      </div>

      {actions && <div className="mt-3">{actions}</div>}
    </div>
  )
}

