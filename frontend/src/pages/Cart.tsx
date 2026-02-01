import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useLanguage } from '../context/LanguageContext'
import { motion, AnimatePresence } from 'framer-motion'
import { useOrderCalculations } from '../hooks/useOrderCalculations'
import { Card } from '../shared/ui/components/Card'
import { Button } from '../shared/ui/components/Button'
import { spacing } from '../shared/ui/tokens'
import { MinOrderProgress } from '../shared/ui/components/MinOrderProgress'

export default function Cart() {
  const { items, removeFromCart, updateQuantity } = useCart()
  const navigate = useNavigate()
  const { language, t } = useLanguage()
  
  // Use central calculations hook for instant updates
  const { subtotal, deliveryFee, tax, grandTotal } = useOrderCalculations()

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  }

  if (items.length === 0) {
    return (
      <div className={spacing.pageMax}>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 font-['Tajawal']">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="w-48 h-48 bg-emerald-50 rounded-full flex items-center justify-center mb-6 relative"
        >
          <span className="text-8xl">🛒</span>
        </motion.div>
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-3xl font-bold mb-3 text-gray-800"
        >
          {language === 'ar' ? 'سلتك فاضية!' : 'Your cart is empty!'}
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-gray-500 mb-8 text-lg max-w-md"
        >
          {language === 'ar' ? 'شكلك نسيت تضيف مقاضيك، خذ لفة في المتجر واختار اللي يعجبك 🍏' : 'Looks like you forgot to add items. Take a tour and pick what you like 🍏'}
        </motion.p>
        <motion.div whileTap={{ scale: 0.98 }} className="w-full max-w-sm">
          <Button full size="lg" onClick={() => navigate('/')}>
          {language === 'ar' ? 'تصفح المنتجات' : 'Browse Products'}
          </Button>
        </motion.div>
      </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 font-['Tajawal'] pb-32 md:pb-24" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className={spacing.pageMax}>
      <div className="px-4 py-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <span className="bg-emerald-100 p-2 rounded-xl">🛍️</span>
            {language === 'ar' ? 'سلة المشتريات' : 'Shopping Cart'}
            <span className="text-sm font-bold bg-gray-100 text-gray-600 px-3 py-1 rounded-full border border-gray-200">
              {items.length}
            </span>
          </h1>
          <button 
            onClick={() => navigate('/')}
            className="text-emerald-600 font-bold hover:underline text-sm md:text-base hidden md:block"
          >
            {language === 'ar' ? 'تابع التسوق' : 'Continue Shopping'}
          </button>
        </motion.div>

        {/* Cart Items - Clean Vertical Card Layout */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-4 mb-6"
        >
          <AnimatePresence mode='popLayout'>
            {items.map((item) => (
              <motion.div 
                key={item.product.id} 
                layout
                variants={itemVariants}
                exit={{ opacity: 0, x: language === 'ar' ? 100 : -100, transition: { duration: 0.2 } }}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex gap-4 items-center group hover:shadow-md transition-all duration-300"
              >
                {/* Quantity Selector - Left Side */}
                <div className="flex flex-col items-center gap-2">
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-bold text-lg flex items-center justify-center transition-colors shadow-sm"
                  >
                    +
                  </motion.button>
                  <span className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center font-bold text-gray-900 text-sm">
                    {item.quantity}
                  </span>
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => updateQuantity(item.product.id, Math.max(0, item.quantity - 1))}
                    className="w-10 h-10 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 font-bold text-lg flex items-center justify-center transition-colors shadow-sm"
                  >
                    −
                  </motion.button>
                </div>

                {/* Product Info - Middle */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-base md:text-lg leading-tight line-clamp-2 mb-1">
                    {language === 'ar' ? item.product.name_ar || item.product.name : item.product.name_en || item.product.name}
                  </h3>
                  <p className="text-xs text-gray-500 mb-2">
                    {item.product.unit || 'Piece'}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-700 font-bold text-lg">
                      {(Number(item.product.price) * item.quantity).toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-500">{t('currency')}</span>
                  </div>
                </div>

                {/* Product Image - Right Side */}
                <div className="w-20 h-20 md:w-24 md:h-24 flex-shrink-0 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 p-1">
                  {(() => {
                    const imageUrl = (item.product as any).image_url || (item.product as any).imageURL || (item.product as any).image
                    const displayImage = imageUrl && imageUrl !== 'null' && imageUrl !== 'undefined' && imageUrl.trim() !== ''
                      ? imageUrl
                      : 'https://placehold.co/200x200/f3f4f6/9ca3af?text=No+Image'
                    
                    return (
                      <img
                        src={displayImage}
                        alt={language === 'ar' ? item.product.name_ar || item.product.name : item.product.name_en || item.product.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.onerror = null
                          e.currentTarget.src = 'https://placehold.co/200x200/f3f4f6/9ca3af?text=No+Image'
                        }}
                        loading="lazy"
                      />
                    )
                  })()}
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => removeFromCart(item.product.id)}
                  className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all"
                  title={language === 'ar' ? 'حذف' : 'Remove'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Pricing Summary - Above Button */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-4"
        >
          <Card className="p-5 md:p-6">
            <h3 className="text-lg font-extrabold text-gray-900 mb-4 flex items-center gap-2">
              <span>🧾</span>
              {language === 'ar' ? 'ملخص الطلب' : 'Order Summary'}
            </h3>
            <MinOrderProgress subtotal={subtotal} className="mb-4" />
            <div className="space-y-3">
              <div className="flex justify-between items-center text-gray-600 text-sm">
                <span>{language === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}</span>
                <span className="font-extrabold text-gray-900">{subtotal.toFixed(2)} {t('currency')}</span>
              </div>
              <div className="h-px bg-gray-100"></div>
              <div className="flex justify-between items-center text-gray-600 text-sm">
                <span>{language === 'ar' ? 'التوصيل' : 'Delivery'}</span>
                <span className={`font-extrabold ${deliveryFee === 0 ? 'text-emerald-700' : 'text-gray-900'}`}>
                  {deliveryFee === 0 ? (language === 'ar' ? 'مجاني' : 'FREE') : `${deliveryFee.toFixed(2)} ${t('currency')}`}
                </span>
              </div>
              <div className="h-px bg-gray-100"></div>
              <div className="flex justify-between items-center text-gray-600 text-sm">
                <span>{language === 'ar' ? 'الضريبة' : 'Tax'}</span>
                <span className="font-extrabold text-gray-900">{tax.toFixed(2)} {t('currency')}</span>
              </div>
              <div className="h-px bg-gray-200 my-2"></div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-lg font-extrabold text-gray-900">{language === 'ar' ? 'الإجمالي' : 'Total'}</span>
                <span className="text-2xl md:text-3xl font-extrabold text-emerald-700">
                  {grandTotal.toFixed(2)} <span className="text-base md:text-lg font-bold text-gray-500">{t('currency')}</span>
                </span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Continue Shopping Link (Desktop) */}
        <div className="text-center mb-4 hidden md:block">
          <button 
            onClick={() => navigate('/')}
            className="text-emerald-600 font-bold hover:underline text-sm"
          >
            {language === 'ar' ? '← تابع التسوق' : 'Continue Shopping →'}
          </button>
        </div>
      </div>
      </div>

      {/* Sticky Bottom Action Bar - Mobile */}
      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-50 md:hidden"
      >
        <div className={spacing.pageMax}>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/checkout')}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 px-6 rounded-xl font-bold text-lg shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-3"
          >
            <span>{language === 'ar' ? 'تأكيد الطلب' : 'Confirm Order'}</span>
            <span className="bg-white/20 px-3 py-1 rounded-lg text-base font-bold">
              {grandTotal.toFixed(2)} {t('currency')}
            </span>
          </motion.button>
        </div>
      </motion.div>

      {/* Desktop Checkout Button */}
      <div className={spacing.pageMax}>
      <div className="px-4 hidden md:block pb-6">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/checkout')}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 px-6 rounded-xl font-bold text-lg shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-3"
        >
          <span>{language === 'ar' ? 'تأكيد الطلب' : 'Confirm Order'}</span>
          <span className="bg-white/20 px-3 py-1 rounded-lg text-base font-bold">
            {grandTotal.toFixed(2)} {t('currency')}
          </span>
        </motion.button>
      </div>
      </div>
    </div>
  )
}
