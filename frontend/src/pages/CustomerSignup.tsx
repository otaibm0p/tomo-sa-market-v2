import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { customerAuthAPI, getApiBase } from '../utils/api'
import { usePublicSettings } from '../hooks/usePublicSettings'

const MIN_PASSWORD_LENGTH = 6

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

function passwordStrength(pwd: string): 'weak' | 'medium' | 'strong' {
  if (!pwd || pwd.length < MIN_PASSWORD_LENGTH) return 'weak'
  const hasLetter = /[a-zA-Z]/.test(pwd)
  const hasNumber = /\d/.test(pwd)
  const hasSpecial = /[^a-zA-Z0-9]/.test(pwd)
  const lengthOk = pwd.length >= 10
  if (lengthOk && hasLetter && hasNumber && hasSpecial) return 'strong'
  if ((hasLetter && hasNumber) || (hasLetter && hasSpecial) || pwd.length >= 8) return 'medium'
  return 'weak'
}

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((s || '').trim())
}

export default function CustomerSignup() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const { settings } = usePublicSettings()
  const signupEnabled = settings?.features?.customer_signup_enabled !== false

  const [name, setName] = useState('')
  const [usePhone, setUsePhone] = useState(true)
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [marketingOptIn, setMarketingOptIn] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const strength = passwordStrength(password)
  const phoneTrim = phone.trim()
  const emailTrim = email.trim()
  const hasIdentifier = usePhone ? !!phoneTrim : !!emailTrim && isEmail(emailTrim)
  const nameValid = name.trim().length >= 2
  const passwordValid = password.length >= MIN_PASSWORD_LENGTH
  const confirmMatch = confirmPassword === password && (confirmPassword.length === 0 || passwordValid)
  const valid = nameValid && hasIdentifier && passwordValid && confirmMatch

  const googleOAuthEnabled = settings?.features?.customer_oauth_google_enabled === true
  const appleOAuthEnabled = settings?.features?.customer_oauth_apple_enabled === true
  const oauthRedirect = typeof window !== 'undefined' ? (new URLSearchParams(location.search).get('redirect') || localStorage.getItem('intended_url') || '/') : '/'
  const apiBase = getApiBase() || (typeof window !== 'undefined' ? window.location.origin : '')

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
    if (!valid || !signupEnabled) return
    setLoading(true)
    try {
      const payload = usePhone
        ? { name: name.trim(), phone: phoneTrim, password }
        : { name: name.trim(), email: emailTrim, password }
      if (marketingOptIn) {
        (payload as any).marketing_opt_in = true
        ;(payload as any).channel_opt_in = { whatsapp: true }
      }
      await customerAuthAPI.signup(payload)
      const fromQuery = new URLSearchParams(location.search).get('redirect')
      const fromStorage = localStorage.getItem('intended_url')
      const redirect = fromQuery || fromStorage || '/'
      if (fromStorage) localStorage.removeItem('intended_url')
      navigate(redirect, { replace: true })
    } catch (err: any) {
      const code = err.response?.data?.code
      const message = err.response?.data?.message
      if (code === 'USER_EXISTS') setError(t('auth.errors.userExists') || message)
      else if (code === 'VALIDATION_ERROR') setError(message || t('auth.errors.generic'))
      else setError(message || t('auth.errors.generic'))
    } finally {
      setLoading(false)
    }
  }

  if (!signupEnabled) {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
          <h1 className="text-xl font-bold text-gray-800 mb-2">{t('auth.signup.disabled.title')}</h1>
          <p className="text-gray-600 mb-6">{t('auth.signup.disabled.message')}</p>
          <Link to="/" className="inline-block w-full py-3 px-4 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark">
            {t('auth.signup.backToHome')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h1 className="text-xl font-bold text-gray-800 mb-1">{t('auth.signup.title')}</h1>
        <p className="text-gray-500 text-sm mb-6">{t('auth.signup.subtitle')}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.signup.fullName')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder={t('auth.signup.fullName')}
              minLength={2}
            />
            {name.trim() && !nameValid && <p className="text-red-500 text-xs mt-1">{t('auth.errors.required')}</p>}
          </div>
          <div>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setUsePhone(true)}
                className={`flex-1 py-2 text-sm rounded-lg ${usePhone ? 'bg-primary/10 text-primary font-medium' : 'bg-gray-100 text-gray-600'}`}
              >
                {t('auth.signup.usePhone')}
              </button>
              <button
                type="button"
                onClick={() => setUsePhone(false)}
                className={`flex-1 py-2 text-sm rounded-lg ${!usePhone ? 'bg-primary/10 text-primary font-medium' : 'bg-gray-100 text-gray-600'}`}
              >
                {t('auth.signup.useEmail')}
              </button>
            </div>
            {usePhone ? (
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="05xxxxxxxx"
              />
            ) : (
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="example@email.com"
              />
            )}
            {((usePhone && phoneTrim && !phoneTrim.match(/^[0-9+\s-]{8,}$/)) || (!usePhone && emailTrim && !isEmail(emailTrim))) && (
              <p className="text-red-500 text-xs mt-1">{usePhone ? t('auth.errors.invalidPhone') : t('auth.errors.invalidEmail')}</p>
            )}
          </div>
          <div>
            <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 mb-1">{t('auth.signup.password')}</label>
            <div className="relative">
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-4 py-2.5 pr-12 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${password.length > 0 && password.length < MIN_PASSWORD_LENGTH ? 'border-red-400' : 'border-gray-300'}`}
                placeholder="••••••••"
                minLength={MIN_PASSWORD_LENGTH}
                aria-invalid={password.length > 0 && password.length < MIN_PASSWORD_LENGTH}
                aria-describedby={password.length > 0 ? (password.length < MIN_PASSWORD_LENGTH ? 'signup-password-helper signup-password-error' : 'signup-password-helper') : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label={showPassword ? (t('auth.login.password') || 'Hide password') : (t('auth.login.password') || 'Show password')}
              >
                <EyeIcon show={!showPassword} />
              </button>
            </div>
            {password.length > 0 && (
              <div id="signup-password-helper" className="flex items-center gap-2 mt-1" role="status">
                <span className="text-xs text-gray-500">{t(`auth.passwordStrength.${strength}`)}</span>
                <div className="flex gap-0.5 flex-1 max-w-[120px]">
                  <span className={`h-1 flex-1 rounded ${strength !== 'weak' ? 'bg-red-400' : 'bg-gray-200'}`} />
                  <span className={`h-1 flex-1 rounded ${strength === 'medium' || strength === 'strong' ? 'bg-amber-400' : 'bg-gray-200'}`} />
                  <span className={`h-1 flex-1 rounded ${strength === 'strong' ? 'bg-primary' : 'bg-gray-200'}`} />
                </div>
              </div>
            )}
            {password.length > 0 && password.length < MIN_PASSWORD_LENGTH && (
              <p id="signup-password-error" className="text-red-500 text-xs mt-1" role="alert">{t('auth.errors.passwordMin')}</p>
            )}
          </div>
          <div>
            <label htmlFor="signup-confirm-password" className="block text-sm font-medium text-gray-700 mb-1">{t('auth.signup.confirmPassword')}</label>
            <div className="relative">
              <input
                id="signup-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-4 py-2.5 pr-12 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${confirmPassword.length > 0 && confirmPassword !== password ? 'border-red-400' : 'border-gray-300'}`}
                placeholder="••••••••"
                aria-invalid={confirmPassword.length > 0 && confirmPassword !== password}
                aria-describedby="signup-confirm-error"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label={showConfirmPassword ? (t('auth.signup.confirmPassword') || 'Hide') : (t('auth.signup.confirmPassword') || 'Show')}
              >
                <EyeIcon show={!showConfirmPassword} />
              </button>
            </div>
            {confirmPassword.length > 0 && confirmPassword !== password && (
              <p id="signup-confirm-error" className="text-red-500 text-xs mt-1" role="alert">{t('auth.signup.passwordMismatch')}</p>
            )}
          </div>
          <div className="flex items-start gap-2">
            <input
              id="signup-whatsapp-optin"
              type="checkbox"
              checked={marketingOptIn}
              onChange={(e) => setMarketingOptIn(e.target.checked)}
              className="mt-1 rounded border-gray-300 text-primary focus:ring-primary"
              aria-describedby="signup-whatsapp-optin-desc"
            />
            <label htmlFor="signup-whatsapp-optin" id="signup-whatsapp-optin-desc" className="text-sm text-gray-600">
              {t('auth.signup.whatsappOptIn') || 'أوافق على استقبال العروض عبر واتساب'}
            </label>
          </div>
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm" role="alert">{error}</div>}
          <button
            type="submit"
            disabled={!valid || loading}
            className="w-full py-3 px-4 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (t('loading') || 'جاري المعالجة...') : t('auth.signup.submit')}
          </button>

          <div className="space-y-2 pt-2">
            <a
              href={googleOAuthEnabled ? `${apiBase}/api/auth/oauth/google/start?redirect=${encodeURIComponent(oauthRedirect)}` : undefined}
              onClick={(e) => { if (!googleOAuthEnabled) e.preventDefault() }}
              className={`flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg border text-sm font-medium ${googleOAuthEnabled ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50' : 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'}`}
              aria-disabled={!googleOAuthEnabled}
            >
              <span aria-hidden="true">Google</span>
              {googleOAuthEnabled ? t('auth.signup.continueWithGoogle') : t('auth.signup.continueWithGoogle')}
              {!googleOAuthEnabled && <span className="text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">{t('auth.signup.comingSoon')}</span>}
            </a>
            <a
              href={appleOAuthEnabled ? `${apiBase}/api/auth/oauth/apple/start?redirect=${encodeURIComponent(oauthRedirect)}` : undefined}
              onClick={(e) => { if (!appleOAuthEnabled) e.preventDefault() }}
              className={`flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg border text-sm font-medium ${appleOAuthEnabled ? 'border-gray-800 bg-black text-white hover:bg-gray-800' : 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'}`}
              aria-disabled={!appleOAuthEnabled}
            >
              <span aria-hidden="true">Apple</span>
              {appleOAuthEnabled ? t('auth.signup.continueWithApple') : t('auth.signup.continueWithApple')}
              {!appleOAuthEnabled && <span className="text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">{t('auth.signup.comingSoon')}</span>}
            </a>
          </div>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">{t('auth.trustStrip')}</p>
        <div className="mt-4 text-center space-y-2">
          <div>
            <Link to="/login" className="text-primary hover:underline text-sm">
              {t('auth.signup.haveAccountSignIn')}
            </Link>
          </div>
          <Link to="/" className="text-gray-600 hover:underline text-sm">
            {t('auth.signup.backToShopping')}
          </Link>
        </div>
      </div>
    </div>
  )
}
