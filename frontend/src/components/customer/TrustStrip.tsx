import { Link, useLocation } from 'react-router-dom'
import { useLanguage } from '../../context/LanguageContext'
import { cx } from '../../shared/ui/tokens'

export default function TrustStrip() {
  const { language, t } = useLanguage()
  const location = useLocation()

  const show =
    location.pathname === '/' ||
    location.pathname.startsWith('/products') ||
    location.pathname.startsWith('/categories')

  if (!show) return null

  const items = [
    { icon: '🚚', title: t('customer.trust.fastDelivery') || (language === 'ar' ? 'توصيل سريع' : 'Fast delivery') },
    { icon: '🥬', title: t('customer.trust.freshDaily') || (language === 'ar' ? 'طازج يوميًا' : 'Fresh daily') },
    { icon: '💳', title: t('customer.trust.securePay') || (language === 'ar' ? 'دفع آمن' : 'Secure pay') },
  ]

  return (
    <div className="border-b border-gray-100 bg-white/90 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 md:gap-4 overflow-x-auto scrollbar-hide">
          {items.map((it) => (
            <div key={it.title} className="flex items-center gap-2 text-xs font-extrabold text-gray-700 whitespace-nowrap">
              <span className="text-base">{it.icon}</span>
              <span>{it.title}</span>
            </div>
          ))}
        </div>

        <Link
          to="/products?sort=deals"
          className={cx(
            'shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-extrabold',
            'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
          )}
          aria-label="Deals"
        >
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
          {t('customer.promo.dealsToday') || (language === 'ar' ? 'عروض اليوم' : 'Deals today')}
        </Link>
      </div>
    </div>
  )
}

