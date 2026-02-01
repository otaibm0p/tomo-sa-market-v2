import { useEffect, useMemo, useState } from 'react'
import api from '../../utils/api'
import { useLanguage } from '../../context/LanguageContext'
import { formatNumber } from '../../utils/numberFormat'

// Add fade-in animation style
const fadeInStyle = `
  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .animate-fade-in {
    animation: fade-in 0.3s ease-out;
  }
`

type UiPricingDisplay = {
  hide_shipping_cost_line_item: boolean
  delivery_fee_label_ar: string
  delivery_fee_label_en: string
  show_delivery_fee_line: boolean
  show_service_fee_line: boolean
  service_fee_label_ar: string
  service_fee_label_en: string
  show_free_delivery_threshold: boolean
  free_delivery_over_amount: number
}

type OperationsSla = {
  customer_timer_enabled: boolean
  target_minutes: number
  thresholds: {
    green_minutes: number
    yellow_minutes: number
    red_minutes: number
  }
}

type ProductPageSettings = {
  show_brand: boolean
  show_origin_country: boolean
  tabs: {
    description: boolean
    ingredients: boolean
    nutrition: boolean
    allergens: boolean
    storage: boolean
  }
  similar_products_limit: number
  similar_products_fallback: 'brand' | 'category'
}

type MaintenanceMode = {
  enabled: boolean
  title_ar: string
  title_en: string
  message_ar: string
  message_en: string
  maintenance_password?: string
  maintenance_password_hash?: string
  showPassword?: boolean
  passwordSaved?: boolean
}

function clampInt(val: number, min: number, max: number) {
  if (Number.isNaN(val)) return min
  return Math.max(min, Math.min(max, Math.trunc(val)))
}

