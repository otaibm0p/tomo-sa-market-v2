import { useState, useEffect } from 'react'
import api from '../../utils/api'

interface APIKey {
  id: number
  key_name: string
  api_key: string
  store_id: number | null
  store_name: string | null
  is_active: boolean
  last_used_at: string | null
  created_at: string
  expires_at: string | null
  total_requests: number
  last_sync_at: string | null
}

interface SyncLog {
  id: number
  api_key_name: string
  store_name: string
  product_name: string
  barcode: string
  quantity_sold: number
  quantity_before: number
  quantity_after: number
  status: string
  error_message: string | null
  created_at: string
}

export default function APIManagement() {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([])
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showKeyForm, setShowKeyForm] = useState(false)
  const [showLogs, setShowLogs] = useState(false)
  const [formData, setFormData] = useState({
    key_name: '',
    store_id: '',
    expires_at: '',
  })
  const [stores, setStores] = useState<any[]>([])

  useEffect(() => {
    loadAPIKeys()
    loadStores()
  }, [])

  const loadAPIKeys = async () => {
    try {
      const res = await api.get('/api/admin/api-keys')
      setApiKeys(res.data.api_keys || [])
    } catch (err) {
      console.error('Error loading API keys:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadStores = async () => {
    try {
      const res = await api.get('/api/admin/stores')
      setStores(res.data.stores || [])
    } catch (err) {
      console.error('Error loading stores:', err)
    }
  }

  const loadSyncLogs = async () => {
    try {
      const res = await api.get('/api/admin/sync-logs?limit=50')
      setSyncLogs(res.data.logs || [])
      setShowLogs(true)
    } catch (err) {
      console.error('Error loading sync logs:', err)
    }
  }

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/api/admin/api-keys', {
        ...formData,
        store_id: formData.store_id || null,
        expires_at: formData.expires_at || null,
      })
      setShowKeyForm(false)
      setFormData({ key_name: '', store_id: '', expires_at: '' })
      loadAPIKeys()
      alert('تم إنشاء API Key بنجاح!')
    } catch (err: any) {
      alert(err.response?.data?.message || 'حدث خطأ في إنشاء API Key')
    }
  }

  const handleDeactivateKey = async (id: number) => {
    if (!confirm('هل أنت متأكد من تعطيل هذا API Key؟')) return
    try {
      await api.delete(`/api/admin/api-keys/${id}`)
      loadAPIKeys()
    } catch (err: any) {
      alert(err.response?.data?.message || 'حدث خطأ')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('تم نسخ API Key!')
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
            إدارة POS Sync API
          </h1>
          <p className="text-gray-600 text-sm lg:text-base">
            إدارة API Keys ومراقبة Sync Logs
          </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:gap-3 w-full lg:w-auto">
          <button
            onClick={loadSyncLogs}
            className="px-4 lg:px-6 py-2.5 lg:py-3 rounded-lg font-semibold text-white transition-all duration-200 hover:shadow-xl flex items-center gap-2 text-sm lg:text-base"
            style={{ backgroundColor: '#1a237e' }}
          >
            <span>📋</span>
            <span>سجلات المزامنة</span>
          </button>
          <button
            onClick={() => setShowKeyForm(true)}
            className="px-4 lg:px-6 py-2.5 lg:py-3 rounded-lg font-semibold text-white transition-all duration-200 hover:shadow-xl flex items-center gap-2 text-sm lg:text-base"
            style={{ backgroundColor: '#2e7d32' }}
          >
            <span>➕</span>
            <span>إنشاء API Key</span>
          </button>
        </div>
      </div>

      {/* API Keys Form */}
      {showKeyForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 lg:p-8 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold" style={{ color: '#1a237e' }}>
                إنشاء API Key جديد
              </h2>
              <button
                onClick={() => {
                  setShowKeyForm(false)
                  setFormData({ key_name: '', store_id: '', expires_at: '' })
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateKey} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">اسم المفتاح *</label>
                <input
                  type="text"
                  value={formData.key_name}
                  onChange={(e) => setFormData({ ...formData, key_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                  placeholder="مثال: Daftari POS - Store 1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">المتجر (اختياري)</label>
                <select
                  value={formData.store_id}
                  onChange={(e) => setFormData({ ...formData, store_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                >
                  <option value="">جميع المتاجر</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">تاريخ انتهاء الصلاحية (اختياري)</label>
                <input
                  type="datetime-local"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#2e7d32] text-white rounded-lg font-semibold hover:bg-[#1b5e20] transition-all"
                >
                  إنشاء
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowKeyForm(false)
                    setFormData({ key_name: '', store_id: '', expires_at: '' })
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

      {/* API Keys List */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-200">
        <h2 className="text-xl font-bold mb-4" style={{ color: '#1a237e' }}>
          API Keys
        </h2>
        <div className="space-y-4">
          {apiKeys.length === 0 ? (
            <p className="text-gray-500 text-center py-8">لا توجد API Keys</p>
          ) : (
            apiKeys.map((key) => (
              <div
                key={key.id}
                className={`p-4 rounded-lg border-2 ${
                  key.is_active ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg">{key.key_name}</h3>
                    {key.store_name && (
                      <p className="text-sm text-gray-600">المتجر: {key.store_name}</p>
                    )}
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      key.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {key.is_active ? 'نشط' : 'معطل'}
                  </span>
                </div>
                <div className="bg-gray-100 p-3 rounded-lg mb-3">
                  <div className="flex items-center justify-between">
                    <code className="text-sm font-mono break-all">{key.api_key}</code>
                    <button
                      onClick={() => copyToClipboard(key.api_key)}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors mr-2"
                    >
                      نسخ
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">الطلبات</p>
                    <p className="font-bold">{key.total_requests || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">آخر استخدام</p>
                    <p className="font-bold text-xs">
                      {key.last_used_at
                        ? new Date(key.last_used_at).toLocaleDateString('ar-SA')
                        : 'لم يُستخدم'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">آخر مزامنة</p>
                    <p className="font-bold text-xs">
                      {key.last_sync_at
                        ? new Date(key.last_sync_at).toLocaleDateString('ar-SA')
                        : 'لا يوجد'}
                    </p>
                  </div>
                  <div>
                    <button
                      onClick={() => handleDeactivateKey(key.id)}
                      className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                    >
                      تعطيل
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Sync Logs */}
      {showLogs && (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold" style={{ color: '#1a237e' }}>
              سجلات المزامنة
            </h2>
            <button
              onClick={() => setShowLogs(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">التاريخ</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">API Key</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">المتجر</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">المنتج</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Barcode</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الكمية المباعة</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">قبل</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">بعد</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {syncLogs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      لا توجد سجلات
                    </td>
                  </tr>
                ) : (
                  syncLogs.map((log) => (
                    <tr key={log.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        {new Date(log.created_at).toLocaleString('ar-SA')}
                      </td>
                      <td className="px-4 py-3 text-sm">{log.api_key_name || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm">{log.store_name || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm">{log.product_name || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm font-mono">{log.barcode}</td>
                      <td className="px-4 py-3 text-sm font-bold">{log.quantity_sold}</td>
                      <td className="px-4 py-3 text-sm">{log.quantity_before}</td>
                      <td className="px-4 py-3 text-sm font-bold">{log.quantity_after}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            log.status === 'success'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {log.status === 'success' ? '✅ نجح' : '❌ فشل'}
                        </span>
                        {log.error_message && (
                          <p className="text-xs text-red-600 mt-1">{log.error_message}</p>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* API Documentation */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-lg p-6 border border-blue-200 mt-6">
        <h2 className="text-xl font-bold mb-4" style={{ color: '#1a237e' }}>
          📚 وثائق API
        </h2>
        <div className="space-y-4 text-sm">
          <div>
            <h3 className="font-bold mb-2">Endpoint:</h3>
            <code className="bg-gray-800 text-green-400 p-2 rounded block">
              POST /api/v1/inventory/sync
            </code>
          </div>
          <div>
            <h3 className="font-bold mb-2">Headers:</h3>
            <code className="bg-gray-800 text-green-400 p-2 rounded block">
              X-API-Key: your_api_key_here
            </code>
          </div>
          <div>
            <h3 className="font-bold mb-2">Request Body:</h3>
            <pre className="bg-gray-800 text-green-400 p-3 rounded overflow-x-auto">
{`{
  "barcode": "1234567890",
  "quantity_sold": 2,
  "store_id": "1"
}`}
            </pre>
          </div>
          <div>
            <h3 className="font-bold mb-2">Response (Success):</h3>
            <pre className="bg-gray-800 text-green-400 p-3 rounded overflow-x-auto">
{`{
  "success": true,
  "message": "تم تحديث المخزون بنجاح",
  "data": {
    "barcode": "1234567890",
    "product_id": 1,
    "store_id": 1,
    "quantity_before": 100,
    "quantity_sold": 2,
    "quantity_after": 98
  },
  "log_id": 123
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}

