import type { LucideIcon } from 'lucide-react'
import { adminTokens } from '../tokens'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className={`${adminTokens.radius.card} ${adminTokens.surfaces.card} ${adminTokens.borders.soft} border p-8 md:p-12 text-center shadow-sm`} dir="auto">
      {Icon && (
        <div className="inline-flex p-4 rounded-2xl bg-gray-100 text-gray-400 mb-4">
          <Icon className="w-10 h-10" />
        </div>
      )}
      <h3 className={`${adminTokens.text.h2} ${adminTokens.color.text}`}>{title}</h3>
      {description && <p className={`mt-2 text-sm max-w-md mx-auto ${adminTokens.color.muted}`}>{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
