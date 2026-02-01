import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Search, Clock, ArrowRight } from 'lucide-react'
import { cx, adminTokens } from '../tokens'
import { useLanguage } from '../../../../context/LanguageContext'

type RouteItem = { path: string; labelKey: string; group?: 'core' | 'intelligence' }

const RECENT_KEY = 'admin_recent_nav'

function safeParse<T>(raw: string | null): T | null {
  try {
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function getRecent(): string[] {
  if (typeof window === 'undefined') return []
  const list = safeParse<string[]>(localStorage.getItem(RECENT_KEY))
  return Array.isArray(list) ? list : []
}

function pushRecent(path: string) {
  if (typeof window === 'undefined') return
  const prev = getRecent().filter((p) => p !== path)
  const next = [path, ...prev].slice(0, 5)
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
}

function isTypingTarget(el: EventTarget | null) {
  const t = el as HTMLElement | null
  if (!t) return false
  const tag = (t.tagName || '').toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
  return t.isContentEditable
}

export function AdminCommandPalette({ theme }: { theme: 'light' | 'dark' }) {
  const { t, language } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()

  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const routes: RouteItem[] = useMemo(
    () => [
      { path: '/admin', labelKey: 'admin.items.dashboard', group: 'core' },
      { path: '/admin/orders', labelKey: 'admin.items.orders', group: 'core' },
      { path: '/admin/products', labelKey: 'admin.items.products', group: 'core' },
      { path: '/admin/stores', labelKey: 'admin.items.stores', group: 'core' },
      { path: '/admin/control', labelKey: 'admin.items.controlCenter', group: 'core' },

      { path: '/admin/ops', labelKey: 'admin.items.opsDigest', group: 'intelligence' },
      { path: '/admin/ops-monitor', labelKey: 'admin.items.opsMonitor', group: 'intelligence' },
      { path: '/admin/catalog-watch', labelKey: 'admin.items.catalogWatch', group: 'intelligence' },
      { path: '/admin/guardrails', labelKey: 'admin.items.guardrails', group: 'intelligence' },
      { path: '/admin/profit-guard', labelKey: 'admin.items.profitGuard', group: 'intelligence' },
      { path: '/admin/copilot', labelKey: 'admin.items.adminCopilot', group: 'intelligence' },
      { path: '/admin/activity', labelKey: 'admin.items.activityLog', group: 'intelligence' },
    ],
    []
  )

  const labelFor = (it: RouteItem) => t(it.labelKey) || it.path

  const recentItems = useMemo(() => {
    const recentPaths = getRecent()
    const map = new Map(routes.map((r) => [r.path, r]))
    return recentPaths.map((p) => map.get(p)).filter(Boolean) as RouteItem[]
  }, [routes, open, location.pathname])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return routes
    return routes.filter((it) => labelFor(it).toLowerCase().includes(query) || it.path.toLowerCase().includes(query))
  }, [q, routes])

  const list = useMemo(() => {
    // Show Recent section on top when no query
    if (!q.trim() && recentItems.length) {
      const recentSet = new Set(recentItems.map((r) => r.path))
      const rest = routes.filter((r) => !recentSet.has(r.path))
      return [...recentItems, ...rest]
    }
    return filtered
  }, [q, recentItems, routes, filtered])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isK = e.key.toLowerCase() === 'k'
      const metaOrCtrl = (e.ctrlKey && !e.metaKey) || e.metaKey
      if (metaOrCtrl && isK) {
        if (isTypingTarget(e.target)) return
        e.preventDefault()
        setOpen(true)
        return
      }
      if (!open) return
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx((i) => Math.min(i + 1, Math.max(0, list.length - 1)))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const it = list[activeIdx]
        if (!it) return
        pushRecent(it.path)
        navigate(it.path)
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, list, activeIdx, navigate])

  useEffect(() => {
    if (!open) return
    setQ('')
    setActiveIdx(0)
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }, [open])

  if (!open) return null

  const isRTL = language === 'ar'

  const title = t('admin.palette.title') || (isRTL ? 'بحث سريع' : 'Quick search')
  const placeholder = t('admin.palette.placeholder') || (isRTL ? 'اكتب للبحث…' : 'Type to search…')
  const recentLabel = t('admin.palette.recent') || (isRTL ? 'Recent' : 'Recent')
  const noResults = t('admin.palette.noResults') || (isRTL ? 'لا توجد نتائج' : 'No results')

  return (
    <div className="fixed inset-0 z-[320]" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />

      <div className="absolute inset-0 flex items-start justify-center p-4 md:p-8">
        <div className={cx('w-full max-w-xl overflow-hidden', adminTokens.radius.card, 'border', theme === 'dark' ? 'bg-gray-950 border-gray-800 text-gray-100' : 'bg-white border-gray-200 text-gray-900')}>
          <div className={cx('px-4 py-3 border-b', theme === 'dark' ? 'border-gray-800' : 'border-gray-100')}>
            <div className="flex items-center gap-2">
              <Search className={cx('w-4 h-4', theme === 'dark' ? 'text-gray-300' : 'text-gray-500')} />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value)
                  setActiveIdx(0)
                }}
                placeholder={placeholder}
                className={cx('w-full bg-transparent outline-none text-sm font-bold', theme === 'dark' ? 'text-gray-100 placeholder:text-gray-500' : 'text-gray-900 placeholder:text-gray-400')}
              />
              <div className={cx('text-xs font-bold', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>Esc</div>
            </div>
            <div className={cx('mt-2 text-xs font-bold', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>{title}</div>
          </div>

          <div className="max-h-[60vh] overflow-auto p-2">
            {!q.trim() && recentItems.length ? (
              <div className={cx('px-2 py-2 text-xs font-extrabold uppercase tracking-wide', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>
                {recentLabel}
              </div>
            ) : null}

            {list.length === 0 ? (
              <div className={cx('px-3 py-6 text-sm font-bold text-center', theme === 'dark' ? 'text-gray-300' : 'text-gray-600')}>
                {noResults}
              </div>
            ) : (
              <div className="space-y-1">
                {list.map((it, idx) => {
                  const active = idx === activeIdx
                  return (
                    <button
                      key={it.path}
                      type="button"
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={() => {
                        pushRecent(it.path)
                        navigate(it.path)
                        setOpen(false)
                      }}
                      className={cx(
                        adminTokens.radius.control,
                        'w-full text-left px-3 py-2 flex items-center justify-between gap-3',
                        active
                          ? theme === 'dark'
                            ? 'bg-gray-800 text-white'
                            : 'bg-gray-900 text-white'
                          : theme === 'dark'
                            ? 'hover:bg-gray-900 text-gray-100'
                            : 'hover:bg-gray-50 text-gray-900'
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          {recentItems.some((r) => r.path === it.path) && !q.trim() ? (
                            <Clock className={cx('w-4 h-4', active ? 'text-white' : theme === 'dark' ? 'text-gray-300' : 'text-gray-400')} />
                          ) : null}
                          <div className={cx('text-sm font-extrabold truncate')}>{labelFor(it)}</div>
                        </div>
                        <div className={cx('mt-0.5 text-xs truncate', active ? 'text-white/80' : theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>{it.path}</div>
                      </div>
                      <ArrowRight className={cx('w-4 h-4 shrink-0', active ? 'text-white' : theme === 'dark' ? 'text-gray-300' : 'text-gray-400')} />
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

