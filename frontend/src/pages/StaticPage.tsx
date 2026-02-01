import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import ReactMarkdown from 'react-markdown'
import { getPublicSettings, type PublicSettings } from '../shared/settings/publicSettings'

export default function StaticPage() {
  const { slug } = useParams<{ slug: string }>()
  const { language } = useLanguage()
  const location = useLocation()
  const navigate = useNavigate()
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
  }, [slug])

  const effectiveSlug = useMemo(() => {
    if (slug) return slug
    const p = String(location.pathname || '').replace(/^\//, '')
    return p || ''
  }, [slug, location.pathname])

  // No spinner/skeleton on static pages: show gentle fallback immediately.
  const effectiveSettings = settings || ({ sitePages: [] } as any)

  const pages = Array.isArray(effectiveSettings?.sitePages) ? effectiveSettings!.sitePages : []
  const page = pages.find((p: any) => String(p.slug) === effectiveSlug) || null
  const published = page?.published === true

  const title = page ? (language === 'ar' ? (page.titleAr || page.titleEn) : (page.titleEn || page.titleAr)) : ''
  const body = page ? (language === 'ar' ? (page.contentAr || page.contentEn) : (page.contentEn || page.contentAr)) : ''

  // If not published OR content empty -> gentle banner (no raw errors)
  const hasBody = !!String(body || '').trim()
  if (!page || !published) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-10 text-center">
          <div className="text-2xl font-extrabold text-gray-900">
            {language === 'en' ? 'Content coming soon' : 'سيتم إضافة المحتوى قريبًا'}
          </div>
          <div className="mt-2 text-sm font-bold text-gray-600">
            {language === 'en' ? 'This page will be available soon.' : 'هذه الصفحة ستتوفر قريبًا.'}
          </div>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-5 px-5 py-3 rounded-2xl bg-gray-900 text-white text-sm font-extrabold hover:bg-gray-800 transition"
          >
            {language === 'en' ? 'Back to home' : 'العودة للرئيسية'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <article className="bg-white rounded-2xl border border-gray-100 p-6 md:p-10">
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-5">{title}</h1>
        {!hasBody ? (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-700">
            {language === 'en' ? 'Content will be added soon.' : 'سيتم إضافة المحتوى قريبًا.'}
          </div>
        ) : (
          <div className="prose prose-slate max-w-none">
            <ReactMarkdown>{body}</ReactMarkdown>
          </div>
        )}
      </article>
    </div>
  )
}

