import { cx, adminTokens } from '../tokens'

export function CardModern({
  children,
  className,
  padding = true,
}: {
  children: React.ReactNode
  className?: string
  padding?: boolean
}) {
  return (
    <div
      className={cx(
        adminTokens.radius.card,
        adminTokens.surfaces.card,
        adminTokens.borders.soft,
        adminTokens.shadow.cardPremium,
        'transition-shadow duration-200 hover:shadow-lg hover:shadow-gray-200/40',
        padding && adminTokens.spacing.card,
        className
      )}
    >
      {children}
    </div>
  )
}
