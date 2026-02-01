import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../utils/api'
import { useLanguage } from '../../context/LanguageContext'

interface StaffMember {
  id: number
  name: string
  email: string
  role: string
  is_active: boolean
  created_at: string
  phone?: string
}

interface Permission {
  key: string
  labelAr: string
  labelEn: string
  category: string
  icon: string
}

interface PermissionCategory {
  id: string
  nameAr: string
  nameEn: string
  icon: string
  permissions: Permission[]
}

const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    id: 'products',
    nameAr: 'إدارة المنتجات',
    nameEn: 'Products Management',
    icon: '🛍️',
    permissions: [
      { key: 'products.view', labelAr: 'عرض المنتجات', labelEn: 'View Products', category: 'products', icon: '👁️' },
      { key: 'products.create', labelAr: 'إضافة منتجات', labelEn: 'Create Products', category: 'products', icon: '➕' },
      { key: 'products.edit', labelAr: 'تعديل المنتجات', labelEn: 'Edit Products', category: 'products', icon: '✏️' },
      { key: 'products.delete', labelAr: 'حذف المنتجات', labelEn: 'Delete Products', category: 'products', icon: '🗑️' },
      { key: 'products.prices', labelAr: 'تعديل الأسعار', labelEn: 'Edit Prices', category: 'products', icon: '💰' },
      { key: 'products.stock', labelAr: 'إدارة المخزون', labelEn: 'Manage Stock', category: 'products', icon: '📦' },
      { key: 'products.categories', labelAr: 'إدارة الأقسام', labelEn: 'Manage Categories', category: 'products', icon: '📁' },
      { key: 'products.promotions', labelAr: 'إدارة العروض', labelEn: 'Manage Promotions', category: 'products', icon: '🎁' },
    ]
  },
  {
    id: 'orders',
    nameAr: 'إدارة الطلبات',
    nameEn: 'Orders Management',
    icon: '📦',
    permissions: [
      { key: 'orders.view', labelAr: 'عرض الطلبات', labelEn: 'View Orders', category: 'orders', icon: '👁️' },
      { key: 'orders.create', labelAr: 'إنشاء طلبات', labelEn: 'Create Orders', category: 'orders', icon: '➕' },
      { key: 'orders.edit', labelAr: 'تعديل الطلبات', labelEn: 'Edit Orders', category: 'orders', icon: '✏️' },
      { key: 'orders.cancel', labelAr: 'إلغاء الطلبات', labelEn: 'Cancel Orders', category: 'orders', icon: '❌' },
      { key: 'orders.status', labelAr: 'تغيير حالة الطلب', labelEn: 'Change Order Status', category: 'orders', icon: '🔄' },
      { key: 'orders.refund', labelAr: 'إدارة الاسترجاع', labelEn: 'Manage Refunds', category: 'orders', icon: '↩️' },
      { key: 'orders.export', labelAr: 'تصدير الطلبات', labelEn: 'Export Orders', category: 'orders', icon: '📤' },
    ]
  },
  {
    id: 'delivery',
    nameAr: 'إدارة التوصيل',
    nameEn: 'Delivery Management',
    icon: '🚚',
    permissions: [
      { key: 'delivery.view', labelAr: 'عرض السائقين', labelEn: 'View Riders', category: 'delivery', icon: '👁️' },
      { key: 'delivery.assign', labelAr: 'تعيين السائقين', labelEn: 'Assign Riders', category: 'delivery', icon: '👤' },
      { key: 'delivery.track', labelAr: 'تتبع الطلبات', labelEn: 'Track Orders', category: 'delivery', icon: '📍' },
      { key: 'delivery.zones', labelAr: 'إدارة المناطق', labelEn: 'Manage Zones', category: 'delivery', icon: '🗺️' },
      { key: 'delivery.wallets', labelAr: 'محافظ السائقين', labelEn: 'Rider Wallets', category: 'delivery', icon: '💼' },
      { key: 'delivery.dispatch', labelAr: 'التوزيع المباشر', labelEn: 'Live Dispatch', category: 'delivery', icon: '⚡' },
    ]
  },
  {
    id: 'customers',
    nameAr: 'إدارة العملاء',
    nameEn: 'Customers Management',
    icon: '👥',
    permissions: [
      { key: 'customers.view', labelAr: 'عرض العملاء', labelEn: 'View Customers', category: 'customers', icon: '👁️' },
      { key: 'customers.edit', labelAr: 'تعديل بيانات العملاء', labelEn: 'Edit Customer Data', category: 'customers', icon: '✏️' },
      { key: 'customers.ban', labelAr: 'حظر العملاء', labelEn: 'Ban Customers', category: 'customers', icon: '🚫' },
      { key: 'customers.orders', labelAr: 'عرض طلبات العملاء', labelEn: 'View Customer Orders', category: 'customers', icon: '📋' },
    ]
  },
  {
    id: 'staff',
    nameAr: 'إدارة الموظفين',
    nameEn: 'Staff Management',
    icon: '👤',
    permissions: [
      { key: 'staff.view', labelAr: 'عرض الموظفين', labelEn: 'View Staff', category: 'staff', icon: '👁️' },
      { key: 'staff.create', labelAr: 'إضافة موظفين', labelEn: 'Create Staff', category: 'staff', icon: '➕' },
      { key: 'staff.edit', labelAr: 'تعديل الموظفين', labelEn: 'Edit Staff', category: 'staff', icon: '✏️' },
      { key: 'staff.delete', labelAr: 'حذف الموظفين', labelEn: 'Delete Staff', category: 'staff', icon: '🗑️' },
      { key: 'staff.permissions', labelAr: 'إدارة الصلاحيات', labelEn: 'Manage Permissions', category: 'staff', icon: '🔐' },
    ]
  },
  {
    id: 'settings',
    nameAr: 'الإعدادات',
    nameEn: 'Settings',
    icon: '⚙️',
    permissions: [
      { key: 'settings.view', labelAr: 'عرض الإعدادات', labelEn: 'View Settings', category: 'settings', icon: '👁️' },
      { key: 'settings.edit', labelAr: 'تعديل الإعدادات', labelEn: 'Edit Settings', category: 'settings', icon: '✏️' },
      { key: 'settings.stores', labelAr: 'إدارة المتاجر', labelEn: 'Manage Stores', category: 'settings', icon: '🏪' },
      { key: 'settings.payment', labelAr: 'إعدادات الدفع', labelEn: 'Payment Settings', category: 'settings', icon: '💳' },
      { key: 'settings.delivery', labelAr: 'إعدادات التوصيل', labelEn: 'Delivery Settings', category: 'settings', icon: '🚚' },
      { key: 'settings.ui', labelAr: 'تخصيص الواجهة', labelEn: 'UI Customization', category: 'settings', icon: '🎨' },
    ]
  },
  {
    id: 'reports',
    nameAr: 'التقارير والتحليلات',
    nameEn: 'Reports & Analytics',
    icon: '📊',
    permissions: [
      { key: 'reports.view', labelAr: 'عرض التقارير', labelEn: 'View Reports', category: 'reports', icon: '👁️' },
      { key: 'reports.sales', labelAr: 'تقارير المبيعات', labelEn: 'Sales Reports', category: 'reports', icon: '💰' },
      { key: 'reports.products', labelAr: 'تقارير المنتجات', labelEn: 'Product Reports', category: 'reports', icon: '📦' },
      { key: 'reports.customers', labelAr: 'تقارير العملاء', labelEn: 'Customer Reports', category: 'reports', icon: '👥' },
      { key: 'reports.export', labelAr: 'تصدير التقارير', labelEn: 'Export Reports', category: 'reports', icon: '📤' },
    ]
  },
  {
    id: 'security',
    nameAr: 'الأمن السيبراني',
    nameEn: 'Cybersecurity',
    icon: '🔒',
    permissions: [
      { key: 'security.audit', labelAr: 'سجلات التدقيق', labelEn: 'Audit Logs', category: 'security', icon: '📋' },
      { key: 'security.api', labelAr: 'إدارة API', labelEn: 'API Management', category: 'security', icon: '🔌' },
      { key: 'security.backup', labelAr: 'النسخ الاحتياطي', labelEn: 'Backup Management', category: 'security', icon: '💾' },
      { key: 'security.monitor', labelAr: 'مراقبة النظام', labelEn: 'System Monitoring', category: 'security', icon: '📡' },
    ]
  },
  {
    id: 'marketing',
    nameAr: 'التسويق',
    nameEn: 'Marketing',
    icon: '📢',
    permissions: [
      { key: 'marketing.view', labelAr: 'عرض الحملات', labelEn: 'View Campaigns', category: 'marketing', icon: '👁️' },
      { key: 'marketing.create', labelAr: 'إنشاء حملات', labelEn: 'Create Campaigns', category: 'marketing', icon: '➕' },
      { key: 'marketing.hero', labelAr: 'إدارة البانر الرئيسي', labelEn: 'Manage Hero Slider', category: 'marketing', icon: '🖼️' },
      { key: 'marketing.notifications', labelAr: 'الإشعارات', labelEn: 'Notifications', category: 'marketing', icon: '🔔' },
    ]
  },
  {
    id: 'accounting',
    nameAr: 'المحاسبة',
    nameEn: 'Accounting',
    icon: '💰',
    permissions: [
      { key: 'accounting.view', labelAr: 'عرض التقارير المالية', labelEn: 'View Financial Reports', category: 'accounting', icon: '👁️' },
      { key: 'accounting.transactions', labelAr: 'المعاملات المالية', labelEn: 'Financial Transactions', category: 'accounting', icon: '💸' },
      { key: 'accounting.commissions', labelAr: 'العمولات', labelEn: 'Commissions', category: 'accounting', icon: '💵' },
    ]
  },
]

