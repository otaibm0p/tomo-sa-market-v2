import { useState, useEffect } from 'react'
import api from '../../utils/api'

interface Store {
  id: number
  name: string
  code: string
  address: string
  latitude: number
  longitude: number
  phone: string
  email: string
  manager_name: string
  is_active: boolean
  delivery_radius: number
  products_count?: number
  available_products?: number
}

export default function StoresManagement() {
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingStore, setEditingStore] = useState<Store | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    latitude: '',
    longitude: '',
    phone: '',
    email: '',
    manager_name: '',
    delivery_radius: '10',
    is_active: true,
  })

  useEffect(() => {
    loadStores()
  }, [])

  const loadStores = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/admin/stores')
      setStores(res.data.stores || [])
    } catch (err) {
      console.error('Error loading stores:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingStore) {
        await api.put(`/api/admin/stores/${editingStore.id}`, {
          ...formData,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          delivery_radius: parseFloat(formData.delivery_radius),
          is_active: formData.is_active,
        })
      } else {
        await api.post('/api/admin/stores', {
          ...formData,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          delivery_radius: parseFloat(formData.delivery_radius),
        })
      }
      setShowForm(false)
      setEditingStore(null)
      setFormData({
        name: '',
        code: '',
        address: '',
        latitude: '',
        longitude: '',
        phone: '',
        email: '',
        manager_name: '',
        delivery_radius: '10',
        is_active: true,
      })
      loadStores()
    } catch (err: any) {
      alert(err.response?.data?.message || 'حدث خطأ في حفظ المتجر')
    }
  }

  const handleEdit = (store: Store) => {
    setEditingStore(store)
    setFormData({
      name: store.name,
      code: store.code,
      address: store.address,
      latitude: store.latitude.toString(),
      longitude: store.longitude.toString(),
      phone: store.phone || '',
      email: store.email || '',
      manager_name: store.manager_name || '',
      delivery_radius: store.delivery_radius.toString(),
      is_active: store.is_active,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا المتجر؟')) return
    try {
      await api.delete(`/api/admin/stores/${id}`)
      loadStores()
    } catch (err: any) {
      alert(err.response?.data?.message || 'حدث خطأ في حذف المتجر')
    }
  }

  const toggleActive = async (store: Store) => {
    try {
      await api.put(`/api/admin/stores/${store.id}`, {
        is_active: !store.is_active,
      })
      loadStores()
    } catch (err: any) {
      alert(err.response?.data?.message || 'حدث خطأ في تحديث الحالة')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-lg" style={{ fontFamily: 'Cairo, sans-serif' }}>جاري التحميل...</div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'Cairo, sans-serif' }} className="w-full max-w-full">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold mb-2" style={{ color: '#1a237e' }}>
            إدارة المتاجر
          </h1>
          <p className="text-gray-600 text-sm lg:text-base">
            إدارة المتاجر المتعددة والمواقع الجغرافية
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(true)
            setEditingStore(null)
            setFormData({
              name: '',
              code: '',
              address: '',
              latitude: '',
              longitude: '',
              phone: '',
              email: '',
              manager_name: '',
              delivery_radius: '10',
              is_active: true,
            })
          }}
          className="px-4 lg:px-6 py-2.5 lg:py-3 rounded-lg font-semibold text-white transition-all duration-200 hover:shadow-xl flex items-center gap-2 text-sm lg:text-base"
          style={{ backgroundColor: '#2e7d32' }}
        >
          <span>➕</span>
          <span>إضافة متجر جديد</span>
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-lg p-4 lg:p-6 border border-blue-200">
          <p className="text-gray-600 text-sm mb-2">إجمالي المتاجر</p>
          <p className="text-3xl font-bold" style={{ color: '#1a237e' }}>{stores.length}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl shadow-lg p-4 lg:p-6 border border-emerald-200">
          <p className="text-gray-600 text-sm mb-2">المتاجر النشطة</p>
          <p className="text-3xl font-bold" style={{ color: '#2e7d32' }}>
            {stores.filter(s => s.is_active).length}
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-lg p-4 lg:p-6 border border-purple-200">
          <p className="text-gray-600 text-sm mb-2">متوسط المنتجات</p>
          <p className="text-3xl font-bold" style={{ color: '#7c3aed' }}>
            {stores.length > 0
              ? Math.round(stores.reduce((sum, s) => sum + (s.products_count || 0), 0) / stores.length)
              : 0}
          </p>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 lg:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold" style={{ color: '#1a237e' }}>
                {editingStore ? 'تعديل متجر' : 'إضافة متجر جديد'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false)
                  setEditingStore(null)
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">اسم المتجر *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">كود المتجر *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">العنوان *</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">خط العرض (Latitude) *</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">خط الطول (Longitude) *</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">الهاتف</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">اسم المدير</label>
                <input
                  type="text"
                  value={formData.manager_name}
                  onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">نطاق التوصيل (كم) *</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.delivery_radius}
                  onChange={(e) => setFormData({ ...formData, delivery_radius: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                  required
                />
              </div>
              {editingStore && (
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-[#2e7d32] focus:ring-[#2e7d32]"
                    />
                    <span className="font-medium">نشط</span>
                  </label>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#2e7d32] text-white rounded-lg font-semibold hover:bg-[#1b5e20] transition-all"
                >
                  {editingStore ? 'تحديث' : 'حفظ'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingStore(null)
                  }}
                  className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stores Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الاسم</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الكود</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">العنوان</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الموقع</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">المنتجات</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الحالة</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {stores.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    لا توجد متاجر
                  </td>
                </tr>
              ) : (
                stores.map((store) => (
                  <tr key={store.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          store.is_active ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        <span className="font-medium">{store.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{store.code}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{store.address}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {store.latitude && typeof store.latitude === 'number' ? store.latitude.toFixed(4) : (store.latitude || 'N/A')}, {store.longitude && typeof store.longitude === 'number' ? store.longitude.toFixed(4) : (store.longitude || 'N/A')}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="font-medium">{store.products_count || 0}</span>
                      <span className="text-gray-500 mr-1">منتج</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(store)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all ${
                          store.is_active ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        {store.is_active ? '⏸️ إيقاف' : '▶️ تفعيل'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(store)}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-all"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => handleDelete(store.id)}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-all"
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

