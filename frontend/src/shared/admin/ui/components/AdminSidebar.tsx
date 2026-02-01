import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { Lock, ChevronDown, ChevronRight } from 'lucide-react'
import { cx, adminTokens } from '../tokens'

export type AdminNavItem = {
  path: string
  label: string
  icon?: LucideIcon
  roles?: string[]
  accent?: 'emerald' | 'amber' | 'blue' | 'violet' | 'rose' | 'cyan'
  /** When true, show Disabled badge + lock (super_admin still sees and can open) */
  moduleDisabled?: boolean
}

export type AdminNavSection = {
  id: string
  label: string
  items: AdminNavItem[]
  /** If true, section can be collapsed (default true for sections with multiple items) */
  collapsible?: boolean
}

function isActivePath(current: string, itemPath: string) {
  if (itemPath === '/admin') return current === '/admin'
  return current === itemPath || current.startsWith(itemPath + '/')
}

export function AdminSidebar({
  sections,
  currentPath,
  userRole,
  onNavigate,
  isRTL,
  theme,
  title,
  subtitle,
  collapsed,
}: {
  sections: AdminNavSection[]
  currentPath: string
  userRole: string
  onNavigate?: () => void
  isRTL: boolean
  theme: 'light' | 'dark'
  title?: string
  subtitle?: string
  collapsed?: boolean
}) {
  const isSuperAdminOrAdmin = userRole === 'super_admin' || userRole === 'admin'

  const sectionContainsCurrent = (sec: { id: string; items: AdminNavItem[] }) =>
    sec.items.some((it) => isActivePath(currentPath, it.path))

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => ({}))
  useEffect(() => {
    const next: Record<string, boolean> = {}
    sections.forEach((sec) => {
      next[sec.id] = sec.items.some((it) => isActivePath(currentPath, it.path))
    })
    setOpenSections(next)
  }, [currentPath, sections])

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const dotClass = (accent: AdminNavItem['accent']) => {
    if (accent === 'emerald') return 'bg-emerald-500 dark:bg-emerald-400'
    if (accent === 'amber') return 'bg-amber-500 dark:bg-amber-400'
    if (accent === 'blue') return 'bg-blue-500 dark:bg-blue-400'
    if (accent === 'violet') return 'bg-violet-500 dark:bg-violet-400'
    if (accent === 'rose') return 'bg-rose-500 dark:bg-rose-400'
    if (accent === 'cyan') return 'bg-cyan-500 dark:bg-cyan-400'
    return 'bg-gray-300 dark:bg-gray-600'
  }

  return (
    <div className={cx('h-full w-full', theme === 'dark' ? 'dark bg-gray-950 text-gray-100' : adminTokens.surfaces.card + ' text-gray-900')}>
      <div className={cx('h-full', 'flex flex-col')}>
        <div className={cx('border-b', theme === 'dark' ? 'border-gray-800' : adminTokens.borders.soft, collapsed ? 'px-2 py-3.5' : 'px-4 py-4')}>
          {collapsed ? (
            <div className="flex items-center justify-center">
              <div className={cx(adminTokens.radius['2xl'], 'w-10 h-10 flex items-center justify-center font-semibold', theme === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-900')}>
                {(title || 'A').slice(0, 1).toUpperCase()}
              </div>
            </div>
          ) : (
            <>
              <div className={cx(adminTokens.text.sectionTitle, theme === 'dark' ? 'text-gray-100' : 'text-gray-900')}>{title || ''}</div>
              <div className={cx('mt-1', adminTokens.text.meta, theme === 'dark' ? 'text-gray-400' : '')}>
                {subtitle || ''}
              </div>
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-3.5">
          {sections.map((sec) => {
            const visibleItems = sec.items.filter((it) => {
              if (!it.roles || it.roles.length === 0) return true
              if (isSuperAdminOrAdmin) return true
              return it.roles.includes(userRole)
            })
            if (!visibleItems.length) return null

            const collapsible = sec.collapsible !== false && visibleItems.length > 1
            const isOpen = collapsed ? true : (openSections[sec.id] ?? sectionContainsCurrent(sec))
            const showItems = !collapsible || isOpen

            return (
              <div key={sec.id} className="mb-3">
                {!collapsed ? (
                  collapsible ? (
                    <button
                      type="button"
                      onClick={() => toggleSection(sec.id)}
                      className={cx('w-full flex items-center gap-2 px-3 py-2', adminTokens.text.meta, 'font-semibold uppercase tracking-wide', adminTokens.radius.lg, theme === 'dark' ? 'text-gray-400 hover:bg-gray-900' : 'text-gray-500 hover:bg-gray-100', 'transition-colors')}
                    >
                      {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      {sec.label}
                    </button>
                  ) : (
                    <div className={cx('px-3 py-2.5', adminTokens.text.meta, 'font-semibold uppercase tracking-wider', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>
                      {sec.label}
                    </div>
                  )
                ) : (
                  <div className={cx('mx-3 my-2 h-px', theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100')} />
                )}
                {showItems && (
                <div className="space-y-1">
                  {visibleItems.map((it) => {
                    const active = isActivePath(currentPath, it.path)
                    const Icon = it.icon
                    return (
                      <Link
                        key={it.path}
                        to={it.path}
                        onClick={onNavigate}
                        className={cx(
                          'relative flex items-center transition-colors',
                          adminTokens.radius.control,
                          collapsed ? 'justify-center gap-2 px-2 py-2.5 text-sm font-medium' : 'gap-3 px-3 py-2.5 text-sm font-medium',
                          active
                            ? theme === 'dark'
                              ? 'bg-gray-800/80 text-white'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : theme === 'dark'
                              ? 'text-gray-200 hover:bg-gray-800/60'
                              : 'text-gray-700 hover:bg-gray-50',
                          active && !collapsed && (isRTL ? 'border-r-[3px] admin-sidebar-active-indicator' : 'border-l-[3px] admin-sidebar-active-indicator')
                        )}
                        title={collapsed ? it.label : undefined}
                      >
                        {Icon ? <Icon className="w-4 h-4 opacity-90" /> : <span className="w-4" />}
                        {it.accent ? <span className={cx('inline-block w-2 h-2 rounded-full', dotClass(it.accent))} /> : null}
                        {!collapsed ? (
                          <span className="min-w-0 truncate flex items-center gap-2">
                            <span className="truncate">{it.label}</span>
                            {it.moduleDisabled && (
                              <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" title="Module disabled">
                                <Lock className="w-3 h-3" />
                                <span>Disabled</span>
                              </span>
                            )}
                          </span>
                        ) : null}
                      </Link>
                    )
                  })}
                </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

