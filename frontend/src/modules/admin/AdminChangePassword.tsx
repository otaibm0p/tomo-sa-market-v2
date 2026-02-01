import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../../context/LanguageContext'
import { authAPI } from '../../utils/api'
import { Eye, EyeOff, Lock } from 'lucide-react'

const MIN_LENGTH = 8

function passwordStrength(pwd: string): 'weak' | 'medium' | 'strong' {
  if (!pwd || pwd.length < MIN_LENGTH) return 'weak'
  const hasLetter = /[a-zA-Z]/.test(pwd)
  const hasNumber = /\d/.test(pwd)
  const hasSpecial = /[^a-zA-Z0-9]/.test(pwd)
  const lengthOk = pwd.length >= 12
  if (lengthOk && hasLetter && hasNumber && hasSpecial) return 'strong'
  if ((hasLetter && hasNumber) || (hasLetter && hasSpecial) || pwd.length >= 10) return 'medium'
  return 'weak'
}

export default function AdminChangePassword() {
  const { t, language } = useLanguage()
  const navigate = useNavigate()
  const isRtl = language === 'ar'
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const strength = passwordStrength(newPassword)
  const match = !confirmPassword || newPassword === confirmPassword
  const validLength = newPassword.length >= MIN_LENGTH
  const canSubmit = validLength && match && !loading

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!canSubmit) return
    setLoading(true)
    try {
      await authAPI.changePassword(newPassword, confirmPassword)
      authAPI.updateStoredUser({ force_password_change: false })
      navigate('/admin', { replace: true })
    } catch (err: any) {
      const msg = err.response?.data?.message || err.userMessage || (t('auth.changePassword.error') ?? 'Failed to change password.')
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {t('auth.changePassword.title') || 'Change password'}
            </h1>
            <p className="text-sm text-gray-500">
              {t('auth.changePassword.subtitle') || 'You must set a new password to continue.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.changePassword.newPassword') || 'New password'}
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="••••••••"
                autoComplete="new-password"
                minLength={MIN_LENGTH}
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                aria-label={showNew ? (t('auth.login.hidePassword') || 'Hide') : (t('auth.login.showPassword') || 'Show')}
              >
                {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {t(`auth.passwordStrength.${strength}`)} {validLength ? '' : ` · ${t('auth.changePassword.minLength') || `At least ${MIN_LENGTH} characters`}`}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.changePassword.confirmPassword') || 'Confirm password'}
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-4 py-2.5 pr-10 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${match ? 'border-gray-300' : 'border-amber-400'}`}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                aria-label={showConfirm ? (t('auth.login.hidePassword') || 'Hide') : (t('auth.login.showPassword') || 'Show')}
              >
                {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {confirmPassword && !match && (
              <p className="mt-1 text-xs text-amber-600">{t('auth.signup.passwordMismatch') || 'Passwords do not match'}</p>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (t('auth.changePassword.submitting') || 'Saving…') : (t('auth.changePassword.submit') || 'Change password')}
          </button>
        </form>
      </div>
    </div>
  )
}
