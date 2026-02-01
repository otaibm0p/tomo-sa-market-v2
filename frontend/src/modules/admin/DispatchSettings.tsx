import { useState, useEffect } from 'react'
import api from '../../utils/api'
import { useLanguage } from '../../context/LanguageContext'
import { formatNumber, parseNumber } from '../../utils/numberFormat'

interface DispatchSettings {
  mode: 'AUTO_OFFER' | 'AUTO_ASSIGN'
  is_enabled: boolean
  offer_timeout_seconds: number
  max_couriers_per_offer: number
  retry_enabled: boolean
  max_retries: number
  scoring_weights: {
    distance_weight: number
    performance_weight: number
    fairness_weight: number
  }
  fallback_behavior: 'switch_manual' | 'notify_admin' | 'keep_retrying'
}

export default function DispatchSettings() {
  const { language, t } = useLanguage()
  const [dispatchMode, setDispatchMode] = useState<'AUTO_ASSIGN' | 'OFFER_ACCEPT'>('AUTO_ASSIGN')
  const [settings, setSettings] = useState<DispatchSettings>({
    mode: 'AUTO_OFFER',
    is_enabled: true,
    offer_timeout_seconds: 30,
    max_couriers_per_offer: 5,
    retry_enabled: true,
    max_retries: 3,
    scoring_weights: {
      distance_weight: 0.4,
      performance_weight: 0.3,
      fairness_weight: 0.3
    },
    fallback_behavior: 'notify_admin'
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
      const [dispatchRes, settingsRes] = await Promise.allSettled([
        api.get('/api/settings'),
        api.get('/api/admin/dispatch/settings'),
      ])
      if (dispatchRes.status === 'fulfilled') {
        const dm = (dispatchRes.value?.data?.dispatchMode || 'AUTO_ASSIGN') as any
        const next = dm === 'OFFER_ACCEPT' ? 'OFFER_ACCEPT' : 'AUTO_ASSIGN'
        setDispatchMode(next)
      }
      if (settingsRes.status === 'fulfilled') {
        setSettings(settingsRes.value.data)
      }
    } catch (err) {
      console.error('Error loading dispatch settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setMessage(null)
      // 1) Save simplified public dispatch mode via /api/settings
      await api.put('/api/settings', { dispatchMode })
      // 2) Keep legacy dispatch settings in sync (non-breaking)
      await api.put('/api/admin/dispatch/settings', {
        ...settings,
        mode: dispatchMode === 'OFFER_ACCEPT' ? 'AUTO_OFFER' : 'AUTO_ASSIGN',
      })
      setMessage({ 
        text: language === 'en' ? 'Settings saved successfully!' : 'تم حفظ الإعدادات بنجاح!', 
        type: 'success' 
      })
    } catch (err: any) {
      console.error('Error saving dispatch settings:', err)
      setMessage({ 
        text: language === 'en' ? 'Failed to save settings' : 'فشل حفظ الإعدادات', 
        type: 'error' 
      })
    } finally {
      setSaving(false)
    }
  }

  const updateSettings = (updates: Partial<DispatchSettings>) => {
    setSettings({ ...settings, ...updates })
  }

  const updateScoringWeight = (key: keyof DispatchSettings['scoring_weights'], value: number) => {
    setSettings({
      ...settings,
      scoring_weights: {
        ...settings.scoring_weights,
        [key]: value
      }
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  const totalWeight = settings.scoring_weights.distance_weight + 
                     settings.scoring_weights.performance_weight + 
                     settings.scoring_weights.fairness_weight

  return (
    <div className="p-6 space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          {language === 'en' ? 'Order Dispatch Settings' : 'إعدادات توزيع الطلبات'}
        </h1>
        <p className="text-gray-600 text-sm">
          {language === 'en' 
            ? 'Configure automated order dispatch system with AUTO_OFFER or AUTO_ASSIGN modes'
            : 'تكوين نظام توزيع الطلبات التلقائي مع وضع AUTO_OFFER أو AUTO_ASSIGN'}
        </p>
      </div>

      {/* DispatchMode (new simplified toggle) */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-extrabold text-gray-900">{t('admin.dispatch.modeLabel') || (language === 'ar' ? 'طريقة توزيع الطلبات' : 'Dispatch mode')}</div>
            <div className="mt-1 text-sm font-bold text-gray-600">
              {(t('admin.dispatch.mode.bannerTitle') || '') && (t('admin.dispatch.mode.bannerSubtitle') || '') ? (
                <>
                  <div>{t('admin.dispatch.mode.bannerTitle')}</div>
                  <div className="text-xs mt-1">{t('admin.dispatch.mode.bannerSubtitle')}</div>
                </>
              ) : null}
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setDispatchMode('AUTO_ASSIGN')
              updateSettings({ mode: 'AUTO_ASSIGN' })
            }}
            className={`rounded-xl border px-4 py-3 text-left transition ${
              dispatchMode === 'AUTO_ASSIGN' ? 'border-emerald-600 bg-emerald-50' : 'border-gray-200 bg-white hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <input type="radio" checked={dispatchMode === 'AUTO_ASSIGN'} readOnly className="w-5 h-5 text-emerald-600" />
              <div className="font-extrabold">{t('admin.dispatch.mode.autoAssign') || (language === 'ar' ? 'تعيين مباشر' : 'Auto assign')}</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => {
              setDispatchMode('OFFER_ACCEPT')
              updateSettings({ mode: 'AUTO_OFFER' })
            }}
            className={`rounded-xl border px-4 py-3 text-left transition ${
              dispatchMode === 'OFFER_ACCEPT' ? 'border-emerald-600 bg-emerald-50' : 'border-gray-200 bg-white hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <input type="radio" checked={dispatchMode === 'OFFER_ACCEPT'} readOnly className="w-5 h-5 text-emerald-600" />
              <div className="font-extrabold">{t('admin.dispatch.mode.offerAccept') || (language === 'ar' ? 'عرض وقبول' : 'Offer & accept')}</div>
            </div>
          </button>
        </div>
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
              {language === 'en' ? 'Automated Dispatch' : 'التوزيع التلقائي'}
            </h2>
            <p className="text-gray-600 text-sm">
              {language === 'en' 
                ? 'Enable or disable the automated order dispatch system'
                : 'تفعيل أو تعطيل نظام توزيع الطلبات التلقائي'}
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.is_enabled}
              onChange={(e) => updateSettings({ is_enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>
      </div>

      {/* Dispatch Mode Selection */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">
          {language === 'en' ? 'Dispatch Mode' : 'وضع التوزيع'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
              settings.mode === 'AUTO_OFFER'
                ? 'border-emerald-600 bg-emerald-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => updateSettings({ mode: 'AUTO_OFFER' })}
          >
            <div className="flex items-center gap-3 mb-2">
              <input
                type="radio"
                checked={settings.mode === 'AUTO_OFFER'}
                onChange={() => updateSettings({ mode: 'AUTO_OFFER' })}
                className="w-5 h-5 text-emerald-600"
              />
              <h3 className="font-bold text-lg">AUTO_OFFER</h3>
            </div>
            <p className="text-sm text-gray-600">
              {language === 'en' 
                ? 'Send offers to multiple couriers. First to accept gets the order.'
                : 'إرسال عروض لعدة مندوبين. أول من يقبل يحصل على الطلب.'}
            </p>
          </div>

          <div
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
              settings.mode === 'AUTO_ASSIGN'
                ? 'border-emerald-600 bg-emerald-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => updateSettings({ mode: 'AUTO_ASSIGN' })}
          >
            <div className="flex items-center gap-3 mb-2">
              <input
                type="radio"
                checked={settings.mode === 'AUTO_ASSIGN'}
                onChange={() => updateSettings({ mode: 'AUTO_ASSIGN' })}
                className="w-5 h-5 text-emerald-600"
              />
              <h3 className="font-bold text-lg">AUTO_ASSIGN</h3>
            </div>
            <p className="text-sm text-gray-600">
              {language === 'en' 
                ? 'Automatically assign to best courier based on scoring algorithm.'
                : 'تعيين تلقائي لأفضل مندوب بناءً على خوارزمية التقييم.'}
            </p>
          </div>
        </div>
      </div>

      {/* Offer Settings */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">
          {language === 'en' ? 'Offer Settings' : 'إعدادات العروض'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              {language === 'en' ? 'Offer Timeout (seconds)' : 'انتهاء العرض (بالثواني)'}
            </label>
            <input
              type="text"
              inputMode="numeric"
              min="10"
              max="300"
              value={formatNumber(settings.offer_timeout_seconds)}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/[^\d]/g, '')
                if (cleaned === '') {
                  updateSettings({ offer_timeout_seconds: 30 })
                } else {
                  const parsed = parseInt(cleaned)
                  if (!isNaN(parsed) && parsed >= 10 && parsed <= 300) {
                    updateSettings({ offer_timeout_seconds: parsed })
                  }
                }
              }}
              onBlur={(e) => {
                const parsed = parseInt(e.target.value.replace(/[^\d]/g, ''))
                if (isNaN(parsed) || parsed < 10) {
                  updateSettings({ offer_timeout_seconds: 10 })
                } else if (parsed > 300) {
                  updateSettings({ offer_timeout_seconds: 300 })
                }
              }}
              placeholder="30"
              className="w-full px-4 py-2 border rounded-lg font-mono text-left"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              {language === 'en' ? 'Max Couriers per Offer' : 'الحد الأقصى للمندوبين لكل عرض'}
            </label>
            <input
              type="text"
              inputMode="numeric"
              min="1"
              max="20"
              value={formatNumber(settings.max_couriers_per_offer)}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/[^\d]/g, '')
                if (cleaned === '') {
                  updateSettings({ max_couriers_per_offer: 5 })
                } else {
                  const parsed = parseInt(cleaned)
                  if (!isNaN(parsed) && parsed >= 1 && parsed <= 20) {
                    updateSettings({ max_couriers_per_offer: parsed })
                  }
                }
              }}
              onBlur={(e) => {
                const parsed = parseInt(e.target.value.replace(/[^\d]/g, ''))
                if (isNaN(parsed) || parsed < 1) {
                  updateSettings({ max_couriers_per_offer: 1 })
                } else if (parsed > 20) {
                  updateSettings({ max_couriers_per_offer: 20 })
                }
              }}
              placeholder="5"
              className="w-full px-4 py-2 border rounded-lg font-mono text-left"
              dir="ltr"
            />
            <p className="text-xs text-gray-500 mt-1">
              {language === 'en' ? '(AUTO_OFFER mode only)' : '(وضع AUTO_OFFER فقط)'}
            </p>
          </div>
        </div>
      </div>

      {/* Retry Settings */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">
            {language === 'en' ? 'Retry Settings' : 'إعدادات إعادة المحاولة'}
          </h2>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.retry_enabled}
              onChange={(e) => updateSettings({ retry_enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>
        {settings.retry_enabled && (
          <div>
            <label className="block text-sm font-medium mb-2">
              {language === 'en' ? 'Max Retry Attempts' : 'الحد الأقصى لمحاولات إعادة المحاولة'}
            </label>
            <input
              type="text"
              inputMode="numeric"
              min="1"
              max="10"
              value={formatNumber(settings.max_retries)}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/[^\d]/g, '')
                if (cleaned === '') {
                  updateSettings({ max_retries: 3 })
                } else {
                  const parsed = parseInt(cleaned)
                  if (!isNaN(parsed) && parsed >= 1 && parsed <= 10) {
                    updateSettings({ max_retries: parsed })
                  }
                }
              }}
              onBlur={(e) => {
                const parsed = parseInt(e.target.value.replace(/[^\d]/g, ''))
                if (isNaN(parsed) || parsed < 1) {
                  updateSettings({ max_retries: 1 })
                } else if (parsed > 10) {
                  updateSettings({ max_retries: 10 })
                }
              }}
              placeholder="3"
              className="w-full px-4 py-2 border rounded-lg font-mono text-left"
              dir="ltr"
            />
          </div>
        )}
      </div>

      {/* Scoring Weights (AUTO_ASSIGN mode only) */}
      {settings.mode === 'AUTO_ASSIGN' && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">
            {language === 'en' ? 'Scoring Weights' : 'أوزان التقييم'}
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            {language === 'en' 
              ? 'Configure how couriers are scored for AUTO_ASSIGN mode. Total should be 1.0'
              : 'تكوين كيفية تقييم المندوبين لوضع AUTO_ASSIGN. يجب أن يكون المجموع 1.0'}
          </p>
          {totalWeight !== 1.0 && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                {language === 'en' 
                  ? `Warning: Total weight is ${formatNumber(totalWeight, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Should be 1.0`
                  : `تحذير: إجمالي الوزن هو ${formatNumber(totalWeight, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. يجب أن يكون 1.0`}
              </p>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                {language === 'en' ? 'Distance Weight' : 'وزن المسافة'}
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={settings.scoring_weights.distance_weight === 0 ? '' : formatNumber(settings.scoring_weights.distance_weight, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                onChange={(e) => {
                  const parsed = parseNumber(e.target.value)
                  if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
                    updateScoringWeight('distance_weight', parsed)
                  } else if (e.target.value === '' || e.target.value === '.') {
                    updateScoringWeight('distance_weight', 0)
                  }
                }}
                onBlur={(e) => {
                  const parsed = parseNumber(e.target.value)
                  if (isNaN(parsed) || parsed < 0) {
                    updateScoringWeight('distance_weight', 0)
                  } else if (parsed > 1) {
                    updateScoringWeight('distance_weight', 1)
                  }
                }}
                placeholder="0.0"
                className="w-full px-4 py-2 border rounded-lg text-left"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                {language === 'en' ? 'Performance Weight' : 'وزن الأداء'}
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={settings.scoring_weights.performance_weight === 0 ? '' : formatNumber(settings.scoring_weights.performance_weight, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                onChange={(e) => {
                  const parsed = parseNumber(e.target.value)
                  if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
                    updateScoringWeight('performance_weight', parsed)
                  } else if (e.target.value === '' || e.target.value === '.') {
                    updateScoringWeight('performance_weight', 0)
                  }
                }}
                onBlur={(e) => {
                  const parsed = parseNumber(e.target.value)
                  if (isNaN(parsed) || parsed < 0) {
                    updateScoringWeight('performance_weight', 0)
                  } else if (parsed > 1) {
                    updateScoringWeight('performance_weight', 1)
                  }
                }}
                placeholder="0.0"
                className="w-full px-4 py-2 border rounded-lg text-left"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                {language === 'en' ? 'Fairness Weight' : 'وزن العدالة'}
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={settings.scoring_weights.fairness_weight === 0 ? '' : formatNumber(settings.scoring_weights.fairness_weight, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                onChange={(e) => {
                  const parsed = parseNumber(e.target.value)
                  if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
                    updateScoringWeight('fairness_weight', parsed)
                  } else if (e.target.value === '' || e.target.value === '.') {
                    updateScoringWeight('fairness_weight', 0)
                  }
                }}
                onBlur={(e) => {
                  const parsed = parseNumber(e.target.value)
                  if (isNaN(parsed) || parsed < 0) {
                    updateScoringWeight('fairness_weight', 0)
                  } else if (parsed > 1) {
                    updateScoringWeight('fairness_weight', 1)
                  }
                }}
                placeholder="0.0"
                className="w-full px-4 py-2 border rounded-lg text-left"
                dir="ltr"
              />
            </div>
          </div>
        </div>
      )}

      {/* Fallback Behavior */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">
          {language === 'en' ? 'Fallback Behavior' : 'سلوك الاحتياطي'}
        </h2>
        <select
          value={settings.fallback_behavior}
          onChange={(e) => updateSettings({ fallback_behavior: e.target.value as any })}
          className="w-full px-4 py-2 border rounded-lg"
        >
          <option value="notify_admin">
            {language === 'en' ? 'Notify Admin' : 'إشعار الإدارة'}
          </option>
          <option value="switch_manual">
            {language === 'en' ? 'Switch to Manual' : 'التبديل إلى يدوي'}
          </option>
          <option value="keep_retrying">
            {language === 'en' ? 'Keep Retrying' : 'الاستمرار في إعادة المحاولة'}
          </option>
        </select>
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

