import { type ReactNode } from 'react'
import { cx } from './tokens'

type Role = 'admin' | 'store' | 'driver'

const DRIVER_NAV = [
  { href: '/driver', labelAr: 'الرئيسية', labelEn: 'Home' },
  { href: '/driver/dashboard', labelAr: 'المهام', labelEn: 'Tasks' },
  { href: '/driver/settings', labelAr: 'الإعدادات', labelEn: 'Settings' },
]

export function AppShell({
  title,
  role,
  topActions,
  children,
  navItems,
}: {
  title: string
  role: Role
  topActions?: ReactNode
  children: ReactNode
  /** Override nav (e.g. driver with Home, Tasks, Settings) */
  navItems?: { href: string; labelAr: string; labelEn: string }[]
}) {
  const nav = navItems ?? (role === 'admin'
    ? [
        { href: '/admin', labelAr: 'لوحة الأدمن', labelEn: 'Admin' },
        { href: '/admin/orders', labelAr: 'الطلبات', labelEn: 'Orders' },
      ]
    : role === 'store'
      ? [
          { href: '/store', labelAr: 'الرئيسية', labelEn: 'Home' },
          { href: '/store/dashboard', labelAr: 'الطلبات', labelEn: 'Orders' },
        ]
      : DRIVER_NAV)

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Cairo, sans-serif' }}>
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <aside className="w-64 shrink-0 border-r border-gray-200 bg-white min-h-screen">
          <div className="p-6">
            <div className="text-sm font-extrabold text-gray-900">{title}</div>
            <div className="text-xs text-gray-500 mt-1">{role.toUpperCase()}</div>
          </div>
          <nav className="px-3 pb-6 space-y-1">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="block px-3 py-2 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50"
              >
                {item.labelAr}
              </a>
            ))}
          </nav>
        </aside>
        <main className="flex-1">
          <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
            <div className="text-lg font-extrabold text-gray-900">{title}</div>
            <div>{topActions}</div>
          </header>
          <div className="p-4 md:p-6">{children}</div>
        </main>
      </div>

      {/* Mobile header + optional bottom nav */}
      <div className="md:hidden">
        <header className="sticky top-0 z-[120] bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className={cx('text-base font-extrabold text-gray-900 truncate')}>{title}</div>
            <div className="shrink-0">{topActions}</div>
          </div>
        </header>
        <main className="p-4 pb-24">{children}</main>

        {(role === 'store' || role === 'driver') && (
          <nav className="fixed bottom-0 left-0 right-0 z-[120] bg-white border-t border-gray-200">
            <div className={cx('max-w-md mx-auto grid gap-px', nav.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
              {nav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="px-4 py-3 text-center text-sm font-bold text-gray-700 hover:bg-gray-50"
                >
                  {item.labelAr}
                </a>
              ))}
            </div>
          </nav>
        )}
      </div>
    </div>
  )
}

