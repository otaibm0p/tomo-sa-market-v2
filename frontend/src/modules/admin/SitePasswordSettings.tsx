import { useState, useEffect } from 'react'
import api from '../../utils/api'
import { useLanguage } from '../../context/LanguageContext'

export default function SitePasswordSettings() {
  const { language } = useLanguage()
  const [enabled, setEnabled] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/admin/site-password')
      setEnabled(response.data.enabled || false)
    } catch (err) {
      console.error('Error loading site password settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setMessage(null)

      if (enabled && !password && !confirmPassword) {
        setMessage({ 
          text: language === 'en' ? 'Password is required when enabling protection' : 'كلمة المرور مطلوبة عند تفعيل الحماية', 
          type: 'error' 
        })
        return
      }

      if (enabled && password && password !== confirmPassword) {
        setMessage({ 
          text: language === 'en' ? 'Passwords do not match' : 'كلمات المرور غير متطابقة', 
          type: 'error' 
        })
        return
      }

      if (enabled && password && password.length < 4) {
        setMessage({ 
          text: language === 'en' ? 'Password must be at least 4 characters' : 'كلمة المرور يجب أن تكون 4 أحرف على الأقل', 
          type: 'error' 
        })
        return
      }

      await api.put('/api/admin/site-password', {
        enabled,
        password: password || undefined
      })

      setMessage({ 
        text: enabled 
          ? (language === 'en' ? 'Site password protection enabled successfully!' : 'تم تفعيل حماية كلمة المرور بنجاح!')
          : (language === 'en' ? 'Site password protection disabled successfully!' : 'تم تعطيل حماية كلمة المرور بنجاح!'), 
        type: 'success' 
      })

      // Clear password fields
      setPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      console.error('Error saving site password settings:', err)
      setMessage({ 
        text: err.response?.data?.message || (language === 'en' ? 'Failed to save settings' : 'فشل حفظ الإعدادات'), 
        type: 'error' 
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          {language === 'en' ? 'Site Password Protection' : 'حماية الموقع بكلمة مرور'}
        </h1>
        <p className="text-gray-600 text-sm">
          {language === 'en' 
            ? 'Protect your site with a password. Visitors will need to enter the password to access the site.'
            : 'احمِ موقعك بكلمة مرور. سيحتاج الزوار إلى إدخال كلمة المرور للوصول إلى الموقع.'}
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}

      {/* Enable/Disable Toggle */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold mb-2">
              {language === 'en' ? 'Password Protection' : 'حماية كلمة المرور'}
            </h2>
            <p className="text-gray-600 text-sm">
              {language === 'en' 
                ? 'Enable or disable password protection for site visitors'
                : 'تفعيل أو تعطيل حماية كلمة المرور لزوار الموقع'}
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>
      </div>

      {/* Password Settings */}
      {enabled && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">
            {language === 'en' ? 'Set Password' : 'تعيين كلمة المرور'}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                {language === 'en' ? 'New Password' : 'كلمة المرور الجديدة'}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder={language === 'en' ? 'Enter new password' : 'أدخل كلمة المرور الجديدة'}
              />
              <p className="text-xs text-gray-500 mt-1">
                {language === 'en' 
                  ? 'Leave empty to keep current password'
                  : 'اتركه فارغاً للاحتفاظ بكلمة المرور الحالية'}
              </p>
            </div>
            {password && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  {language === 'en' ? 'Confirm Password' : 'تأكيد كلمة المرور'}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder={language === 'en' ? 'Confirm password' : 'أكد كلمة المرور'}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-bold text-blue-900 mb-2">
          {language === 'en' ? 'How it works' : 'كيف يعمل'}
        </h3>
        <ul className="text-sm text-blue-800 space-y-2 list-disc list-inside">
          <li>
            {language === 'en' 
              ? 'When enabled, all visitors must enter the password to access the site'
              : 'عند التفعيل، يجب على جميع الزوار إدخال كلمة المرور للوصول إلى الموقع'}
          </li>
          <li>
            {language === 'en' 
              ? 'Admin and API routes are not protected'
              : 'صفحات الإدارة وواجهات برمجة التطبيقات غير محمية'}
          </li>
          <li>
            {language === 'en' 
              ? 'Password is stored securely using bcrypt hashing'
              : 'يتم تخزين كلمة المرور بشكل آمن باستخدام تشفير bcrypt'}
          </li>
          <li>
            {language === 'en' 
              ? 'Session lasts for 24 hours after login'
              : 'تبقى الجلسة نشطة لمدة 24 ساعة بعد تسجيل الدخول'}
          </li>
        </ul>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          {saving 
            ? (language === 'en' ? 'Saving...' : 'جاري الحفظ...') 
            : (language === 'en' ? 'Save Settings' : 'حفظ الإعدادات')}
        </button>
      </div>
    </div>
  )
}

