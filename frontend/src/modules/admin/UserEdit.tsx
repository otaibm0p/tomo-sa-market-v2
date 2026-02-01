import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom'
import { useLanguage } from '../../context/LanguageContext'
import api, { authAPI, adminUserAPI } from '../../utils/api'
import { showToast } from '../../shared/toast'
import { ArrowLeft, Save, RotateCcw, KeyRound } from 'lucide-react'
import AdminUserPermissionsEditor, { type PermissionGroup, type RoleTemplate } from './AdminUserPermissionsEditor'

interface User {
  id: number
  name: string
  email: string
  role: string
  is_active: boolean
  created_at?: string
}

export default function UserEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { language, t } = useLanguage()
  const isNew = id === 'new'
  const isAr = language === 'ar'
  const presetRole = (location.state as { presetRole?: string })?.presetRole

  const [user, setUser] = useState<User | null>(null)
  const [templates, setTemplates] = useState<RoleTemplate[]>([])
  const [schemaGroups, setSchemaGroups] = useState<PermissionGroup[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'admin',
    active: true,
  })
  const [permissions, setPermissions] = useState<Record<string, boolean>>({})
  const [initialPermissions, setInitialPermissions] = useState<Record<string, boolean>>({})
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false)
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false)
  const currentUser = authAPI.getCurrentUser()
  const isSuperAdmin = currentUser?.role === 'super_admin'

  const allKeys = useMemo(() => {
    const set = new Set<string>()
    templates.forEach((t) => Object.keys(t.permissions || {}).forEach((k) => set.add(k)))
    if (schemaGroups?.length) schemaGroups.flatMap((g) => g.permissions).forEach((k) => set.add(k))
    return Array.from(set)
  }, [templates, schemaGroups])

  const currentTemplatePerms = useMemo(() => {
    const tpl = templates.find((t) => t.role === form.role)
    return tpl?.permissions || {}
  }, [templates, form.role])

  const isCustom = useMemo(() => {
    for (const k of allKeys) {
      const curr = permissions[k] === true
      const tpl = currentTemplatePerms[k] === true
      if (curr !== tpl) return true
    }
    return false
  }, [permissions, currentTemplatePerms, allKeys])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const schemaRes = await api.get('/api/admin/permissions/schema').then((r) => r.data).catch(() => null)
        const tplRes = await api.get('/api/admin/role-templates').then((r) => r.data?.templates || [])
        const userRes = isNew ? null : await api.get(`/api/admin/users/${id}`).then((r) => r.data).catch(() => null)
        if (cancelled) return
        const tplList = Array.isArray(tplRes) ? tplRes : []
        const rolesFromSchema = schemaRes?.roles && Array.isArray(schemaRes.roles) ? schemaRes.roles : tplList
        setTemplates(rolesFromSchema)
        if (schemaRes?.groups?.length) setSchemaGroups(schemaRes.groups)
        else setSchemaGroups(null)
        if (userRes && userRes.id) {
          setUser(userRes)
          setForm({
            name: userRes.name || '',
            email: userRes.email || '',
            password: '',
            role: userRes.role || 'admin',
            active: userRes.is_active !== false,
          })
          const permRes = await api.get(`/api/admin/users/${id}/permissions`).catch(() => ({ data: { permissions: [] } }))
          const rows = permRes.data?.permissions || []
          const overrides: Record<string, boolean> = {}
          rows.forEach((r: { permission_key: string; granted?: boolean }) => {
            overrides[r.permission_key] = r.granted !== false
          })
          const rolePerms = (rolesFromSchema.find((t: RoleTemplate) => t.role === userRes.role)?.permissions || {}) as Record<string, boolean>
          const merged = { ...rolePerms, ...overrides }
          setPermissions(merged)
          setInitialPermissions(merged)
        } else if (!isNew) {
          setUser(null)
        } else {
          const initialRole = presetRole && rolesFromSchema.some((t: RoleTemplate) => t.role === presetRole) ? presetRole : (rolesFromSchema[0]?.role || 'admin')
          setForm((f) => ({ ...f, role: initialRole }))
          const roleTpl = rolesFromSchema.find((t: RoleTemplate) => t.role === initialRole)
          const perms = (roleTpl?.permissions || {}) as Record<string, boolean>
          setPermissions(perms)
          setInitialPermissions(perms)
        }
      } catch (e) {
        if (!cancelled) setTemplates([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id, isNew])

  // When creating new user and role changes, sync permissions from template
  useEffect(() => {
    if (!isNew || templates.length === 0) return
    const tpl = templates.find((t) => t.role === form.role)
    setPermissions((tpl?.permissions as Record<string, boolean>) || {})
  }, [form.role, isNew, templates])

  const applyTemplate = () => {
    const tpl = templates.find((t) => t.role === form.role)
    setPermissions((tpl?.permissions as Record<string, boolean>) || {})
  }

  const resetToInitial = () => {
    setPermissions({ ...initialPermissions })
  }

  const togglePermission = (key: string) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = async (e?: React.MouseEvent) => {
    e?.preventDefault()
    setSaveMessage(null)
    if (isNew) {
      if (!form.name?.trim() || !form.email?.trim()) {
        setSaveMessage({
          type: 'error',
          text: isAr ? 'الاسم والبريد الإلكتروني مطلوبان.' : 'Name and email are required.',
        })
        return
      }
      if (!form.password?.trim()) {
        setSaveMessage({
          type: 'error',
          text: isAr ? 'أدخل كلمة مرور مؤقتة للمستخدم الجديد.' : 'Enter a temporary password for the new user.',
        })
        return
      }
      setSaving(true)
      try {
        const createRes = await api.post('/api/admin/users', {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
        })
        const newUser = createRes.data
        const newId = newUser?.id
        if (newId && isCustom) {
          const permKeys = Object.entries(permissions)
            .filter(([, v]) => v)
            .map(([k]) => k)
          await api.put(`/api/admin/users/${newId}`, {
            role: form.role,
            active: true,
            permissions: permKeys,
          })
        }
        setSaveMessage({
          type: 'success',
          text: isAr ? 'تم إنشاء المستخدم بنجاح.' : 'User created successfully.',
        })
        setTimeout(() => navigate('/admin/users'), 1200)
      } catch (err: any) {
        const msg =
          err.response?.data?.message ||
          err.message ||
          (isAr ? 'فشل إنشاء المستخدم. تحقق من الاتصال وقاعدة البيانات.' : 'Failed to create user. Check connection and database.')
        setSaveMessage({ type: 'error', text: msg })
      } finally {
        setSaving(false)
      }
      return
    }

    if (!user?.id) return
    setSaving(true)
    try {
      const permKeys = Object.entries(permissions)
        .filter(([, v]) => v)
        .map(([k]) => k)
      await api.put(`/api/admin/users/${user.id}`, {
        role: form.role,
        active: form.active,
        permissions: permKeys,
      })
      setSaveMessage({
        type: 'success',
        text: isAr ? 'تم حفظ التغييرات.' : 'Changes saved.',
      })
      setInitialPermissions({ ...permissions })
    } catch (err: any) {
      setSaveMessage({
        type: 'error',
        text: err.response?.data?.message || err.message || (isAr ? 'فشل الحفظ.' : 'Failed to save.'),
      })
    } finally {
      setSaving(false)
    }
  }

  const handleResetPassword = async () => {
    if (!user?.id || user.id === currentUser?.id) return
    setResetPasswordLoading(true)
    setSaveMessage(null)
    try {
      await adminUserAPI.resetPassword(user.id)
      setResetPasswordModalOpen(false)
      const successMsg = t('admin.users.resetPasswordSuccess') || (isAr ? 'تم إعادة تعيين كلمة المرور. سيُطلب من المستخدم تغييرها عند تسجيل الدخول.' : 'Password has been reset. User must change it on next login.')
      const securityMsg = t('admin.users.resetPasswordSecurityNote') || (isAr ? 'لم يتم تخزين كلمة المرور المؤقتة. تواصل مع المستخدم عبر قناة آمنة لإبلاغه بتسجيل الدخول وتغيير كلمة المرور.' : 'The temporary password is not stored. Contact the user through a secure channel to have them sign in and change their password.')
      showToast(successMsg, 'success')
      setTimeout(() => showToast(securityMsg, 'error'), 2000)
    } catch (err: any) {
      const msg = err.response?.data?.message || err.userMessage || (isAr ? 'فشل إعادة تعيين كلمة المرور.' : 'Failed to reset password.')
      setSaveMessage({ type: 'error', text: msg })
    } finally {
      setResetPasswordLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="inline-block w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="mt-2 text-gray-500">{isAr ? 'جاري التحميل...' : 'Loading...'}</p>
      </div>
    )
  }

  if (!isNew && !user) {
    return (
      <div className="p-6">
        <p className="text-gray-600">{isAr ? 'المستخدم غير موجود.' : 'User not found.'}</p>
        <Link to="/admin/users" className="mt-2 inline-block text-emerald-600 hover:underline">
          {isAr ? '← العودة للقائمة' : '← Back to list'}
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-4 mb-6">
        <Link
          to="/admin/users"
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
        >
          <ArrowLeft className="w-5 h-5" />
          {isAr ? 'القائمة' : 'List'}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {isNew ? (isAr ? 'إنشاء مستخدم' : 'Create user') : (isAr ? 'تعديل المستخدم' : 'Edit user')}
        </h1>
      </div>

      {saveMessage && (
          <div
            className={`mb-4 rounded-xl border px-4 py-3 ${
              saveMessage.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
            role="alert"
          >
            {saveMessage.text}
          </div>
        )}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
        {/* Basic info: الاسم = الاسم الظاهر، البريد = اسم الدخول (لا يوجد username منفصل)، كلمة المرور = مؤقتة عند الإنشاء فقط */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.users.nameLabel') || (isAr ? 'الاسم' : 'Name')}
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              disabled={!isNew}
              placeholder={isAr ? 'مثال: أحمد المدير' : 'e.g. Ahmed Admin'}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
              aria-describedby="name-hint"
            />
            <p id="name-hint" className="mt-1 text-xs text-gray-500">
              {t('admin.users.nameHint') || (isAr ? 'الاسم الظاهر في لوحة التحكم' : 'Display name in the dashboard')}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.users.emailLabel') || (isAr ? 'البريد الإلكتروني (للتسجيل)' : 'Email (for login)')}
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              disabled={!isNew}
              placeholder={isAr ? 'user@example.com' : 'user@example.com'}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
              aria-describedby="email-hint"
            />
            <p id="email-hint" className="mt-1 text-xs text-gray-500">
              {t('admin.users.emailHint') || (isAr ? 'يُستخدم لتسجيل الدخول (البريد = اسم الدخول)' : 'Used to sign in — email is the login identifier')}
            </p>
          </div>
          {isNew && (
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.users.passwordLabel') || (isAr ? 'كلمة المرور المؤقتة' : 'Temporary password')}
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder={isAr ? 'أدخل كلمة مرور قوية — لن تُعرض مرة أخرى' : 'Enter a strong password — it will not be shown again'}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                aria-describedby="password-hint"
                autoComplete="new-password"
              />
              <p id="password-hint" className="mt-1 text-xs text-amber-700">
                {t('admin.users.passwordHint') || (isAr ? 'إجباري عند الإنشاء. لن تُعرض مرة أخرى — أخبر المستخدم بها، وسيُطلب منه تغييرها عند أول دخول.' : 'Required when creating. Won\'t be shown again — share with user securely; they must change it on first login.')}
              </p>
            </div>
          )}
        </div>

        {/* Role & status row */}
        <div className="flex flex-wrap items-center gap-4">
          {!isNew && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="active" className="text-sm font-medium text-gray-700">
                {isAr ? 'نشط' : 'Active'}
              </label>
            </div>
          )}
          {!isNew && user && user.id !== currentUser?.id && isSuperAdmin && (
            <button
              type="button"
              onClick={() => setResetPasswordModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-amber-300 text-amber-700 rounded-xl hover:bg-amber-50"
            >
              <KeyRound className="w-4 h-4" />
              {t('admin.users.resetPassword') || (isAr ? 'إعادة تعيين كلمة المرور' : 'Reset password')}
            </button>
          )}
          {isCustom && (
            <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
              {isAr ? 'مخصص' : 'Custom'}
            </span>
          )}
          <button type="button" onClick={resetToInitial} className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50">
            <RotateCcw className="w-4 h-4 inline mr-1" />
            {isAr ? 'إعادة' : 'Reset'}
          </button>
        </div>

        {/* Permissions: wide editor when schema available, else legacy list */}
        {(schemaGroups?.length && templates.length) ? (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              {t('admin.users.permissionsSection') || (isAr ? 'صلاحيات الموظف' : 'Staff permissions')}
            </h3>
            {isNew && (
              <p className="text-sm text-gray-600 mb-3">
                {t('admin.users.permissionsHint') || (isAr ? 'اختر الصلاحيات المناسبة أو استخدم قالب الدور أعلاه. يمكنك تغييرها لاحقاً من صفحة تعديل المستخدم.' : 'Choose the permissions for this user or use the role template above. You can change them later from the user edit page.')}
              </p>
            )}
            <AdminUserPermissionsEditor
              groups={schemaGroups}
              roles={templates}
              role={form.role}
              onRoleChange={(role) => setForm((f) => ({ ...f, role }))}
              permissions={permissions}
              onPermissionsChange={setPermissions}
              onApplyTemplate={applyTemplate}
            />
          </div>
        ) : (
          allKeys.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {t('admin.users.permissionsSection') || (isAr ? 'صلاحيات الموظف' : 'Staff permissions')}
              </h3>
              <div className="flex flex-wrap items-center gap-4 mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{isAr ? 'الدور' : 'Role'}</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                    className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  >
                    {templates.map((t) => (
                      <option key={t.role} value={t.role}>
                        {isAr ? t.description_ar : t.description_en}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="button" onClick={applyTemplate} className="px-4 py-2 border border-emerald-600 text-emerald-600 rounded-xl hover:bg-emerald-50">
                  {isAr ? 'تطبيق قالب الدور' : 'Apply role template'}
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                {allKeys.map((k) => (
                  <label key={k} className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions[k] === true}
                      onChange={() => togglePermission(k)}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-gray-700">{k}</span>
                  </label>
                ))}
              </div>
            </div>
          )
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
          <Link to="/admin/users" className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50">
            {isAr ? 'إلغاء' : 'Cancel'}
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ' : 'Save')}
          </button>
        </div>
      </div>

      {resetPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="reset-password-title">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h2 id="reset-password-title" className="text-lg font-bold text-gray-900 mb-2">
              {t('admin.users.resetPassword') || (isAr ? 'إعادة تعيين كلمة المرور' : 'Reset password')}
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {t('admin.users.resetPasswordConfirm') || (isAr ? 'هل أنت متأكد؟ سيتم تعيين كلمة مرور مؤقتة ويُطلب من المستخدم تغييرها عند الدخول.' : 'Are you sure? A temporary password will be set and the user will be required to change it on login.')}
            </p>
            <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2 mb-4">
              {t('admin.users.forceChangePassword') || (isAr ? 'سيُطلب من المستخدم تغيير كلمة المرور عند أول تسجيل دخول.' : 'User will be required to change password on first login.')}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setResetPasswordModalOpen(false)}
                disabled={resetPasswordLoading}
                className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={resetPasswordLoading}
                className="px-4 py-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 disabled:opacity-50"
              >
                {resetPasswordLoading ? (isAr ? 'جاري التنفيذ…' : 'Resetting…') : (isAr ? 'إعادة التعيين' : 'Reset')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
