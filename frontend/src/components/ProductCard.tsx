import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Product } from '../utils/api'
import { useLanguage, getProductName } from '../context/LanguageContext'
import { useCart } from '../context/CartContext'
import { cx } from '../shared/ui/tokens'

interface ProductCardProps {
  product: Product
  onAdd: (product: Product) => void
  compact?: boolean // For horizontal scroll sections
  highlight?: string // optional search highlight
}

function highlightText(text: string, query: string) {
  const q = (query || '').trim()
  if (!q) return text
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx === -1) return text
  const before = text.slice(0, idx)
  const mid = text.slice(idx, idx + q.length)
  const after = text.slice(idx + q.length)
  return (
    <>
      {before}
      <mark className="bg-amber-100 text-gray-900 rounded px-1">{mid}</mark>
      {after}
    </>
  )
}

export const ProductCard = ({ product, onAdd, compact = false, highlight }: ProductCardProps) => {
  const { language, t } = useLanguage()
  const { cart, updateQuantity } = useCart() as any
  const [isAdded, setIsAdded] = useState(false)

  const productName = getProductName(product, language)
  const price = Number((product as any).price_per_unit || product.price || 0).toFixed(2)
  // المنتج متاح إذا: الكمية > 0 أو الكمية null/undefined (افتراضي متاح)
  // أو إذا لم يكن هناك quantity محددة (null/undefined) - يعني متاح افتراضياً
  const availableQty = (product as any).available_quantity
  const quantity = (product as any).quantity
  const stockQuantity = (product as any).stock_quantity
  
  // المنتج متاح إذا لم تكن هناك معلومات مخزون، أو إذا كان هناك كمية متاحة
  // نعامل null/undefined كـ متاح افتراضياً
  const hasStockInfo = availableQty !== null && availableQty !== undefined
  const stockNum = stockQuantity !== null && stockQuantity !== undefined ? Number(stockQuantity) : null
  const hasStockQty = stockNum !== null && Number.isFinite(stockNum)
  const isOutOfStock = hasStockQty && stockNum <= 0
  const isLowStock = hasStockQty && stockNum >= 1 && stockNum <= 5

  const isAvailable = isOutOfStock ? false : !hasStockInfo || availableQty > 0 || quantity > 0 || (hasStockQty ? stockNum! > 0 : false)
  
  // Check quantity in cart
  const cartItem = (cart && Array.isArray(cart)) ? cart.find(item => item.product.id === product.id) : undefined
  const quantityInCart = cartItem ? cartItem.quantity : 0

  // Get image URL - check image_url first (as returned from API)
  const imageUrl = (product as any).image_url || 
                   (product as any).imageURL || 
                   (product as any).image ||
                   null
  
  // Use image directly if available, otherwise placeholder
  const displayImage = imageUrl && imageUrl !== 'null' && imageUrl !== 'undefined' && String(imageUrl).trim() !== ''
    ? String(imageUrl)
    : 'https://placehold.co/200x200/f3f4f6/9ca3af?text=No+Image'
  
  // Get currency with fallback
  const currency = t('currency') || (language === 'ar' ? 'ريال' : 'SAR')

  const handleAddClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onAdd(product)
    
    // Trigger animation
    setIsAdded(true)
    setTimeout(() => setIsAdded(false), 1500)
  }

  return (
    <div className={cx(
      'bg-white border border-gray-100',
      'rounded-2xl',
      'shadow-sm hover:shadow-md transition-all duration-300',
      compact ? 'p-2' : 'p-3',
      'relative flex flex-col h-full group'
    )}>
      {/* Image */}
      <Link to={`/product/${product.id}`} className="block aspect-square mb-3 relative flex items-center justify-center bg-gray-50 rounded-xl overflow-hidden">
        <img 
          src={displayImage}
          alt={productName}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = 'https://placehold.co/200x200/f3f4f6/9ca3af?text=No+Image';
          }}
        />
        {!isAvailable && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center z-10">
            <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
              {language === 'en' ? 'Out of Stock' : 'نفد'}
            </span>
          </div>
        )}

        {isLowStock && isAvailable ? (
          <div className="absolute bottom-2 left-2 bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-1 rounded-full border border-amber-200">
            {language === 'ar' ? 'متبقي قليل' : 'Low stock'}
          </div>
        ) : null}
        
        {/* Quantity Badge */}
        {quantityInCart > 0 && (
            <div className="absolute top-2 right-2 bg-emerald-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full shadow-sm z-10 border-2 border-white">
                {quantityInCart}
            </div>
        )}
      </Link>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        <span className="text-[10px] text-gray-400 mb-1 font-bold tracking-wide uppercase">
            {(product as any).brand || (language === 'en' ? 'Generic' : 'عام')}
        </span>
        
        <Link to={`/product/${product.id}`} className="block mb-1.5 sm:mb-2 flex-1">
          <h4 className="font-extrabold text-gray-900 text-sm leading-snug line-clamp-2 hover:text-emerald-700 transition-colors" style={{ minHeight: '2em' }}>
            {highlight ? highlightText(productName, highlight) : productName}
          </h4>
        </Link>
        
        {/* Price & Add Button */}
        <div className="flex items-end justify-between mt-auto gap-2">
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-emerald-700 font-extrabold text-lg leading-none" dir="ltr">
              {price} <span className="text-[11px] font-bold text-gray-500">{currency}</span>
            </span>
            {(product as any).old_price && (
              <span className="text-gray-400 text-[9px] sm:text-[10px] line-through decoration-red-400 decoration-2">{(product as any).old_price}</span>
            )}
          </div>
          
          {quantityInCart > 0 ? (
            <div className="flex items-center rounded-full border border-gray-200 bg-white shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  updateQuantity(product.id, Math.max(0, quantityInCart - 1))
                }}
                className="w-9 h-9 flex items-center justify-center font-extrabold text-gray-700 hover:bg-gray-50"
                aria-label="Decrease"
              >
                −
              </button>
              <div className="w-8 text-center text-sm font-extrabold text-gray-900" dir="ltr">
                {quantityInCart}
              </div>
              <button
                type="button"
                onClick={handleAddClick}
                disabled={!isAvailable}
                className="w-9 h-9 flex items-center justify-center font-extrabold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                aria-label="Increase"
              >
                +
              </button>
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleAddClick}
              disabled={!isAvailable}
              className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-all z-10 relative overflow-hidden bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white disabled:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed flex-shrink-0"
            >
              <AnimatePresence mode='wait'>
                  {isAdded ? (
                      <motion.svg 
                          key="check"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                      </motion.svg>
                  ) : (
                      <motion.svg 
                          key="plus"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                          <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                      </motion.svg>
                  )}
              </AnimatePresence>
            </motion.button>
          )}
        </div>
      </div>
    </div>
  )
}

