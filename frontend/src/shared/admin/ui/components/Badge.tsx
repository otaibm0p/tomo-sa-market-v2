import { cx, adminTokens } from '../tokens'

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-gray-100 text-gray-800 border-gray-200',
  success: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  warning: 'bg-amber-100 text-amber-800 border-amber-200',
  danger: 'bg-rose-100 text-rose-800 border-rose-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200',
}

export function Badge({
  children,
  tone,
  variant,
  size = 'md',
  className,
}: {
  children: React.ReactNode
  tone?: BadgeTone
  /** Alias for tone (premium OS style) */
  variant?: BadgeTone
  size?: 'sm' | 'md'
  className?: string
}) {
  const t = variant ?? tone ?? 'neutral'
  return (
    <span
      className={cx(
        adminTokens.radius.pill,
        'border inline-flex items-center gap-1.5 font-semibold',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        adminTokens.text.meta,
        toneClasses[t],
        className
      )}
    >
      {children}
    </span>
  )
}

