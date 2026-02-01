/**
 * Admin path -> permission key mapping (RBAC).
 * Effective perms = user custom overrides else role template.
 */
export const ADMIN_PATH_PERMISSION: Record<string, string> = {
  '/admin': 'view_reports',
  '/admin/orders': 'manage_orders',
  '/admin/dispatch': 'live_dispatch',
  '/admin/mission-control': 'manage_orders',
  '/admin/ops': 'view_orders',
  '/admin/ops/board': 'live_dispatch',
  '/admin/guardrails': 'view_reports',
  '/admin/ops-monitor': 'view_reports',
  '/admin/catalog-watch': 'manage_products',
  '/admin/profit-guard': 'view_reports',
  '/admin/copilot': 'view_reports',
  '/admin/activity': 'view_reports',
  '/admin/products': 'manage_products',
  '/admin/stores': 'manage_stores',
  '/admin/control': 'control_center',
  '/admin/marketing/promo-strip': 'manage_promo_strip',
  '/admin/marketing/site-links': 'manage_site_links',
  '/admin/marketing/site-content': 'manage_site_content',
  '/admin/marketing/audience': 'manage_campaigns',
  '/admin/marketing/templates': 'manage_campaigns',
  '/admin/marketing/campaigns': 'manage_campaigns',
  '/admin/marketing/utm': 'manage_utm_builder',
  '/admin/marketing/coupons': 'manage_coupons',
  '/admin/staff': 'manage_users_roles',
  '/admin/users': 'manage_users_roles',
  '/admin/users/:id': 'manage_users_roles',
  '/admin/settings': 'manage_system_settings',
  '/admin/accountant': 'view_finance_dashboard',
  '/admin/marketing': 'manage_campaigns',
  '/admin/delivery': 'manage_riders',
  '/admin/dispatch-settings': 'manage_system_settings',
  '/admin/zone-management': 'manage_riders',
  '/admin/courier-wallets': 'view_settlements',
  '/admin/audit': 'view_audit_log',
  '/admin/api-keys': 'manage_system_settings',
  '/admin/payment-settings': 'manage_system_settings',
  '/admin/hero-slides': 'manage_home_hero',
  '/admin/categories': 'manage_categories',
  '/admin/pricing': 'manage_products',
  '/admin/promotions': 'manage_campaigns',
  '/admin/ops/live-dispatch': 'live_dispatch',
  '/admin/ops/riders': 'manage_riders',
  '/admin/ops/sla': 'sla_timers',
  '/admin/tracking': 'view_tracking',
  '/admin/delivery-map': 'view_tracking',
  '/admin/catalog/import': 'view_reports',
  '/admin/accounting': 'view_reports',
  '/admin/accountant/reports': 'view_reports',
  '/admin/accountant/exports': 'exports_csv',
  '/admin/accountant/settlements': 'view_settlements',
  '/admin/experience/support': 'manage_support_settings',
}

export function pathToPermission(path: string): string | null {
  if (!path || !path.startsWith('/admin')) return null
  const normalized = path.replace(/\/$/, '') || '/admin'
  return ADMIN_PATH_PERMISSION[normalized] ?? ADMIN_PATH_PERMISSION[normalized.split('/').slice(0, 3).join('/')] ?? 'view_reports'
}

export function hasPermission(permissions: Record<string, boolean>, path: string): boolean {
  if (!permissions) return false
  if (permissions.all === true) return true
  const key = pathToPermission(path)
  return key ? permissions[key] === true : false
}

/** Module flag name for feature-flag check (marketing, accounting, support, users_roles, exports, settlements, campaigns, coupons) */
export type ModuleFlagName =
  | 'marketing'
  | 'accounting'
  | 'support'
  | 'users_roles'
  | 'exports'
  | 'settlements'
  | 'campaigns'
  | 'coupons'
  | 'ops_console'

/** Path -> module flag. Returns null if path does not require a module flag (e.g. /admin/users is independent). */
export function pathToModule(path: string): ModuleFlagName | null {
  if (!path || !path.startsWith('/admin')) return null
  const p = path.replace(/\/$/, '') || '/admin'
  /* Users & permissions: not tied to any module flag; access is permission-only */
  if (p.startsWith('/admin/users') || p === '/admin/staff') return null
  if (p === '/admin/marketing/campaigns') return 'campaigns'
  if (p === '/admin/marketing/coupons') return 'coupons'
  if (p.startsWith('/admin/marketing')) return 'marketing'
  if (p.startsWith('/admin/accountant')) return 'accounting'
  if (p.startsWith('/admin/support')) return 'support'
  if (p === '/admin/accountant/exports' || p.includes('/exports')) return 'exports'
  if (p === '/admin/accountant/settlements' || p.includes('/settlements')) return 'settlements'
  if (p.startsWith('/admin/audit')) return null
  if (p === '/admin/ops/live-dispatch' || p === '/admin/ops/riders' || p === '/admin/ops/sla') return 'ops_console'
  if (p.startsWith('/admin/ops')) return 'ops_console'
  if (p === '/admin/accountant/exports' || p.includes('/exports')) return 'exports'
  if (p === '/admin/accountant/settlements' || p.includes('/settlements')) return 'settlements'
  if (p.startsWith('/admin/experience/support')) return 'support'
  return null
}

export type SettingsWithFeatures = {
  features?: {
    modules_enabled?: Record<string, boolean>
  }
} | null

/** Check if a module is enabled by admin (feature flags). Reads publicSettings.features.modules_enabled.*. Missing key = enabled (backward compat). */
export function isModuleEnabled(settings: SettingsWithFeatures | null | undefined, name: ModuleFlagName | string): boolean {
  if (!settings?.features?.modules_enabled) return true
  const v = settings.features.modules_enabled[name]
  return v !== false
}
