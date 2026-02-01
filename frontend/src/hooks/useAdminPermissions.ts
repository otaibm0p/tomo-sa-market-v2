import { useState, useEffect, useCallback, useMemo } from 'react'
import api from '../utils/api'
import { hasPermission as checkHasPermission } from '../shared/admin/adminPermissions'

const FULL_MANAGE_PERMISSIONS: Record<string, boolean> = {
  all: true,
  manage_orders: true,
  manage_products: true,
  manage_stores: true,
  view_reports: true,
  manage_settings: true,
  manage_marketing: true,
  manage_users: true,
  manage_drivers: true,
  manage_finance: true,
}

export interface AdminPermissionsState {
  permissions: Record<string, boolean>
  role: string
  loading: boolean
  hasAccess: (path: string) => boolean
  /** Effective permissions used for access (super_admin gets full manage) */
  effectivePermissions: Record<string, boolean>
  /** True if user has at least one manage_* or all */
  hasAnyManage: boolean
}

export function useAdminPermissions(enabled: boolean = true): AdminPermissionsState {
  const [permissions, setPermissions] = useState<Record<string, boolean>>({})
  const [role, setRole] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    let cancelled = false
    api
      .get('/api/admin/me/permissions')
      .then((res) => {
        if (cancelled) return
        const p = res.data?.permissions && typeof res.data.permissions === 'object' ? res.data.permissions : {}
        setPermissions(p)
        setRole(res.data?.role || '')
      })
      .catch(() => {
        if (!cancelled) {
          setPermissions(FULL_MANAGE_PERMISSIONS)
          setRole('admin')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [enabled])

  const effectivePermissions = useMemo(() => {
    if (role === 'super_admin') return { ...permissions, ...FULL_MANAGE_PERMISSIONS }
    return permissions
  }, [role, permissions])

  const hasAccess = useCallback(
    (path: string) => checkHasPermission(effectivePermissions, path),
    [effectivePermissions]
  )

  const hasAnyManage = useMemo(() => {
    if (effectivePermissions.all === true) return true
    return Object.keys(effectivePermissions).some(
      (k) => k.startsWith('manage_') && effectivePermissions[k] === true
    )
  }, [effectivePermissions])

  return { permissions, role, loading, hasAccess, effectivePermissions, hasAnyManage }
}
