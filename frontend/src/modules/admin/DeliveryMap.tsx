import { useState, useEffect, useRef } from 'react'
import api from '../../utils/api'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface Driver {
  id: number
  driver_name: string
  latitude: number
  longitude: number
  last_location_update: string
  active_orders: number
}

interface ActiveOrder {
  id: number
  status: string
  delivery_latitude: number
  delivery_longitude: number
  delivery_address: string
  store_id: number
  store_name: string
  store_latitude: number
  store_longitude: number
  driver_id: number | null
  driver_name: string | null
  driver_latitude: number | null
  driver_longitude: number | null
}

export default function DeliveryMap() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [orders, setOrders] = useState<ActiveOrder[]>([])
  const [loading, setLoading] = useState(true)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Layer[]>([])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 10000) // تحديث كل 10 ثواني
    return () => clearInterval(interval)
  }, [])

  // 1. Initialize Map (Run once when ready)
  useEffect(() => {
    if (!loading && !mapRef.current && L) {
      // Wait a bit for DOM to be ready
      const timer = setTimeout(() => {
        const container = document.getElementById('delivery-map')
        if (container && L) {
          initMap()
        }
      }, 100)
      
      return () => {
        clearTimeout(timer)
        if (mapRef.current) {
          mapRef.current.remove()
          mapRef.current = null
        }
      }
    }
    
    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [loading])

  // 2. Update Markers (Run when data changes)
  useEffect(() => {
    if (mapRef.current && !loading) {
      updateMarkers()
    }
  }, [drivers, orders, loading])

  const loadData = async () => {
    try {
      const [driversRes, ordersRes] = await Promise.all([
        api.get('/api/admin/drivers/locations'),
        api.get('/api/admin/orders/active'),
      ])
      setDrivers(driversRes.data.drivers || [])
      setOrders(ordersRes.data.orders || [])
    } catch (err) {
      console.error('Error loading map data:', err)
    } finally {
      setLoading(false)
    }
  }

  const initMap = () => {
    if (!L) {
      console.error('Leaflet not loaded')
      return
    }

    // التأكد من عدم وجود خريطة سابقة
    if (mapRef.current) {
      mapRef.current.remove()
      mapRef.current = null
    }

    const container = document.getElementById('delivery-map')
    if (!container) {
      console.error('Map container not found')
      return
    }

    // إنشاء الخريطة
    const map = L.map('delivery-map', {
      center: [24.7136, 46.6753],
      zoom: 6,
      zoomControl: true,
    })
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    mapRef.current = map
    updateMarkers()
  }

  const updateMarkers = () => {
    const map = mapRef.current
    if (!L || !map) return

    // إزالة العلامات القديمة
    markersRef.current.forEach(layer => map.removeLayer(layer))
    markersRef.current = []

    const bounds = L.latLngBounds([]) // Initialize bounds

    // إضافة Riders
    drivers.forEach((driver) => {
      // التحقق من صحة الإحداثيات قبل الرسم
      const lat = Number(driver.latitude);
      const lon = Number(driver.longitude);
      
      if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
        bounds.extend([lat, lon]) // Add to bounds
        const driverIcon = L.divIcon({
          className: 'driver-marker',
          html: `<div style="
            background: #2e7d32;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 14px;
          ">🚚</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        })

        const marker = L.marker([lat, lon], { icon: driverIcon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family: Cairo, sans-serif; text-align: right;">
              <strong>${driver.driver_name}</strong><br/>
              الطلبات النشطة: ${driver.active_orders}<br/>
              آخر تحديث: ${new Date(driver.last_location_update).toLocaleString('ar-SA')}
            </div>
          `)
        markersRef.current.push(marker)
      }
    })

    // إضافة الطلبات
    orders.forEach((order) => {
      const storeLat = Number(order.store_latitude);
      const storeLon = Number(order.store_longitude);
      const deliveryLat = Number(order.delivery_latitude);
      const deliveryLon = Number(order.delivery_longitude);

      if (!isNaN(storeLat) && !isNaN(storeLon) && !isNaN(deliveryLat) && !isNaN(deliveryLon) && 
          storeLat !== 0 && storeLon !== 0 && deliveryLat !== 0 && deliveryLon !== 0) {
        
        bounds.extend([storeLat, storeLon])
        bounds.extend([deliveryLat, deliveryLon])

        // خط من المتجر للعميل
        const polyline = L.polyline(
          [
            [storeLat, storeLon],
            [deliveryLat, deliveryLon],
          ],
          {
            color: order.status === 'out_for_delivery' ? '#2e7d32' : '#f59e0b',
            weight: 3,
            opacity: 0.7,
          }
        ).addTo(map).bindPopup(`
          <div style="font-family: Cairo, sans-serif; text-align: right;">
            <strong>طلب #${order.id}</strong><br/>
            الحالة: ${order.status === 'out_for_delivery' ? 'قيد التوصيل' : 'قيد التحضير'}<br/>
            المتجر: ${order.store_name}<br/>
            ${order.driver_name ? `Rider: ${order.driver_name}` : 'لم يتم تعيين Rider'}
          </div>
        `)
        markersRef.current.push(polyline)

        // علامة المتجر
        const storeMarker = L.marker([storeLat, storeLon])
          .addTo(map)
          .bindPopup(`<div style="font-family: Cairo, sans-serif; text-align: right;"><strong>${order.store_name}</strong></div>`)
        markersRef.current.push(storeMarker)

        // علامة العميل
        const customerIcon = L.divIcon({
          className: 'customer-marker',
          html: `<div style="
            background: ${order.status === 'out_for_delivery' ? '#2e7d32' : '#f59e0b'};
            width: 25px;
            height: 25px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          "></div>`,
          iconSize: [25, 25],
          iconAnchor: [12, 12],
        })

        const customerMarker = L.marker([deliveryLat, deliveryLon], { icon: customerIcon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family: Cairo, sans-serif; text-align: right;">
              <strong>طلب #${order.id}</strong><br/>
              ${order.delivery_address || 'لا يوجد عنوان'}
            </div>
          `)
        markersRef.current.push(customerMarker)
          
        // إذا كان هناك Rider معين، إضافة خط من Rider للعميل
        const driverLat = Number(order.driver_latitude);
        const driverLon = Number(order.driver_longitude);
        
        if (order.driver_id && !isNaN(driverLat) && !isNaN(driverLon) && driverLat !== 0 && driverLon !== 0) {
          const driverLine = L.polyline(
            [
              [driverLat, driverLon],
              [deliveryLat, deliveryLon],
            ],
            {
              color: '#dc2626',
              weight: 2,
              opacity: 0.5,
              dashArray: '10, 5',
            }
          ).addTo(map)
          markersRef.current.push(driverLine)
        }
      }
    })

    // Fit map to bounds if valid
    if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-lg" style={{ fontFamily: 'Cairo, sans-serif' }}>جاري تحميل الخريطة...</div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'Cairo, sans-serif' }} className="w-full max-w-full">
      <div className="mb-6">
        <h1 className="text-3xl lg:text-4xl font-bold mb-2" style={{ color: '#1a237e' }}>
          خريطة التوصيل المباشرة
        </h1>
        <p className="text-gray-600 text-sm lg:text-base">
          تتبع Riders والطلبات النشطة في الوقت الفعلي
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-lg p-4 lg:p-6 border border-blue-200">
          <p className="text-gray-600 text-sm mb-2">Riders النشطين</p>
          <p className="text-3xl font-bold" style={{ color: '#1a237e' }}>{drivers.length}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl shadow-lg p-4 lg:p-6 border border-emerald-200">
          <p className="text-gray-600 text-sm mb-2">الطلبات النشطة</p>
          <p className="text-3xl font-bold" style={{ color: '#2e7d32' }}>{orders.length}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-lg p-4 lg:p-6 border border-purple-200">
          <p className="text-gray-600 text-sm mb-2">قيد التوصيل</p>
          <p className="text-3xl font-bold" style={{ color: '#7c3aed' }}>
            {orders.filter(o => o.status === 'out_for_delivery').length}
          </p>
        </div>
      </div>

      {/* Map */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div 
          id="delivery-map" 
          style={{ 
            height: '600px', 
            width: '100%',
            minHeight: '600px',
            position: 'relative',
            zIndex: 0
          }}
        ></div>
      </div>

      {/* Legend */}
      <div className="mt-6 bg-white rounded-xl shadow-lg p-4 border border-gray-200">
        <h3 className="font-bold mb-3" style={{ color: '#1a237e' }}>مفتاح الخريطة:</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#2e7d32] rounded-full border-2 border-white shadow-md flex items-center justify-center text-white text-sm">
              🚚
            </div>
            <span className="text-sm">Rider نشط</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-[#2e7d32] rounded-full border-2 border-white shadow-md"></div>
            <span className="text-sm">عميل (قيد التوصيل)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-[#f59e0b] rounded-full border-2 border-white shadow-md"></div>
            <span className="text-sm">عميل (قيد التحضير)</span>
          </div>
        </div>
      </div>
    </div>
  )
}

