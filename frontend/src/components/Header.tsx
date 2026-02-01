import { Lock, Phone, Truck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useMemo, useState, useEffect } from 'react'
import { useCart } from '../context/CartContext'
import { authAPI } from '../utils/api'
import { useLanguage } from '../context/LanguageContext'
import { debounce } from '../shared/ui/tokens'
import { getPublicSettings, type PublicSettings } from '../shared/settings/publicSettings'

interface HeaderProps {
  onCartClick?: () => void
}

export default function Header({ onCartClick }: HeaderProps) {
  const { cart } = useCart()
  const { language, setLanguage, t } = useLanguage()
  const navigate = useNavigate()
  // Use local state as a fallback/primary listener for immediate updates
  const [localCount, setLocalCount] = useState(0)
  const [q, setQ] = useState('')
  const [publicSettings, setPublicSettings] = useState<PublicSettings | null>(null)

  // Sync with Context
  useEffect(() => {
    const count = (cart || []).reduce((sum, item) => sum + item.quantity, 0)
    setLocalCount(count)
  }, [cart])

  // Listen for direct updates (Fallback for fast interactions)
  useEffect(() => {
    const handleCartUpdate = (e: any) => {
        if (e.detail && typeof e.detail.count === 'number') {
            setLocalCount(e.detail.count)
        }
    }
    window.addEventListener('cart-updated', handleCartUpdate)
    return () => window.removeEventListener('cart-updated', handleCartUpdate)
  }, [])

  const handleCartClick = (e: React.MouseEvent) => {
    if (onCartClick) {
      e.preventDefault()
      onCartClick()
    }
  }

  useEffect(() => {
    try {
      const sp = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
      const v = sp?.get('q')
      if (v) setQ(v)
    } catch {
      // ignore
    }
  }, [])

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
  const siteSupport = publicSettings?.siteSupport || null
  const trustFeatures = publicSettings?.trustFeatures || null
  const showSupportButton = siteLinks?.header?.showSupportButton !== false
  const supportLabel = language === 'ar'
    ? (siteLinks?.header?.supportLabelAr || 'خدمة العملاء')
    : (siteLinks?.header?.supportLabelEn || 'Support')

  const supportUrl = useMemo(() => {
    const number = (siteSupport?.whatsappNumber || siteLinks?.support?.whatsappNumber || '').trim()
    if (!number) return null
    const msg = (language === 'ar' ? siteLinks?.support?.whatsappMessageAr : siteLinks?.support?.whatsappMessageEn) || null
    const fallback = language === 'ar' ? 'مرحباً، أحتاج مساعدة' : 'Hi, I need support'
    const text = encodeURIComponent((msg || fallback).trim())
    return `https://wa.me/${number}?text=${text}`
  }, [siteSupport?.whatsappNumber, siteLinks?.support?.whatsappNumber, siteLinks?.support?.whatsappMessageAr, siteLinks?.support?.whatsappMessageEn, language])

  const headerLinks = Array.isArray(siteLinks?.headerLinks) ? siteLinks!.headerLinks : []
  const trustItems = Array.isArray(trustFeatures) ? trustFeatures.filter((x: any) => x && x.enabled !== false) : []
  const TrustIcon = ({ icon, color }: { icon: any; color: string }) => {
    const Comp = icon === 'lock' ? Lock : icon === 'phone' ? Phone : Truck
    return <Comp size={18} style={{ color }} />
  }

  const runSearch = (query: string) => {
    const clean = (query || '').trim()
    if (!clean) {
      navigate('/products')
      return
    }
    navigate(`/products?q=${encodeURIComponent(clean)}`)
  }

  const debounced = debounce((val: string) => {
    if (typeof window === 'undefined') return
    if (window.innerWidth >= 768 && (val || '').trim().length >= 2) runSearch(val)
  }, 300)

  return (
    <header className="sticky top-0 z-[100] bg-white/90 backdrop-blur border-b border-gray-100 font-['Tajawal']">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <span className="text-xl md:text-2xl font-extrabold text-emerald-700 tracking-tight">{brandName}</span>
        </Link>

        {/* Search */}
        <div className="flex-1 relative">
          <input
            type="text"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              debounced(e.target.value)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') runSearch(q)
            }}
            placeholder={language === 'en' ? 'Search products…' : 'ابحث عن منتج…'}
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-2.5 px-4 pr-10 text-sm font-bold focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 focus:bg-white outline-none transition-all"
          />
          <button
            type="button"
            onClick={() => runSearch(q)}
            className={`absolute top-2.5 ${language === 'ar' ? 'left-3' : 'right-3'} text-gray-400 hover:text-emerald-600 transition-colors`}
            aria-label="Search"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </button>
        </div>

        {/* Desktop quick links */}
        <div className="hidden md:flex items-center gap-4">
          {(headerLinks.length ? headerLinks : [
            { key: 'categories', label_ar: 'الأقسام', label_en: 'Categories', href: '/categories', external: false },
            { key: 'orders', label_ar: 'طلباتي', label_en: 'Orders', href: '/orders', external: false },
          ]).map((it: any) => {
            const label = language === 'ar' ? it.label_ar : it.label_en
            const external = !!it.external || String(it.href || '').startsWith('http')
            if (!label || !it.href) return null
            return external ? (
              <a
                key={it.key || it.href}
                href={it.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-emerald-700 font-extrabold text-sm transition-colors"
              >
                {label}
              </a>
            ) : (
              <Link key={it.key || it.href} to={it.href} className="text-gray-600 hover:text-emerald-700 font-extrabold text-sm transition-colors">
                {label}
              </Link>
            )
          })}
        </div>

        {/* Language (always visible) */}
        <button
          type="button"
          onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
          className="flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition font-extrabold text-xs text-gray-800"
          aria-label="Toggle language"
        >
          {language === 'ar' ? 'EN' : 'عربي'}
        </button>

        {/* Support (desktop + mobile) */}
        {showSupportButton ? (
          supportUrl ? (
            <a
              href={supportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-10 h-10 md:w-auto md:h-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition font-extrabold text-xs text-gray-800 px-0 md:px-3"
              aria-label={supportLabel}
              title={supportLabel}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-gray-700">
                <path
                  d="M8.5 15h3m8.5-3a8 8 0 1 1-3.04-6.27M20 12v4a2 2 0 0 1-2 2h-3l-4 3v-3H8a2 2 0 0 1-2-2v-1"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="hidden md:inline ml-2">{supportLabel}</span>
            </a>
          ) : (
            <Link
              to="/contact"
              className="flex items-center justify-center w-10 h-10 md:w-auto md:h-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition font-extrabold text-xs text-gray-800 px-0 md:px-3"
              aria-label={supportLabel}
              title={supportLabel}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-gray-700">
                <path
                  d="M8.5 15h3m8.5-3a8 8 0 1 1-3.04-6.27M20 12v4a2 2 0 0 1-2 2h-3l-4 3v-3H8a2 2 0 0 1-2-2v-1"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="hidden md:inline ml-2">{supportLabel}</span>
            </Link>
          )
        ) : null}

        {/* Cart */}
        <button onClick={handleCartClick} className="relative flex items-center justify-center w-10 h-10 rounded-xl hover:bg-gray-50 active:scale-95 transition" aria-label="Open cart">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-6 h-6 text-gray-700">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
          </svg>
          {localCount > 0 ? (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[11px] font-extrabold min-w-[18px] h-[18px] rounded-full flex items-center justify-center border border-white">
              {localCount}
            </span>
          ) : null}
        </button>

        {/* Account */}
        <Link to={authAPI.isAuthenticated() ? '/profile' : '/login'} className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-gray-50 transition" aria-label="Account">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-6 h-6 text-gray-700">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.1a7.5 7.5 0 0 1 15 0A17.9 17.9 0 0 1 12 21.75c-2.68 0-5.22-.58-7.5-1.65Z" />
          </svg>
        </Link>
      </div>

      {/* Trust mini-strip (desktop only) */}
      <div className="hidden md:block border-t border-gray-100 bg-white/70">
        <div className="max-w-7xl mx-auto px-4 py-1.5 text-[12px] font-bold text-gray-600">
          <div className="flex items-center gap-2">
            {(trustItems.length ? trustItems : [
              { icon: 'truck', color: '#10b981', labelAr: t('customer.trust.fastDelivery') || 'توصيل سريع', labelEn: 'Fast delivery', enabled: true },
              { icon: 'lock', color: '#f59e0b', labelAr: t('customer.trust.securePay') || 'دفع آمن', labelEn: 'Secure payment', enabled: true },
              { icon: 'phone', color: '#3b82f6', labelAr: supportLabel || (language === 'ar' ? 'دعم عملاء' : 'Support'), labelEn: supportLabel || 'Support', enabled: true },
            ]).slice(0, 3).map((it: any, idx: number) => (
              <span key={`${it.icon}-${idx}`} className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-gray-200 bg-white/80">
                <TrustIcon icon={it.icon} color={String(it.color || '#64748b')} />
                <span className="text-[12px] font-extrabold text-gray-700">{language === 'ar' ? it.labelAr : it.labelEn}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}
