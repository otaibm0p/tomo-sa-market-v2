import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useLanguage } from '../../context/LanguageContext'
import { getPublicSettings, type PublicSettings } from '../../shared/settings/publicSettings'
import { cx } from '../../shared/ui/tokens'

function djb2Hash(input: string) {
  let h = 5381
  for (let i = 0; i < input.length; i++) h = (h * 33) ^ input.charCodeAt(i)
  return (h >>> 0).toString(16)
}

function inWindow(startAt: string | null | undefined, endAt: string | null | undefined) {
  const now = Date.now()
  const s = startAt ? Date.parse(startAt) : NaN
  const e = endAt ? Date.parse(endAt) : NaN
  if (!Number.isFinite(s) && !Number.isFinite(e)) return true
  if (Number.isFinite(s) && now < s) return false
  if (Number.isFinite(e) && now > e) return false
  return true
}

export default function PromoStrip() {
  const { language } = useLanguage()
  const location = useLocation()

  const [settings, setSettings] = useState<PublicSettings | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const s = await getPublicSettings()
      if (!cancelled) setSettings(s)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const promo = settings?.promoStrip || null
  const homeHero = settings?.homeHero || null

  const canShow = useMemo(() => {
    if (!promo || !promo.enabled) return false
    if (promo.scope === 'home' && location.pathname !== '/') return false
    if (!inWindow(promo.startAt, promo.endAt)) return false
    return true
  }, [promo, location.pathname])

  const sig = useMemo(() => {
    if (!promo) return null
    const raw = JSON.stringify({
      enabled: promo.enabled,
      textAr: promo.textAr,
      textEn: promo.textEn,
      icon: promo.icon,
      linkUrl: promo.linkUrl,
      linkLabelAr: promo.linkLabelAr,
      linkLabelEn: promo.linkLabelEn,
      variant: promo.variant,
      align: promo.align,
      dismissible: promo.dismissible,
      scope: promo.scope,
      mobileOnly: promo.mobileOnly,
      startAt: promo.startAt,
      endAt: promo.endAt,
      // also consider hero toggle because it changes page feel
      homeHeroEnabled: !!homeHero?.enabled,
    })
    return djb2Hash(raw)
  }, [promo, homeHero?.enabled])

  useEffect(() => {
    if (!sig) return
    try {
      const raw = localStorage.getItem(`promo_strip_dismissed_v1:${sig}`)
      setDismissed(!!raw)
    } catch {
      setDismissed(false)
    }
  }, [sig])

  if (!canShow) return null
  if (promo?.dismissible && dismissed) return null

  const text = language === 'ar' ? promo.textAr : promo.textEn
  if (!text) return null

  const linkLabel = language === 'ar' ? promo.linkLabelAr : promo.linkLabelEn
  const hasCta = !!(promo.linkUrl && linkLabel)

  const variantClass = (() => {
    switch (promo.variant) {
      case 'success':
        return 'border-emerald-200 bg-emerald-50 text-emerald-900'
      case 'promo':
        return 'border-violet-200 bg-violet-50 text-violet-900'
      case 'warning':
        return 'border-amber-200 bg-amber-50 text-amber-900'
      default:
        return 'border-slate-200 bg-slate-50 text-slate-900'
    }
  })()

  const alignClass = (() => {
    if (promo.align === 'center') return 'justify-center text-center'
    if (promo.align === 'left') return 'justify-start text-left'
    return 'justify-end text-right'
  })()

  return (
    <div className={cx('border-b', promo.mobileOnly ? 'md:hidden' : '', 'border-slate-200 bg-white')}>
      <div className="max-w-[1200px] mx-auto px-4 py-2">
        <div className={cx('rounded-2xl border px-3 py-2', variantClass)}>
          <div className={cx('flex items-center gap-2', alignClass)}>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base">{promo.icon || '🔥'}</span>
              <div className="text-sm font-extrabold truncate">{text}</div>
            </div>

            <div className="flex-1" />

            {hasCta ? (
              promo.linkUrl?.startsWith('/') ? (
                <Link
                  to={promo.linkUrl}
                  className="shrink-0 px-3 py-2 rounded-xl bg-gray-900 text-white text-xs font-extrabold hover:bg-gray-800 transition"
                >
                  {linkLabel}
                </Link>
              ) : (
                <a
                  href={String(promo.linkUrl)}
                  className="shrink-0 px-3 py-2 rounded-xl bg-gray-900 text-white text-xs font-extrabold hover:bg-gray-800 transition"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {linkLabel}
                </a>
              )
            ) : null}

            {promo.dismissible ? (
              <button
                type="button"
                className="shrink-0 w-9 h-9 rounded-xl border border-slate-200 bg-white/70 hover:bg-white transition text-slate-700 font-extrabold"
                aria-label="Dismiss"
                onClick={() => {
                  if (!sig) return
                  try {
                    localStorage.setItem(`promo_strip_dismissed_v1:${sig}`, String(Date.now()))
                  } catch {
                    // ignore
                  }
                  setDismissed(true)
                }}
              >
                ×
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

