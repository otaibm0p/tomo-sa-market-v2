import { useState, useEffect } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import { CheckCircle, XCircle, MapPin, Package, User, Clock, Truck } from 'lucide-react'
import api from '../../utils/api'

interface Order {
  id: number
  customer_name: string
  customer_email: string
  total_amount: number
  delivery_address: string
  delivery_latitude: number
  delivery_longitude: number
  status: string
  driver_id: number | null
  driver_name: string | null
  created_at: string
}

interface Driver {
  id: number
  name: string
  phone: string
  vehicle_type: string
  status: string
  is_active: boolean
  is_approved: boolean
}

export default function LiveDispatch() {
  const { language } = useLanguage()
  const [pendingOrders, setPendingOrders] = useState<Order[]>([])
  const [activeOrders, setActiveOrders] = useState<Order[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState<number | null>(null)

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [ordersRes, driversRes] = await Promise.all([
        api.get('/api/admin/orders'),
        api.get('/api/admin/drivers')
      ])
      
      const allOrders = ordersRes.data.orders || []
      setPendingOrders(allOrders.filter((o: Order) => !o.driver_id && (o.status === 'pending' || o.status === 'confirmed')))
      setActiveOrders(allOrders.filter((o: Order) => o.driver_id && o.status !== 'delivered'))
      
      const allDrivers = driversRes.data.drivers || []
      setDrivers(allDrivers.filter((d: Driver) => d.is_active && d.is_approved && d.status === 'active'))
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const assignDriver = async (orderId: number, driverId: number) => {
    setAssigning(orderId)
    try {
      await api.post(`/api/admin/orders/${orderId}/assign-driver`, { driver_id: driverId })
      await loadData()
    } catch (err: any) {
      alert(err.response?.data?.message || (language === 'en' ? 'Failed to assign rider' : 'فشل تعيين Rider'))
    } finally {
      setAssigning(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { color: string; icon: any; label: { ar: string; en: string } } } = {
      pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock, label: { ar: 'قيد الانتظار', en: 'Pending' } },
      confirmed: { color: 'bg-blue-100 text-blue-800 border-blue-300', icon: CheckCircle, label: { ar: 'مؤكد', en: 'Confirmed' } },
      preparing: { color: 'bg-purple-100 text-purple-800 border-purple-300', icon: Package, label: { ar: 'قيد التحضير', en: 'Preparing' } },
      out_for_delivery: { color: 'bg-green-100 text-green-800 border-green-300', icon: Truck, label: { ar: 'قيد التوصيل', en: 'Out for Delivery' } },
      delivered: { color: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: CheckCircle, label: { ar: 'تم التسليم', en: 'Delivered' } }
    }
    
    const config = statusConfig[status] || statusConfig.pending
    const Icon = config.icon
    
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${config.color}`}>
        <Icon size={14} />
        {config.label[language]}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
          <div className="text-lg text-gray-600">{language === 'en' ? 'Loading...' : 'جاري التحميل...'}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8" style={{ fontFamily: 'Cairo, sans-serif' }}>
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {language === 'en' ? 'Live Dispatch' : 'إدارة التوزيع المباشر'}
        </h1>
        <p className="text-gray-600">
          {language === 'en' ? 'Assign orders to active riders in real-time' : 'تعيين الطلبات لـ Riders النشطين في الوقت الفعلي'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">{language === 'en' ? 'Pending Orders' : 'الطلبات المعلقة'}</p>
              <p className="text-3xl font-bold text-gray-900">{pendingOrders.length}</p>
            </div>
            <Package className="w-12 h-12 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">{language === 'en' ? 'Active Deliveries' : 'التوصيلات النشطة'}</p>
              <p className="text-3xl font-bold text-gray-900">{activeOrders.length}</p>
            </div>
            <Truck className="w-12 h-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">{language === 'en' ? 'Available Riders' : 'Riders المتاحين'}</p>
              <p className="text-3xl font-bold text-gray-900">{drivers.length}</p>
            </div>
            <User className="w-12 h-12 text-emerald-600" />
          </div>
        </div>
      </div>

      {/* Pending Orders Section */}
      <section>
        <div className="flex items-center gap-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {language === 'en' ? 'Pending Orders' : 'الطلبات المعلقة'}
          </h2>
          <div className="flex-1 h-1 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingOrders.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white rounded-2xl shadow-lg">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">{language === 'en' ? 'No pending orders' : 'لا توجد طلبات معلقة'}</p>
            </div>
          ) : (
            pendingOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all border-2 border-yellow-200 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {language === 'en' ? 'Order' : 'طلب'} #{order.id}
                    </h3>
                    {getStatusBadge(order.status)}
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-gray-700">
                    <User size={18} className="text-emerald-600" />
                    <span className="font-medium">{order.customer_name}</span>
                  </div>
                  <div className="flex items-start gap-2 text-gray-700">
                    <MapPin size={18} className="text-red-600 mt-0.5" />
                    <span className="text-sm">{order.delivery_address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Package size={18} className="text-blue-600" />
                    <span className="font-semibold">{Number(order.total_amount).toFixed(2)} {language === 'en' ? 'SAR' : 'ريال'}</span>
                  </div>
                </div>

                {drivers.length > 0 ? (
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      {language === 'en' ? 'Assign Rider' : 'تعيين Rider'}
                    </label>
                    <select
                      onChange={(e) => {
                        const driverId = parseInt(e.target.value)
                        if (driverId) assignDriver(order.id, driverId)
                      }}
                      disabled={assigning === order.id}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="">{language === 'en' ? 'Select rider...' : 'اختر Rider...'}</option>
                      {drivers.map((driver) => (
                        <option key={driver.id} value={driver.id}>
                          {driver.name} ({driver.vehicle_type})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="text-center py-2 text-sm text-gray-500">
                    {language === 'en' ? 'No available riders' : 'لا يوجد Riders متاحين'}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* Active Orders Section */}
      {activeOrders.length > 0 && (
        <section>
          <div className="flex items-center gap-4 mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {language === 'en' ? 'Active Deliveries' : 'التوصيلات النشطة'}
            </h2>
            <div className="flex-1 h-1 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-2xl shadow-lg border-l-4 border-blue-500 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {language === 'en' ? 'Order' : 'طلب'} #{order.id}
                    </h3>
                    {getStatusBadge(order.status)}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User size={18} className="text-emerald-600" />
                    <span className="font-medium">{order.customer_name}</span>
                  </div>
                  {order.driver_name && (
                    <div className="flex items-center gap-2">
                      <Truck size={18} className="text-blue-600" />
                      <span className="font-medium">{order.driver_name}</span>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <MapPin size={18} className="text-red-600 mt-0.5" />
                    <span className="text-sm">{order.delivery_address}</span>
                  </div>
                  {order.delivery_latitude && order.delivery_longitude && (
                    <a
                      href={`https://www.google.com/maps?q=${order.delivery_latitude},${order.delivery_longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-all"
                    >
                      <MapPin size={18} />
                      {language === 'en' ? 'View on Map' : 'عرض على الخريطة'}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

