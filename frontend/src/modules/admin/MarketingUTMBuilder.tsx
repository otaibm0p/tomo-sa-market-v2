import { useState } from 'react'
import { useLanguage } from '../../context/LanguageContext'

export default function MarketingUTMBuilder() {
  const { language, t } = useLanguage()
  const [baseUrl, setBaseUrl] = useState('https://example.com/page')
  const [utmSource, setUtmSource] = useState('')
  const [utmMedium, setUtmMedium] = useState('')
  const [utmCampaign, setUtmCampaign] = useState('')
  const [utmTerm, setUtmTerm] = useState('')
  const [utmContent, setUtmContent] = useState('')

  const params: [string, string][] = []
  if (utmSource) params.push(['utm_source', utmSource])
  if (utmMedium) params.push(['utm_medium', utmMedium])
  if (utmCampaign) params.push(['utm_campaign', utmCampaign])
  if (utmTerm) params.push(['utm_term', utmTerm])
  if (utmContent) params.push(['utm_content', utmContent])
  const query = new URLSearchParams(params).toString()
  const builtUrl = query ? `${baseUrl.replace(/\?.*$/, '')}?${query}` : baseUrl

  const copy = () => {
    navigator.clipboard.writeText(builtUrl)
  }

  return (
    <div className="p-6 max-w-2xl" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        {language === 'ar' ? 'أداة بناء UTM (واجهة فقط)' : 'UTM Builder (UI only)'}
      </h1>
      <p className="text-sm text-gray-600 mb-6">
        {language === 'ar' ? 'أنشئ روابط تتبع بدون حفظ.' : 'Build tracking links without saving.'}
      </p>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            {language === 'ar' ? 'رابط الصفحة' : 'Page URL'}
          </label>
          <input
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">utm_source</label>
            <input
              type="text"
              value={utmSource}
              onChange={(e) => setUtmSource(e.target.value)}
              placeholder="e.g. newsletter"
              className="w-full px-3 py-2 rounded-lg border border-gray-200"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">utm_medium</label>
            <input
              type="text"
              value={utmMedium}
              onChange={(e) => setUtmMedium(e.target.value)}
              placeholder="e.g. email"
              className="w-full px-3 py-2 rounded-lg border border-gray-200"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">utm_campaign</label>
            <input
              type="text"
              value={utmCampaign}
              onChange={(e) => setUtmCampaign(e.target.value)}
              placeholder="e.g. summer_sale"
              className="w-full px-3 py-2 rounded-lg border border-gray-200"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">utm_term</label>
            <input
              type="text"
              value={utmTerm}
              onChange={(e) => setUtmTerm(e.target.value)}
              placeholder="optional"
              className="w-full px-3 py-2 rounded-lg border border-gray-200"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">utm_content</label>
            <input
              type="text"
              value={utmContent}
              onChange={(e) => setUtmContent(e.target.value)}
              placeholder="optional"
              className="w-full px-3 py-2 rounded-lg border border-gray-200"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            {language === 'ar' ? 'الرابط الناتج' : 'Result URL'}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={builtUrl}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-800"
            />
            <button
              type="button"
              onClick={copy}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700"
            >
              {language === 'ar' ? 'نسخ' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
