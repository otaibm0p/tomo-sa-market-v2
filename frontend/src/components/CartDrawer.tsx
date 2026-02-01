import { Fragment } from 'react'
import { useCart } from '../context/CartContext'
import { Link, useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { useOrderCalculations } from '../hooks/useOrderCalculations'
import { motion, AnimatePresence } from 'framer-motion'

export default function CartDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { cart, removeFromCart, updateQuantity } = useCart()
  const { t, language } = useLanguage()
  const navigate = useNavigate()

  // Use the central hook for consistent calculations
  const { subtotal, deliveryFee, tax, grandTotal } = useOrderCalculations()

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-40"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: language === 'ar' ? '-100%' : '100%' }}
            animate={{ x: 0 }}
            exit={{ x: language === 'ar' ? '-100%' : '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 font-['Tajawal']"
            dir={language === 'ar' ? 'rtl' : 'ltr'}
          >
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-5 sm:px-6 border-b border-gray-100 bg-white z-20">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span>{language === 'ar' ? 'سلة التسوق' : 'My Cart'}</span>
                  <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-bold">
                    {cart.length}
                  </span>
                </h2>
                <button
                  type="button"
                  className="rounded-full p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-colors"
                  onClick={onClose}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 bg-gray-50/50 scrollbar-thin scrollbar-thumb-gray-200">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4 -mt-10">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center text-5xl mb-2 shadow-inner">
                      🛒
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">{language === 'ar' ? 'السلة فارغة' : 'Your cart is empty'}</h3>
                    <p className="text-gray-500 max-w-xs leading-relaxed">{language === 'ar' ? 'يبدو أنك لم تضف أي منتجات بعد. تصفح المتجر واكتشف عروضنا!' : 'Looks like you haven\'t added any items yet.'}</p>
                    <button
                      onClick={onClose}
                      className="mt-6 px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 transform hover:-translate-y-1"
                    >
                      {language === 'ar' ? 'تصفح المنتجات' : 'Start Shopping'}
                    </button>
                  </div>
                ) : (
                  <ul role="list" className="space-y-4 pb-20">
                    {cart.map((item) => (
                      <li key={item.product.id} className="flex bg-white p-3 rounded-2xl shadow-sm border border-gray-100 group transition-all hover:shadow-md">
                        {/* Thumbnail */}
                        <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50 p-1">
                          {(() => {
                            const imageUrl = (item.product as any).image_url || (item.product as any).imageURL || (item.product as any).image
                            const displayImage = imageUrl && imageUrl !== 'null' && imageUrl !== 'undefined' && imageUrl.trim() !== ''
                              ? imageUrl
                              : 'https://placehold.co/150x150/f3f4f6/9ca3af?text=No+Image'
                            
                            return (
                              <img
                                src={displayImage}
                                alt={language === 'ar' ? item.product.name_ar || item.product.name : item.product.name_en || item.product.name}
                                className="h-full w-full object-contain object-center group-hover:scale-105 transition-transform duration-500"
                                onError={(e) => {
                                  e.currentTarget.onerror = null
                                  e.currentTarget.src = 'https://placehold.co/150x150/f3f4f6/9ca3af?text=No+Image'
                                }}
                                loading="lazy"
                              />
                            )
                          })()}
                        </div>

                        <div className={`flex flex-1 flex-col justify-between ${language === 'ar' ? 'mr-4' : 'ml-4'}`}>
                          <div>
                            <div className="flex justify-between items-start">
                              <h3 className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug">
                                <Link to={`/product/${item.product.id}`} onClick={onClose}>
                                  {language === 'ar' ? item.product.name_ar || item.product.name : item.product.name_en || item.product.name}
                                </Link>
                              </h3>
                              <button
                                type="button"
                                onClick={() => removeFromCart(item.product.id)}
                                className="text-gray-300 hover:text-red-500 -mt-1 -mr-1 p-1 transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                                </svg>
                              </button>
                            </div>
                            <p className="mt-1 text-xs text-gray-500 font-medium">{item.product.unit}</p>
                          </div>
                          
                          <div className="flex items-end justify-between mt-2">
                            {/* Price */}
                            <p className="text-emerald-700 font-bold">
                              {(Number(item.product.price) * item.quantity).toFixed(2)} <span className="text-xs font-normal text-gray-500">{t('currency')}</span>
                            </p>

                            {/* Quantity Selector */}
                            <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 h-8 shadow-sm">
                              <button 
                                onClick={() => updateQuantity(item.product.id, Math.max(0, item.quantity - 1))}
                                className="w-8 h-full flex items-center justify-center text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-l-lg transition-colors font-bold"
                              >−</button>
                              <span className="w-8 text-center text-sm font-bold text-gray-900">{item.quantity}</span>
                              <button 
                                onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                className="w-8 h-full flex items-center justify-center text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-r-lg transition-colors font-bold"
                              >+</button>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Footer / Summary */}
              {cart.length > 0 && (
                <div className="border-t border-gray-100 bg-white px-4 py-6 sm:px-6 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-30">
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm text-gray-500">
                      <p>{language === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}</p>
                      <p className="font-medium text-gray-900">{subtotal.toFixed(2)} {t('currency')}</p>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <p>{language === 'ar' ? 'التوصيل' : 'Delivery Fee'}</p>
                      <p className={`font-medium ${deliveryFee === 0 ? 'text-emerald-600 font-bold' : 'text-gray-900'}`}>
                        {deliveryFee === 0 ? (language === 'ar' ? 'مجاني' : 'FREE') : deliveryFee.toFixed(2) + ' ' + t('currency')}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-dashed border-gray-200 pt-4 mb-6">
                    <div className="flex flex-col">
                      <p className="text-sm text-gray-500 font-medium">{language === 'ar' ? 'الإجمالي (شامل الضريبة)' : 'Total (Inc. VAT)'}</p>
                    </div>
                    <p className="text-2xl font-extrabold text-emerald-700">{grandTotal.toFixed(2)} <span className="text-sm font-medium text-gray-500">{t('currency')}</span></p>
                  </div>

                  <button
                    onClick={() => {
                      onClose()
                      navigate('/checkout')
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-transparent bg-emerald-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700 hover:shadow-xl transition-all transform active:scale-[0.98]"
                  >
                    <span>{language === 'ar' ? 'إتمام الطلب' : 'Checkout'}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={`w-5 h-5 ${language === 'ar' ? 'rotate-180' : ''}`}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                  </button>
                  
                  <div className="mt-4 flex justify-center text-center text-sm text-gray-500">
                    <button
                      type="button"
                      className="font-medium text-emerald-600 hover:text-emerald-500 flex items-center gap-1 transition-colors"
                      onClick={onClose}
                    >
                      {language === 'ar' ? 'أو تابع التسوق' : 'or Continue Shopping'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
