import { useLanguage } from '../../context/LanguageContext'
import { getStatusLabel } from '../orderStatus'
import { cx, getStatusTone } from '../ui/tokens'

export function StatusBadge({
  status,
  lang,
  className,
  showDot = true,
}: {
  status: string | null | undefined
  lang?: 'ar' | 'en'
  className?: string
  showDot?: boolean
}) {
  const ctx = useLanguage()
  const resolvedLang = lang || (ctx?.language === 'en' ? 'en' : 'ar')
  const tone = getStatusTone(status)

  return (
    <span
      className={cx(
        'inline-flex items-center gap-2 px-3 py-1.5 text-xs font-extrabold border rounded-full whitespace-nowrap',
        tone.badge,
        className
      )}
    >
      {showDot && <span className={cx('w-2 h-2 rounded-full', tone.dot)} />}
      {getStatusLabel(status, resolvedLang)}
    </span>
  )
}

