import { useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  LayoutGrid,
  ClipboardList,
  Zap,
  Users,
  Store,
  MapPin,
  Package,
  FolderTree,
  Megaphone,
  Image,
  Link as LinkIcon,
  Headphones,
  BarChart3,
  Wallet,
  Settings,
  Activity,
  Shield,
} from 'lucide-react'
import { authAPI } from '../../utils/api'
import { useLanguage } from '../../context/LanguageContext'
import { AdminSidebar as AdminSidebarUI, type AdminNavSection } from '../../shared/admin/ui/components/AdminSidebar'
import { pathToModule, isModuleEnabled } from '../../shared/admin/adminPermissions'
import type { PublicSettings } from '../../shared/settings/publicSettings'

export default function AdminSidebar({
  theme = 'light',
  onNavigate,
  collapsed,
  hasAccess,
  publicSettings,
  isSuperAdmin = false,
}: {
  theme?: 'light' | 'dark'
  onNavigate?: () => void
  collapsed?: boolean
  hasAccess?: (path: string) => boolean
  publicSettings?: PublicSettings | null
  isSuperAdmin?: boolean
}) {
  const location = useLocation()
  const user = authAPI.getCurrentUser()
  const { language, t } = useLanguage()

  const itemVisible = (path: string) => {
    if (hasAccess && !hasAccess(path)) return false
    if (isSuperAdmin) return true
    const mod = pathToModule(path)
    if (mod == null) return true
    if (publicSettings == null) return true
    return isModuleEnabled(publicSettings, mod)
  }

  const isModuleDisabledForPath = (path: string) => {
    const mod = pathToModule(path)
    return mod != null && publicSettings != null && !isModuleEnabled(publicSettings, mod)
  }

  const sectionsFilterActive = hasAccess != null || (publicSettings != null && !isSuperAdmin)

  const allSections: AdminNavSection[] = [
    {
      id: 'command-center',
      label: t('admin.nav.commandCenter') || (language === 'ar' ? 'مركز القيادة' : 'Command Center'),
      collapsible: false,
      items: [
        { path: '/admin', label: t('admin.items.missionControl') || (language === 'ar' ? 'مركز القيادة' : 'Mission Control'), icon: LayoutDashboard, roles: ['super_admin', 'admin'] },
      ],
    },
    {
      id: 'operations',
      label: t('admin.nav.operations') || (language === 'ar' ? 'العمليات' : 'Operations'),
      collapsible: true,
      items: [
        { path: '/admin/orders', label: t('admin.items.orders') || (language === 'ar' ? 'الطلبات' : 'Orders'), icon: ClipboardList, roles: ['super_admin', 'admin'] },
        { path: '/admin/ops/board', label: t('admin.items.opsBoard') || (language === 'ar' ? 'لوحة العمليات' : 'Ops Board'), icon: LayoutGrid, roles: ['super_admin', 'admin', 'delivery_manager'] },
        { path: '/admin/ops/live-dispatch', label: t('admin.items.liveDispatch') || (language === 'ar' ? 'الإرسال المباشر' : 'Live Dispatch'), icon: Zap, roles: ['super_admin', 'admin', 'delivery_manager'] },
        { path: '/admin/riders', label: t('riders.console.title') || (language === 'ar' ? 'وحدة المندوبين' : 'Riders Console'), icon: Users, roles: ['super_admin', 'admin', 'delivery_manager'] },
        { path: '/admin/stores', label: t('admin.items.stores') || (language === 'ar' ? 'المتاجر' : 'Stores'), icon: Store, roles: ['super_admin', 'admin'] },
        { path: '/admin/delivery-map', label: language === 'ar' ? 'التتبع والخريطة' : 'Tracking & Map', icon: MapPin, roles: ['super_admin', 'admin', 'delivery_manager'] },
      ],
    },
    {
      id: 'catalog',
      label: t('admin.nav.catalog') || (language === 'ar' ? 'الكتالوج' : 'Catalog'),
      collapsible: true,
      items: [
        { path: '/admin/products', label: t('admin.items.products') || (language === 'ar' ? 'المنتجات' : 'Products'), icon: Package, roles: ['super_admin', 'admin'] },
        { path: '/admin/categories', label: language === 'ar' ? 'الأقسام' : 'Categories', icon: FolderTree, roles: ['super_admin', 'admin'] },
      ],
    },
    {
      id: 'experience',
      label: t('admin.nav.experience') || (language === 'ar' ? 'التجربة' : 'Experience'),
      collapsible: true,
      items: [
        { path: '/admin/marketing/site-content', label: language === 'ar' ? 'محتوى الموقع' : 'Site Content', icon: Megaphone, roles: ['super_admin', 'admin'] },
        { path: '/admin/marketing/promo-strip', label: language === 'ar' ? 'شريط الترويج' : 'Promo Strip', icon: Megaphone, roles: ['super_admin', 'admin'] },
        { path: '/admin/hero-slider', label: language === 'ar' ? 'هيرو الصفحة الرئيسية' : 'Home Hero', icon: Image, roles: ['super_admin', 'admin'] },
        { path: '/admin/marketing/site-links', label: language === 'ar' ? 'روابط الموقع' : 'Site Links', icon: LinkIcon, roles: ['super_admin', 'admin'] },
        { path: '/admin/experience/support', label: language === 'ar' ? 'إعدادات الدعم' : 'Support Settings', icon: Headphones, roles: ['super_admin', 'admin'] },
      ],
    },
    {
      id: 'marketing',
      label: t('admin.nav.marketing') || (language === 'ar' ? 'التسويق' : 'Marketing'),
      collapsible: true,
      items: [
        { path: '/admin/marketing/audience', label: language === 'ar' ? 'الجمهور' : 'Audience', icon: Megaphone, roles: ['super_admin', 'admin'] },
        { path: '/admin/marketing/templates', label: language === 'ar' ? 'قوالب واتساب' : 'WhatsApp Templates', icon: Megaphone, roles: ['super_admin', 'admin'] },
        { path: '/admin/marketing/campaigns', label: language === 'ar' ? 'الحملات' : 'Campaigns', icon: Megaphone, roles: ['super_admin', 'admin'] },
        { path: '/admin/marketing/utm', label: language === 'ar' ? 'أداة UTM' : 'UTM Builder', icon: LinkIcon, roles: ['super_admin', 'admin'] },
        { path: '/admin/marketing/coupons', label: language === 'ar' ? 'الكوبونات' : 'Coupons', icon: Megaphone, roles: ['super_admin', 'admin'] },
      ],
    },
    {
      id: 'finance',
      label: t('admin.nav.finance') || (language === 'ar' ? 'المالية' : 'Finance'),
      collapsible: true,
      items: [
        { path: '/admin/accountant', label: language === 'ar' ? 'لوحة المالية' : 'Finance Dashboard', icon: BarChart3, roles: ['super_admin', 'admin'] },
        { path: '/admin/courier-wallets', label: language === 'ar' ? 'محافظ المندوبين' : 'Courier Wallets', icon: Wallet, roles: ['super_admin', 'admin'] },
      ],
    },
    {
      id: 'admin',
      label: t('admin.nav.admin') || (language === 'ar' ? 'الإدارة' : 'Admin'),
      collapsible: true,
      items: [
        { path: '/admin/users', label: t('admin.items.usersAndRoles') || (language === 'ar' ? 'المستخدمون والصلاحيات' : 'Users & Permissions'), icon: Users, roles: ['super_admin', 'admin'] },
        { path: '/admin/audit', label: t('admin.items.auditLog') || (language === 'ar' ? 'سجل التدقيق' : 'Audit Log'), icon: Activity, roles: ['super_admin', 'admin'] },
        { path: '/admin/settings', label: language === 'ar' ? 'إعدادات النظام' : 'System Settings', icon: Settings, roles: ['super_admin', 'admin'] },
        { path: '/admin/control', label: t('admin.items.controlCenter') || (language === 'ar' ? 'مركز التحكم' : 'Control Center'), icon: Shield, roles: ['super_admin', 'admin'] },
      ],
    },
  ]

  const sections: AdminNavSection[] = sectionsFilterActive
    ? allSections
        .map((sec) => ({
          ...sec,
          items: sec.items
            .filter((it) => itemVisible(it.path))
            .map((it) => ({
              ...it,
              moduleDisabled: isSuperAdmin ? isModuleDisabledForPath(it.path) : false,
            })),
        }))
        .filter((sec) => sec.items.length > 0)
    : allSections

  return (
    <AdminSidebarUI
      sections={sections}
      currentPath={location.pathname}
      userRole={user?.role || 'customer'}
      onNavigate={onNavigate}
      isRTL={language === 'ar'}
      theme={theme}
      title={t('admin.sidebar.title') || (language === 'ar' ? 'نظام تومو' : 'Tomo OS')}
      subtitle={t('admin.sidebar.subtitle') || (language === 'ar' ? 'لوحة التشغيل' : 'Operating OS')}
      collapsed={!!collapsed}
    />
  )
}
