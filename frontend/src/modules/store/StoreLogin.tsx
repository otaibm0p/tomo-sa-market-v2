import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../../context/LanguageContext'
import { authAPI } from '../../utils/api'
import { Store, LogIn, Eye, EyeOff } from 'lucide-react'

export default function StoreLogin() {
  const { language } = useLanguage()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authAPI.isAuthenticated()) {
      const user = authAPI.getCurrentUser()
      if (user?.role === 'store') {
        navigate('/store')
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
        if (user?.role === 'store') {
          navigate('/store/dashboard')
        } else {
          setError(language === 'en' ? 'Invalid store credentials' : 'بيانات الدخول غير صحيحة للمتجر')
          authAPI.logout()
        }
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          (language === 'en' ? 'Login failed. Please check your credentials.' : 'فشل تسجيل الدخول. يرجى التحقق من بياناتك.')
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4" style={{ fontFamily: 'Cairo, sans-serif' }}>
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full mb-4 shadow-lg">
            <Store className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {language === 'en' ? 'Store Portal' : 'بوابة المتجر'}
          </h1>
          <p className="text-gray-600">
            {language === 'en' ? 'Sign in to manage your store' : 'سجل الدخول لإدارة متجرك'}
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
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
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
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
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
          <div className="mt-6 text-center">
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

