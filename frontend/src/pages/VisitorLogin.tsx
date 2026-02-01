import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { useLanguage } from '../context/LanguageContext'

export default function VisitorLogin() {
  const { language } = useLanguage()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const response = await api.get('/api/visitor/check')
      if (response.data.authenticated) {
        navigate('/')
      } else if (!response.data.enabled) {
        // Password protection is disabled, allow access
        navigate('/')
      }
    } catch (err) {
      console.error('Error checking auth status:', err)
    } finally {
      setChecking(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.post('/api/visitor/login', { password })
      
      if (response.data.success) {
        // Redirect to home page
        window.location.href = '/'
      }
    } catch (err: any) {
      setError(err.response?.data?.message || (language === 'en' ? 'Invalid password' : 'كلمة المرور غير صحيحة'))
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-gray-100 px-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-emerald-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {language === 'en' ? 'Site Access' : 'الوصول إلى الموقع'}
          </h1>
          <p className="text-gray-600">
            {language === 'en' 
              ? 'Please enter the password to access the site'
              : 'يرجى إدخال كلمة المرور للوصول إلى الموقع'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              {language === 'en' ? 'Password' : 'كلمة المرور'}
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              placeholder={language === 'en' ? 'Enter password' : 'أدخل كلمة المرور'}
              required
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading 
              ? (language === 'en' ? 'Checking...' : 'جاري التحقق...')
              : (language === 'en' ? 'Access Site' : 'الوصول إلى الموقع')}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            {language === 'en' 
              ? 'This site is password protected'
              : 'هذا الموقع محمي بكلمة مرور'}
          </p>
        </div>
      </div>
    </div>
  )
}

