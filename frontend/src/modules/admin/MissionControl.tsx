import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../utils/api'
import { useLanguage } from '../../context/LanguageContext'
import type { Socket } from 'socket.io-client'
import { getSocket } from '../../shared/socketClient'
import { debounce } from '../../shared/ui/tokens'
import { StatusBadge } from '../../shared/order-ui/StatusBadge'

// ================= Interfaces =================
interface Product {
  id: number
  name_ar: string
  name_en: string
  category_id: number
  category_name_ar?: string
  category_name_en?: string
  quantity: number
  min_stock_level: number
  is_low_stock: boolean
  storage_type: 'fridge' | 'dry' | 'cleaning' | 'other'
}

interface Order {
  id: number
  total_amount: number
  status: string
  created_at: string
  delivery_address: string
  customer_name: string
  items: OrderItem[]
  picking_list?: PickingItem[]
}

interface OrderItem {
  product_id: number
  product_name_ar: string
  product_name_en: string
  quantity: number
  storage_type: 'fridge' | 'dry' | 'cleaning' | 'other'
}

interface PickingItem {
  product_id: number
  product_name_ar: string
  product_name_en: string
  quantity: number
  storage_type: 'fridge' | 'dry' | 'cleaning' | 'other'
  picked: boolean
}

interface Rider {
  id: number
  name: string
  rider_status: 'available' | 'busy' | 'offline'
  current_latitude: number | null
  current_longitude: number | null
  active_orders_count: number
}

interface FinancialData {
  today_revenue: number
  rider_commissions: number
  operational_costs: number
  net_profit: number
}

