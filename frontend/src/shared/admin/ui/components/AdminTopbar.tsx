import { Link } from 'react-router-dom'
import { Search, Menu, Sun, Moon, ChevronDown, PanelLeftClose, PanelLeftOpen, ShieldAlert } from 'lucide-react'
import { cx, adminTokens } from '../tokens'
import { Button } from './Button'
import { AdminHealthBadge } from './AdminHealthBadge'

export function AdminTopbar({
  title,
  onOpenSidebar,
  onToggleCollapse,
  isCollapsed,
  searchPlaceholder,
  userName,
  languageLabel,
  onToggleLanguage,
  theme,
  onToggleTheme,
  rightSlot,
  readOnlyBanner,
  managePermissionsHref,
  readOnlyBannerMessage,
  readOnlyBannerButtonLabel,
}: {
  title: string
  onOpenSidebar: () => void
  onToggleCollapse?: () => void
  isCollapsed?: boolean
  searchPlaceholder: string
  userName: string
  languageLabel: string
  onToggleLanguage: () => void
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  rightSlot?: React.ReactNode
  readOnlyBanner?: boolean
  managePermissionsHref?: string
  readOnlyBannerMessage?: string
  readOnlyBannerButtonLabel?: string
}) {
  const bannerMessage = readOnlyBannerMessage ?? 'You are in Read-only mode due to permissions'
  const bannerButtonLabel = readOnlyBannerButtonLabel ?? 'Manage Permissions'
  return (
    <div className={cx('sticky top-0 z-30', theme === 'dark' ? 'bg-gray-900/95' : adminTokens.surfaces.background, 'backdrop-blur-sm border-b', theme === 'dark' ? 'border-gray-800' : adminTokens.borders.soft)}>
      {readOnlyBanner && (
        <div className={cx('px-3 py-2 md:px-4 flex items-center justify-between gap-3', theme === 'dark' ? 'bg-amber-900/40 text-amber-200 border-b border-amber-800' : 'bg-amber-100 text-amber-900 border-b border-amber-200')}>
          <span className="flex items-center gap-2 text-sm font-bold">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            {bannerMessage}
          </span>
          {(managePermissionsHref === '/admin/users' || managePermissionsHref === '/admin/control') && (
            <Link
              to={managePermissionsHref}
              className={cx('shrink-0 px-3 py-1.5 rounded-lg text-sm font-bold border-2', theme === 'dark' ? 'border-amber-500 text-amber-200 hover:bg-amber-900/60' : 'border-amber-600 text-amber-800 hover:bg-amber-200')}
            >
              {bannerButtonLabel}
            </Link>
          )}
        </div>
      )}
      <div className="max-w-full">
        <div className={cx(adminTokens.surfaces.card, adminTokens.borders.strong, adminTokens.radius.card, adminTokens.shadow.subtle, 'px-4 py-3 md:px-5')}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                className={cx('lg:hidden', adminTokens.radius.control, 'p-2 hover:bg-gray-100', theme === 'dark' && 'hover:bg-gray-800')}
                onClick={onOpenSidebar}
                aria-label="Open sidebar"
              >
                <Menu className={cx('w-5 h-5', theme === 'dark' ? 'text-gray-100' : 'text-gray-900')} />
              </button>
              {onToggleCollapse ? (
                <button
                  type="button"
                  className={cx(
                    'hidden lg:inline-flex',
                    adminTokens.radius.control,
                    'p-2 border border-gray-200 bg-white hover:bg-gray-50',
                    theme === 'dark' && 'border-gray-700 bg-gray-900 hover:bg-gray-800'
                  )}
                  onClick={onToggleCollapse}
                  aria-label="Toggle sidebar collapse"
                >
                  {isCollapsed ? (
                    <PanelLeftOpen className={cx('w-4 h-4', theme === 'dark' ? 'text-gray-100' : 'text-gray-900')} />
                  ) : (
                    <PanelLeftClose className={cx('w-4 h-4', theme === 'dark' ? 'text-gray-100' : 'text-gray-900')} />
                  )}
                </button>
              ) : null}
              <div className={cx('min-w-0', adminTokens.text.pageTitle, theme === 'dark' ? 'text-gray-100' : adminTokens.color.text)}>{title}</div>
            </div>

            <div className="hidden md:flex items-center gap-2 flex-1 max-w-xl">
              <div className={cx('flex items-center gap-2 w-full', adminTokens.radius.control, 'border border-gray-200 px-3 py-2', theme === 'dark' && 'border-gray-700 bg-gray-900')}>
                <Search className={cx('w-4 h-4', theme === 'dark' ? 'text-gray-300' : 'text-gray-500')} />
                <input
                  className={cx('w-full bg-transparent outline-none text-sm', theme === 'dark' ? 'text-gray-100 placeholder:text-gray-400' : 'text-gray-900 placeholder:text-gray-400')}
                  placeholder={searchPlaceholder}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <AdminHealthBadge theme={theme} />
              {rightSlot}

              <Button variant="secondary" size="sm" onClick={onToggleLanguage} className={theme === 'dark' ? 'bg-gray-900 border-gray-700 text-gray-100 hover:bg-gray-800' : undefined}>
                {languageLabel}
              </Button>

              <button
                type="button"
                onClick={onToggleTheme}
                className={cx(adminTokens.radius.control, 'p-2 border border-gray-200 bg-white hover:bg-gray-50', theme === 'dark' && 'border-gray-700 bg-gray-900 hover:bg-gray-800')}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-gray-700" />}
              </button>

              <button
                type="button"
                className={cx(
                  adminTokens.radius.control,
                  'px-3 py-2 border border-gray-200 bg-white hover:bg-gray-50 flex items-center gap-2',
                  theme === 'dark' && 'border-gray-700 bg-gray-900 hover:bg-gray-800'
                )}
              >
                <span className={cx('text-sm font-extrabold', theme === 'dark' ? 'text-gray-100' : 'text-gray-900')}>{userName}</span>
                <ChevronDown className={cx('w-4 h-4', theme === 'dark' ? 'text-gray-300' : 'text-gray-500')} />
              </button>
            </div>
          </div>

          <div className="mt-3 md:hidden">
            <div className={cx('flex items-center gap-2 w-full', adminTokens.radius.control, 'border border-gray-200 px-3 py-2', theme === 'dark' && 'border-gray-700 bg-gray-900')}>
              <Search className={cx('w-4 h-4', theme === 'dark' ? 'text-gray-300' : 'text-gray-500')} />
              <input
                className={cx('w-full bg-transparent outline-none text-sm', theme === 'dark' ? 'text-gray-100 placeholder:text-gray-400' : 'text-gray-900 placeholder:text-gray-400')}
                placeholder={searchPlaceholder}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

