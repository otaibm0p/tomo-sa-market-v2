import { cx, adminTokens } from '../tokens'
import { Search } from 'lucide-react'

export function FilterBar({
  searchValue,
  onSearchChange,
  onSearchSubmit,
  searchPlaceholder,
  searchButtonLabel = 'بحث',
  right,
  className,
}: {
  searchValue: string
  onSearchChange: (v: string) => void
  onSearchSubmit?: () => void
  searchPlaceholder?: string
  searchButtonLabel?: string
  right?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cx('flex flex-col sm:flex-row gap-3 items-stretch sm:items-center', className)}>
      <div className={cx('flex gap-2 flex-1 min-w-0')}>
        <div className={cx('flex-1 min-w-0 flex items-center gap-2', adminTokens.radius.control, 'border border-gray-200 bg-white px-3 py-2')}>
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="search"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearchSubmit?.()}
            placeholder={searchPlaceholder}
            className={cx('flex-1 min-w-0 bg-transparent outline-none text-sm', adminTokens.color.text, 'placeholder:text-gray-400')}
          />
        </div>
        {onSearchSubmit && (
          <button
            type="button"
            onClick={onSearchSubmit}
            className={cx(adminTokens.radius.control, adminTokens.color.primaryBg, 'text-white px-4 py-2 text-sm font-semibold hover:opacity-90')}
          >
            {searchButtonLabel}
          </button>
        )}
      </div>
      {right ? <div className="flex items-center gap-2 shrink-0">{right}</div> : null}
    </div>
  )
}
