import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'

export interface PermissionGroup {
  id: string
  label_ar: string
  label_en: string
  permissions: string[]
}

export interface RoleTemplate {
  role: string
  permissions: Record<string, boolean>
  description_ar: string
  description_en: string
}

interface AdminUserPermissionsEditorProps {
  groups: PermissionGroup[]
  roles: RoleTemplate[]
  role: string
  onRoleChange: (role: string) => void
  permissions: Record<string, boolean>
  onPermissionsChange: (perms: Record<string, boolean>) => void
  onApplyTemplate?: () => void
  disabled?: boolean
}

export default function AdminUserPermissionsEditor({
  groups,
  roles,
  role,
  onRoleChange,
  permissions,
  onPermissionsChange,
  onApplyTemplate,
  disabled = false,
}: AdminUserPermissionsEditorProps) {
  const { language, t } = useLanguage()
  const isAr = language === 'ar'
  const [search, setSearch] = useState('')

  const effectiveCount = useMemo(
    () => Object.keys(permissions).filter((k) => permissions[k] === true).length,
    [permissions]
  )

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return groups
    return groups
      .map((g) => ({
        ...g,
        permissions: g.permissions.filter(
          (p) =>
            p.toLowerCase().includes(q) ||
            (t(`admin.permissions.${p}` as any) || p).toLowerCase().includes(q) ||
            (isAr ? g.label_ar : g.label_en).toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.permissions.length > 0)
  }, [groups, search, isAr, t])

  const togglePermission = (key: string) => {
    if (disabled) return
    onPermissionsChange({ ...permissions, [key]: !permissions[key] })
  }

  const selectAllInGroup = (group: PermissionGroup, checked: boolean) => {
    if (disabled) return
    const next = { ...permissions }
    group.permissions.forEach((p) => {
      next[p] = checked
    })
    onPermissionsChange(next)
  }

  const isGroupAllSelected = (group: PermissionGroup) =>
    group.permissions.every((p) => permissions[p] === true)
  const isGroupSomeSelected = (group: PermissionGroup) =>
    group.permissions.some((p) => permissions[p] === true)

  const labelForPermission = (key: string) => t(`admin.permissions.${key}` as any) || key
  const labelForGroup = (g: PermissionGroup) => (isAr ? g.label_ar : g.label_en)

  return (
    <div className="space-y-4" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('admin.users.roleLabel') || (isAr ? 'الدور' : 'Role')}
          </label>
          <select
            value={role}
            onChange={(e) => onRoleChange(e.target.value)}
            disabled={disabled}
            className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
          >
            {roles.map((r) => (
              <option key={r.role} value={r.role}>
                {isAr ? r.description_ar : r.description_en}
              </option>
            ))}
          </select>
        </div>
        {onApplyTemplate && (
          <button
            type="button"
            onClick={onApplyTemplate}
            disabled={disabled}
            className="px-4 py-2 border border-emerald-600 text-emerald-600 rounded-xl hover:bg-emerald-50 disabled:opacity-50"
          >
            {t('admin.users.applyRoleTemplate') || (isAr ? 'تطبيق قالب الدور' : 'Apply role template')}
          </button>
        )}
        <div className="ml-auto flex items-center gap-2 text-sm font-medium text-gray-600">
          <span>
            {t('admin.users.effectivePermissionsCount') || (isAr ? 'عدد الصلاحيات الفعالة' : 'Effective permissions count')}:{' '}
            <strong className="text-emerald-700">{effectiveCount}</strong>
          </span>
        </div>
      </div>

      <div className="relative">
        <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 ${isAr ? 'right-3' : 'left-3'}`} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('admin.users.searchPermissions') || (isAr ? 'بحث في الصلاحيات…' : 'Search permissions…')}
          className={`w-full py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 ${isAr ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
        />
      </div>

      <div className="space-y-4">
        {filteredGroups.map((grp) => (
          <div key={grp.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h4 className="font-semibold text-gray-800">{labelForGroup(grp)}</h4>
              <button
                type="button"
                onClick={() => selectAllInGroup(grp, !isGroupAllSelected(grp))}
                disabled={disabled}
                className="text-sm font-medium text-[#047857] hover:underline disabled:opacity-50"
              >
                {t('admin.users.selectAllInGroup') || (isAr ? 'تحديد الكل في المجموعة' : 'Select all in group')}
                {isGroupSomeSelected(grp) && !isGroupAllSelected(grp) && ` (${grp.permissions.filter((p) => permissions[p]).length}/${grp.permissions.length})`}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {grp.permissions.map((k) => {
                const checked = permissions[k] === true
                return (
                  <label
                    key={k}
                    className={`inline-flex items-center gap-2 cursor-pointer rounded-lg border px-3 py-2 transition-colors ${
                      checked ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    } ${disabled ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePermission(k)}
                      disabled={disabled}
                      className="rounded border-gray-300 text-[#047857] focus:ring-[#047857]"
                    />
                    <span className="text-sm font-medium">{labelForPermission(k)}</span>
                  </label>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
