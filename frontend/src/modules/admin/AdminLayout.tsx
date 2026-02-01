import { Outlet, Link } from 'react-router-dom'
import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { authAPI } from '../../utils/api'
import AdminSidebar from './AdminSidebar'
import NotificationBell from './NotificationBell'
import NoAccessPage from './NoAccessPage'
import { useLanguage } from '../../context/LanguageContext'
import { useTheme } from '../../context/ThemeContext'
import { AdminShell } from '../../shared/admin/ui/components/AdminShell'
import { AdminTopbar } from '../../shared/admin/ui/components/AdminTopbar'
import { AdminCommandPalette } from '../../shared/admin/ui/components/AdminCommandPalette'
import { logAdminEvent } from '../../shared/admin/activityLog'
import { useAdminPermissions } from '../../hooks/useAdminPermissions'
import { usePublicSettings } from '../../hooks/usePublicSettings'
import { pathToModule, isModuleEnabled } from '../../shared/admin/adminPermissions'
import { getAdminTheme, applyAdminTheme } from '../../shared/admin/ui/tokens'

export default function AdminLayout() {
  const { language, setLanguage } = useLanguage()
  const { t } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const user = authAPI.getCurrentUser()
  const { settings: publicSettings } = usePublicSettings()
  const { loading: permsLoading, hasAccess, role, permissions, hasAnyManage } = useAdminPermissions(user != null)
  const readOnlyMode = !permsLoading && !hasAnyManage
  const managePermissionsHref = '/admin/users'
  const currentPath = location.pathname
  const isSuperAdmin = user?.role === 'super_admin' || role === 'super_admin' || permissions?.manage_users === true || permissions?.all === true
  const moduleForPath = pathToModule(currentPath)
  const moduleDisabled = moduleForPath != null && publicSettings != null && !isModuleEnabled(publicSettings, moduleForPath)
  const canAccessCurrent = permsLoading || (isSuperAdmin ? hasAccess(currentPath) : (moduleDisabled ? false : hasAccess(currentPath)))
  const noAccessReason: 'module_disabled' | 'permission_denied' = moduleDisabled ? 'module_disabled' : 'permission_denied'

  // Redirect to admin login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/admin/login?redirect=' + encodeURIComponent(location.pathname))
      return
    }
    // Force password change: only allow /admin/change-password until changed
    if (user.force_password_change && currentPath !== '/admin/change-password') {
      navigate('/admin/change-password', { replace: true })
    }
  }, [user, navigate, location, currentPath])

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100" dir="ltr">
        <div className="text-center text-gray-600">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p>Redirecting to login… / جاري التحويل لتسجيل الدخول</p>
        </div>
      </div>
    )
  }

  const title = (() => {
    const p = location.pathname
    if (p === '/admin') return t('admin.items.dashboard') || 'Dashboard'
    if (p.startsWith('/admin/orders')) return t('admin.items.orders') || 'Orders'
    if (p.startsWith('/admin/dispatch')) return t('admin.items.liveDispatch') || 'Live Dispatch'
    if (p.startsWith('/admin/mission-control')) return t('admin.items.missionControl') || 'Mission Control'
    if (p.startsWith('/admin/ops')) return t('admin.items.opsDigest') || 'Ops Digest'
    if (p.startsWith('/admin/guardrails')) return t('admin.items.guardrails') || 'Guardrails'
    if (p.startsWith('/admin/ops-monitor')) return t('admin.items.opsMonitor') || 'Ops Monitor'
    if (p.startsWith('/admin/catalog-watch')) return t('admin.items.catalogWatch') || 'Catalog Watch'
    if (p.startsWith('/admin/profit-guard')) return t('admin.items.profitGuard') || 'Profit Guard'
    if (p.startsWith('/admin/copilot')) return t('admin.items.adminCopilot') || 'Admin Copilot'
    if (p.startsWith('/admin/products')) return t('admin.items.products') || 'Products'
    if (p.startsWith('/admin/stores')) return t('admin.items.stores') || 'Stores'
    if (p.startsWith('/admin/control')) return t('admin.items.controlCenter') || 'Control Center'
    return t('admin') || 'Admin'
  })()

  useEffect(() => {
    applyAdminTheme(getAdminTheme())
  }, [])

  useEffect(() => {
    // Log navigation events for Intelligence pages only
    const p = location.pathname
    const isIntelligence =
      p.startsWith('/admin/ops') ||
      p.startsWith('/admin/ops-monitor') ||
      p.startsWith('/admin/catalog-watch') ||
      p.startsWith('/admin/guardrails') ||
      p.startsWith('/admin/profit-guard')

    if (!isIntelligence) return

    const label = (() => {
      if (p.startsWith('/admin/ops-monitor')) return t('admin.items.opsMonitor') || 'Ops Monitor'
      if (p.startsWith('/admin/catalog-watch')) return t('admin.items.catalogWatch') || 'Catalog Watch'
      if (p.startsWith('/admin/guardrails')) return t('admin.items.guardrails') || 'Guardrails'
      if (p.startsWith('/admin/profit-guard')) return t('admin.items.profitGuard') || 'Profit Guard'
      return t('admin.items.opsDigest') || 'Ops Digest'
    })()

    logAdminEvent('navigation', label, { path: p })
  }, [location.pathname, t])

  return (
    <>
      <AdminShell
        isRTL={language === 'ar'}
        theme={theme}
        mobileMenuLabel={language === 'ar' ? 'القائمة' : 'Menu'}
        sidebar={({ onNavigate, collapsed }) => (
          <AdminSidebar theme={theme} onNavigate={onNavigate} collapsed={collapsed} hasAccess={permsLoading ? undefined : hasAccess} publicSettings={publicSettings ?? undefined} isSuperAdmin={isSuperAdmin} />
        )}
        topbar={({ onOpenSidebar, onToggleCollapse, collapsed }) => (
          <AdminTopbar
            title={title}
            onOpenSidebar={onOpenSidebar}
            onToggleCollapse={onToggleCollapse}
            isCollapsed={collapsed}
            searchPlaceholder={language === 'ar' ? 'بحث (واجهة فقط)...' : 'Search (UI only)...'}
            userName={user.name}
            languageLabel={language === 'ar' ? 'EN' : 'عربي'}
            onToggleLanguage={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            theme={theme}
            onToggleTheme={toggleTheme}
            readOnlyBanner={readOnlyMode}
            managePermissionsHref={managePermissionsHref}
            readOnlyBannerMessage={t('admin.readOnlyBanner.message')}
            readOnlyBannerButtonLabel={t('admin.readOnlyBanner.managePermissions')}
            rightSlot={
              <div className="flex items-center gap-2">
                <Link
                  to="/"
                  className={`px-4 py-2 rounded-xl font-extrabold border ${
                    theme === 'dark'
                      ? 'bg-gray-900 border-gray-700 text-gray-100 hover:bg-gray-800'
                      : 'bg-white border-gray-200 text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {language === 'ar' ? 'العودة للمتجر' : 'Back to Store'}
                </Link>
                <NotificationBell />
              </div>
            }
          />
        )}
      >
        {!canAccessCurrent ? <NoAccessPage reason={noAccessReason} /> : <Outlet />}
      </AdminShell>

      <AdminCommandPalette theme={theme} />
    </>
  )
}
