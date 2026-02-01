
import { useState, useEffect } from 'react'
import api from '../../utils/api'

interface Driver {
  id: number
  user_id: number
  name: string
  email: string
  phone: string | null
  vehicle_type: string | null
  license_number: string | null
  is_active: boolean
  user_active: boolean
  avg_rating: number
  total_ratings: number
  rider_status?: 'available' | 'busy' | 'offline'
  active_orders_count?: number
  // Financial Settings
  base_commission_per_order?: number
  bonus_threshold?: number
  bonus_amount?: number
  payout_frequency?: string
}

export default function DriversTab() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  
  // Financial Modal State
  const [showFinancialModal, setShowFinancialModal] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [financialForm, setFinancialForm] = useState({
    base_commission_per_order: 9,
    bonus_threshold: 500,
    bonus_amount: 150,
    payout_frequency: 'Weekly'
  })

  useEffect(() => {
    loadDrivers()
  }, [])

  const loadDrivers = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/admin/riders') // Updated endpoint
      setDrivers(res.data.riders || [])
    } catch (err: any) {
      console.error('Error loading riders:', err)
      // Fallback
      try {
        const fallbackRes = await api.get('/api/admin/drivers')
        setDrivers(fallbackRes.data.drivers || [])
      } catch (fallbackErr) {
        console.error('Error loading drivers fallback:', fallbackErr)
      }
    } finally {
      setLoading(false)
    }
  }

  const toggleDriverStatus = async (driverId: number, currentStatus: boolean) => {
    try {
      await api.put(`/api/admin/drivers/${driverId}/status`, {
        is_active: !currentStatus,
      })
      loadDrivers()
    } catch (err: any) {
      alert(err.response?.data?.message || 'حدث خطأ في تحديث حالة Rider')
    }
  }

  const updateRiderStatus = async (riderId: number, newStatus: 'available' | 'busy' | 'offline') => {
    try {
      await api.put(`/api/admin/riders/${riderId}/status`, { rider_status: newStatus })
      loadDrivers()
    } catch (err: any) {
      alert(err.response?.data?.message || 'حدث خطأ في تحديث حالة Rider')
    }
  }

  const openFinancialModal = (driver: Driver) => {
    setSelectedDriver(driver)
    setFinancialForm({
      base_commission_per_order: Number(driver.base_commission_per_order) || 9,
      bonus_threshold: Number(driver.bonus_threshold) || 500,
      bonus_amount: Number(driver.bonus_amount) || 150,
      payout_frequency: driver.payout_frequency || 'Weekly'
    })
    setShowFinancialModal(true)
  }

  const saveFinancialSettings = async () => {
    if (!selectedDriver) return
    try {
      await api.put(`/api/admin/drivers/${selectedDriver.id}/financials`, financialForm)
      setShowFinancialModal(false)
      loadDrivers() // Refresh data
      alert('تم حفظ الإعدادات المالية بنجاح')
    } catch (err: any) {
      alert(err.response?.data?.message || 'حدث خطأ في حفظ الإعدادات')
    }
  }

  const getRiderStatusLabel = (status?: string) => {
    switch (status) {
      case 'available':
        return { text: 'متاح', color: 'bg-green-100 text-green-800', icon: '🟢' }
      case 'busy':
        return { text: 'مشغول بطلب', color: 'bg-yellow-100 text-yellow-800', icon: '🟡' }
      case 'offline':
      default:
        return { text: 'خارج الخدمة', color: 'bg-gray-100 text-gray-800', icon: '⚫' }
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-lg">جاري التحميل...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-2xl font-bold mb-2">فريق التوصيل السريع</h3>
        <p className="text-gray-600 text-sm">إدارة Riders، الحالات، والعمولات المالية</p>
      </div>

      {drivers.length === 0 ? (
        <div className="text-center py-12 text-gray-500">لا يوجد Riders مسجلين</div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden overflow-x-auto">
          <table className="w-full whitespace-nowrap">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-right">الاسم</th>
                <th className="px-4 py-3 text-right">المالية (عمولة/هدف)</th>
                <th className="px-4 py-3 text-right">التقييم</th>
                <th className="px-4 py-3 text-right">حالة Rider</th>
                <th className="px-4 py-3 text-right">نشط الآن</th>
                <th className="px-4 py-3 text-right">الحساب</th>
                <th className="px-4 py-3 text-right">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((driver) => {
                const statusInfo = getRiderStatusLabel(driver.rider_status)
                return (
                  <tr key={driver.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{driver.name}</div>
                      <div className="text-xs text-gray-500">{driver.phone || '-'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col text-xs gap-1">
                        <span className="font-semibold text-emerald-700">
                          {Number(driver.base_commission_per_order || 9).toFixed(2)} ريال / طلب
                        </span>
                        <span className="text-gray-600">
                          الهدف: {driver.bonus_threshold} (+{driver.bonus_amount} ريال)
                        </span>
                        <span className="text-blue-600">
                          دفع: {driver.payout_frequency === 'Weekly' ? 'أسبوعي' : 'شهري'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {driver.total_ratings > 0 ? (
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-400">★</span>
                            <span className="font-semibold">{Number(driver.avg_rating).toFixed(1)}</span>
                          </div>
                          <span className="text-xs text-gray-500">({driver.total_ratings})</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-fit ${statusInfo.color}`}>
                          <span>{statusInfo.icon}</span>
                          <span>{statusInfo.text}</span>
                        </span>
                        <select
                          value={driver.rider_status || 'offline'}
                          onChange={(e) => updateRiderStatus(driver.id, e.target.value as any)}
                          className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="available">متاح</option>
                          <option value="busy">مشغول</option>
                          <option value="offline">أوفلاين</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                        {driver.active_orders_count || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${driver.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {driver.is_active ? 'نشط' : 'محظور'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openFinancialModal(driver)}
                          className="px-3 py-1 rounded text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          إعدادات
                        </button>
                        <button
                          onClick={() => toggleDriverStatus(driver.id, driver.is_active)}
                          className={`px-3 py-1 rounded text-xs font-semibold ${
                            driver.is_active ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                        >
                          {driver.is_active ? 'تعطيل' : 'تفعيل'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Financial Settings Modal */}
      {showFinancialModal && selectedDriver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-bold mb-4">الإعدادات المالية: {selectedDriver.name}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  سعر التوصيل للمندوب (ريال/طلب)
                </label>
                <input
                  type="number"
                  value={financialForm.base_commission_per_order}
                  onChange={(e) => setFinancialForm({...financialForm, base_commission_per_order: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  هدف الطلبات الشهري (للمكافأة)
                </label>
                <input
                  type="number"
                  value={financialForm.bonus_threshold}
                  onChange={(e) => setFinancialForm({...financialForm, bonus_threshold: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  قيمة المكافأة الشهرية (ريال)
                </label>
                <input
                  type="number"
                  value={financialForm.bonus_amount}
                  onChange={(e) => setFinancialForm({...financialForm, bonus_amount: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  تكرار تحويل المستحقات
                </label>
                <select
                  value={financialForm.payout_frequency}
                  onChange={(e) => setFinancialForm({...financialForm, payout_frequency: e.target.value})}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Weekly">أسبوعي (Weekly)</option>
                  <option value="Monthly">شهري (Monthly)</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowFinancialModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                إلغاء
              </button>
              <button
                onClick={saveFinancialSettings}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow-sm"
              >
                حفظ التغييرات
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
