import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useCart } from '../context/CartContext'
import { orderAPI, authAPI } from '../utils/api'
import { useLanguage } from '../context/LanguageContext'
import { useOrderCalculations } from '../hooks/useOrderCalculations'
import { CheckoutSkeleton } from '../components/ui/Skeletons'
import { Input } from '../shared/ui/components/Input'
import { spacing } from '../shared/ui/tokens'
import { MinOrderProgress } from '../shared/ui/components/MinOrderProgress'

export default function Checkout() {
  const { items, clearCart } = useCart()
  const navigate = useNavigate()
  const { language, t } = useLanguage()
  const { subtotal, deliveryFee, tax, grandTotal, freeDeliveryProgress, percentToFreeDelivery, settings, uiSettings } = useOrderCalculations()
  
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryNotes, setDeliveryNotes] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'online' | 'cod' | 'card'>('online')
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    // Simulate initial loading for premium feel
    const timer = setTimeout(() => setInitializing(false), 800)

    if (items.length === 0) {
      navigate('/cart')
      return
    }

    if (!authAPI.isAuthenticated()) {
      navigate('/login?redirect=/checkout')
      return
    }

    // Load user info if authenticated
    const user = authAPI.getCurrentUser()
    if (user) {
      setCustomerName(user.name || user.full_name || '')
      setCustomerPhone(user.phone || '')
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (error) => {
          console.error('Geolocation error:', error)
          setLocationError(language === 'ar' ? 'لم يتم تحديد الموقع' : 'Location not found')
        }
      )
    }
    return () => clearTimeout(timer)
  }, [items, navigate, language])

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    
    if (!customerName.trim()) {
      errors.name = language === 'ar' ? 'الاسم مطلوب' : 'Name is required'
    }
    
    if (!customerPhone.trim()) {
      errors.phone = language === 'ar' ? 'رقم الهاتف مطلوب' : 'Phone number is required'
    } else if (!/^[0-9+\-\s()]+$/.test(customerPhone)) {
      errors.phone = language === 'ar' ? 'رقم الهاتف غير صحيح' : 'Invalid phone number'
    }
    
    if (!deliveryAddress.trim()) {
      errors.address = language === 'ar' ? 'عنوان التوصيل مطلوب' : 'Delivery address is required'
    } else if (deliveryAddress.trim().length < 10) {
      errors.address = language === 'ar' ? 'يرجى إدخال عنوان تفصيلي' : 'Please enter a detailed address'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handlePlaceOrder = async () => {
    if (!validateForm()) {
      setMessage({ 
        text: language === 'ar' ? 'يرجى إكمال جميع الحقول المطلوبة' : 'Please complete all required fields', 
        type: 'error' 
      })
      return
    }

    if (items.length === 0) {
      setMessage({ text: language === 'ar' ? 'السلة فارغة' : 'Cart is empty', type: 'error' })
      navigate('/cart')
      return
    }

    try {
      setLoading(true)
      const orderItems = items.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: Number(item.product.price),
        unit: (item.product as any).unit || 'piece',
      }))

      const res = await orderAPI.create({
        items: orderItems,
        delivery_address: deliveryAddress,
        delivery_latitude: location?.lat || null,
        delivery_longitude: location?.lng || null,
        delivery_notes: deliveryNotes,
        payment_method: selectedPaymentMethod,
      })
      
      // Clear cart after successful order
      clearCart()
      
      setTimeout(() => {
        if (res && res.order && res.order.id) {
            navigate(`/order-success/${res.order.id}`)
        } else {
            navigate('/orders')
        }
      }, 500)
    } catch (err: any) {
      setMessage({
        text: err.response?.data?.message || (language === 'ar' ? 'حدث خطأ أثناء الطلب' : 'Error placing order'),
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  if (initializing) {
    return (
      <div className={spacing.pageMax}>
      <div className="min-h-screen bg-gray-50 font-['Tajawal'] pb-32 md:pb-20 pt-20 px-4 max-w-3xl mx-auto">
        <CheckoutSkeleton />
      </div>
      </div>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="min-h-screen bg-gray-50 font-['Tajawal'] pb-32 md:pb-20" 
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-40 backdrop-blur-md bg-white/80">
        <div className={spacing.pageMax}>
        <div className="max-w-3xl mx-auto px-4 h-14 md:h-16 flex items-center gap-3 md:gap-4">
            <button onClick={() => navigate('/cart')} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-5 h-5 md:w-6 md:h-6 ${language === 'ar' ? '' : 'rotate-180'}`}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
            </button>
            <h1 className="text-lg md:text-xl font-bold text-gray-900">{language === 'ar' ? 'إتمام الطلب' : 'Checkout'}</h1>
        </div>
        </div>
      </div>
      
      <div className={spacing.pageMax}>
      <div className="max-w-3xl mx-auto px-4 py-4 md:py-6 space-y-4 md:space-y-6 pb-28 md:pb-24">
        
        {/* Free Delivery Progress */}
        <AnimatePresence>
          {settings.free_shipping_threshold > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-100"
              >
                  <div className="flex justify-between items-end mb-2">
                      <span className="text-xs md:text-sm font-bold text-gray-800">
                          {freeDeliveryProgress > 0 
                              ? (language === 'ar' ? `أضف ${freeDeliveryProgress.toFixed(2)} ${t('currency')} لتوصيل مجاني` : `Add ${freeDeliveryProgress.toFixed(2)} ${t('currency')} for Free Delivery`)
                              : (language === 'ar' ? 'توصيل مجاني مفعل! 🎉' : 'Free Delivery Unlocked! 🎉')
                          }
                      </span>
                      <span className="text-[10px] md:text-xs text-gray-500">{percentToFreeDelivery.toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div 
                          className="h-full bg-emerald-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${percentToFreeDelivery}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                      />
                  </div>
              </motion.div>
          )}
        </AnimatePresence>

        {/* Customer Info Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white p-4 md:p-5 rounded-2xl shadow-sm"
        >
            <h2 className="text-base md:text-lg font-bold mb-3 md:mb-4 flex items-center gap-2 text-gray-900">
                <span className="w-5 h-5 md:w-6 md:h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xs">1</span>
                {language === 'ar' ? 'معلومات العميل' : 'Customer Information'}
            </h2>
            <div className="space-y-3 md:space-y-4">
                <div>
                    <Input
                      value={customerName}
                      onChange={(v) => {
                        setCustomerName(v)
                        if (validationErrors.name) setValidationErrors((prev) => ({ ...prev, name: '' }))
                      }}
                      placeholder={language === 'ar' ? 'الاسم الكامل' : 'Full name'}
                      invalid={!!validationErrors.name}
                    />
                    {validationErrors.name && (
                        <p className="text-red-600 text-xs mt-1">{validationErrors.name}</p>
                    )}
                </div>
                <div>
                    <Input
                      value={customerPhone}
                      onChange={(v) => {
                        setCustomerPhone(v)
                        if (validationErrors.phone) setValidationErrors((prev) => ({ ...prev, phone: '' }))
                      }}
                      placeholder={language === 'ar' ? 'رقم الهاتف' : 'Phone number'}
                      invalid={!!validationErrors.phone}
                      type="tel"
                      inputMode="tel"
                    />
                    {validationErrors.phone && (
                        <p className="text-red-600 text-xs mt-1">{validationErrors.phone}</p>
                    )}
                </div>
            </div>
        </motion.section>

        {/* Address Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-4 md:p-5 rounded-2xl shadow-sm"
        >
            <h2 className="text-base md:text-lg font-bold mb-3 md:mb-4 flex items-center gap-2 text-gray-900">
                <span className="w-5 h-5 md:w-6 md:h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xs">2</span>
                {language === 'ar' ? 'موقع التوصيل' : 'Delivery Location'}
            </h2>
            <div className="space-y-3 md:space-y-4">
                <div className="relative">
                    <Input
                      value={deliveryAddress}
                      onChange={(v) => {
                        setDeliveryAddress(v)
                        if (validationErrors.address) setValidationErrors((prev) => ({ ...prev, address: '' }))
                      }}
                      placeholder={language === 'ar' ? 'ادخل العنوان…' : 'Enter address…'}
                      invalid={!!validationErrors.address}
                    />
                    <span className={`absolute top-1/2 -translate-y-1/2 text-gray-400 text-base md:text-lg ${language === 'ar' ? 'left-3' : 'right-3'}`}>📍</span>
                </div>
                {validationErrors.address && (
                    <p className="text-red-600 text-xs">{validationErrors.address}</p>
                )}
                {location && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg w-fit"
                    >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/></svg>
                        <span>{language === 'ar' ? 'تم تحديد الموقع بدقة' : 'GPS Location Pinned'}</span>
                    </motion.div>
                )}
                 <textarea
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white text-sm md:text-base"
                  rows={2}
                  placeholder={language === 'ar' ? 'ملاحظات للسائق (اختياري)...' : 'Driver Notes (Optional)...'}
                />
            </div>
        </motion.section>

        {/* Payment Methods */}
        <motion.section 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.2 }}
           className="bg-white p-4 md:p-5 rounded-2xl shadow-sm"
        >
            <h2 className="text-base md:text-lg font-bold mb-3 md:mb-4 flex items-center gap-2 text-gray-900">
                <span className="w-5 h-5 md:w-6 md:h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xs">3</span>
                {language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
            </h2>
            <div className="space-y-2 md:space-y-3">
                {/* Online Payment */}
                <label className={`flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedPaymentMethod === 'online' ? 'border-emerald-500 bg-emerald-50/30' : 'border-gray-100 hover:border-gray-200'}`}>
                    <input type="radio" name="payment" value="online" checked={selectedPaymentMethod === 'online'} onChange={() => setSelectedPaymentMethod('online')} className="w-4 h-4 md:w-5 md:h-5 text-emerald-600 focus:ring-emerald-500 flex-shrink-0" />
                    <div className="flex-1 flex justify-between items-center min-w-0">
                        <span className="font-bold text-gray-800 text-sm md:text-base">{language === 'ar' ? 'دفع إلكتروني' : 'Online Payment'}</span>
                        <div className="flex gap-1.5 md:gap-2 flex-shrink-0">
                             <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-5 md:h-6" />
                             <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-5 md:h-6" />
                             <img src="https://upload.wikimedia.org/wikipedia/commons/0/02/Mada_Logo.svg" alt="Mada" className="h-5 md:h-6" />
                        </div>
                    </div>
                </label>

                {/* Apple Pay */}
                <label className={`flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedPaymentMethod === 'card' ? 'border-emerald-500 bg-emerald-50/30' : 'border-gray-100 hover:border-gray-200'}`}>
                    <input type="radio" name="payment" value="card" checked={selectedPaymentMethod === 'card'} onChange={() => setSelectedPaymentMethod('card')} className="w-4 h-4 md:w-5 md:h-5 text-emerald-600 focus:ring-emerald-500 flex-shrink-0" />
                    <div className="flex-1 flex justify-between items-center min-w-0">
                        <span className="font-bold text-gray-800 text-sm md:text-base">Apple Pay</span>
                        <span className="text-lg md:text-xl flex-shrink-0">Pay</span>
                    </div>
                </label>
                
                 {/* Cash */}
                 <label className={`flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedPaymentMethod === 'cod' ? 'border-emerald-500 bg-emerald-50/30' : 'border-gray-100 hover:border-gray-200'}`}>
                    <input type="radio" name="payment" value="cod" checked={selectedPaymentMethod === 'cod'} onChange={() => setSelectedPaymentMethod('cod')} className="w-4 h-4 md:w-5 md:h-5 text-emerald-600 focus:ring-emerald-500 flex-shrink-0" />
                    <div className="flex-1 flex justify-between items-center min-w-0">
                        <span className="font-bold text-gray-800 text-sm md:text-base">{language === 'ar' ? 'دفع عند الاستلام' : 'Cash on Delivery'}</span>
                        <span className="text-lg md:text-xl flex-shrink-0">💵</span>
                    </div>
                </label>
            </div>
        </motion.section>

        {/* Order Summary Card */}
        <motion.section 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.3 }}
           className="bg-white p-4 md:p-5 rounded-2xl shadow-sm"
        >
             <h2 className="text-base md:text-lg font-bold mb-3 md:mb-4 flex items-center gap-2 text-gray-900">
                <span className="w-5 h-5 md:w-6 md:h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xs">3</span>
                {language === 'ar' ? 'ملخص الطلب' : 'Order Summary'}
            </h2>
            <MinOrderProgress subtotal={subtotal} className="mb-4" />
            <div className="space-y-2 md:space-y-3">
                {items.map((item) => (
                    <div key={item.product.id} className="flex justify-between items-center text-xs md:text-sm py-2 border-b border-dashed border-gray-100 last:border-0">
                        <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                            <span className="bg-gray-100 px-1.5 md:px-2 py-0.5 md:py-1 rounded text-xs font-bold text-gray-600 flex-shrink-0">x{item.quantity}</span>
                            <span className="text-gray-700 truncate">{language === 'ar' ? item.product.name_ar || item.product.name : item.product.name_en || item.product.name}</span>
                        </div>
                        <span className="font-medium text-gray-900 flex-shrink-0 ml-2">{((Number(item.product.price) * item.quantity).toFixed(2))} {t('currency')}</span>
                    </div>
                ))}
            </div>
            
            <div className="mt-4 md:mt-6 pt-4 border-t border-gray-100 space-y-2">
                 <div className="flex justify-between text-xs md:text-sm text-gray-500">
                    <span>{language === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}</span>
                    <span>{subtotal.toFixed(2)} {t('currency')}</span>
                </div>
                {uiSettings?.show_delivery_fee !== false && (
                <div className="flex justify-between text-xs md:text-sm text-gray-500">
                    <span>{language === 'ar' ? (uiSettings?.delivery_fee_label_ar || 'رسوم التوصيل') : (uiSettings?.delivery_fee_label_en || 'Delivery Fee')}</span>
                    <span className={deliveryFee === 0 ? 'text-emerald-600 font-bold' : ''}>
                        {deliveryFee === 0 ? (language === 'ar' ? 'مجاني' : 'FREE') : `${deliveryFee.toFixed(2)} ${t('currency')}`}
                    </span>
                </div>
                )}
                {uiSettings?.show_service_fee === true && (
                <div className="flex justify-between text-xs md:text-sm text-gray-500">
                    <span>{language === 'ar' ? (uiSettings?.service_fee_label_ar || 'رسوم الخدمة') : (uiSettings?.service_fee_label_en || 'Service Fee')}</span>
                    <span>0.00 {t('currency')}</span>
                </div>
                )}
                 <div className="flex justify-between text-xs md:text-sm text-gray-500">
                    <span>{language === 'ar' ? 'ضريبة القيمة المضافة (15%)' : 'VAT (15%)'}</span>
                    <span>{tax.toFixed(2)} {t('currency')}</span>
                </div>
                <div className="flex justify-between text-base md:text-lg font-bold text-gray-900 pt-3 border-t border-dashed border-gray-200 mt-2">
                    <span>{language === 'ar' ? 'الإجمالي الكلي' : 'Total'}</span>
                    <span className="text-emerald-700">{grandTotal.toFixed(2)} {t('currency')}</span>
                </div>
            </div>
        </motion.section>

        {message && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl text-center text-sm font-bold ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
            >
            {message.text}
            </motion.div>
        )}

      </div>
      </div>

      {/* Sticky Bottom Bar */}
      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 md:p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-50 safe-area-bottom"
      >
        <div className={spacing.pageMax}>
        <div className="max-w-3xl mx-auto flex gap-3 md:gap-4 items-center">
             <div className="flex-1 md:hidden">
                <span className="text-[10px] text-gray-500 block">{language === 'ar' ? 'الإجمالي' : 'Total'}</span>
                <span className="text-lg md:text-xl font-bold text-emerald-700">{grandTotal.toFixed(2)} {t('currency')}</span>
             </div>
             <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handlePlaceOrder}
              disabled={loading}
              className="flex-[2] md:flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 md:py-4 px-4 md:px-6 rounded-xl md:rounded-2xl font-bold text-sm md:text-base shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>{language === 'ar' ? 'تأكيد الطلب' : 'Place Order'}</span>
                  <span className="hidden md:inline bg-white/20 px-2 py-0.5 rounded text-sm ml-2">{grandTotal.toFixed(2)} {t('currency')}</span>
                </>
              )}
            </motion.button>
        </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