export default function SiteSettings() {
  const { language } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [uiPricing, setUiPricing] = useState<UiPricingDisplay | null>(null)
  const [sla, setSla] = useState<OperationsSla | null>(null)
  const [productPage, setProductPage] = useState<ProductPageSettings | null>(null)
  const [maintenance, setMaintenance] = useState<MaintenanceMode | null>(null)

  const labels = useMemo(() => {
    return {
      title: language === 'ar' ? 'إعدادات الموقع' : 'Site Settings',
      pricing: language === 'ar' ? 'عرض الأسعار في واجهة العميل' : 'Customer Pricing Display',
      sla: language === 'ar' ? 'عمليات التوصيل + SLA' : 'Operations SLA',
      product: language === 'ar' ? 'إعدادات صفحة المنتج' : 'Product Page',
      maintenance: language === 'ar' ? 'وضع الصيانة' : 'Maintenance Mode',
      save: language === 'ar' ? 'حفظ' : 'Save',
    }
  }, [language])

  const load = async () => {
    try {
      setLoading(true)
      setMessage(null)
      const [pricingRes, slaRes, productRes, maintenanceRes] = await Promise.all([
        api.get('/api/admin/site/settings/ui_pricing_display'),
        api.get('/api/admin/site/settings/operations_sla'),
        api.get('/api/admin/site/settings/product_page_settings'),
        api.get('/api/admin/site/settings/maintenance_mode'),
      ])

      setUiPricing(pricingRes.data?.value_json || null)
      setSla(slaRes.data?.value_json || null)
      setProductPage(productRes.data?.value_json || null)
      setMaintenance(maintenanceRes.data?.value_json || null)
    } catch (err) {
      console.error('Failed to load site settings:', err)
      setMessage({ type: 'error', text: language === 'ar' ? 'فشل تحميل الإعدادات' : 'Failed to load settings' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveSetting = async (setting_key: string, value_json: any) => {
    try {
      setSavingKey(setting_key)
      setMessage(null)
      await api.put('/api/admin/site/settings', { setting_key, value_json })
      
      // Special message for maintenance mode with password
      let successMessage = ''
      if (setting_key === 'maintenance_mode') {
        if (value_json.maintenance_password) {
          successMessage = language === 'ar' 
            ? '✅ تم حفظ إعدادات وضع الصيانة بنجاح! تم حفظ كلمة مرور فريق الصيانة أيضاً.'
            : '✅ Successfully saved maintenance mode settings! Maintenance team password has been saved.'
        } else {
          successMessage = language === 'ar' 
            ? '✅ تم حفظ إعدادات وضع الصيانة بنجاح!'
            : '✅ Successfully saved maintenance mode settings!'
        }
      } else {
        successMessage = language === 'ar' 
          ? `✅ تم حفظ إعدادات ${setting_key} بنجاح!` 
          : `✅ Successfully saved ${setting_key} settings!`
      }
      
      setMessage({ 
        type: 'success', 
        text: successMessage
      })
      
      // Clear password field after successful save (for security)
      if (setting_key === 'maintenance_mode' && value_json.maintenance_password) {
        setMaintenance(prev => prev ? { ...prev, maintenance_password: '', passwordSaved: true } : null)
        // Clear the saved indicator after 3 seconds
        setTimeout(() => {
          setMaintenance(prev => prev ? { ...prev, passwordSaved: false } : null)
        }, 3000)
      }

      // Refresh settings from server so hash/state reflect persistence
      await load()
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setMessage(null)
      }, 5000)
    } catch (err: any) {
      console.error('Failed to save setting:', setting_key, err)
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.message || (language === 'ar' ? '❌ فشل الحفظ. يرجى المحاولة مرة أخرى.' : '❌ Save failed. Please try again.') 
      })
    } finally {
      setSavingKey(null)
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
    <div className="space-y-6">
      <style>{fadeInStyle}</style>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{labels.title}</h1>
        <button
          onClick={load}
          className="px-4 py-2 rounded-lg bg-white border hover:bg-gray-50"
        >
          {language === 'ar' ? 'تحديث' : 'Refresh'}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {/* Pricing Display */}
      <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{labels.pricing}</h2>
          <button
            disabled={!uiPricing || savingKey === 'ui_pricing_display'}
            onClick={() => uiPricing && saveSetting('ui_pricing_display', uiPricing)}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {savingKey === 'ui_pricing_display' ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : labels.save}
          </button>
        </div>

        {!uiPricing ? (
          <p className="text-gray-500">{language === 'ar' ? 'لا توجد إعدادات' : 'No settings found'}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!uiPricing.hide_shipping_cost_line_item}
                onChange={(e) => setUiPricing({ ...uiPricing, hide_shipping_cost_line_item: e.target.checked })}
                className="w-5 h-5"
              />
              <span>{language === 'ar' ? 'إخفاء أي سطر باسم "سعر الشحن"' : 'Hide any "Shipping cost" line item'}</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!uiPricing.show_delivery_fee_line}
                onChange={(e) => setUiPricing({ ...uiPricing, show_delivery_fee_line: e.target.checked })}
                className="w-5 h-5"
              />
              <span>{language === 'ar' ? 'إظهار رسوم التوصيل' : 'Show delivery fee line'}</span>
            </label>

            <div>
              <label className="block text-sm font-medium mb-1">{language === 'ar' ? 'اسم رسوم التوصيل (عربي)' : 'Delivery fee label (AR)'}</label>
              <input
                value={uiPricing.delivery_fee_label_ar || ''}
                onChange={(e) => setUiPricing({ ...uiPricing, delivery_fee_label_ar: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                dir="rtl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{language === 'ar' ? 'اسم رسوم التوصيل (إنجليزي)' : 'Delivery fee label (EN)'}</label>
              <input
                value={uiPricing.delivery_fee_label_en || ''}
                onChange={(e) => setUiPricing({ ...uiPricing, delivery_fee_label_en: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                dir="ltr"
              />
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!uiPricing.show_service_fee_line}
                onChange={(e) => setUiPricing({ ...uiPricing, show_service_fee_line: e.target.checked })}
                className="w-5 h-5"
              />
              <span>{language === 'ar' ? 'إظهار رسوم الخدمة' : 'Show service fee line'}</span>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2">
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'ar' ? 'اسم رسوم الخدمة (عربي)' : 'Service fee label (AR)'}</label>
                <input
                  value={uiPricing.service_fee_label_ar || ''}
                  onChange={(e) => setUiPricing({ ...uiPricing, service_fee_label_ar: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  dir="rtl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'ar' ? 'اسم رسوم الخدمة (إنجليزي)' : 'Service fee label (EN)'}</label>
                <input
                  value={uiPricing.service_fee_label_en || ''}
                  onChange={(e) => setUiPricing({ ...uiPricing, service_fee_label_en: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  dir="ltr"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 md:col-span-2">
              <input
                type="checkbox"
                checked={!!uiPricing.show_free_delivery_threshold}
                onChange={(e) => setUiPricing({ ...uiPricing, show_free_delivery_threshold: e.target.checked })}
                className="w-5 h-5"
              />
              <span>{language === 'ar' ? 'إظهار "توصيل مجاني فوق X"' : 'Show “Free delivery over X”'}</span>
            </label>

            <div>
              <label className="block text-sm font-medium mb-1">{language === 'ar' ? 'قيمة X للتوصيل المجاني' : 'Free delivery threshold (X)'}</label>
              <input
                type="text"
                inputMode="numeric"
                value={formatNumber(uiPricing.free_delivery_over_amount ?? 0)}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/[^\d]/g, '')
                  if (cleaned === '') {
                    setUiPricing({ ...uiPricing, free_delivery_over_amount: 0 })
                  } else {
                    const parsed = parseInt(cleaned)
                    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100000) {
                      setUiPricing({ ...uiPricing, free_delivery_over_amount: parsed })
                    }
                  }
                }}
                onBlur={(e) => {
                  const parsed = parseInt(e.target.value.replace(/[^\d]/g, ''))
                  if (isNaN(parsed) || parsed < 0) {
                    setUiPricing({ ...uiPricing, free_delivery_over_amount: 0 })
                  } else if (parsed > 100000) {
                    setUiPricing({ ...uiPricing, free_delivery_over_amount: 100000 })
                  }
                }}
                placeholder="0"
                className="w-full border rounded-lg px-3 py-2 font-mono text-left"
                dir="ltr"
              />
            </div>
          </div>
        )}
      </div>

      {/* SLA */}
      <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{labels.sla}</h2>
          <button
            disabled={!sla || savingKey === 'operations_sla'}
            onClick={() => sla && saveSetting('operations_sla', sla)}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {savingKey === 'operations_sla' ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : labels.save}
          </button>
        </div>

        {!sla ? (
          <p className="text-gray-500">{language === 'ar' ? 'لا توجد إعدادات' : 'No settings found'}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex items-center gap-2 md:col-span-3">
              <input
                type="checkbox"
                checked={!!sla.customer_timer_enabled}
                onChange={(e) => setSla({ ...sla, customer_timer_enabled: e.target.checked })}
                className="w-5 h-5"
              />
              <span>{language === 'ar' ? 'إظهار عداد الوقت للعميل' : 'Show timer for customer'}</span>
            </label>

            <div>
              <label className="block text-sm font-medium mb-1">{language === 'ar' ? 'هدف SLA (دقيقة)' : 'SLA target (minutes)'}</label>
              <input
                type="text"
                inputMode="numeric"
                value={formatNumber(sla.target_minutes)}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/[^\d]/g, '')
                  if (cleaned === '') {
                    setSla({ ...sla, target_minutes: 45 })
                  } else {
                    const parsed = parseInt(cleaned)
                    if (!isNaN(parsed) && parsed >= 1 && parsed <= 999) {
                      setSla({ ...sla, target_minutes: parsed })
                    }
                  }
                }}
                onBlur={(e) => {
                  const parsed = parseInt(e.target.value.replace(/[^\d]/g, ''))
                  if (isNaN(parsed) || parsed < 1) {
                    setSla({ ...sla, target_minutes: 1 })
                  } else if (parsed > 999) {
                    setSla({ ...sla, target_minutes: 999 })
                  }
                }}
                placeholder="45"
                className="w-full border rounded-lg px-3 py-2 font-mono text-left"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{language === 'ar' ? 'أخضر حتى (دقيقة)' : 'Green up to (min)'}</label>
              <input
                type="text"
                inputMode="numeric"
                value={formatNumber(sla.thresholds.green_minutes)}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/[^\d]/g, '')
                  if (cleaned === '') {
                    setSla({ ...sla, thresholds: { ...sla.thresholds, green_minutes: 30 } })
                  } else {
                    const parsed = parseInt(cleaned)
                    if (!isNaN(parsed) && parsed >= 1 && parsed <= 999) {
                      setSla({ ...sla, thresholds: { ...sla.thresholds, green_minutes: parsed } })
                    }
                  }
                }}
                onBlur={(e) => {
                  const parsed = parseInt(e.target.value.replace(/[^\d]/g, ''))
                  if (isNaN(parsed) || parsed < 1) {
                    setSla({ ...sla, thresholds: { ...sla.thresholds, green_minutes: 1 } })
                  } else if (parsed > 999) {
                    setSla({ ...sla, thresholds: { ...sla.thresholds, green_minutes: 999 } })
                  }
                }}
                placeholder="30"
                className="w-full border rounded-lg px-3 py-2 font-mono text-left"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{language === 'ar' ? 'أحمر بعد (دقيقة)' : 'Red after (min)'}</label>
              <input
                type="text"
                inputMode="numeric"
                value={formatNumber(sla.thresholds.red_minutes)}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/[^\d]/g, '')
                  if (cleaned === '') {
                    setSla({ ...sla, thresholds: { ...sla.thresholds, red_minutes: 60 } })
                  } else {
                    const parsed = parseInt(cleaned)
                    if (!isNaN(parsed) && parsed >= 1 && parsed <= 999) {
                      setSla({ ...sla, thresholds: { ...sla.thresholds, red_minutes: parsed } })
                    }
                  }
                }}
                onBlur={(e) => {
                  const parsed = parseInt(e.target.value.replace(/[^\d]/g, ''))
                  if (isNaN(parsed) || parsed < 1) {
                    setSla({ ...sla, thresholds: { ...sla.thresholds, red_minutes: 1 } })
                  } else if (parsed > 999) {
                    setSla({ ...sla, thresholds: { ...sla.thresholds, red_minutes: 999 } })
                  }
                }}
                placeholder="60"
                className="w-full border rounded-lg px-3 py-2 font-mono text-left"
                dir="ltr"
              />
            </div>
          </div>
        )}
      </div>

      {/* Product Page */}
      <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{labels.product}</h2>
          <button
            disabled={!productPage || savingKey === 'product_page_settings'}
            onClick={() => productPage && saveSetting('product_page_settings', productPage)}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {savingKey === 'product_page_settings' ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : labels.save}
          </button>
        </div>

        {!productPage ? (
          <p className="text-gray-500">{language === 'ar' ? 'لا توجد إعدادات' : 'No settings found'}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!productPage.show_brand}
                onChange={(e) => setProductPage({ ...productPage, show_brand: e.target.checked })}
                className="w-5 h-5"
              />
              <span>{language === 'ar' ? 'إظهار العلامة التجارية' : 'Show brand'}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!productPage.show_origin_country}
                onChange={(e) => setProductPage({ ...productPage, show_origin_country: e.target.checked })}
                className="w-5 h-5"
              />
              <span>{language === 'ar' ? 'إظهار بلد المنشأ' : 'Show origin country'}</span>
            </label>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">{language === 'ar' ? 'التبويبات (عرض/إخفاء)' : 'Tabs (show/hide)'}</label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {Object.entries(productPage.tabs).map(([k, v]) => (
                  <label key={k} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    <input
                      type="checkbox"
                      checked={!!v}
                      onChange={(e) => setProductPage({ ...productPage, tabs: { ...productPage.tabs, [k]: e.target.checked } })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{k}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{language === 'ar' ? 'عدد المنتجات المشابهة' : 'Similar products limit'}</label>
              <input
                type="text"
                inputMode="numeric"
                value={formatNumber(productPage.similar_products_limit)}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/[^\d]/g, '')
                  if (cleaned === '') {
                    setProductPage({ ...productPage, similar_products_limit: 0 })
                  } else {
                    const parsed = parseInt(cleaned)
                    if (!isNaN(parsed) && parsed >= 0 && parsed <= 50) {
                      setProductPage({ ...productPage, similar_products_limit: parsed })
                    }
                  }
                }}
                onBlur={(e) => {
                  const parsed = parseInt(e.target.value.replace(/[^\d]/g, ''))
                  if (isNaN(parsed) || parsed < 0) {
                    setProductPage({ ...productPage, similar_products_limit: 0 })
                  } else if (parsed > 50) {
                    setProductPage({ ...productPage, similar_products_limit: 50 })
                  }
                }}
                placeholder="12"
                className="w-full border rounded-lg px-3 py-2 font-mono text-left"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{language === 'ar' ? 'Fallback للمشابهة' : 'Similar fallback'}</label>
              <select
                value={productPage.similar_products_fallback}
                onChange={(e) => setProductPage({ ...productPage, similar_products_fallback: e.target.value as any })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="brand">{language === 'ar' ? 'بالعلامة التجارية' : 'By brand'}</option>
                <option value="category">{language === 'ar' ? 'بالتصنيف' : 'By category'}</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Maintenance Mode */}
      <div className="bg-white rounded-xl shadow-md p-6 space-y-4 border-2 border-yellow-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{labels.maintenance}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {language === 'ar' 
                ? 'إقفال الموقع للزوار أثناء الصيانة. الأدمن يمكنه الدخول دائماً.'
                : 'Lock the site for visitors during maintenance. Admin can always access.'}
            </p>
          </div>
          <button
            disabled={!maintenance || savingKey === 'maintenance_mode'}
            onClick={() => maintenance && saveSetting('maintenance_mode', maintenance)}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              savingKey === 'maintenance_mode' 
                ? 'bg-yellow-500 text-white cursor-wait' 
                : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-lg'
            } disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2`}
          >
            {savingKey === 'maintenance_mode' ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>{language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}</span>
              </>
            ) : (
              <>
                <span>💾</span>
                <span>{labels.save}</span>
              </>
            )}
          </button>
        </div>

        {!maintenance ? (
          <p className="text-gray-500">{language === 'ar' ? 'لا توجد إعدادات' : 'No settings found'}</p>
        ) : (
          <div className="space-y-4">
            <label className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg border-2 border-yellow-300">
              <input
                type="checkbox"
                checked={!!maintenance.enabled}
                onChange={(e) => setMaintenance({ ...maintenance, enabled: e.target.checked })}
                className="w-6 h-6 text-yellow-600"
              />
              <div>
                <span className="font-bold text-lg block">
                  {language === 'ar' ? 'تفعيل وضع الصيانة' : 'Enable Maintenance Mode'}
                </span>
                <span className="text-sm text-gray-600">
                  {language === 'ar' 
                    ? 'عند التفعيل، سيتم إقفال الموقع للزوار وإظهار صفحة الصيانة'
                    : 'When enabled, the site will be locked for visitors and show maintenance page'}
                </span>
              </div>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'ar' ? 'عنوان الصيانة (عربي)' : 'Maintenance Title (AR)'}</label>
                <input
                  value={maintenance.title_ar || ''}
                  onChange={(e) => setMaintenance({ ...maintenance, title_ar: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  dir="rtl"
                  placeholder={language === 'ar' ? 'الموقع قيد الصيانة' : 'Site Under Maintenance'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'ar' ? 'عنوان الصيانة (إنجليزي)' : 'Maintenance Title (EN)'}</label>
                <input
                  value={maintenance.title_en || ''}
                  onChange={(e) => setMaintenance({ ...maintenance, title_en: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  dir="ltr"
                  placeholder="Site Under Maintenance"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'ar' ? 'رسالة الصيانة (عربي)' : 'Maintenance Message (AR)'}</label>
                <textarea
                  value={maintenance.message_ar || ''}
                  onChange={(e) => setMaintenance({ ...maintenance, message_ar: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  dir="rtl"
                  rows={4}
                  placeholder={language === 'ar' ? 'نقوم بإجراء صيانة على الموقع. سنعود قريباً!' : 'We are performing maintenance. We will be back soon!'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'ar' ? 'رسالة الصيانة (إنجليزي)' : 'Maintenance Message (EN)'}</label>
                <textarea
                  value={maintenance.message_en || ''}
                  onChange={(e) => setMaintenance({ ...maintenance, message_en: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  dir="ltr"
                  rows={4}
                  placeholder="We are performing maintenance. We will be back soon!"
                />
              </div>
            </div>

            {/* Maintenance Password for Team Access */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
              <h3 className="font-semibold text-gray-800 mb-3">
                {language === 'ar' ? '🔧 كلمة مرور فريق الصيانة' : '🔧 Maintenance Team Password'}
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                {language === 'ar' 
                  ? 'عند تفعيل وضع الصيانة، يمكن لفريق الصيانة الدخول باستخدام هذه الكلمة. اتركها فارغة لإلغاء كلمة المرور.'
                  : 'When maintenance mode is enabled, the maintenance team can access the site using this password. Leave empty to disable password.'}
              </p>
              
              {/* Password Saved Indicator */}
              {(maintenance.passwordSaved || (maintenance.maintenance_password_hash && !maintenance.maintenance_password)) && (
                <div className="mb-3 p-3 bg-green-100 border-2 border-green-400 rounded-lg flex items-center gap-2 animate-fade-in">
                  <span className="text-green-700 text-lg">✅</span>
                  <span className="text-green-800 font-semibold text-sm">
                    {language === 'ar' ? 'كلمة المرور محفوظة بنجاح!' : 'Password saved successfully!'}
                  </span>
                </div>
              )}
              
              <div className="relative">
                <input
                  type={maintenance.showPassword ? 'text' : 'password'}
                  value={maintenance.maintenance_password || ''}
                  onChange={(e) => {
                    const newPassword = e.target.value
                    setMaintenance({ 
                      ...maintenance, 
                      maintenance_password: newPassword,
                      passwordSaved: false, // Clear saved indicator when typing
                      // Clear hash when password changes (will be hashed on save)
                      maintenance_password_hash: newPassword ? undefined : maintenance.maintenance_password_hash
                    })
                  }}
                  className={`w-full border rounded-lg px-3 py-2 pr-10 ${
                    (maintenance.passwordSaved || (maintenance.maintenance_password_hash && !maintenance.maintenance_password))
                      ? 'border-green-400 bg-green-50' 
                      : ''
                  }`}
                  placeholder={language === 'ar' ? 'أدخل كلمة مرور جديدة لفريق الصيانة' : 'Enter new password for maintenance team'}
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setMaintenance({ ...maintenance, showPassword: !maintenance.showPassword })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  title={language === 'ar' ? (maintenance.showPassword ? 'إخفاء' : 'إظهار') : (maintenance.showPassword ? 'Hide' : 'Show')}
                >
                  {maintenance.showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              
              {maintenance.maintenance_password_hash && !maintenance.maintenance_password && !maintenance.passwordSaved && (
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <span>ℹ️</span>
                  <span>{language === 'ar' ? 'كلمة المرور الحالية محفوظة. أدخل كلمة جديدة لتغييرها.' : 'Current password is saved. Enter a new password to change it.'}</span>
                </p>
              )}
              
              {!maintenance.maintenance_password_hash && !maintenance.maintenance_password && !maintenance.passwordSaved && (
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <span>⚠️</span>
                  <span>{language === 'ar' ? 'لم يتم حفظ كلمة مرور بعد. أدخل كلمة مرور واضغط حفظ.' : 'No password saved yet. Enter a password and click save.'}</span>
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


