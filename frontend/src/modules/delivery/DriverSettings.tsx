import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../../context/LanguageContext'
import { authAPI } from '../../utils/api'
import { Settings as SettingsIcon, LogOut } from 'lucide-react'

export default function DriverSettings() {
  const navigate = useNavigate()
  const { language } = useLanguage()
  const isAr = language === 'ar'

  const handleLogout = () => {
    authAPI.logout()
    navigate('/driver/login')
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <h2 className="text-lg font-bold text-gray-900">
        {isAr ? 'الإعدادات' : 'Settings'}
      </h2>
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-800 hover:bg-gray-50 border-b border-gray-100 last:border-0"
        >
          <LogOut className="w-5 h-5 text-gray-500" />
          <span className="font-medium">{isAr ? 'تسجيل الخروج' : 'Log out'}</span>
        </button>
      </div>
    </div>
  )
}
