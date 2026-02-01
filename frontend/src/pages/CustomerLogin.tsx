import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { customerAuthAPI } from '../utils/api'

function EyeIcon({ show }: { show: boolean }) {
  return show ? (
    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  )
}

export default function CustomerLogin() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const [phoneOrEmail, setPhoneOrEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (localStorage.getItem('tomo_token')) {
      const fromQuery = new URLSearchParams(location.search).get('redirect')
      const fromStorage = localStorage.getItem('intended_url')
      const redirect = fromQuery || fromStorage || '/'
      if (fromStorage) localStorage.removeItem('intended_url')
      navigate(redirect, { replace: true })
    }
  }, [location.search, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!phoneOrEmail.trim() || !password) return
    setLoading(true)
    try {
      await customerAuthAPI.login(phoneOrEmail.trim(), password)
      const fromQuery = new URLSearchParams(location.search).get('redirect')
      const fromStorage = localStorage.getItem('intended_url')
      const redirect = fromQuery || fromStorage || '/'
      if (fromStorage) localStorage.removeItem('intended_url')
      navigate(redirect, { replace: true })
    } catch (err: any) {
      const code = err.response?.data?.code
      const message = err.response?.data?.message
      if (code === 'INVALID_CREDENTIALS') setError(t('auth.errors.invalidCredentials') || message)
      else setError(message || t('auth.errors.generic'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h1 className="text-xl font-bold text-gray-800 mb-1">{t('auth.login.title')}</h1>
        <p className="text-gray-500 text-sm mb-6">{t('auth.login.subtitle')}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.login.phoneOrEmail')}</label>
            <input
              type="text"
              inputMode="email"
              autoComplete="username"
              value={phoneOrEmail}
              onChange={(e) => setPhoneOrEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="05xxxxxxxx أو example@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.login.password')}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label={showPassword ? (t('auth.login.hidePassword') || 'إخفاء') : (t('auth.login.showPassword') || 'إظهار')}
              >
                <EyeIcon show={!showPassword} />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="rounded border-gray-300 text-primary focus:ring-primary" />
              <span className="text-sm text-gray-600">{t('auth.login.rememberMe')}</span>
            </label>
            <span className="text-sm text-gray-400" title={t('auth.login.forgotSoon')}>
              {t('auth.login.forgotPassword')} ({t('auth.login.forgotSoon')})
            </span>
          </div>
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
          <button
            type="submit"
            disabled={!phoneOrEmail.trim() || !password || loading}
            className="w-full py-3 px-4 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (t('loading') || 'جاري المعالجة...') : t('auth.login.submit')}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">{t('auth.trustStrip')}</p>
        <div className="mt-4 text-center">
          <Link to="/signup" className="text-primary hover:underline text-sm">
            {t('auth.signup.title')}
          </Link>
          <span className="mx-2 text-gray-400">|</span>
          <Link to="/" className="text-gray-600 hover:underline text-sm">
            {t('auth.login.backToShopping')}
          </Link>
        </div>
      </div>
    </div>
  )
}
