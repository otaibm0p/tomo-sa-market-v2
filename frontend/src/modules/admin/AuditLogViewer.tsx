import { useState, useEffect } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import api from '../../utils/api'

interface AuditLog {
  id: number
  user_id: number
  user_name: string
  user_role: string
  action: string
  entity_type: string
  entity_id: number
  old_values: any
  new_values: any
  ip_address: string
  created_at: string
}

export default function AuditLogViewer() {
  const { language } = useLanguage()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    user_id: '',
    action: '',
    start_date: '',
    end_date: ''
  })
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    loadLogs()
  }, [page, filters])

  const loadLogs = async () => {
    try {
      setLoading(true)
      const params: any = { page, limit: 50 }
      if (filters.user_id) params.user_id = filters.user_id
      if (filters.action) params.action = filters.action
      if (filters.start_date) params.start_date = filters.start_date
      if (filters.end_date) params.end_date = filters.end_date
      
      const res = await api.get('/api/admin/audit-logs', { params })
      setLogs(res.data.logs || [])
      setTotal(res.data.total || 0)
    } catch (err) {
      console.error('Error loading audit logs:', err)
    } finally {
      setLoading(false)
    }
  }

  const getActionLabel = (action: string) => {
    const labels: { [key: string]: { ar: string; en: string } } = {
      'CREATE_PRODUCT': { ar: 'إنشاء منتج', en: 'Create Product' },
      'UPDATE_PRODUCT': { ar: 'تحديث منتج', en: 'Update Product' },
      'DELETE_PRODUCT': { ar: 'حذف منتج', en: 'Delete Product' },
      'CREATE_COUPON': { ar: 'إنشاء كوبون', en: 'Create Coupon' },
      'CREATE_BOGO': { ar: 'إنشاء عرض BOGO', en: 'Create BOGO' },
      'CREATE_FLASH_SALE': { ar: 'إنشاء عرض سريع', en: 'Create Flash Sale' },
      'VIEW_PROFIT_REPORT': { ar: 'عرض تقرير الربح', en: 'View Profit Report' },
      'ACCESS_DENIED': { ar: 'رفض الوصول', en: 'Access Denied' },
      'FEATURE_TOGGLES_CHANGE': { ar: 'تغيير مفاتيح الميزات', en: 'Feature toggles change' },
      'CAMPAIGNS_UPDATE': { ar: 'تحديث الحملات', en: 'Campaigns update' },
      'UPDATE_USER': { ar: 'تحديث المستخدم', en: 'User update' },
      'UPDATE_USER_PERMISSIONS': { ar: 'تحديث صلاحيات المستخدم', en: 'User permissions update' },
      'UPDATE_USER_PERMISSION': { ar: 'تحديث صلاحية المستخدم', en: 'User permission update' },
      'CLEAR_USER_PERMISSIONS': { ar: 'مسح صلاحيات المستخدم', en: 'Clear user permissions' },
    }
    return labels[action] || { ar: action, en: action }
  }

  return (
    <div className="p-6 space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold" style={{ color: '#064e3b' }}>
          {language === 'en' ? 'Audit Log' : 'سجل التدقيق'}
        </h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">
          {language === 'en' ? 'Filters' : 'الفلاتر'}
        </h2>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              {language === 'en' ? 'Action' : 'الإجراء'}
            </label>
            <input
              type="text"
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="CREATE_PRODUCT"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              {language === 'en' ? 'User ID' : 'معرف المستخدم'}
            </label>
            <input
              type="number"
              value={filters.user_id}
              onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              {language === 'en' ? 'Start Date' : 'تاريخ البداية'}
            </label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              {language === 'en' ? 'End Date' : 'تاريخ النهاية'}
            </label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {language === 'en' ? 'Date' : 'التاريخ'}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {language === 'en' ? 'User' : 'المستخدم'}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {language === 'en' ? 'Role' : 'الدور'}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {language === 'en' ? 'Action' : 'الإجراء'}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {language === 'en' ? 'Entity' : 'الكيان'}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {language === 'en' ? 'IP Address' : 'عنوان IP'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold">{log.user_name}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                        {log.user_role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {language === 'en' 
                        ? getActionLabel(log.action).en
                        : getActionLabel(log.action).ar
                      }
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {log.entity_type && log.entity_id 
                        ? `${log.entity_type} #${log.entity_id}`
                        : '-'
                      }
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{log.ip_address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t flex justify-between items-center">
            <span className="text-sm text-gray-500">
              {language === 'en' ? 'Total' : 'الإجمالي'}: {total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50"
              >
                {language === 'en' ? 'Previous' : 'السابق'}
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page * 50 >= total}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg disabled:opacity-50"
              >
                {language === 'en' ? 'Next' : 'التالي'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

