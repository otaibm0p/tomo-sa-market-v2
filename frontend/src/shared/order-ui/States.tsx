import { type ReactNode } from 'react'
import { cx, cardClass } from '../ui/tokens'

export function LoadingState({ title }: { title?: string }) {
  return (
    <div className="min-h-[240px] flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mb-3" />
        <div className="text-sm font-extrabold text-gray-700">{title || '...'}</div>
      </div>
    </div>
  )
}

export function EmptyState({
  title,
  subtitle,
  icon,
  actions,
}: {
  title: string
  subtitle?: string
  icon?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className={cx(cardClass(), 'p-8 text-center')}>
      <div className="text-5xl mb-3">{icon || '📦'}</div>
      <div className="text-lg font-extrabold text-gray-900">{title}</div>
      {subtitle ? <div className="mt-1 text-sm font-bold text-gray-600">{subtitle}</div> : null}
      {actions ? <div className="mt-4 flex items-center justify-center">{actions}</div> : null}
    </div>
  )
}

export function ErrorBanner({
  title,
  subtitle,
  onRetry,
}: {
  title: string
  subtitle?: string
  onRetry?: () => void
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <div className="text-sm font-extrabold text-gray-900">{title}</div>
      {subtitle ? <div className="mt-1 text-xs font-bold text-gray-600">{subtitle}</div> : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 px-3 py-2 rounded-xl font-extrabold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
        >
          Retry
        </button>
      ) : null}
    </div>
  )
}

