import { useState, useEffect } from 'react'
import api from '../../utils/api'

interface ShopSettings {
  site_name: string
  header_logo: string | null
  footer_logo: string | null
  phone: string
  whatsapp: string
  email: string
  location: string
  social_x: string
  social_instagram: string
  social_tiktok: string
  social_snapchat: string
  free_shipping_threshold: number
  announcement_bar_text: string
  primary_color: string
  secondary_color: string
}

export default function ShopSettings() {
  const [settings, setSettings] = useState<ShopSettings>({
    site_name: 'TOMO Market',
    header_logo: null,
    footer_logo: null,
    phone: '',
    whatsapp: '',
    email: '',
    location: '',
    social_x: '',
    social_instagram: '',
    social_tiktok: '',
    social_snapchat: '',
    free_shipping_threshold: 150,
    announcement_bar_text: '',
    primary_color: '#1a237e',
    secondary_color: '#2e7d32',
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
        site_name: res.data.site_name || 'TOMO Market',
        header_logo: res.data.header_logo || null,
        footer_logo: res.data.footer_logo || null,
        phone: res.data.phone || '',
        whatsapp: res.data.whatsapp || '',
        email: res.data.email || '',
        location: res.data.location || '',
        social_x: res.data.social_x || '',
        social_instagram: res.data.social_instagram || '',
        social_tiktok: res.data.social_tiktok || '',
        social_snapchat: res.data.social_snapchat || '',
        free_shipping_threshold: res.data.free_shipping_threshold || 150,
        announcement_bar_text: res.data.announcement_bar_text || '',
        primary_color: res.data.primary_color || '#1a237e',
        secondary_color: res.data.secondary_color || '#2e7d32',
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
      await api.put('/api/settings', settings)
      setMessage({ text: 'تم حفظ الإعدادات بنجاح! ✅', type: 'success' })
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
    <div style={{ fontFamily: 'Cairo, sans-serif' }} className="w-full max-w-full">
      <div className="mb-6 lg:mb-8">
        <h2 className="text-3xl lg:text-4xl font-bold mb-2" style={{ color: '#1a237e' }}>
          إعدادات المتجر
        </h2>
        <p className="text-gray-600 text-sm lg:text-base">تخصيص هوية المتجر وإعداداته</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card 1: الهوية البصرية */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-xl font-bold mb-6" style={{ color: '#1a237e' }}>
            الهوية البصرية
          </h3>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                اسم الموقع
              </label>
              <input
                type="text"
                value={settings.site_name}
                onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                placeholder="TOMO Market"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  شعار الهيدر (رابط الصورة)
                </label>
                <input
                  type="text"
                  value={settings.header_logo || ''}
                  onChange={(e) => setSettings({ ...settings, header_logo: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                  placeholder="https://example.com/logo.png"
                />
                {settings.header_logo && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <img
                      src={settings.header_logo}
                      alt="Header Logo Preview"
                      className="h-16 object-contain mx-auto"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  شعار الفوتر (رابط الصورة)
                </label>
                <input
                  type="text"
                  value={settings.footer_logo || ''}
                  onChange={(e) => setSettings({ ...settings, footer_logo: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                  placeholder="https://example.com/logo.png"
                />
                {settings.footer_logo && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <img
                      src={settings.footer_logo}
                      alt="Footer Logo Preview"
                      className="h-16 object-contain mx-auto"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: معلومات الاتصال */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-xl font-bold mb-6" style={{ color: '#1a237e' }}>
            معلومات الاتصال
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                رقم الهاتف
              </label>
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                placeholder="+966501234567"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                رقم الواتساب
              </label>
              <input
                type="text"
                value={settings.whatsapp}
                onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                placeholder="+966501234567"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                placeholder="info@tomomarket.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                الموقع
              </label>
              <input
                type="text"
                value={settings.location}
                onChange={(e) => setSettings({ ...settings, location: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                placeholder="المملكة العربية السعودية"
              />
            </div>
          </div>
        </div>

        {/* Card 3: وسائل التواصل الاجتماعي */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-xl font-bold mb-6" style={{ color: '#1a237e' }}>
            وسائل التواصل الاجتماعي
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                X (تويتر)
              </label>
              <input
                type="text"
                value={settings.social_x}
                onChange={(e) => setSettings({ ...settings, social_x: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                placeholder="https://x.com/username"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                إنستغرام
              </label>
              <input
                type="text"
                value={settings.social_instagram}
                onChange={(e) => setSettings({ ...settings, social_instagram: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                placeholder="https://instagram.com/username"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                تيك توك
              </label>
              <input
                type="text"
                value={settings.social_tiktok}
                onChange={(e) => setSettings({ ...settings, social_tiktok: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                placeholder="https://tiktok.com/@username"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                سناب شات
              </label>
              <input
                type="text"
                value={settings.social_snapchat}
                onChange={(e) => setSettings({ ...settings, social_snapchat: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                placeholder="https://snapchat.com/add/username"
              />
            </div>
          </div>
        </div>

        {/* Card 4: الألوان */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-xl font-bold mb-6" style={{ color: '#1a237e' }}>
            الألوان الرئيسية
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                اللون الأساسي
              </label>
              <input
                type="color"
                value={settings.primary_color}
                onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                className="w-full h-12 border border-gray-300 rounded-lg cursor-pointer"
              />
              <p className="text-sm text-gray-500 mt-2">
                يستخدم للعناوين الرئيسية والأزرار الهامة
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                اللون الثانوي
              </label>
              <input
                type="color"
                value={settings.secondary_color}
                onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                className="w-full h-12 border border-gray-300 rounded-lg cursor-pointer"
              />
              <p className="text-sm text-gray-500 mt-2">
                يستخدم للعناصر الثانوية والخلفيات
              </p>
            </div>
          </div>
        </div>

        {/* Card 5: إعدادات إضافية */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-xl font-bold mb-6" style={{ color: '#1a237e' }}>
            إعدادات إضافية
          </h3>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                حد الشحن المجاني (ريال)
              </label>
              <input
                type="number"
                step="0.01"
                value={settings.free_shipping_threshold}
                onChange={(e) =>
                  setSettings({ ...settings, free_shipping_threshold: parseFloat(e.target.value) || 150 })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
              />
              <p className="text-sm text-gray-500 mt-2">
                الطلبات التي تزيد عن هذا المبلغ سيتم شحنها مجاناً
              </p>
            </div>

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
