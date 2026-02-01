import { cx, adminTokens } from '../tokens'

export function Card({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cx(adminTokens.radius.card, adminTokens.surfaces.card, adminTokens.borders.soft, adminTokens.shadow.cardPremium, adminTokens.spacing.card, className)}>
      {children}
    </div>
  )
}

