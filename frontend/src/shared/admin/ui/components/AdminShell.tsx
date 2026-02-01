import { useState } from 'react'
import { X } from 'lucide-react'
import { cx, adminTokens } from '../tokens'

export function AdminShell({
  sidebar,
  topbar,
  children,
  isRTL,
  theme,
  mobileMenuLabel = 'Menu',
}: {
  sidebar: (args: { onNavigate?: () => void; collapsed?: boolean }) => React.ReactNode
  topbar: (args: { onOpenSidebar: () => void; onToggleCollapse: () => void; collapsed: boolean }) => React.ReactNode
  children: React.ReactNode
  isRTL: boolean
  theme: 'light' | 'dark'
  mobileMenuLabel?: string
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const fontClass = isRTL ? 'font-ar' : 'font-en'
  return (
    <div className={cx('admin-shell min-h-screen', fontClass, theme === 'dark' ? 'bg-gray-900' : adminTokens.surfaces.background, adminTokens.text.body)} dir={isRTL ? 'rtl' : 'ltr'} lang={isRTL ? 'ar' : 'en'}>
      {/* Desktop sidebar */}
      <aside
        className={cx(
          'admin-shell-sidebar hidden lg:block fixed top-0 h-full transition-colors duration-150',
          collapsed ? 'w-20' : 'w-72',
          isRTL ? 'right-0' : 'left-0',
          theme === 'dark' ? 'bg-gray-950' : adminTokens.surfaces.elevated,
          'border-r',
          theme === 'dark' ? 'border-gray-800' : adminTokens.borders.soft
        )}
      >
        {sidebar({ collapsed })}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div
            className={cx(
              'absolute top-0 h-full w-[88%] max-w-[360px]',
              adminTokens.shadow.premium,
              isRTL ? 'right-0' : 'left-0',
              theme === 'dark' ? 'bg-gray-950' : adminTokens.surfaces.elevated
            )}
          >
            <div className={cx('flex items-center justify-between px-3 py-3 border-b', theme === 'dark' ? 'border-gray-800' : adminTokens.borders.soft)}>
              <div className={cx('text-sm font-extrabold', theme === 'dark' ? 'text-gray-100' : 'text-gray-900')}>{mobileMenuLabel}</div>
              <button
                type="button"
                className={cx(adminTokens.radius.control, 'p-2 hover:bg-gray-100', theme === 'dark' && 'hover:bg-gray-900')}
                onClick={() => setMobileOpen(false)}
                aria-label="Close sidebar"
              >
                <X className={cx('w-5 h-5', theme === 'dark' ? 'text-gray-100' : 'text-gray-900')} />
              </button>
            </div>
            {sidebar({ onNavigate: () => setMobileOpen(false) })}
          </div>
        </div>
      ) : null}

      {/* Main */}
      <div
        className={cx(
          'min-h-screen',
          'flex flex-col',
          'lg:transition-[margin] lg:duration-200',
          isRTL ? (collapsed ? 'lg:mr-20' : 'lg:mr-72') : collapsed ? 'lg:ml-20' : 'lg:ml-72'
        )}
      >
        {topbar({
          onOpenSidebar: () => setMobileOpen(true),
          onToggleCollapse: () => setCollapsed((v) => !v),
          collapsed,
        })}
        <main className={cx(adminTokens.spacing.page)}>{children}</main>
      </div>
    </div>
  )
}