export default function StaffManagement() {
  const { language, t } = useLanguage()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null)
  const [permissions, setPermissions] = useState<{ [key: string]: boolean }>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff',
    phone: ''
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadStaff()
  }, [])

  useEffect(() => {
    if (selectedStaff) {
      loadPermissions(selectedStaff.id)
    }
  }, [selectedStaff])

  const loadStaff = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/admin/users')
      const staffData = res.data.users || res.data || []
      // Filter out customers and drivers/riders
      setStaff(staffData.filter((s: StaffMember) => 
        s.role !== 'customer' && 
        s.role !== 'driver' && 
        s.role !== 'rider' &&
        !s.role?.toLowerCase().includes('rider') &&
        !s.role?.toLowerCase().includes('driver')
      ))
    } catch (err) {
      console.error('Error loading staff:', err)
      setStaff([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const res = await api.post('/api/admin/users', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        phone: formData.phone
      })

      alert(language === 'ar' ? 'تم إضافة الموظف بنجاح ✅' : 'Staff member added successfully ✅')
      setShowAddForm(false)
      setFormData({ name: '', email: '', password: '', role: 'staff', phone: '' })
      loadStaff()
    } catch (err: any) {
      alert(err.response?.data?.message || (language === 'ar' ? 'حدث خطأ في إضافة الموظف' : 'Error adding staff member'))
    } finally {
      setSubmitting(false)
    }
  }

  const loadPermissions = async (userId: number) => {
    try {
      const res = await api.get(`/api/admin/users/${userId}/permissions`)
      const userPermissions = res.data.permissions || []
      const permissionsMap: { [key: string]: boolean } = {}
      userPermissions.forEach((p: { permission_key: string }) => {
        permissionsMap[p.permission_key] = true
      })
      setPermissions(permissionsMap)
    } catch (err: any) {
      console.error('Error loading permissions:', err)
      // If 404, user has no permissions yet - that's okay
      if (err.response?.status === 404) {
        setPermissions({})
      } else {
        console.error('Failed to load permissions:', err.response?.data || err.message)
        setPermissions({})
      }
    }
  }

  const togglePermission = (permissionKey: string) => {
    setPermissions(prev => ({
      ...prev,
      [permissionKey]: !prev[permissionKey]
    }))
  }

  const savePermissions = async () => {
    if (!selectedStaff) return

    try {
      setSaving(true)
      const permissionKeys = Object.keys(permissions).filter(key => permissions[key])
      
      const res = await api.put(`/api/admin/users/${selectedStaff.id}/permissions`, {
        permissions: permissionKeys
      })

      if (res.data.success) {
        alert(language === 'ar' ? `تم حفظ ${res.data.count} صلاحية بنجاح ✅` : `${res.data.count} permissions saved successfully ✅`)
      } else {
        alert(language === 'ar' ? 'تم حفظ الصلاحيات بنجاح ✅' : 'Permissions saved successfully ✅')
      }
    } catch (err: any) {
      console.error('Save permissions error:', err)
      const errorMessage = err.response?.data?.message || err.message || (language === 'ar' ? 'حدث خطأ في حفظ الصلاحيات' : 'Error saving permissions')
      
      if (err.response?.status === 404) {
        const detailedMessage = language === 'ar' 
          ? `الـ API endpoint غير موجود.\n\nالطريق: PUT /api/admin/users/${selectedStaff.id}/permissions\n\nتأكد من:\n1. الـ backend يعمل على http://localhost:5000\n2. أنك مسجل دخول كـ Admin\n3. أن الـ route موجود في backend/server.js`
          : `API endpoint not found.\n\nPath: PUT /api/admin/users/${selectedStaff.id}/permissions\n\nCheck:\n1. Backend is running on http://localhost:5000\n2. You are logged in as Admin\n3. Route exists in backend/server.js`
        alert(detailedMessage)
        console.error('404 Error Details:', {
          url: `/api/admin/users/${selectedStaff.id}/permissions`,
          method: 'PUT',
          response: err.response?.data
        })
      } else if (err.response?.status === 403) {
        alert(language === 'ar' ? 'ليس لديك صلاحية لتعديل الصلاحيات. يجب أن تكون Admin أو Super Admin.' : 'You do not have permission to modify permissions. You must be Admin or Super Admin.')
      } else if (err.response?.status === 401) {
        alert(language === 'ar' ? 'غير مصرح. يرجى تسجيل الدخول مرة أخرى.' : 'Unauthorized. Please log in again.')
      } else {
        alert(errorMessage)
        console.error('Save permissions error:', err)
      }
    } finally {
      setSaving(false)
    }
  }

  const selectAllCategory = (categoryId: string) => {
    const category = PERMISSION_CATEGORIES.find(c => c.id === categoryId)
    if (!category) return

    const allSelected = category.permissions.every(p => permissions[p.key])
    const newPermissions = { ...permissions }
    
    category.permissions.forEach(p => {
      newPermissions[p.key] = !allSelected
    })
    
    setPermissions(newPermissions)
  }

  const filteredStaff = staff.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
          <div className="text-gray-600">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 font-['Tajawal'] p-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <span>🏛️</span>
            {language === 'ar' ? 'مركز القيادة والعمليات' : 'Command & Operations Center'}
          </h1>
          <p className="text-gray-600">
            {language === 'ar' ? 'إدارة الصلاحيات، الموظفين، والأمن السيبراني' : 'Manage Permissions, Staff, and Cybersecurity'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Staff List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="mb-4 flex gap-2">
                <input
                  type="text"
                  placeholder={language === 'ar' ? '🔍 البحث عن موظف...' : '🔍 Search staff...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center gap-2"
                >
                  <span>➕</span>
                  <span className="hidden sm:inline">{language === 'ar' ? 'إضافة' : 'Add'}</span>
                </button>
              </div>
              
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredStaff.map((member) => (
                  <motion.div
                    key={member.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedStaff(member)}
                    className={`p-4 rounded-xl cursor-pointer transition-all ${
                      selectedStaff?.id === member.id
                        ? 'bg-emerald-50 border-2 border-emerald-500 shadow-md'
                        : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold text-lg">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{member.name}</p>
                          <p className="text-xs text-gray-500">{member.email}</p>
                        </div>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${member.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
                    </div>
                    <div className="mt-2">
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-bold">
                        {member.role}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Permissions Panel */}
          <div className="lg:col-span-2">
            {selectedStaff ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6"
              >
                {/* Selected Staff Header */}
                <div className="mb-6 pb-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold text-2xl">
                        {selectedStaff.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">{selectedStaff.name}</h2>
                        <p className="text-gray-500">{selectedStaff.email}</p>
                        <span className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-bold mt-2 inline-block">
                          {selectedStaff.role}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={savePermissions}
                      disabled={saving}
                      className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50"
                    >
                      {saving ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? '💾 حفظ الصلاحيات' : '💾 Save Permissions')}
                    </button>
                  </div>
                </div>

                {/* Permissions Categories */}
                <div className="space-y-6 max-h-[600px] overflow-y-auto">
                  {PERMISSION_CATEGORIES.map((category) => {
                    const categoryPermissions = category.permissions
                    const selectedCount = categoryPermissions.filter(p => permissions[p.key]).length
                    const allSelected = categoryPermissions.length === selectedCount

                    return (
                      <motion.div
                        key={category.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="border border-gray-200 rounded-xl p-5 bg-gray-50"
                      >
                        {/* Category Header */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{category.icon}</span>
                            <div>
                              <h3 className="text-lg font-bold text-gray-900">
                                {language === 'ar' ? category.nameAr : category.nameEn}
                              </h3>
                              <p className="text-xs text-gray-500">
                                {selectedCount} / {categoryPermissions.length} {language === 'ar' ? 'محدد' : 'selected'}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => selectAllCategory(category.id)}
                            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                              allSelected
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            }`}
                          >
                            {allSelected ? (language === 'ar' ? 'إلغاء الكل' : 'Deselect All') : (language === 'ar' ? 'تحديد الكل' : 'Select All')}
                          </button>
                        </div>

                        {/* Permissions Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {categoryPermissions.map((permission) => (
                            <motion.label
                              key={permission.key}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                                permissions[permission.key]
                                  ? 'bg-emerald-50 border-2 border-emerald-500'
                                  : 'bg-white border border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={permissions[permission.key] || false}
                                onChange={() => togglePermission(permission.key)}
                                className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                              />
                              <span className="text-xl">{permission.icon}</span>
                              <span className="flex-1 font-medium text-gray-900 text-sm">
                                {language === 'ar' ? permission.labelAr : permission.labelEn}
                              </span>
                              {permissions[permission.key] && (
                                <span className="text-emerald-600 text-lg">✓</span>
                              )}
                            </motion.label>
                          ))}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            ) : (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
                <div className="text-6xl mb-4">👤</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {language === 'ar' ? 'اختر موظفاً' : 'Select a Staff Member'}
                </h3>
                <p className="text-gray-500">
                  {language === 'ar' ? 'اختر موظفاً من القائمة لعرض وتعديل صلاحياته' : 'Select a staff member from the list to view and edit their permissions'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Staff Modal */}
      <AnimatePresence>
        {showAddForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddForm(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                      <span>➕</span>
                      {language === 'ar' ? 'إضافة موظف جديد' : 'Add New Staff Member'}
                    </h2>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                    >
                      ×
                    </button>
                  </div>

                  <form onSubmit={handleAddStaff} className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        {language === 'ar' ? 'الاسم' : 'Name'} *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                        placeholder={language === 'ar' ? 'اسم الموظف' : 'Staff name'}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        {language === 'ar' ? 'البريد الإلكتروني' : 'Email'} *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                        placeholder={language === 'ar' ? 'email@example.com' : 'email@example.com'}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        {language === 'ar' ? 'رقم الهاتف' : 'Phone'} (اختياري)
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                        placeholder={language === 'ar' ? '05xxxxxxxx' : '05xxxxxxxx'}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        {language === 'ar' ? 'كلمة المرور' : 'Password'} *
                      </label>
                      <input
                        type="password"
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                        placeholder={language === 'ar' ? 'كلمة مرور قوية' : 'Strong password'}
                        minLength={6}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        {language === 'ar' ? 'الدور' : 'Role'} *
                      </label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                      >
                        <option value="ceo">{language === 'ar' ? 'رئيس تنفيذي' : 'CEO'}</option>
                        <option value="manager">{language === 'ar' ? 'مدير عام' : 'Manager'}</option>
                        <option value="admin">{language === 'ar' ? 'مدير' : 'Admin'}</option>
                        <option value="accountant">{language === 'ar' ? 'محاسب' : 'Accountant'}</option>
                        <option value="delivery_manager">{language === 'ar' ? 'مدير التوصيل' : 'Delivery Manager'}</option>
                        <option value="staff">{language === 'ar' ? 'موظف' : 'Staff'}</option>
                      </select>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
                      >
                        {language === 'ar' ? 'إلغاء' : 'Cancel'}
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50"
                      >
                        {submitting ? (language === 'ar' ? 'جاري الإضافة...' : 'Adding...') : (language === 'ar' ? 'إضافة' : 'Add')}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
