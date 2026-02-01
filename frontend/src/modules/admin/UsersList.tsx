import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLanguage } from '../../context/LanguageContext'
import api from '../../utils/api'
import { Users as UsersIcon, Plus, ChevronRight, Shield } from 'lucide-react'

interface UserRow {
  id: number
  name: string
  email: string
  role: string
  is_active: boolean
  created_at: string
}

interface RoleTemplate {
  role: string
  permissions: Record<string, boolean>
  description_ar: string
  description_en: string
}

const GROUP_LABELS: Record<string, { ar: string; en: string }> = {
  products: { ar: 'المنتجات', en: 'Products' },
  orders: { ar: 'الطلبات', en: 'Orders' },
  reports: { ar: 'التقارير', en: 'Reports' },
  settings: { ar: 'الإعدادات', en: 'Settings' },
  stores: { ar: 'المتاجر', en: 'Stores' },
  drivers: { ar: 'التوصيل', en: 'Delivery' },
  marketing: { ar: 'التسويق', en: 'Marketing' },
  users: { ar: 'المستخدمون', en: 'Users' },
  finance: { ar: 'المالية', en: 'Finance' },
  payments: { ar: 'المدفوعات', en: 'Payments' },
  promotions: { ar: 'العروض', en: 'Promotions' },
  footer: { ar: 'الفوتر', en: 'Footer' },
  other: { ar: 'أخرى', en: 'Other' },
}

function permissionKeyToGroup(k: string): string {
  if (k.includes('product')) return 'products'
  if (k.includes('order')) return 'orders'
  if (k.includes('report')) return 'reports'
  if (k.includes('setting')) return 'settings'
  if (k.includes('store')) return 'stores'
  if (k.includes('driver') || k.includes('location') || k.includes('wallet') || k.includes('assigned')) return 'drivers'
  if (k.includes('market') || k.includes('hero') || k.includes('coupon')) return 'marketing'
  if (k.includes('user')) return 'users'
  if (k.includes('finance') || k.includes('expense') || k.includes('supplier')) return 'finance'
  if (k.includes('payment')) return 'payments'
  if (k.includes('promotion')) return 'promotions'
  if (k.includes('footer')) return 'footer'
  return 'other'
}

function getPermissionSummary(perms: Record<string, boolean>, lang: 'ar' | 'en'): string[] {
  const groups = new Set<string>()
  Object.entries(perms || {}).forEach(([k, v]) => {
    if (v) groups.add(permissionKeyToGroup(k))
  })
  return Array.from(groups)
    .sort()
    .map((g) => (GROUP_LABELS[g] ? (lang === 'ar' ? GROUP_LABELS[g].ar : GROUP_LABELS[g].en) : g))
}

export default function UsersList() {
  const { language, t } = useLanguage()
  const navigate = useNavigate()
  const [users, setUsers] = useState<UserRow[]>([])
  const [templates, setTemplates] = useState<RoleTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    api.get('/api/admin/role-templates').then((r) => {
      const list = r.data?.templates || []
      setTemplates(Array.isArray(list) ? list : [])
    }).catch(() => setTemplates([]))
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/admin/users')
      setUsers(res.data?.users || res.data || [])
    } catch (err) {
      console.error('Error loading users:', err)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const filtered = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.role?.toLowerCase().includes(search.toLowerCase())
  )

  const isAr = language === 'ar'

  return (
    <div className="p-6 max-w-6xl mx-auto" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <UsersIcon className="w-7 h-7 text-emerald-600" />
          {t('admin.users.title') || (isAr ? 'المستخدمون والصلاحيات' : 'Users & Roles')}
        </h1>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={t('admin.users.searchPlaceholder') || (isAr ? 'بحث بالاسم أو البريد أو الدور...' : 'Search by name, email or role...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          <Link
            to="/admin/users/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700"
          >
            <Plus className="w-5 h-5" />
            {t('admin.users.createUser') || (isAr ? 'إنشاء مستخدم' : 'Create user')}
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="inline-block w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2" />
            <p>{isAr ? 'جاري التحميل...' : 'Loading...'}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8">
            <div className="text-center text-gray-500 mb-6">
              <p className="text-lg font-medium">{t('admin.users.noUsers') || (isAr ? 'لا يوجد مستخدمون.' : 'No users found.')}</p>
            </div>
            {templates.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-600" />
                  {t('admin.users.choosePermissions') || (isAr ? 'اختر صلاحيات للموظفين — إنشاء مستخدم بقالب دور' : 'Choose permissions for staff — Create user with role template')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {templates.filter((t) => !['customer', 'driver'].includes(t.role)).map((tpl) => {
                    const summary = getPermissionSummary(tpl.permissions || {}, isAr ? 'ar' : 'en')
                    return (
                      <div
                        key={tpl.role}
                        className="rounded-xl border border-gray-200 bg-gray-50 p-4 hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors"
                      >
                        <p className="font-bold text-gray-900">{isAr ? tpl.description_ar : tpl.description_en}</p>
                        <p className="text-xs text-gray-500 mt-1">{tpl.role}</p>
                        {summary.length > 0 && (
                          <p className="text-xs text-gray-600 mt-2 flex flex-wrap gap-1">
                            {summary.map((s) => (
                              <span key={s} className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                {s}
                              </span>
                            ))}
                          </p>
                        )}
                        <Link
                          to="/admin/users/new"
                          state={{ presetRole: tpl.role }}
                          className="mt-3 inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700"
                        >
                          <Plus className="w-4 h-4" />
                          {t('admin.users.createWithRole') || (isAr ? 'إنشاء مستخدم بهذا الدور' : 'Create user with this role')}
                        </Link>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filtered.map((u) => (
              <li key={u.id}>
                <Link
                  to={`/admin/users/${u.id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold">
                      {u.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{u.name}</p>
                      <p className="text-sm text-gray-500">{u.email}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">{u.role}</span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}
                    >
                      {u.is_active ? (isAr ? 'نشط' : 'Active') : (isAr ? 'معطل' : 'Inactive')}
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {templates.length > 0 && (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            {t('admin.users.staffPermissions') || (isAr ? 'صلاحيات الموظفين — إنشاء مستخدم بقالب دور' : 'Staff permissions — Create user with role template')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {templates.filter((t) => !['customer', 'driver'].includes(t.role)).map((tpl) => {
              const summary = getPermissionSummary(tpl.permissions || {}, isAr ? 'ar' : 'en')
              return (
                <div
                  key={tpl.role}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-4 hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors"
                >
                  <p className="font-bold text-gray-900">{isAr ? tpl.description_ar : tpl.description_en}</p>
                  <p className="text-xs text-gray-500 mt-1">{tpl.role}</p>
                  {summary.length > 0 && (
                    <p className="text-xs text-gray-600 mt-2 flex flex-wrap gap-1">
                      {summary.map((s) => (
                        <span key={s} className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          {s}
                        </span>
                      ))}
                    </p>
                  )}
                  <Link
                    to="/admin/users/new"
                    state={{ presetRole: tpl.role }}
                    className="mt-3 inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700"
                  >
                    <Plus className="w-4 h-4" />
                    {t('admin.users.createWithRole') || (isAr ? 'إنشاء مستخدم بهذا الدور' : 'Create user with this role')}
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
