import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../../context/LanguageContext'
import api, { authAPI } from '../../utils/api'
import { Truck, LogIn, Eye, EyeOff } from 'lucide-react'

export default function DriverLogin() {
  const { language } = useLanguage()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creatingTest, setCreatingTest] = useState(false)
  const [testAccountCreated, setTestAccountCreated] = useState(false)

  useEffect(() => {
    if (authAPI.isAuthenticated()) {
      const user = authAPI.getCurrentUser()
      if (user?.role === 'driver') {
        navigate('/driver')
      }
    }
  }, [navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await authAPI.login(formData.email, formData.password)
      
      if (response) {
        const user = authAPI.getCurrentUser()
        if (user?.role === 'driver') {
          navigate('/driver')
        } else {
          setError(language === 'en' ? 'Invalid rider credentials' : 'بيانات الدخول غير صحيحة لـ Rider')
          authAPI.logout()
        }
      }
    } catch (err: any) {
      setError(
        err.userMessage ||
          err.response?.data?.message ||
          (language === 'en' ? 'Login failed. Please check your credentials.' : 'فشل تسجيل الدخول. يرجى التحقق من بياناتك.')
      )
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTestAccount = async () => {
    setError(null)
    setCreatingTest(true)
    try {
      await api.post('/api/auth/create-test-accounts')
      setFormData({ email: 'driver@tomo.com', password: 'driver123' })
      setTestAccountCreated(true)
    } catch (err: any) {
      setError(
        err.userMessage ||
          err.response?.data?.message ||
          (language === 'en' ? 'Could not create test account. Is the backend running?' : 'تعذر إنشاء الحساب التجريبي. هل الباك إند يعمل؟')
      )
    } finally {
      setCreatingTest(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50 flex items-center justify-center p-4" style={{ fontFamily: 'Cairo, sans-serif' }}>
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-600 to-green-600 rounded-full mb-4 shadow-lg">
            <Truck className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {language === 'en' ? 'Rider Portal' : 'بوابة Riders'}
          </h1>
          <p className="text-gray-600">
            {language === 'en' ? 'Sign in to access your delivery tasks' : 'سجل الدخول للوصول إلى مهام التوصيل'}
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}
          {testAccountCreated && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
              {language === 'en' ? 'Test rider account created. Email and password filled — click Sign In.' : 'تم إنشاء حساب Rider تجريبي. تم تعبئة البريد وكلمة المرور — اضغط تسجيل الدخول.'}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                {language === 'en' ? 'Email' : 'البريد الإلكتروني'}
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                required
                placeholder={language === 'en' ? 'your@email.com' : 'بريدك@الإلكتروني.com'}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                {language === 'en' ? 'Password' : 'كلمة المرور'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  required
                  placeholder={language === 'en' ? 'Enter your password' : 'أدخل كلمة المرور'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-green-600 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  {language === 'en' ? 'Signing in...' : 'جاري تسجيل الدخول...'}
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  {language === 'en' ? 'Sign In' : 'تسجيل الدخول'}
                </>
              )}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 text-center space-y-2">
            <button
              onClick={() => navigate('/driver/register')}
              className="text-emerald-600 hover:text-emerald-700 font-medium text-sm"
            >
              {language === 'en' ? 'New rider? Register here' : 'Rider جديد؟ سجل هنا'}
            </button>
            <br />
            <button
              type="button"
              onClick={handleCreateTestAccount}
              disabled={creatingTest}
              className="text-amber-600 hover:text-amber-700 font-medium text-sm disabled:opacity-50"
            >
              {creatingTest
                ? (language === 'en' ? 'Creating…' : 'جاري الإنشاء…')
                : (language === 'en' ? 'Create test rider (driver@tomo.com)' : 'إنشاء Rider تجريبي (driver@tomo.com)')}
            </button>
            <br />
            <button
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-700 text-sm"
            >
              {language === 'en' ? '← Back to Home' : '← العودة للصفحة الرئيسية'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

