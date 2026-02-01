import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { getPublicSettings, type PublicSettings } from '../shared/settings/publicSettings'

export default function Contact() {
  const { language } = useLanguage()
  const isRTL = language === 'ar'

  const [settings, setSettings] = useState<PublicSettings | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const s = await getPublicSettings()
      if (!cancelled) setSettings(s)
    })()
    const onUpdated = (e: any) => {
      const next = e?.detail
      if (next && typeof next === 'object') setSettings(next as any)
    }
    window.addEventListener('public-settings-updated', onUpdated as any)
    return () => {
      cancelled = true
      window.removeEventListener('public-settings-updated', onUpdated as any)
    }
  }, [])

  const support = settings?.siteSupport || null
  const siteLinks = settings?.siteLinks || null

  const whatsappNumber = (support?.whatsappNumber || siteLinks?.support?.whatsappNumber || '').trim()
  const phone = (support?.phone || '').trim()
  const email = (support?.email || '').trim()
  const hours = (isRTL ? support?.hours_ar : support?.hours_en) || null

  const waMessage = (isRTL ? siteLinks?.support?.whatsappMessageAr : siteLinks?.support?.whatsappMessageEn) || (isRTL ? 'مرحباً، أحتاج مساعدة' : 'Hi, I need support')

  const waUrl = useMemo(() => {
    if (!whatsappNumber) return null
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(String(waMessage || '').trim())}`
  }, [whatsappNumber, waMessage])

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 font-['Tajawal']" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-10">
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">
          {isRTL ? 'خدمة العملاء' : 'Contact & Support'}
        </h1>
        <p className="mt-2 text-sm font-bold text-gray-600">
          {isRTL ? 'تواصل معنا بسرعة عبر واتساب أو الهاتف أو البريد.' : 'Reach us quickly via WhatsApp, phone, or email.'}
        </p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <a
            href={waUrl || '#'}
            onClick={(e) => {
              if (!waUrl) e.preventDefault()
            }}
            target={waUrl ? '_blank' : undefined}
            rel={waUrl ? 'noopener noreferrer' : undefined}
            className={`rounded-2xl border px-4 py-4 font-extrabold text-sm transition ${
              waUrl ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100' : 'border-gray-200 bg-gray-50 text-gray-500'
            }`}
          >
            <div className="text-lg">💬</div>
            <div className="mt-1">{isRTL ? 'WhatsApp' : 'WhatsApp'}</div>
            <div className="mt-1 text-xs font-bold opacity-90">{whatsappNumber || (isRTL ? 'غير مفعّل حالياً' : 'Not configured')}</div>
          </a>

          <a
            href={phone ? `tel:${phone}` : '#'}
            onClick={(e) => {
              if (!phone) e.preventDefault()
            }}
            className={`rounded-2xl border px-4 py-4 font-extrabold text-sm transition ${
              phone ? 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50' : 'border-gray-200 bg-gray-50 text-gray-500'
            }`}
          >
            <div className="text-lg">📞</div>
            <div className="mt-1">{isRTL ? 'الهاتف' : 'Phone'}</div>
            <div className="mt-1 text-xs font-bold opacity-90">{phone || (isRTL ? 'غير متوفر حالياً' : 'Not available')}</div>
          </a>

          <a
            href={email ? `mailto:${email}` : '#'}
            onClick={(e) => {
              if (!email) e.preventDefault()
            }}
            className={`rounded-2xl border px-4 py-4 font-extrabold text-sm transition ${
              email ? 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50' : 'border-gray-200 bg-gray-50 text-gray-500'
            }`}
          >
            <div className="text-lg">✉️</div>
            <div className="mt-1">{isRTL ? 'البريد' : 'Email'}</div>
            <div className="mt-1 text-xs font-bold opacity-90">{email || (isRTL ? 'غير متوفر حالياً' : 'Not available')}</div>
          </a>
        </div>

        <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-700">
          <div className="text-xs font-extrabold text-gray-900">{isRTL ? 'ساعات العمل' : 'Hours'}</div>
          <div className="mt-1">{hours || (isRTL ? 'متاحون يوميًا — سيتم تحديث الساعات قريبًا' : 'Available daily — hours will be updated soon')}</div>
        </div>
      </div>
    </div>
  )
}

