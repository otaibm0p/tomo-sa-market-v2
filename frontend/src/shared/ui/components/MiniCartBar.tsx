import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useCart } from '../../../context/CartContext'
import { useLanguage } from '../../../context/LanguageContext'
import { useOrderCalculations } from '../../../hooks/useOrderCalculations'
import { Button } from './Button'
import { MinOrderProgress } from './MinOrderProgress'
import { cx, radius } from '../tokens'

export function MiniCartBar({ bottomNavVisible }: { bottomNavVisible: boolean }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { language, t } = useLanguage()
  const { items } = useCart()
  const { subtotal } = useOrderCalculations()

  const itemCount = useMemo(() => items.reduce((sum, it) => sum + (it?.quantity ?? 0), 0), [items])
  if (itemCount <= 0) return null

  const p = location.pathname
  if (p.startsWith('/cart') || p.startsWith('/checkout')) return null
  const allowed = p === '/products' || p === '/categories' || p.startsWith('/product/')
  if (!allowed) return null

  // Avoid overlapping other sticky bars.
  const bottomOffset = p.startsWith('/product/') ? 86 : bottomNavVisible ? 72 : 0

  return (
    <div className="fixed left-0 right-0 z-[89]" style={{ bottom: bottomOffset }}>
      <div className="max-w-7xl mx-auto px-4">
        <div
          className={cx(
            'bg-white/95 backdrop-blur border border-gray-200 shadow-lg',
            radius.card,
            'px-4 py-3'
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-bold text-gray-600">
                {language === 'ar' ? 'في السلة' : 'In cart'} • <span className="text-gray-900 font-extrabold">{itemCount}</span>
              </div>
              <div className="mt-1 text-lg font-extrabold text-emerald-700" dir="ltr">
                {subtotal.toFixed(2)} <span className="text-xs font-bold text-gray-500">{t('currency')}</span>
              </div>
            </div>

            <Button size="lg" onClick={() => navigate('/checkout')} className="shrink-0">
              {language === 'ar' ? 'إتمام الطلب' : 'Checkout'}
            </Button>
          </div>

          <div className="mt-3">
            <MinOrderProgress subtotal={subtotal} />
          </div>
        </div>
      </div>
    </div>
  )
}

