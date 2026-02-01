import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import api from '../../utils/api'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface Zone {
  id: number
  name_ar: string
  name_en: string
  description: string
  polygon_coordinates: number[][]
  is_active: boolean
  assigned_drivers_count: number
}

interface Driver {
  id: number
  name: string
  phone: string
}

export default function ZoneManagement() {
  const { language } = useLanguage()
  const [zones, setZones] = useState<Zone[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [formData, setFormData] = useState({
    name_ar: '',
    name_en: '',
    description: ''
  })
  const [polygonCoordinates, setPolygonCoordinates] = useState<number[][]>([])
  const mapRef = useRef<L.Map | null>(null)
  const polygonRef = useRef<L.Polygon | null>(null)
  const markersRef = useRef<L.Marker[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/admin/delivery/zones')
      setZones(res.data.zones || [])
      // Load riders for assignment
      const ridersRes = await api.get('/api/admin/riders')
      setDrivers(ridersRes.data.riders?.filter((d: any) => d.is_approved) || [])
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (showMap && !mapRef.current) {
      const timer = setTimeout(() => {
        initMap()
      }, 100)
      return () => clearTimeout(timer)
    }
    
    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove()
        } catch (e) {
          // Ignore cleanup errors
        }
        mapRef.current = null
      }
      if (polygonRef.current) {
        polygonRef.current = null
      }
      markersRef.current = []
    }
  }, [showMap])

  const initMap = () => {
    const container = document.getElementById('zone-map')
    if (!container || mapRef.current) return

    // Initialize map centered on Saudi Arabia (Riyadh)
    mapRef.current = L.map('zone-map', {
      center: [24.7136, 46.6753],
      zoom: 11
    })

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(mapRef.current)

    // Enable drawing mode
    let isDrawing = false
    const tempMarkers: L.Marker[] = []
    
    mapRef.current.on('click', (e: L.LeafletMouseEvent) => {
      if (!isDrawing) {
        // Clear previous polygon
        if (polygonRef.current) {
          mapRef.current!.removeLayer(polygonRef.current)
        }
        markersRef.current.forEach(m => mapRef.current!.removeLayer(m))
        markersRef.current = []
        tempMarkers.forEach(m => mapRef.current!.removeLayer(m))
        tempMarkers.length = 0
        setPolygonCoordinates([])
        isDrawing = true
      }

      const { lat, lng } = e.latlng
      const newCoords = [...polygonCoordinates, [lat, lng]]
      setPolygonCoordinates(newCoords)

      // Add marker
      const marker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'zone-marker',
          html: `<div style="background: #064e3b; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 2px #064e3b;"></div>`,
          iconSize: [12, 12]
        })
      }).addTo(mapRef.current!)
      tempMarkers.push(marker)
      markersRef.current.push(marker)

      // Draw polygon if we have at least 3 points
      if (newCoords.length >= 3) {
        if (polygonRef.current) {
          mapRef.current!.removeLayer(polygonRef.current)
        }
        polygonRef.current = L.polygon(newCoords as [number, number][], {
          color: '#064e3b',
          fillColor: '#064e3b',
          fillOpacity: 0.3,
          weight: 2
        }).addTo(mapRef.current!)
      }
    })

    // Double-click to finish drawing
    mapRef.current.on('dblclick', () => {
      if (isDrawing && polygonCoordinates.length >= 3) {
        isDrawing = false
        alert(language === 'en' 
          ? 'Zone polygon completed! Click "Create Zone" to save.' 
          : 'تم إكمال رسم المنطقة! انقر "إنشاء المنطقة" للحفظ.')
      }
    })
  }

  const clearMap = () => {
    if (polygonRef.current && mapRef.current) {
      mapRef.current.removeLayer(polygonRef.current)
      polygonRef.current = null
    }
    markersRef.current.forEach(m => {
      if (mapRef.current) mapRef.current.removeLayer(m)
    })
    markersRef.current = []
    setPolygonCoordinates([])
  }

  const viewZoneOnMap = (coordinates: number[][]) => {
    if (!mapRef.current && coordinates.length > 0) {
      const container = document.getElementById('zone-preview-map') || document.getElementById('zone-map')
      if (!container) return

      mapRef.current = L.map(container.id, {
        center: [coordinates[0][0], coordinates[0][1]],
        zoom: 12
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(mapRef.current)

      // Draw polygon
      L.polygon(coordinates as [number, number][], {
        color: '#064e3b',
        fillColor: '#064e3b',
        fillOpacity: 0.3,
        weight: 2
      }).addTo(mapRef.current)

      // Fit bounds
      const bounds = L.latLngBounds(coordinates as [number, number][])
      mapRef.current.fitBounds(bounds)
    }
  }

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (polygonCoordinates.length < 3) {
        alert(language === 'en' 
          ? 'Please draw a zone on the map (at least 3 points)' 
          : 'يرجى رسم منطقة على الخريطة (3 نقاط على الأقل)')
        return
      }

      console.log('Creating zone with data:', formData, 'Coordinates:', polygonCoordinates)
      
      const response = await api.post('/api/admin/delivery/zones', {
        name_ar: formData.name_ar.trim(),
        name_en: formData.name_en.trim(),
        description: formData.description.trim() || null,
        polygon_coordinates: polygonCoordinates
      })
      
      console.log('Zone created successfully:', response.data)
      
      if (response.data) {
        setShowForm(false)
        setShowMap(false)
        setFormData({ name_ar: '', name_en: '', description: '' })
        setPolygonCoordinates([])
        clearMap()
        await loadData()
        alert(language === 'en' ? 'Zone created successfully!' : 'تم إنشاء المنطقة بنجاح!')
      }
    } catch (err: any) {
      console.error('Error creating zone:', err)
      console.error('Error details:', {
        message: err.message,
        code: err.code,
        response: err.response?.data,
        status: err.response?.status
      })
      
      let errorMessage = language === 'en' ? 'Failed to create zone' : 'فشل إنشاء المنطقة'
      
      if (err.code === 'ECONNREFUSED' || err.message.includes('Network Error')) {
        errorMessage = language === 'en' 
          ? 'Cannot connect to server. Please make sure the backend is running on http://localhost:3000'
          : 'لا يمكن الاتصال بالخادم. تأكد من أن السيرفر يعمل على http://localhost:3000'
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message
      } else if (err.message) {
        errorMessage = err.message
      }
      
      alert(errorMessage)
    }
  }

  return (
    <div className="p-6 space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold" style={{ color: '#064e3b' }}>
          {language === 'en' ? 'Zone Management' : 'إدارة المناطق'}
        </h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
        >
          {language === 'en' ? '+ New Zone' : '+ منطقة جديدة'}
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-xl p-6 border-2 border-emerald-200">
          <h3 className="text-lg font-semibold mb-4">
            {language === 'en' ? 'Create Delivery Zone' : 'إنشاء منطقة توصيل'}
          </h3>
          <form onSubmit={handleCreateZone} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {language === 'en' ? 'Name (Arabic)' : 'الاسم (عربي)'} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  {language === 'en' ? 'Name (English)' : 'الاسم (إنجليزي)'} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name_en}
                  onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                {language === 'en' ? 'Description' : 'الوصف'}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                rows={3}
              />
            </div>
            
            {/* Map Section */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium">
                  {language === 'en' ? 'Zone Area (Draw on Map)' : 'منطقة التوصيل (ارسم على الخريطة)'} *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowMap(!showMap)
                    if (!showMap) {
                      setTimeout(() => initMap(), 100)
                    }
                  }}
                  className="px-4 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {showMap 
                    ? (language === 'en' ? 'Hide Map' : 'إخفاء الخريطة')
                    : (language === 'en' ? 'Show Map' : 'إظهار الخريطة')
                  }
                </button>
              </div>
              
              {showMap && (
                <div className="mt-2 space-y-2">
                  <div 
                    id="zone-map" 
                    className="w-full h-96 rounded-lg border-2 border-gray-300"
                    style={{ zIndex: 1 }}
                  ></div>
                  <div className="flex gap-2 items-center text-sm text-gray-600">
                    <span>
                      {language === 'en' 
                        ? 'Click on map to add points. Double-click to finish. Points added:' 
                        : 'انقر على الخريطة لإضافة نقاط. انقر نقراً مزدوجاً للإنهاء. النقاط المضافة:'}
                    </span>
                    <span className="font-bold text-emerald-600">{polygonCoordinates.length}</span>
                    {polygonCoordinates.length > 0 && (
                      <button
                        type="button"
                        onClick={clearMap}
                        className="ml-2 px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        {language === 'en' ? 'Clear' : 'مسح'}
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {language === 'en' 
                      ? '💡 Tip: Click to add points, double-click when done. You need at least 3 points to create a zone.'
                      : '💡 نصيحة: انقر لإضافة نقاط، انقر نقراً مزدوجاً عند الانتهاء. تحتاج إلى 3 نقاط على الأقل لإنشاء منطقة.'}
                  </p>
                </div>
              )}
              
              {!showMap && polygonCoordinates.length > 0 && (
                <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
                  {language === 'en' 
                    ? `Zone has ${polygonCoordinates.length} points. Click "Show Map" to edit.`
                    : `المنطقة تحتوي على ${polygonCoordinates.length} نقطة. انقر "إظهار الخريطة" للتحرير.`}
                </div>
              )}
            </div>
            
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={polygonCoordinates.length < 3}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {language === 'en' ? 'Create Zone' : 'إنشاء المنطقة'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setShowMap(false)
                  setPolygonCoordinates([])
                  clearMap()
                }}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                {language === 'en' ? 'Cancel' : 'إلغاء'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {zones.map((zone) => (
            <ZoneCard 
              key={zone.id} 
              zone={zone} 
              language={language}
              onViewMap={(zone) => {
                // View zone on map
                setShowMap(true)
                setTimeout(() => {
                  if (zone.polygon_coordinates && zone.polygon_coordinates.length > 0) {
                    viewZoneOnMap(zone.polygon_coordinates)
                  }
                }, 200)
              }}
            />
          ))}
        </div>
      )}
      
      {/* Zone Preview Map Modal */}
      {showMap && !showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">
                {language === 'en' ? 'Zone Map View' : 'عرض خريطة المناطق'}
              </h3>
              <button
                onClick={() => {
                  setShowMap(false)
                  if (mapRef.current) {
                    try {
                      mapRef.current.remove()
                    } catch (e) {
                      // Ignore cleanup errors
                    }
                    mapRef.current = null
                  }
                  if (polygonRef.current) {
                    polygonRef.current = null
                  }
                  markersRef.current = []
                }}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                {language === 'en' ? 'Close' : 'إغلاق'}
              </button>
            </div>
            <div 
              id="zone-preview-map" 
              className="w-full h-96 rounded-lg border-2 border-gray-300"
            ></div>
          </div>
        </div>
      )}
    </div>
  )
}

