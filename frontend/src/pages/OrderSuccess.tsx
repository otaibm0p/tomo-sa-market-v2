import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import api from '../utils/api'
import { useLanguage } from '../context/LanguageContext'

interface Order {
  id: number
  public_code?: string
  total_amount: string
  total?: number
  subtotal?: number
  delivery_fee?: number
  status: string
  payment_status?: string
  created_at: string
  delivery_address: string
  items: any[]
}

export default function OrderSuccess() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { language, t } = useLanguage()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (orderId) {
      loadOrder()
    }
  }, [orderId])

  const loadOrder = async () => {
    try {
      const res = await api.get(`/api/orders/${orderId}`)
      setOrder(res.data.order)
    } catch (err) {
      console.error('Error loading order:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  if (!order) {
    return <div className="text-center py-20 text-gray-500 font-['Tajawal']">Order not found</div>
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 text-center font-['Tajawal']" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="mb-10 animate-bounce-in">
        <div className="w-28 h-28 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border-4 border-white">
          <span className="text-6xl animate-pulse">🎉</span>
        </div>
        <h1 className="text-4xl font-bold text-gray-800 mb-2">
          {language === 'ar' ? 'تم استلام طلبك بنجاح!' : 'Order Placed Successfully!'}
        </h1>
        <p className="text-gray-500 text-lg">
          {language === 'ar' 
            ? `رقم الطلب ${order.public_code || '#' + order.id}` 
            : `Order ${order.public_code || '#' + order.id}`}
        </p>
      </div>

      <div className="card-modern p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-green-600"></div>
        
        <div className="flex justify-between items-center border-b border-gray-100 pb-6 mb-6">
          <span className="text-gray-500 font-medium">{language === 'ar' ? 'الإجمالي المدفوع' : 'Total Paid'}</span>
          <span className="text-3xl font-bold text-emerald-600">{Number(order.total_amount).toFixed(2)} {t('currency')}</span>
        </div>
        
        <div className="space-y-5 text-right">
          <div className="flex justify-between items-start">
            <span className="text-gray-400 text-sm w-1/3 text-left rtl:text-right">{language === 'ar' ? 'عنوان التوصيل' : 'Delivery Address'}</span>
            <span className="font-bold text-gray-800 w-2/3">{order.delivery_address || (language === 'ar' ? 'استلام من المتجر' : 'Pickup')}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm w-1/3 text-left rtl:text-right">{language === 'ar' ? 'تاريخ الطلب' : 'Order Date'}</span>
            <span className="font-medium text-gray-700 w-2/3">{new Date(order.created_at).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm w-1/3 text-left rtl:text-right">{language === 'ar' ? 'حالة الدفع' : 'Payment Status'}</span>
            <span className="font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-xs w-fit">
                {language === 'ar' ? 'تم الدفع بنجاح' : 'Paid Successfully'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 max-w-sm mx-auto">
        <button
          onClick={() => navigate('/orders')}
          className="btn-primary py-4 text-lg shadow-emerald-200 w-full"
        >
          {language === 'ar' ? 'تتبع مسار الطلب' : 'Track Order'}
        </button>
        <button
          onClick={() => navigate('/')}
          className="w-full bg-white border-2 border-gray-100 text-gray-600 py-3.5 rounded-xl font-bold hover:bg-gray-50 hover:text-gray-800 hover:border-gray-200 transition-all shadow-sm"
        >
          {language === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
        </button>
      </div>
    </div>
  )
}
