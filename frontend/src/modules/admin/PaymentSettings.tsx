import { useState, useEffect } from 'react'
import api from '../../utils/api'

interface PaymentSettings {
  enable_cod: boolean
  enable_wallet: boolean
  enable_online_payment: boolean
}

export default function PaymentSettings() {
  const [settings, setSettings] = useState<PaymentSettings>({
    enable_cod: true,
    enable_wallet: false,
    enable_online_payment: false,
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
        enable_cod: res.data.enable_cod !== undefined ? res.data.enable_cod : true,
        enable_wallet: res.data.enable_wallet !== undefined ? res.data.enable_wallet : false,
        enable_online_payment: res.data.enable_online_payment !== undefined ? res.data.enable_online_payment : false,
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
      const currentRes = await api.get('/api/settings')
      const currentSettings = currentRes.data

      await api.put('/api/settings', {
        ...currentSettings,
        enable_cod: false, // معطل دائماً - نظام الدفع الإلكتروني فقط
        enable_wallet: settings.enable_wallet,
        enable_online_payment: true, // مفعل دائماً
      })

      setMessage({ text: 'تم حفظ إعدادات الدفع بنجاح! ✅', type: 'success' })
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

  // نظام الدفع الإلكتروني فقط - always true
  const hasAtLeastOne = true

  return (
    <div style={{ fontFamily: 'Cairo, sans-serif' }} className="w-full max-w-full">
      <div className="mb-6 lg:mb-8">
        <h2 className="text-3xl lg:text-4xl font-bold mb-2" style={{ color: '#1a237e' }}>
          إعدادات الدفع
        </h2>
        <p className="text-gray-600 text-sm lg:text-base">إدارة طرق الدفع المتاحة للعملاء</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card: Payment Methods */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-xl font-bold mb-6" style={{ color: '#1a237e' }}>
            طرق الدفع المتاحة
          </h3>

          <div className="space-y-6">
            {/* Online Payment Only - System Notice */}
            <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">💳</span>
                <h4 className="text-lg font-semibold text-emerald-800">نظام الدفع الإلكتروني فقط</h4>
              </div>
              <p className="text-sm text-emerald-700">
                نظام TOMO يعتمد حصرياً على الدفع الإلكتروني. جميع الطلبات يجب أن تكون مدفوعة مسبقاً قبل التوصيل.
              </p>
            </div>

            {/* Wallet Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 gap-4">
              <div className="flex-1">
                <h4 className="text-lg font-semibold mb-2 text-gray-800">👛 المحفظة الإلكترونية</h4>
                <p className="text-sm text-gray-600">
                  السماح للعملاء بالدفع من رصيد محفظتهم الإلكترونية
                </p>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enable_wallet}
                    onChange={(e) => setSettings({ ...settings, enable_wallet: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div
                    className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#2e7d32]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all"
                    style={{ backgroundColor: settings.enable_wallet ? '#2e7d32' : '#e5e7eb' }}
                  ></div>
                </label>
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  {settings.enable_wallet ? 'مفعل' : 'معطل'}
                </span>
              </div>
            </div>

            {/* Online Payment - Always Enabled */}
            <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg border-2 border-emerald-300 gap-4">
              <div className="flex-1">
                <h4 className="text-lg font-semibold mb-2 text-emerald-800">💳 الدفع الإلكتروني (مفعل دائماً)</h4>
                <p className="text-sm text-emerald-700">
                  الدفع عبر البطاقات الائتمانية أو بوابات الدفع الإلكترونية - مفعل دائماً في نظام TOMO
                </p>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="w-14 h-7 bg-emerald-600 rounded-full flex items-center justify-end px-1">
                  <div className="w-6 h-6 bg-white rounded-full"></div>
                </div>
                <span className="text-sm font-bold text-emerald-800 whitespace-nowrap">
                  مفعل دائماً ✓
                </span>
              </div>
            </div>
          </div>

          {/* Warning if all disabled */}
          {!hasAtLeastOne && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ تحذير: يجب تفعيل طريقة دفع واحدة على الأقل
              </p>
            </div>
          )}
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
            disabled={saving || !hasAtLeastOne}
            className="px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#2e7d32' }}
            onMouseEnter={(e) => {
              if (!saving && hasAtLeastOne) {
                e.currentTarget.style.backgroundColor = '#1b5e20'
              }
            }}
            onMouseLeave={(e) => {
              if (!saving && hasAtLeastOne) {
                e.currentTarget.style.backgroundColor = '#2e7d32'
              }
            }}
          >
            {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </button>
        </div>
      </form>
    </div>
  )
}