// Zone Card Component
function ZoneCard({ 
  zone, 
  language, 
  onViewMap 
}: { 
  zone: Zone
  language: string
  onViewMap: (zone: Zone) => void
}) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold">
          {language === 'en' ? zone.name_en || zone.name_ar : zone.name_ar}
        </h3>
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
          zone.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {zone.is_active 
            ? (language === 'en' ? 'Active' : 'نشط')
            : (language === 'en' ? 'Inactive' : 'غير نشط')
          }
        </span>
      </div>
      {zone.description && (
        <p className="text-gray-600 text-sm mb-4">{zone.description}</p>
      )}
      {zone.polygon_coordinates && zone.polygon_coordinates.length > 0 && (
        <div className="mb-4 p-2 bg-blue-50 rounded-lg text-xs text-blue-700">
          {language === 'en' 
            ? `Zone area: ${zone.polygon_coordinates.length} points`
            : `منطقة التوصيل: ${zone.polygon_coordinates.length} نقطة`}
        </div>
      )}
      <div className="flex justify-between items-center gap-2">
        <span className="text-sm text-gray-500">
          {language === 'en' ? 'Assigned Riders' : 'Riders المعينون'}: {zone.assigned_drivers_count}
        </span>
        <div className="flex gap-2">
          {zone.polygon_coordinates && zone.polygon_coordinates.length > 0 && (
            <button 
              onClick={() => onViewMap(zone)}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-xs"
            >
              {language === 'en' ? 'View Map' : 'عرض الخريطة'}
            </button>
          )}
          <button className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 text-xs">
            {language === 'en' ? 'Manage' : 'إدارة'}
          </button>
        </div>
      </div>
    </div>
  )
}

