import { cx, adminTokens, type StatusVariant } from '../tokens'

export function BadgeStatus({
  variant,
  children,
  dot = true,
  className,
}: {
  variant: StatusVariant
  children: React.ReactNode
  dot?: boolean
  className?: string
}) {
  const s = adminTokens.status[variant]
  return (
    <span
      className={cx(
        adminTokens.radius.pill,
        'inline-flex items-center gap-2 px-3 py-1 font-semibold text-sm border',
        s.bg,
        s.border,
        s.text,
        className
      )}
    >
      {dot ? <span className={cx('w-2 h-2 rounded-full shrink-0', s.dot)} /> : null}
      {children}
    </span>
  )
}
