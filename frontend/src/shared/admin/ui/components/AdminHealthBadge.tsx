import { useEffect, useMemo, useRef, useState } from 'react'
import { cx, adminTokens } from '../tokens'
import { useLanguage } from '../../../../context/LanguageContext'

type HealthState = 'online' | 'slow' | 'offline'

export function AdminHealthBadge({ theme }: { theme: 'light' | 'dark' }) {
  const { t } = useLanguage()
  const [state, setState] = useState<HealthState>('offline')
  const [latencyMs, setLatencyMs] = useState<number | null>(null)
  const timerRef = useRef<number | null>(null)

  const ping = async () => {
    const ctrl = new AbortController()
    const start = performance.now()
    const timeout = window.setTimeout(() => ctrl.abort(), 4000)
    try {
      const res = await fetch('/api/health', { signal: ctrl.signal, cache: 'no-store' })
      const ms = Math.round(performance.now() - start)
      if (!res.ok) throw new Error('BAD_STATUS')
      setLatencyMs(ms)
      if (ms < 800) setState('online')
      else if (ms <= 2500) setState('slow')
      else setState('offline')
    } catch {
      setLatencyMs(null)
      setState('offline')
    } finally {
      window.clearTimeout(timeout)
    }
  }

  useEffect(() => {
    ping()
    timerRef.current = window.setInterval(ping, 30000) as unknown as number
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ui = useMemo(() => {
    if (state === 'online') {
      return {
        dot: 'bg-emerald-500 dark:bg-emerald-400',
        text: t('admin.health.online') || 'Online',
        tone: theme === 'dark' ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-gray-900',
      }
    }
    if (state === 'slow') {
      return {
        dot: 'bg-amber-500 dark:bg-amber-400',
        text: t('admin.health.slow') || 'Slow',
        tone: theme === 'dark' ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-gray-900',
      }
    }
    return {
      dot: 'bg-gray-400 dark:bg-gray-500',
      text: t('admin.health.offline') || 'Offline',
      tone: theme === 'dark' ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-gray-900',
    }
  }, [state, t, theme])

  const title = latencyMs != null ? `${t('admin.health.lastCheck') || 'Last check'}: ${latencyMs}ms` : t('admin.health.offline') || 'Offline'

  return (
    <div
      className={cx(
        adminTokens.radius.pill,
        'inline-flex items-center gap-2 px-3 py-1.5 text-xs font-extrabold border',
        ui.tone
      )}
      title={title}
      aria-label={title}
    >
      <span className={cx('inline-block w-2 h-2 rounded-full', ui.dot)} />
      <span>{ui.text}</span>
    </div>
  )
}

