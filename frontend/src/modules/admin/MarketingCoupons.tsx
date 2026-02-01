import { useState, useEffect } from 'react'
import api from '../../utils/api'
import { useLanguage } from '../../context/LanguageContext'

export default function MarketingCoupons() {
  const { language, t } = useLanguage()
  const [couponsEnabled, setCouponsEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [coupons, setCoupons] = useState<any[]>([])
  const [apiError, setApiError] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        setLoading(true)
        const res = await api.get('/api/settings')
        const en = res.data?.features?.modules_enabled?.coupons === true
        setCouponsEnabled(en)
        if (en) {
          try {
            const cRes = await api.get('/api/admin/marketing/coupons')
            setCoupons(Array.isArray(cRes.data?.coupons) ? cRes.data.coupons : [])
          } catch {
            setApiError(true)
            setCoupons([])
          }
        }
      } catch {
        setCouponsEnabled(false)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
      </div>
    )
  }

  if (!couponsEnabled) {
    return (
      <div className="p-6 max-w-2xl" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <h2 className="text-xl font-bold text-amber-900 mb-2">
            {language === 'ar' ? 'قريباً' : 'Coming soon'}
          </h2>
          <p className="text-amber-800 text-sm">
            {language === 'ar'
              ? 'تفعيل موديول الكوبونات من مركز التحكم لاستخدام هذه الصفحة.'
              : 'Enable the Coupons module from Control Center to use this page.'}
          </p>
        </div>
      </div>
    )
  }

  if (apiError) {
    return (
      <div className="p-6 max-w-2xl" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center">
          <p className="text-gray-600">
            {language === 'ar' ? 'لا توجد بيانات كوبونات حالياً.' : 'No coupon data available right now.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">
        {language === 'ar' ? 'الكوبونات' : 'Coupons'}
      </h1>
      {coupons.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-600">
          {language === 'ar' ? 'لا توجد كوبونات.' : 'No coupons yet.'}
        </div>
      ) : (
        <ul className="space-y-3">
          {coupons.map((c: any) => (
            <li key={c.id} className="p-4 rounded-xl border border-gray-200 bg-white flex justify-between items-center">
              <span className="font-mono font-bold text-gray-900">{c.code}</span>
              <span className="text-sm text-gray-600">{c.name_ar || c.name_en || '-'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
