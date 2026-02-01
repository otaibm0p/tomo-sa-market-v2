import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { getPublicSettings, type PublicSettings } from '../shared/settings/publicSettings'
import { useEffect, useMemo, useState } from 'react'
import { Lock, Phone, Truck } from 'lucide-react'

export default function Footer() {
  const { language, t } = useLanguage()
  const [publicSettings, setPublicSettings] = useState<PublicSettings | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const s = await getPublicSettings()
      if (!cancelled) setPublicSettings(s)
    })()
    const onUpdated = (e: any) => {
      const next = e?.detail
      if (next && typeof next === 'object') setPublicSettings(next as any)
    }
    window.addEventListener('public-settings-updated', onUpdated as any)
    return () => {
      cancelled = true
      window.removeEventListener('public-settings-updated', onUpdated as any)
    }
  }, [])

  const brandName = (publicSettings?.brandName || '').trim() || 'TOMO Market'
  const siteLinks = publicSettings?.siteLinks || null
  const trustFeatures = publicSettings?.trustFeatures || null

  const v2Columns = Array.isArray(siteLinks?.footerColumns) ? siteLinks!.footerColumns : []
  const legacyColumns = Array.isArray(siteLinks?.footer?.columns) ? siteLinks!.footer.columns : []
  const columns = v2Columns.length ? v2Columns : legacyColumns

  const v2TrustItems = Array.isArray(trustFeatures) ? trustFeatures.filter((x: any) => x && x.enabled !== false) : []
  const legacyTrustItems = Array.isArray(siteLinks?.footer?.trustItems) ? siteLinks!.footer.trustItems : []
  const trustItems = v2TrustItems.length ? v2TrustItems : legacyTrustItems

  const TrustIcon = ({ icon, color }: { icon: any; color: string }) => {
    const Comp = icon === 'lock' ? Lock : icon === 'phone' ? Phone : Truck
    return <Comp size={18} style={{ color }} />
  }

  const paymentMethods = useMemo(() => {
    const list = Array.isArray(publicSettings?.paymentMethods) ? publicSettings?.paymentMethods : []
    const cleaned = (list || [])
      .map((x) => String(x || '').trim())
      .filter(Boolean)
      .filter((x) => x.toLowerCase() !== 'cod' && x !== t('cod'))
    // Fallback (no COD)
    return cleaned.length ? cleaned : ['Mada', 'Visa', 'STC Pay']
  }, [publicSettings?.paymentMethods, t])

  const isRTL = language === 'ar'

  return (
    <footer className="mt-auto border-t border-slate-200 bg-[#F8FAFC] text-slate-800 font-['Tajawal']" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-[1200px] mx-auto px-4 py-8">
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 ${isRTL ? 'text-right' : 'text-left'}`}>
          {Array.isArray(v2Columns) && v2Columns.length ? (
            v2Columns.slice(0, 3).map((col: any, idx: number) => {
              const title = isRTL ? col.title_ar : col.title_en
              return (
                <div key={`${title}-${idx}`}>
                  <div className="text-sm font-extrabold text-slate-900">{title}</div>
                  {idx === 2 ? null : null}
                  <div className="mt-3 space-y-2 text-sm font-bold">
                    {(col.links || []).map((l: any, li: number) => {
                      const label = isRTL ? l.label_ar : l.label_en
                      const href = String(l.href || '')
                      if (!label || !href) return null
                      const external = !!l.external || href.startsWith('http')
                      return external ? (
                        <a key={`${label}-${li}`} className="block text-slate-600 hover:text-emerald-700" href={href} target="_blank" rel="noopener noreferrer">
                          {label}
                        </a>
                      ) : (
                        <Link key={`${label}-${li}`} className="block text-slate-600 hover:text-emerald-700" to={href}>
                          {label}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )
            })
          ) : legacyColumns.length ? (
            legacyColumns.slice(0, 3).map((col) => {
              const title = isRTL ? col.titleAr : col.titleEn
              return (
                <div key={col.id}>
                  <div className="text-sm font-extrabold text-slate-900">{title}</div>
                  {col.id === 'about' ? (
                    <div className="mt-2">
                      <div className="text-lg font-extrabold text-emerald-700">{brandName}</div>
                      <div className="mt-2 text-sm text-slate-600 leading-relaxed">{t('aboutUsDescription')}</div>
                    </div>
                  ) : null}
                  <div className="mt-3 space-y-2 text-sm font-bold">
                    {(col.links || []).map((l) => {
                      const label = isRTL ? l.labelAr : l.labelEn
                      if (!label || !l.url) return null
                      const external = !!l.external || l.url.startsWith('http')
                      return external ? (
                        <a
                          key={l.id}
                          className="block text-slate-600 hover:text-emerald-700"
                          href={l.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {label}
                        </a>
                      ) : (
                        <Link key={l.id} className="block text-slate-600 hover:text-emerald-700" to={l.url}>
                          {label}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )
            })
          ) : (
            <>
              <div>
                <div className="text-sm font-extrabold text-slate-900">{t('aboutUs')}</div>
                <div className="mt-2 text-lg font-extrabold text-emerald-700">{brandName}</div>
                <div className="mt-2 text-sm text-slate-600 leading-relaxed">{t('aboutUsDescription')}</div>
              </div>
              <div>
                <div className="text-sm font-extrabold text-slate-900">{t('quickLinks')}</div>
                <div className="mt-3 space-y-2 text-sm font-bold">
                  <Link className="block text-slate-600 hover:text-emerald-700" to="/">
                    {t('home')}
                  </Link>
                  <Link className="block text-slate-600 hover:text-emerald-700" to="/categories">
                    {t('categories')}
                  </Link>
                  <Link className="block text-slate-600 hover:text-emerald-700" to="/products">
                    {t('allProducts')}
                  </Link>
                  <Link className="block text-slate-600 hover:text-emerald-700" to="/orders">
                    {t('trackOrder')}
                  </Link>
                </div>
              </div>
              <div>
                <div className="text-sm font-extrabold text-slate-900">{t('contactUs')}</div>
                <div className="mt-3 text-sm font-bold text-slate-600">
                  {isRTL ? 'سيتم تفعيل روابط الدعم قريبًا' : 'Support links will appear soon'}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 border-t border-slate-200 pt-5 space-y-4">
          {/* Payment methods (small) */}
          <div className={`flex flex-col md:flex-row md:items-center md:justify-between gap-3 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
            <div className="text-xs font-extrabold text-slate-900">{t('paymentMethods')}</div>
            <div className={`flex flex-wrap gap-2 ${isRTL ? 'justify-end' : 'justify-start'}`}>
              {paymentMethods.map((pm) => (
                <span key={pm} className="px-3 py-1 rounded-full border border-slate-200 bg-white text-[11px] font-extrabold text-slate-700">
                  {pm}
                </span>
              ))}
            </div>
          </div>

          {/* Trust strip (chips) */}
          {trustItems.length ? (
            <div className={`flex flex-wrap items-center gap-2 ${isRTL ? 'justify-end' : 'justify-start'}`}>
              {trustItems.slice(0, 5).map((it: any, idx: number) => {
                const label = isRTL ? (it.labelAr ?? it.text_ar ?? it.textAr) : (it.labelEn ?? it.text_en ?? it.textEn)
                return (
                  <span key={it.id || `${it.icon}-${idx}`} className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-white text-[11px] font-extrabold text-slate-700">
                    <TrustIcon icon={it.icon} color={String(it.color || '#64748b')} />
                    <span>{label}</span>
                  </span>
                )
              })}
            </div>
          ) : null}

          {/* Copyright */}
          <div className={`flex flex-col md:flex-row items-center justify-between gap-2 text-xs font-bold text-slate-500 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
            <div>
              {t('allRightsReserved')} © {new Date().getFullYear()} {brandName}
            </div>
            <div>
              {t('poweredBy')} <span className="font-extrabold text-emerald-700">{brandName}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