// ================= Main Component =================
export default function MissionControl() {
  const { language } = useLanguage()
  const [activeTab, setActiveTab] = useState<'inventory' | 'operations' | 'finance'>('operations')
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [riders, setRiders] = useState<Rider[]>([])
  const [financialData, setFinancialData] = useState<FinancialData>({
    today_revenue: 0,
    rider_commissions: 0,
    operational_costs: 0,
    net_profit: 0
  })
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [preparingOrders, setPreparingOrders] = useState<Order[]>([])
  const socketRef = useRef<Socket | null>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])

  // Socket.IO Connection
  useEffect(() => {
    const socket = getSocket()

    const debouncedRefresh = debounce(() => loadOrders(), 700)
    const onConnect = () => {
      console.log('✅ Socket.IO connected to Mission Control')
      socket.emit('join-admin-dashboard')
    }

    const onNewOrder = (data: any) => {
      console.log('📦 New order received:', data)
      loadOrders()
    }

    const onOrderStatusChanged = (data: any) => {
      console.log('🔄 Order status changed:', data)
      loadOrders()
    }

    const onRiderStatusUpdated = (data: any) => {
      console.log('🚴 Rider status updated:', data)
      loadRiders()
    }

    const onOrderUpdated = (p: any) => {
      console.log('🟦 order.updated:', p)
      debouncedRefresh()
    }

    socketRef.current = socket

    if (socket.connected) onConnect()
    socket.on('connect', onConnect)
    socket.on('new_order', onNewOrder)
    socket.on('order_status_changed', onOrderStatusChanged)
    socket.on('rider-status-updated', onRiderStatusUpdated)
    socket.on('order.updated', onOrderUpdated)

    return () => {
      socket.off('connect', onConnect)
      socket.off('new_order', onNewOrder)
      socket.off('order_status_changed', onOrderStatusChanged)
      socket.off('rider-status-updated', onRiderStatusUpdated)
      socket.off('order.updated', onOrderUpdated)
      debouncedRefresh.cancel()
    }
  }, [])

  // Load Data
  useEffect(() => {
    loadAllData()
    const interval = setInterval(loadAllData, 5000)
    return () => clearInterval(interval)
  }, [])

  const loadAllData = async () => {
    try {
      await Promise.all([
        loadInventory(),
        loadOrders(),
        loadRiders(),
        loadFinancialData()
      ])
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadInventory = async () => {
    try {
      // جلب المتاجر أولاً
      const storesRes = await api.get('/api/admin/stores').catch(() => ({ data: { stores: [] } }))
      const stores = storesRes.data.stores || []
      const firstStoreId = stores.length > 0 ? stores[0].id : 1
      
      const res = await api.get(`/api/admin/stores/${firstStoreId}/inventory`)
      const inventory = res.data.inventory || []
      
      // جلب معلومات المنتجات
      const productsRes = await api.get('/api/products').catch(() => ({ data: { products: [] } }))
      const allProducts = productsRes.data.products || productsRes.data || []
      
      // دمج البيانات وتحديد نوع التخزين
      const productsWithStock = inventory.map((inv: any) => {
        const product = allProducts.find((p: any) => p.id === inv.product_id)
        const storageType = determineStorageType(product?.name_ar || product?.name_en || product?.name || '')
        
        return {
          id: inv.product_id,
          name_ar: product?.name_ar || product?.name || '',
          name_en: product?.name_en || product?.name || '',
          category_id: product?.category_id || 0,
          category_name_ar: product?.category_name_ar || '',
          category_name_en: product?.category_name_en || '',
          quantity: inv.quantity || 0,
          min_stock_level: inv.min_stock_level || 10,
          is_low_stock: (inv.quantity || 0) < (inv.min_stock_level || 10),
          storage_type: storageType
        }
      })
      
      setProducts(productsWithStock)
    } catch (err) {
      console.error('Error loading inventory:', err)
      setProducts([]) // تعيين مصفوفة فارغة في حالة الخطأ
    }
  }

  const determineStorageType = (productName: string): 'fridge' | 'dry' | 'cleaning' | 'other' => {
    const name = productName.toLowerCase()
    if (name.includes('ماء') || name.includes('مشروب') || name.includes('عصير') || 
        name.includes('حليب') || name.includes('لبن') || name.includes('جبن') ||
        name.includes('water') || name.includes('juice') || name.includes('milk') ||
        name.includes('cheese') || name.includes('yogurt')) {
      return 'fridge'
    }
    if (name.includes('منظف') || name.includes('صابون') || name.includes('شامبو') ||
        name.includes('cleaning') || name.includes('soap') || name.includes('shampoo') ||
        name.includes('detergent')) {
      return 'cleaning'
    }
    return 'dry'
  }

  const loadOrders = async () => {
    try {
      const res = await api.get('/api/admin/orders')
      const allOrders = res.data.orders || []
      
      // جلب تفاصيل الطلبات مع items
      const ordersWithItems = await Promise.all(
        allOrders
          .filter((o: Order) => ['pending', 'confirmed', 'preparing'].includes(o.status))
          .map(async (order: Order) => {
            try {
              const itemsRes = await api.get(`/api/admin/orders/${order.id}/items`)
              const items = itemsRes.data.items || []
              
              // إنشاء Picking List مرتبة حسب نوع التخزين
              const pickingList = items.map((item: any) => ({
                product_id: item.product_id,
                product_name_ar: item.product_name_ar || item.product_name || '',
                product_name_en: item.product_name_en || item.product_name || '',
                quantity: item.quantity,
                storage_type: determineStorageType(item.product_name_ar || item.product_name_en || ''),
                picked: false
              })).sort((a: PickingItem, b: PickingItem) => {
                const order = ['fridge', 'dry', 'cleaning', 'other']
                return order.indexOf(a.storage_type) - order.indexOf(b.storage_type)
              })
              
              return {
                ...order,
                items: items,
                picking_list: pickingList
              }
            } catch (err) {
              return { ...order, items: [], picking_list: [] }
            }
          })
      )
      
      setOrders(ordersWithItems)
      setPreparingOrders(ordersWithItems.filter((o: Order) => o.status === 'preparing'))
    } catch (err) {
      console.error('Error loading orders:', err)
    }
  }

  const loadRiders = async () => {
    try {
      const res = await api.get('/api/admin/riders')
      setRiders(res.data.riders || [])
    } catch (err) {
      console.error('Error loading riders:', err)
    }
  }

  const loadFinancialData = async () => {
    try {
      const res = await api.get('/api/admin/financial/realtime')
      if (res.data) {
        setFinancialData({
          today_revenue: res.data.todayRevenue || 0,
          rider_commissions: res.data.riderCommissions || 0,
          operational_costs: res.data.operationalCost || 0,
          net_profit: res.data.profitMargin || 0
        })
      }
    } catch (err) {
      console.error('Error loading financial data:', err)
    }
  }

  // Ready for Delivery - استدعاء Rider تلقائياً
  const handleReadyForDelivery = async (orderId: number) => {
    try {
      // تحديث حالة الطلب إلى "out_for_delivery"
      await api.put(`/api/admin/orders/${orderId}/status`, { status: 'out_for_delivery' })
      
      // استدعاء Rider تلقائياً
      const autoAssignRes = await api.post(`/api/orders/${orderId}/auto-assign`)
      
      if (autoAssignRes.data.success) {
        alert(`✅ تم استدعاء Rider: ${autoAssignRes.data.assignment.rider_name}`)
        loadOrders()
        loadRiders()
      } else {
        alert('⚠️ لا يوجد Riders متاحين حالياً')
      }
    } catch (err: any) {
      console.error('Error ready for delivery:', err)
      alert(err.response?.data?.message || 'حدث خطأ في استدعاء Rider')
    }
  }

  // Mark item as picked
  const handleItemPicked = (orderId: number, productId: number) => {
    setOrders(prevOrders =>
      prevOrders.map(order => {
        if (order.id === orderId) {
          const updatedPickingList = order.picking_list?.map(item =>
            item.product_id === productId ? { ...item, picked: !item.picked } : item
          )
          return { ...order, picking_list: updatedPickingList }
        }
        return order
      })
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-4"></div>
          <div className="text-lg text-gray-300">جاري تحميل Mission Control...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white" style={{ fontFamily: 'Cairo, sans-serif' }}>
      {/* Header - Responsive */}
      <div className="bg-gray-800 border-b border-gray-700 px-2 md:px-4 lg:px-6 py-2 md:py-3 lg:py-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-4">
          <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-emerald-400 flex items-center gap-2">
            <span className="text-xl md:text-2xl lg:text-3xl">🎯</span>
            <span className="hidden sm:inline">Mission Control - مركز القيادة الموحد</span>
            <span className="sm:hidden">Mission Control</span>
          </h1>
          <div className="flex items-center gap-2 md:gap-4">
            <div className="text-xs md:text-sm text-gray-400">
              <span className="hidden md:inline">
                {new Date().toLocaleString('ar-SA', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
              <span className="md:hidden">
                {new Date().toLocaleString('ar-SA', { 
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation - Responsive */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="flex flex-wrap gap-1 px-2 md:px-6">
          <button
            onClick={() => setActiveTab('operations')}
            className={`flex-1 md:flex-none px-3 md:px-6 py-2 md:py-3 text-sm md:text-base font-semibold transition-all ${
              activeTab === 'operations'
                ? 'bg-emerald-600 text-white border-b-2 border-emerald-400'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <span className="mr-1 md:mr-2">⚡</span>
            <span className="hidden sm:inline">العمليات الحية (Live Ops)</span>
            <span className="sm:hidden">العمليات</span>
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex-1 md:flex-none px-3 md:px-6 py-2 md:py-3 text-sm md:text-base font-semibold transition-all ${
              activeTab === 'inventory'
                ? 'bg-blue-600 text-white border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <span className="mr-1 md:mr-2">📦</span>
            <span className="hidden sm:inline">المخزن (Inventory Hub)</span>
            <span className="sm:hidden">المخزن</span>
          </button>
          <button
            onClick={() => setActiveTab('finance')}
            className={`flex-1 md:flex-none px-3 md:px-6 py-2 md:py-3 text-sm md:text-base font-semibold transition-all ${
              activeTab === 'finance'
                ? 'bg-purple-600 text-white border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <span className="mr-1 md:mr-2">💰</span>
            <span className="hidden sm:inline">المركز المالي (Finance Vault)</span>
            <span className="sm:hidden">المالية</span>
          </button>
        </div>
      </div>

      {/* Tab Content - Responsive */}
      <div className="p-2 md:p-4 lg:p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'operations' && (
            <motion.div
              key="operations"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <LiveOperationsTab
                orders={orders}
                riders={riders}
                selectedOrder={selectedOrder}
                setSelectedOrder={setSelectedOrder}
                onReadyForDelivery={handleReadyForDelivery}
                onItemPicked={handleItemPicked}
                language={language}
              />
            </motion.div>
          )}

          {activeTab === 'inventory' && (
            <motion.div
              key="inventory"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <InventoryHubTab
                products={products}
                language={language}
              />
            </motion.div>
          )}

          {activeTab === 'finance' && (
            <motion.div
              key="finance"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <FinanceVaultTab
                financialData={financialData}
                language={language}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ================= Live Operations Tab =================
function LiveOperationsTab({
  orders,
  riders,
  selectedOrder,
  setSelectedOrder,
  onReadyForDelivery,
  onItemPicked,
  language
}: {
  orders: Order[]
  riders: Rider[]
  selectedOrder: Order | null
  setSelectedOrder: (order: Order | null) => void
  onReadyForDelivery: (orderId: number) => void
  onItemPicked: (orderId: number, productId: number) => void
  language: string
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Orders List */}
      <div className="lg:col-span-2 space-y-4">
        <h2 className="text-xl font-bold text-emerald-400 mb-4">الطلبات الحية</h2>
        <div className="space-y-3">
          {orders.map((order) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`bg-gray-800 rounded-lg p-4 border-2 cursor-pointer transition-all ${
                selectedOrder?.id === order.id
                  ? 'border-emerald-500 shadow-lg'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
              onClick={() => setSelectedOrder(order)}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-bold text-white">طلب #{order.id}</h3>
                  <p className="text-sm text-gray-400">{order.customer_name}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-400">{Number(order.total_amount).toFixed(2)} ريال</p>
                  <StatusBadge status={order.status} />
                </div>
              </div>
              <p className="text-xs text-gray-500">{order.delivery_address}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Picking List & Riders */}
      <div className="space-y-4">
        {selectedOrder ? (
          <>
            {/* Picking List */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-bold text-blue-400 mb-4">قائمة الجمع (Picking List)</h3>
              <div className="space-y-3">
                {selectedOrder.picking_list?.map((item, idx) => {
                  const storageLabels = {
                    fridge: '🧊 ثلاجة',
                    dry: '📦 رف جاف',
                    cleaning: '🧴 منظفات',
                    other: '📋 أخرى'
                  }
                  
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={item.picked}
                        onChange={() => onItemPicked(selectedOrder.id, item.product_id)}
                        className="w-5 h-5"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-sm ${item.picked ? 'line-through text-gray-500' : 'text-white'}`}>
                            {language === 'ar' ? item.product_name_ar : item.product_name_en}
                          </span>
                          <span className="text-xs text-gray-400">x{item.quantity}</span>
                        </div>
                        <span className="text-xs text-gray-500">{storageLabels[item.storage_type]}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              
              {/* Ready for Delivery Button */}
              {selectedOrder.picking_list?.every(item => item.picked) && (
                <motion.button
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onReadyForDelivery(selectedOrder.id)}
                  className="w-full mt-4 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-all shadow-lg"
                >
                  ✅ Ready for Delivery - استدعاء Rider
                </motion.button>
              )}
            </div>

            {/* Riders Status */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-bold text-purple-400 mb-4">Riders المتاحون</h3>
              <div className="space-y-2">
                {riders.filter(r => r.rider_status === 'available').map((rider) => (
                  <div key={rider.id} className="bg-gray-700 rounded p-2 flex items-center justify-between">
                    <span className="text-sm">{rider.name}</span>
                    <span className="text-xs bg-green-600 px-2 py-1 rounded">متاح</span>
                  </div>
                ))}
                {riders.filter(r => r.rider_status === 'available').length === 0 && (
                  <p className="text-sm text-gray-500 text-center">لا يوجد Riders متاحين</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 text-center text-gray-500">
            اختر طلباً لعرض قائمة الجمع
          </div>
        )}
      </div>
    </div>
  )
}

// ================= Inventory Hub Tab =================
function InventoryHubTab({
  products,
  language
}: {
  products: Product[]
  language: string
}) {
  const lowStockProducts = products.filter(p => p.is_low_stock)
  const groupedProducts = {
    fridge: products.filter(p => p.storage_type === 'fridge'),
    dry: products.filter(p => p.storage_type === 'dry'),
    cleaning: products.filter(p => p.storage_type === 'cleaning'),
    other: products.filter(p => p.storage_type === 'other')
  }

  return (
    <div className="space-y-6">
      {/* Low Stock Alerts */}
      {lowStockProducts.length > 0 && (
        <div className="bg-red-900 border-2 border-red-500 rounded-lg p-4">
          <h3 className="text-lg font-bold text-red-300 mb-3 flex items-center gap-2">
            <span>⚠️</span>
            تنبيه النقص - {lowStockProducts.length} منتج
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStockProducts.map((product) => (
              <div key={product.id} className="bg-gray-800 rounded p-3">
                <div className="font-semibold text-white">
                  {language === 'ar' ? product.name_ar : product.name_en}
                </div>
                <div className="text-sm text-red-400">
                  المخزون: {product.quantity} / الحد الأدنى: {product.min_stock_level}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Products by Storage Type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fridge */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2">
            <span>🧊</span>
            ثلاجة ({groupedProducts.fridge.length})
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {groupedProducts.fridge.map((product) => (
              <div key={product.id} className="bg-gray-700 rounded p-2 flex items-center justify-between">
                <span className="text-sm">{language === 'ar' ? product.name_ar : product.name_en}</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  product.is_low_stock ? 'bg-red-600' : 'bg-green-600'
                }`}>
                  {product.quantity}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Dry Storage */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-lg font-bold text-yellow-400 mb-4 flex items-center gap-2">
            <span>📦</span>
            رف جاف ({groupedProducts.dry.length})
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {groupedProducts.dry.map((product) => (
              <div key={product.id} className="bg-gray-700 rounded p-2 flex items-center justify-between">
                <span className="text-sm">{language === 'ar' ? product.name_ar : product.name_en}</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  product.is_low_stock ? 'bg-red-600' : 'bg-green-600'
                }`}>
                  {product.quantity}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Cleaning */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-lg font-bold text-purple-400 mb-4 flex items-center gap-2">
            <span>🧴</span>
            منظفات ({groupedProducts.cleaning.length})
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {groupedProducts.cleaning.map((product) => (
              <div key={product.id} className="bg-gray-700 rounded p-2 flex items-center justify-between">
                <span className="text-sm">{language === 'ar' ? product.name_ar : product.name_en}</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  product.is_low_stock ? 'bg-red-600' : 'bg-green-600'
                }`}>
                  {product.quantity}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Other */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-lg font-bold text-gray-400 mb-4 flex items-center gap-2">
            <span>📋</span>
            أخرى ({groupedProducts.other.length})
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {groupedProducts.other.map((product) => (
              <div key={product.id} className="bg-gray-700 rounded p-2 flex items-center justify-between">
                <span className="text-sm">{language === 'ar' ? product.name_ar : product.name_en}</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  product.is_low_stock ? 'bg-red-600' : 'bg-green-600'
                }`}>
                  {product.quantity}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ================= Finance Vault Tab =================
function FinanceVaultTab({
  financialData,
  language
}: {
  financialData: FinancialData
  language: string
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Today Revenue */}
      <div className="bg-gradient-to-br from-emerald-900 to-emerald-800 rounded-xl p-6 border border-emerald-700">
        <div className="text-emerald-300 text-sm font-semibold mb-2">إيرادات اليوم</div>
        <div className="text-3xl font-bold text-white mb-1">
          {financialData.today_revenue.toFixed(2)} ريال
        </div>
        <div className="text-xs text-emerald-200">إجمالي المبيعات</div>
      </div>

      {/* Rider Commissions */}
      <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-xl p-6 border border-blue-700">
        <div className="text-blue-300 text-sm font-semibold mb-2">عمولات Riders</div>
        <div className="text-3xl font-bold text-white mb-1">
          {financialData.rider_commissions.toFixed(2)} ريال
        </div>
        <div className="text-xs text-blue-200">10% من الإيرادات</div>
      </div>

      {/* Operational Costs */}
      <div className="bg-gradient-to-br from-orange-900 to-orange-800 rounded-xl p-6 border border-orange-700">
        <div className="text-orange-300 text-sm font-semibold mb-2">تكاليف التشغيل</div>
        <div className="text-3xl font-bold text-white mb-1">
          {financialData.operational_costs.toFixed(2)} ريال
        </div>
        <div className="text-xs text-orange-200">15% من الإيرادات</div>
      </div>

      {/* Net Profit */}
      <div className="bg-gradient-to-br from-green-900 to-green-800 rounded-xl p-6 border border-green-700">
        <div className="text-green-300 text-sm font-semibold mb-2">الربح الصافي</div>
        <div className="text-3xl font-bold text-white mb-1">
          {financialData.net_profit.toFixed(2)} ريال
        </div>
        <div className="text-xs text-green-200">بعد خصم جميع التكاليف</div>
      </div>
    </div>
  )
}

