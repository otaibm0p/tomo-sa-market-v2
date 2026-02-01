import { useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { authAPI } from '../../utils/api'
import { showToast } from '../../shared/toast'
import { useLanguage } from '../../context/LanguageContext'
import { AppShell } from '../../shared/ui/AppShell'

const DRIVER_NAV = [
  { href: '/driver', labelAr: 'الرئيسية', labelEn: 'Home' },
  { href: '/driver/dashboard', labelAr: 'المهام', labelEn: 'My Tasks' },
  { href: '/driver/map', labelAr: 'الخريطة', labelEn: 'Map' },
  { href: '/driver/settings', labelAr: 'الإعدادات', labelEn: 'Settings' },
]

const TITLES: Record<string, { ar: string; en: string }> = {
  '/driver': { ar: 'لوحة المندوب', en: 'Driver Dashboard' },
  '/driver/dashboard': { ar: 'المهام', en: 'My Tasks' },
  '/driver/tasks': { ar: 'المهام', en: 'My Tasks' },
  '/driver/map': { ar: 'الخريطة', en: 'Map' },
  '/driver/settings': { ar: 'الإعدادات', en: 'Settings' },
}

export default function DriverLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useLanguage()

  useEffect(() => {
    if (!authAPI.isAuthenticated()) {
      navigate('/driver/login')
      return
    }
    const user = authAPI.getCurrentUser()
    if (user?.role !== 'driver') {
      authAPI.logout()
      showToast(t('auth.notDriver') || t('auth.unauthorized') || 'Unauthorized', 'error')
      navigate('/driver/login')
    }
  }, [navigate, t])

  const path = location.pathname.replace(/\/$/, '') || '/driver'
  const titles = TITLES[path] ?? TITLES['/driver']
  const lang = document.documentElement.lang === 'ar' ? 'ar' : 'en'
  const title = lang === 'ar' ? titles.ar : titles.en

  return (
    <AppShell title={title} role="driver" navItems={DRIVER_NAV}>
      <Outlet />
    </AppShell>
  )
}
