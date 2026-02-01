import { useState, useEffect } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import { useTheme } from '../../context/ThemeContext'
import api from '../../utils/api'
import { Save, Upload, Building2, Phone, Mail, MapPin, Globe } from 'lucide-react'

interface StoreSettings {
  site_name: string
  phone: string
  whatsapp: string
  email: string
  address: string
  social_x: string
  social_instagram: string
  social_tiktok: string
  social_snapchat: string
  currency: string
  delivery_fee: number
  free_shipping_threshold: number
  header_logo: string
}

export default function StoreSettings() {
  const { language } = useLanguage()
  const { theme } = useTheme()
  const [settings, setSettings] = useState<StoreSettings>({
    site_name: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    social_x: '',
    social_instagram: '',
    social_tiktok: '',
    social_snapchat: '',
    currency: 'SAR',
    delivery_fee: 0,
    free_shipping_threshold: 0,
    header_logo: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const res = await api.get('/api/admin/settings')
      if (res.data.settings) {
        setSettings(res.data.settings)
        if (res.data.settings.header_logo) {
          setLogoPreview(res.data.settings.header_logo)
        }
      }
    } catch (err) {
      console.error('Error loading settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const formData = new FormData()
      if (logoFile) {
        formData.append('logo', logoFile)
      }
      
      Object.keys(settings).forEach(key => {
        if (key !== 'header_logo') {
          formData.append(key, (settings as any)[key])
        }
      })

      await api.put('/api/admin/settings', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      alert(language === 'ar' ? 'تم حفظ الإعدادات بنجاح' : 'Settings saved successfully')
    } catch (err: any) {
      alert(err.response?.data?.message || (language === 'ar' ? 'حدث خطأ' : 'An error occurred'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          {language === 'ar' ? 'إعدادات المتجر' : 'Store Settings'}
        </h1>
        <p className={`mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          {language === 'ar' 
            ? 'إدارة معلومات المتجر الأساسية والإعدادات' 
            : 'Manage basic store information and settings'
          }
        </p>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className={`
          ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}
          rounded-xl shadow-lg p-6
          border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}
        `}>
          <h2 className={`text-xl font-bold mb-6 flex items-center gap-2 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            <Building2 size={24} />
            {language === 'ar' ? 'معلومات المتجر' : 'Store Information'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Store Name */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {language === 'ar' ? 'اسم المتجر' : 'Store Name'}
              </label>
              <input
                type="text"
                value={settings.site_name}
                onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500`}
                required
              />
            </div>

            {/* Logo Upload */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {language === 'ar' ? 'شعار المتجر' : 'Store Logo'}
              </label>
              <div className="flex items-center gap-4">
                {logoPreview && (
                  <img 
                    src={logoPreview} 
                    alt="Logo" 
                    className="w-20 h-20 object-contain rounded-lg border border-gray-300"
                  />
                )}
                <label className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer
                  transition-all duration-200
                  ${theme === 'dark' 
                    ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}>
                  <Upload size={18} />
                  <span className="text-sm">{language === 'ar' ? 'رفع صورة' : 'Upload'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className={`
          ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}
          rounded-xl shadow-lg p-6
          border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}
        `}>
          <h2 className={`text-xl font-bold mb-6 flex items-center gap-2 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            <Phone size={24} />
            {language === 'ar' ? 'معلومات الاتصال' : 'Contact Information'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {language === 'ar' ? 'الهاتف' : 'Phone'}
              </label>
              <input
                type="tel"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {language === 'ar' ? 'واتساب' : 'WhatsApp'}
              </label>
              <input
                type="tel"
                value={settings.whatsapp}
                onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
              </label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500`}
              />
            </div>

            <div className="md:col-span-2">
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {language === 'ar' ? 'العنوان' : 'Address'}
              </label>
              <textarea
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                rows={3}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500`}
              />
            </div>
          </div>
        </div>

        {/* Social Media */}
        <div className={`
          ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}
          rounded-xl shadow-lg p-6
          border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}
        `}>
          <h2 className={`text-xl font-bold mb-6 flex items-center gap-2 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            <Globe size={24} />
            {language === 'ar' ? 'وسائل التواصل الاجتماعي' : 'Social Media'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                X (Twitter)
              </label>
              <input
                type="url"
                value={settings.social_x}
                onChange={(e) => setSettings({ ...settings, social_x: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500`}
                placeholder="https://x.com/..."
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Instagram
              </label>
              <input
                type="url"
                value={settings.social_instagram}
                onChange={(e) => setSettings({ ...settings, social_instagram: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500`}
                placeholder="https://instagram.com/..."
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                TikTok
              </label>
              <input
                type="url"
                value={settings.social_tiktok}
                onChange={(e) => setSettings({ ...settings, social_tiktok: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500`}
                placeholder="https://tiktok.com/..."
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Snapchat
              </label>
              <input
                type="url"
                value={settings.social_snapchat}
                onChange={(e) => setSettings({ ...settings, social_snapchat: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500`}
                placeholder="https://snapchat.com/..."
              />
            </div>
          </div>
        </div>

        {/* Delivery Settings */}
        <div className={`
          ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}
          rounded-xl shadow-lg p-6
          border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}
        `}>
          <h2 className={`text-xl font-bold mb-6 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            {language === 'ar' ? 'إعدادات التوصيل' : 'Delivery Settings'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {language === 'ar' ? 'رسوم التوصيل' : 'Delivery Fee'}
              </label>
              <input
                type="number"
                step="0.01"
                value={settings.delivery_fee}
                onChange={(e) => setSettings({ ...settings, delivery_fee: parseFloat(e.target.value) || 0 })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {language === 'ar' ? 'حد التوصيل المجاني' : 'Free Shipping Threshold'}
              </label>
              <input
                type="number"
                step="0.01"
                value={settings.free_shipping_threshold}
                onChange={(e) => setSettings({ ...settings, free_shipping_threshold: parseFloat(e.target.value) || 0 })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500`}
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-lg
              font-semibold text-white
              bg-gradient-to-r from-emerald-600 to-green-600
              hover:from-emerald-700 hover:to-green-700
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200
              shadow-lg hover:shadow-xl
            `}
          >
            <Save size={20} />
            {saving 
              ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
              : (language === 'ar' ? 'حفظ الإعدادات' : 'Save Settings')
            }
          </button>
        </div>
      </form>
    </div>
  )
}
