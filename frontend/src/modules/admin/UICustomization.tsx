import { useState, useEffect } from 'react'
import api from '../../utils/api'

interface UICustomization {
  primary_color: string
  secondary_color: string
  banner_image: string | null
  announcement_bar_text: string
}

export default function UICustomization() {
  const [settings, setSettings] = useState<UICustomization>({
    primary_color: '#1a237e',
    secondary_color: '#2e7d32',
    banner_image: null,
    announcement_bar_text: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/settings')
      setSettings({
        primary_color: res.data.primary_color || '#1a237e',
        secondary_color: res.data.secondary_color || '#2e7d32',
        banner_image: res.data.banner_image || null,
        announcement_bar_text: res.data.announcement_bar_text || '',
      })
      setMessage(null)
    } catch (err: any) {
      setMessage({ text: 'حدث خطأ في جلب الإعدادات', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      // جلب الإعدادات الحالية أولاً
      const currentRes = await api.get('/api/settings')
      const currentSettings = currentRes.data

      // تحديث الإعدادات مع الحفاظ على القيم الأخرى
      await api.put('/api/settings', {
        ...currentSettings,
        primary_color: settings.primary_color,
        secondary_color: settings.secondary_color,
        banner_image: settings.banner_image,
        announcement_bar_text: settings.announcement_bar_text,
      })

      setMessage({ text: 'تم حفظ إعدادات التنسيق بنجاح! ✅', type: 'success' })
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (err: any) {
      setMessage({
        text: err.response?.data?.message || 'حدث خطأ في حفظ الإعدادات',
        type: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-lg" style={{ fontFamily: 'Cairo, sans-serif' }}>جاري التحميل...</div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'Cairo, sans-serif' }}>
      <h2 className="text-3xl font-bold mb-8" style={{ color: '#1a237e' }}>
        تنسيق شكل الصفحة والألوان
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card: Colors */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-xl font-bold mb-6" style={{ color: '#1a237e' }}>
            الألوان الرئيسية
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Primary Color */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                اللون الأساسي (Primary Color)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={settings.primary_color}
                  onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                  className="w-20 h-12 rounded-lg border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.primary_color}
                  onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                  placeholder="#1a237e"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                يستخدم للعناوين والعناصر الرئيسية
              </p>
            </div>

            {/* Secondary Color */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                اللون الثانوي (Secondary Color)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={settings.secondary_color}
                  onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                  className="w-20 h-12 rounded-lg border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.secondary_color}
                  onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                  placeholder="#2e7d32"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                يستخدم للأزرار والعناصر التفاعلية
              </p>
            </div>
          </div>

          {/* Color Preview */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm font-semibold mb-3 text-gray-700">معاينة الألوان:</p>
            <div className="flex gap-4">
              <div
                className="flex-1 p-4 rounded-lg text-white text-center font-semibold"
                style={{ backgroundColor: settings.primary_color }}
              >
                اللون الأساسي
              </div>
              <div
                className="flex-1 p-4 rounded-lg text-white text-center font-semibold"
                style={{ backgroundColor: settings.secondary_color }}
              >
                اللون الثانوي
              </div>
            </div>
          </div>
        </div>

        {/* Card: Banner & Announcement */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-xl font-bold mb-6" style={{ color: '#1a237e' }}>
            البانر والإعلانات
          </h3>

          <div className="space-y-6">
            {/* Banner Image */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                صورة البانر (رابط الصورة)
              </label>
              <input
                type="text"
                value={settings.banner_image || ''}
                onChange={(e) => setSettings({ ...settings, banner_image: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                placeholder="https://example.com/banner.jpg"
              />
              {settings.banner_image && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <img
                    src={settings.banner_image}
                    alt="Banner Preview"
                    className="w-full h-48 object-cover rounded-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              )}
            </div>

            {/* Announcement Text */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                نص شريط الإعلانات
              </label>
              <textarea
                value={settings.announcement_bar_text}
                onChange={(e) => setSettings({ ...settings, announcement_bar_text: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                rows={3}
                placeholder="مرحباً بك في TOMO Market! 🛒"
              />
              <p className="text-sm text-gray-500 mt-2">سيظهر هذا النص في أعلى الصفحة</p>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-red-100 text-red-700 border border-red-300'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#2e7d32' }}
            onMouseEnter={(e) => {
              if (!saving) e.currentTarget.style.backgroundColor = '#1b5e20'
            }}
            onMouseLeave={(e) => {
              if (!saving) e.currentTarget.style.backgroundColor = '#2e7d32'
            }}
          >
            {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </button>
        </div>
      </form>
    </div>
  )
}

