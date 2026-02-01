import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Product } from '../utils/api'
import { useLanguage, getProductName } from '../context/LanguageContext'
import { useCart } from '../context/CartContext'

interface HomeProductCardProps {
  product: Product
  onAdd: (product: Product) => void
  isDeal?: boolean // For Deals of the Day section
  dealEndTime?: string | null // ISO string for deal end time
}

interface CountdownTime {
  hours: number
  minutes: number
  seconds: number
  expired: boolean
}

// Countdown Timer Component
const CountdownTimer = ({ endTime, labelAr, labelEn }: { endTime: string; labelAr: string; labelEn: string }) => {
  const { language } = useLanguage()
  const [timeLeft, setTimeLeft] = useState<CountdownTime>({ hours: 0, minutes: 0, seconds: 0, expired: false })

  useEffect(() => {
    const calculateTime = () => {
      const end = new Date(endTime).getTime()
      const now = new Date().getTime()
      const diff = end - now

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, expired: true })
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft({ hours, minutes, seconds, expired: false })
    }

    calculateTime()
    const interval = setInterval(calculateTime, 1000)

    return () => clearInterval(interval)
  }, [endTime])

  if (timeLeft.expired) {
    return null // Don't show timer when expired
  }

  const label = language === 'ar' ? labelAr : labelEn

  return (
    <div className="absolute bottom-1 left-1 right-1 z-20">
      <div className="bg-red-600/95 text-white px-1.5 py-0.5 rounded shadow-md flex items-center justify-center gap-1 text-[9px] font-bold">
        <span className="text-[8px]">{label}</span>
        <div className="flex items-center gap-0.5 font-mono">
          <span className="bg-red-700 px-1 py-0.5 rounded min-w-[16px] text-center text-[8px]">
            {String(timeLeft.hours).padStart(2, '0')}
          </span>
          <span className="text-[7px]">:</span>
          <span className="bg-red-700 px-1 py-0.5 rounded min-w-[16px] text-center text-[8px]">
            {String(timeLeft.minutes).padStart(2, '0')}
          </span>
          <span className="text-[7px]">:</span>
          <span className="bg-red-700 px-1 py-0.5 rounded min-w-[16px] text-center text-[8px]">
            {String(timeLeft.seconds).padStart(2, '0')}
          </span>
        </div>
      </div>
    </div>
  )
}

export const HomeProductCard = ({ product, onAdd, isDeal = false, dealEndTime = null }: HomeProductCardProps) => {
  const { language, t } = useLanguage()
  const { cart } = useCart()
  const [isAdded, setIsAdded] = useState(false)

  const productName = getProductName(product, language)
  const basePrice = Number((product as any).price || 0)
  const discountPrice = (product as any).discount_price ? Number((product as any).discount_price) : null
  const discountPercentage = (product as any).discount_percentage ? Number((product as any).discount_percentage) : null
  const displayPrice = discountPrice || basePrice
  const hasDiscount = discountPrice !== null && discountPrice < basePrice

  const availableQty = (product as any).available_quantity
  const hasStockInfo = availableQty !== null && availableQty !== undefined
  const isAvailable = !hasStockInfo || availableQty > 0

  const cartItem = (cart && Array.isArray(cart)) ? cart.find(item => item.product.id === product.id) : undefined
  const quantityInCart = cartItem ? cartItem.quantity : 0

  // Get primary image URL
  const imageUrl = (product as any).image_url || 
                   (product as any).imageURL || 
                   (product as any).image ||
                   null
  
  const displayImage = imageUrl && imageUrl !== 'null' && imageUrl !== 'undefined' && String(imageUrl).trim() !== ''
    ? String(imageUrl)
    : 'https://placehold.co/400x400/f3f4f6/9ca3af?text=No+Image'
  
  const currency = t('currency') || (language === 'ar' ? 'ريال' : 'SAR')

  const handleAddClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onAdd(product)
    setIsAdded(true)
    setTimeout(() => setIsAdded(false), 1500)
  }

  // Check if deal is still active
  const isDealActive = isDeal && dealEndTime && new Date(dealEndTime) > new Date()

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-2 relative flex flex-col group hover:shadow-md transition-all duration-300 w-full max-w-[180px] mx-auto">
      {/* Image Container - Fixed Height (120px mobile, 140px desktop), No min-width, Prevent flex growth */}
      <Link 
        to={`/product/${product.id}`} 
        className="block mb-1.5 relative flex items-center justify-center bg-gray-50 rounded overflow-hidden w-full h-[120px] md:h-[140px] flex-shrink-0"
      >
        <img 
          src={displayImage}
          alt={productName}
          className="max-w-full max-h-full w-auto h-auto object-contain object-center transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.onerror = null
            e.currentTarget.src = 'https://placehold.co/400x400/f3f4f6/9ca3af?text=No+Image'
          }}
        />
        
        {/* Deal Badge - Top Left */}
        {isDealActive && (
          <div className="absolute top-1 left-1 z-20">
            <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-md">
              {language === 'ar' ? 'عرض اليوم' : 'Deal'}
            </span>
          </div>
        )}

        {/* Discount Badge - Top Right */}
        {hasDiscount && discountPercentage && (
          <div className="absolute top-1 right-1 z-20">
            <span className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-md">
              -{Math.round(discountPercentage)}%
            </span>
          </div>
        )}

        {/* Countdown Timer - Bottom */}
        {isDealActive && dealEndTime && (
          <CountdownTimer 
            endTime={dealEndTime}
            labelAr="ينتهي"
            labelEn="Ends"
          />
        )}

        {/* Out of Stock Overlay */}
        {!isAvailable && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center z-10">
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
              {language === 'en' ? 'Out of Stock' : 'نفد'}
            </span>
          </div>
        )}
        
        {/* Quantity Badge */}
        {quantityInCart > 0 && (
          <div className="absolute top-1 right-1 bg-emerald-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-md z-20 border border-white">
            {quantityInCart}
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="flex flex-col">
        {/* Product Name - Max 2 lines, text-sm */}
        <Link to={`/product/${product.id}`} className="block mb-1">
          <h4 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 hover:text-emerald-600 transition-colors">
            {productName}
          </h4>
        </Link>
        
        {/* Price & Add Button */}
        <div className="flex items-end justify-between gap-1">
          <div className="flex flex-col flex-1 min-w-0">
            {/* Discounted Price */}
            {hasDiscount ? (
              <>
                <span className="text-emerald-700 font-bold text-sm leading-none">
                  {displayPrice.toFixed(2)} <span className="text-xs font-normal text-gray-500">{currency}</span>
                </span>
                <span className="text-gray-400 text-xs line-through decoration-red-400 decoration-2 mt-0.5">
                  {basePrice.toFixed(2)}
                </span>
              </>
            ) : (
              <span className="text-emerald-700 font-bold text-sm leading-none">
                {displayPrice.toFixed(2)} <span className="text-xs font-normal text-gray-500">{currency}</span>
              </span>
            )}
          </div>
          
          {/* Add to Cart Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleAddClick}
            disabled={!isAvailable}
            className="w-7 h-7 rounded-full flex items-center justify-center shadow-sm transition-all z-10 relative overflow-hidden bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed flex-shrink-0"
          >
            <AnimatePresence mode='wait'>
              {isAdded ? (
                <motion.svg 
                  key="check"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </motion.svg>
              ) : (
                <motion.svg 
                  key="plus"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                </motion.svg>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </div>
  )
}

