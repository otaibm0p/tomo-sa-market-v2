import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useLanguage } from '../context/LanguageContext'
import { useOrderCalculations } from '../hooks/useOrderCalculations'
import { cx, radius } from '../shared/ui/tokens'

export default function MobileCartBar({ bottomNavVisible }: { bottomNavVisible: boolean }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { t, language } = useLanguage()
  const { items } = useCart()
  const { grandTotal } = useOrderCalculations()

  const itemCount = useMemo(() => (items || []).reduce((sum, it: any) => sum + Number(it?.quantity || 0), 0), [items])
  if (itemCount <= 0) return null

  const p = location.pathname
  if (p.startsWith('/cart') || p.startsWith('/checkout')) return null

  // Avoid overlapping other sticky bars:
  // - BottomNav (mobile): ~72px
  // - ProductDetail sticky CTA bar: ~86px
  const bottomOffset = p.startsWith('/product/') ? 86 : bottomNavVisible ? 72 : 0

  return (
    <div className="fixed left-0 right-0 z-[88] md:hidden" style={{ bottom: bottomOffset }}>
      <div className="max-w-7xl mx-auto px-4 pb-safe">
        <div className={cx('bg-white/95 backdrop-blur border border-gray-200 shadow-lg', radius.card, 'px-4 py-3')}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-bold text-gray-600">
                {language === 'ar' ? 'في السلة' : 'In cart'} • <span className="text-gray-900 font-extrabold">{itemCount}</span>
              </div>
              <div className="mt-1 text-lg font-extrabold text-emerald-700" dir="ltr">
                {Number.isFinite(Number(grandTotal)) ? Number(grandTotal).toFixed(2) : ''}
                <span className="ml-1 text-xs font-bold text-gray-500">{t('currency')}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/cart')}
              className="shrink-0 px-5 py-3 rounded-2xl bg-gray-900 text-white text-sm font-extrabold hover:bg-gray-800 active:scale-[0.99] transition"
            >
              {language === 'ar' ? 'إتمام الطلب' : 'Checkout'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

