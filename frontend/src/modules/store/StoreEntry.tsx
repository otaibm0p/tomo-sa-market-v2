import { authAPI } from '../../utils/api'
import StoreLogin from './StoreLogin'
import StoreDashboard from './StoreDashboard'
import { showToast } from '../../shared/toast'
import { useLanguage } from '../../context/LanguageContext'

export default function StoreEntry() {
  const { t } = useLanguage()
  if (!authAPI.isAuthenticated()) return <StoreLogin />

  const user = authAPI.getCurrentUser()
  if (user?.role !== 'store') {
    authAPI.logout()
    showToast(t('auth.notStore') || t('auth.unauthorized') || 'Unauthorized', 'error')
    return <StoreLogin />
  }

  return <StoreDashboard />
}

