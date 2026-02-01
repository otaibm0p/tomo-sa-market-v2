import { cx, adminTokens, type StatusVariant } from '../tokens'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export function StatCard({
  label,
  value,
  icon,
  tone = 'neutral',
  statusVariant,
  subtitle,
  trend,
  onClick,
}: {
  label: string
  value: React.ReactNode
  icon?: React.ReactNode
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger'
  statusVariant?: StatusVariant
  /** e.g. "Target 120" */
  subtitle?: React.ReactNode
  /** up | down | flat */
  trend?: 'up' | 'down' | 'flat'
  onClick?: () => void
}) {
  const toneBg =
    tone === 'success'
      ? 'bg-emerald-50 dark:bg-emerald-950/30'
      : tone === 'info'
        ? 'bg-blue-50 dark:bg-blue-950/30'
        : tone === 'warning'
          ? 'bg-amber-50 dark:bg-amber-950/30'
          : tone === 'danger'
            ? 'bg-rose-50 dark:bg-rose-950/30'
            : 'bg-gray-50 dark:bg-gray-800/50'
  const trendIcon =
    trend === 'up' ? <TrendingUp className="w-4 h-4 text-primary" /> : trend === 'down' ? <TrendingDown className="w-4 h-4 text-rose-600" /> : trend === 'flat' ? <Minus className="w-4 h-4 text-gray-400" /> : null
  return (
    <div
      className={cx(
        adminTokens.radius.card,
        adminTokens.surfaces.card,
        statusVariant ? adminTokens.status[statusVariant].border : adminTokens.borders.soft,
        adminTokens.shadow.cardPremium,
        adminTokens.spacing.cardSm,
        onClick && 'cursor-pointer hover:shadow-premium transition-shadow',
        'min-w-0'
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className={cx(adminTokens.typography.kpiLabel, adminTokens.color.textMuted)}>{label}</div>
          <div className={cx('mt-1 text-[1.75rem] md:text-[2rem] font-extrabold tracking-[-0.01em] tabular-nums', statusVariant ? adminTokens.status[statusVariant].text : adminTokens.color.textStrong)} dir="ltr">
            {value}
          </div>
          {subtitle ? <div className={cx('mt-1 text-sm', adminTokens.color.secondary, 'dark:text-gray-400')}>{subtitle}</div> : null}
          {trendIcon ? <div className="mt-1 flex items-center gap-1">{trendIcon}</div> : null}
        </div>
        {icon ? <div className={cx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', toneBg)}>{icon}</div> : null}
      </div>
    </div>
  )
}

