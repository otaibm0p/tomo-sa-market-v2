import { useState, useEffect } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'

export default function Maintenance() {
  const { language } = useLanguage()
  const navigate = useNavigate()
  const [maintenance, setMaintenance] = useState<{
    enabled: boolean
    title_ar?: string
    title_en?: string
    message_ar?: string
    message_en?: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showLogin, setShowLogin] = useState(false)
  const [maintenancePassword, setMaintenancePassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')

  useEffect(() => {
    loadMaintenance()
  }, [])

  const loadMaintenance = async () => {
    try {
      const res = await api.get('/api/maintenance/check')
      setMaintenance(res.data)
    } catch (err) {
      console.error('Failed to load maintenance info:', err)
      // Default maintenance message
      setMaintenance({
        enabled: true,
        title_ar: 'الموقع قيد الصيانة',
        title_en: 'Site Under Maintenance',
        message_ar: 'نقوم بإجراء صيانة على الموقع. سنعود قريباً!',
        message_en: 'We are performing maintenance on the site. We will be back soon!'
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  const title = language === 'ar' 
    ? (maintenance?.title_ar || 'الموقع قيد الصيانة')
    : (maintenance?.title_en || 'Site Under Maintenance')
  
  const message = language === 'ar'
    ? (maintenance?.message_ar || 'نقوم بإجراء صيانة على الموقع. سنعود قريباً!')
    : (maintenance?.message_en || 'We are performing maintenance on the site. We will be back soon!')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-2xl mx-auto px-6 text-center">
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12">
          {/* Icon */}
          <div className="mb-8">
            <div className="w-24 h-24 mx-auto bg-yellow-100 rounded-full flex items-center justify-center">
              <svg className="w-16 h-16 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            {title}
          </h1>

          {/* Message */}
          <p className="text-lg md:text-xl text-gray-600 mb-8 leading-relaxed">
            {message}
          </p>

          {/* Decorative Elements */}
          <div className="flex justify-center gap-2 mt-8">
            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>

          {/* Maintenance Team Login */}
          {!showLogin ? (
            <div className="mt-8 pt-6 border-t border-gray-200 space-y-3">
              <button
                onClick={() => setShowLogin(true)}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
              >
                {language === 'ar' ? '🔧 فريق الصيانة - دخول' : '🔧 Maintenance Team - Login'}
              </button>
              <div>
                <a
                  href="/admin"
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors block"
                >
                  {language === 'ar' ? 'دخول الأدمن' : 'Admin Access'}
                </a>
              </div>
            </div>
          ) : (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  {language === 'ar' ? 'دخول فريق الصيانة' : 'Maintenance Team Login'}
                </h3>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault()
                    setLoginError('')
                    setLoginLoading(true)
                    try {
                      const res = await api.post('/api/maintenance/login', { password: maintenancePassword })
                      if (res.data.success) {
                        window.location.href = '/'
                      }
                    } catch (err: any) {
                      setLoginError(err.response?.data?.message || (language === 'ar' ? 'كلمة المرور غير صحيحة' : 'Invalid password'))
                    } finally {
                      setLoginLoading(false)
                    }
                  }}
                  className="space-y-3"
                >
                  <input
                    type="password"
                    value={maintenancePassword}
                    onChange={(e) => setMaintenancePassword(e.target.value)}
                    placeholder={language === 'ar' ? 'كلمة مرور الصيانة' : 'Maintenance Password'}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    dir="ltr"
                    autoFocus
                  />
                  {loginError && (
                    <p className="text-sm text-red-600">{loginError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={loginLoading || !maintenancePassword}
                      className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium"
                    >
                      {loginLoading 
                        ? (language === 'ar' ? 'جاري الدخول...' : 'Logging in...')
                        : (language === 'ar' ? 'دخول' : 'Login')
                      }
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowLogin(false)
                        setMaintenancePassword('')
                        setLoginError('')
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                    >
                      {language === 'ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

