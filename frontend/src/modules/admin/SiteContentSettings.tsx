import { useEffect, useMemo, useState } from 'react'
import api from '../../utils/api'
import { useLanguage } from '../../context/LanguageContext'
import { Card } from '../../shared/admin/ui/components/Card'
import { SectionHeader } from '../../shared/admin/ui/components/SectionHeader'
import { Button } from '../../shared/admin/ui/components/Button'
import ReactMarkdown from 'react-markdown'

type HeaderLink = { key: string; label_ar: string; label_en: string; href: string; external: boolean }
type FooterLink = { label_ar: string; label_en: string; href: string; external: boolean }
type FooterColumn = { title_ar: string; title_en: string; links: FooterLink[] }

type SiteLinks = {
  headerLinks: HeaderLink[]
  footerColumns: FooterColumn[]
  // keep existing (backward compatible)
  support?: { whatsappNumber?: string | null; whatsappMessageAr?: string | null; whatsappMessageEn?: string | null }
  header?: { showSupportButton?: boolean; supportLabelAr?: string; supportLabelEn?: string }
}

type SitePage = {
  slug: string
  titleAr: string
  titleEn: string
  contentAr: string
  contentEn: string
  published: boolean
}

type SiteSupport = { whatsappNumber: string | null; phone: string | null; email: string | null; hours_ar: string | null; hours_en: string | null }
type TrustItem = { icon: 'truck' | 'lock' | 'phone'; color: string; labelAr: string; labelEn: string; enabled: boolean }
type TrustFeatures = TrustItem[]

const defaults: { siteLinks: SiteLinks; sitePages: SitePage[]; siteSupport: SiteSupport; trustFeatures: TrustFeatures } = {
  siteLinks: {
    headerLinks: [
      { key: 'categories', label_ar: 'الأقسام', label_en: 'Categories', href: '/categories', external: false },
      { key: 'products', label_ar: 'جميع المنتجات', label_en: 'Products', href: '/products', external: false },
      { key: 'orders', label_ar: 'طلباتي', label_en: 'Orders', href: '/orders', external: false },
    ],
    footerColumns: [
      {
        title_ar: 'روابط سريعة',
        title_en: 'Links',
        links: [
          { label_ar: 'الرئيسية', label_en: 'Home', href: '/', external: false },
          { label_ar: 'الأقسام', label_en: 'Categories', href: '/categories', external: false },
          { label_ar: 'جميع المنتجات', label_en: 'Products', href: '/products', external: false },
          { label_ar: 'اتصل بنا', label_en: 'Contact', href: '/contact', external: false },
        ],
      },
      {
        title_ar: 'السياسات',
        title_en: 'Policies',
        links: [
          { label_ar: 'الخصوصية', label_en: 'Privacy', href: '/p/privacy', external: false },
          { label_ar: 'الشروط', label_en: 'Terms', href: '/p/terms', external: false },
          { label_ar: 'الاسترجاع', label_en: 'Returns', href: '/p/shipping-returns', external: false },
        ],
      },
      {
        title_ar: 'عن تومو',
        title_en: 'About',
        links: [
          { label_ar: 'من نحن', label_en: 'About', href: '/p/about', external: false },
          { label_ar: 'الدعم', label_en: 'Support', href: '/contact', external: false },
        ],
      },
    ],
    support: { whatsappNumber: null, whatsappMessageAr: null, whatsappMessageEn: null },
    header: { showSupportButton: true, supportLabelAr: 'خدمة العملاء', supportLabelEn: 'Support' },
  },
  // Defaults required
  sitePages: [
    { slug: 'privacy', titleAr: '', titleEn: '', contentAr: '', contentEn: '', published: false },
    { slug: 'terms', titleAr: '', titleEn: '', contentAr: '', contentEn: '', published: false },
    { slug: 'shipping-returns', titleAr: '', titleEn: '', contentAr: '', contentEn: '', published: false },
  ],
  siteSupport: { whatsappNumber: null, phone: null, email: null, hours_ar: null, hours_en: null },
  trustFeatures: [
    { icon: 'truck', color: '#10b981', labelAr: 'توصيل سريع داخل مدينتك', labelEn: 'Fast delivery in your city', enabled: true },
    { icon: 'lock', color: '#f59e0b', labelAr: 'دفع آمن 100%', labelEn: '100% secure payment', enabled: true },
    { icon: 'phone', color: '#3b82f6', labelAr: 'دعم عملاء متاح', labelEn: 'Customer support available', enabled: true },
  ],
}

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function slugify(input: string) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function SiteContentSettings() {
  const { language } = useLanguage()
  const isRTL = language === 'ar'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState<'links' | 'pages' | 'support'>('links')

  const [base, setBase] = useState<any>(null)
  const [siteLinks, setSiteLinks] = useState<SiteLinks>(defaults.siteLinks)
  const [sitePages, setSitePages] = useState<SitePage[]>(defaults.sitePages)
  const [siteSupport, setSiteSupport] = useState<SiteSupport>(defaults.siteSupport)
  const [trustFeatures, setTrustFeatures] = useState<TrustFeatures>(defaults.trustFeatures)
  const [showPreview, setShowPreview] = useState(false)

  const [selectedSlug, setSelectedSlug] = useState<string>(defaults.sitePages[0]?.slug || 'privacy')
  const [slugConflict, setSlugConflict] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const res = await api.get('/api/settings')
        if (cancelled) return
        const s = res.data || {}
        setBase(s)
        setSiteLinks((s.siteLinks || s.site_links || defaults.siteLinks) as SiteLinks)
        const sp: any = (s.sitePages || s.site_pages || defaults.sitePages)
        const pagesArr = Array.isArray(sp) ? sp : Array.isArray(sp?.pages) ? sp.pages : defaults.sitePages
        setSitePages(pagesArr as any)
        setSiteSupport((s.siteSupport || s.site_support || defaults.siteSupport) as SiteSupport)
        const tfAny = (s.trustFeatures || s.trust_features) as any
        setTrustFeatures((Array.isArray(tfAny) ? tfAny : Array.isArray(tfAny?.items) ? tfAny.items : defaults.trustFeatures) as TrustFeatures)
      } catch {
        if (!cancelled) {
          setBase(null)
          setSiteLinks(defaults.siteLinks)
          setSitePages(defaults.sitePages)
          setSiteSupport(defaults.siteSupport)
          setTrustFeatures(defaults.trustFeatures)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const canSave = useMemo(() => !!base && !saving, [base, saving])

  useEffect(() => {
    if (!saved) return
    const t = setTimeout(() => setSaved(false), 2200)
    return () => clearTimeout(t)
  }, [saved])

  const onReset = () => {
    setSiteLinks(defaults.siteLinks)
    setSitePages(defaults.sitePages)
    setSiteSupport(defaults.siteSupport)
    setTrustFeatures(defaults.trustFeatures)
    setSelectedSlug(defaults.sitePages[0]?.slug || 'privacy')
    setShowPreview(false)
    setSlugConflict(false)
  }

  const onSave = async () => {
    if (!base) return
    try {
      setSaving(true)
      const payload = { ...base, siteLinks, sitePages, siteSupport, trustFeatures }
      const res = await api.put('/api/settings', payload)
      setBase(res.data || payload)
      setSaved(true)
      try {
        localStorage.removeItem('public_settings_cache_v1')
      } catch {
        // ignore
      }
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'links' as const, label: isRTL ? 'روابط الموقع' : 'Site Links' },
    { id: 'pages' as const, label: isRTL ? 'صفحات الموقع' : 'Site Pages' },
    { id: 'support' as const, label: isRTL ? 'الدعم وميزات الثقة' : 'Support & Trust' },
  ]

  const selectedPage = (sitePages || []).find((p) => p.slug === selectedSlug) || null

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <SectionHeader title={isRTL ? 'محتوى الموقع' : 'Site Content'} description={isRTL ? 'إدارة المحتوى عبر /api/settings' : 'Manage content via /api/settings'} />
        <Card className="p-4">Loading…</Card>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <SectionHeader
        title={isRTL ? 'محتوى الموقع' : 'Site Content'}
        description={isRTL ? 'روابط الهيدر/الفوتر + صفحات Markdown + بيانات الدعم' : 'Header/footer links + Markdown pages + support info'}
        right={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onReset}>
              {isRTL ? 'Reset' : 'Reset'}
            </Button>
            <Button variant="primary" size="sm" disabled={!canSave} onClick={onSave}>
              {saving ? (isRTL ? 'جارٍ الحفظ…' : 'Saving…') : isRTL ? 'حفظ' : 'Save'}
            </Button>
          </div>
        }
      />

      {saved ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-extrabold text-emerald-800">
          {isRTL ? 'تم الحفظ بنجاح' : 'Saved successfully'}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-2xl text-sm font-extrabold border transition ${
              tab === t.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'links' ? (
        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-extrabold text-gray-900">{isRTL ? 'روابط الهيدر' : 'Header links'}</div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  setSiteLinks((s) => ({
                    ...s,
                    headerLinks: [...(s.headerLinks || []), { key: uid(), label_ar: 'رابط', label_en: 'Link', href: '/', external: false }],
                  }))
                }
              >
                {isRTL ? 'إضافة' : 'Add'}
              </Button>
            </div>

            <div className="space-y-2">
              {(siteLinks.headerLinks || []).map((l, idx) => (
                <div key={l.key || String(idx)} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
                  <input
                    value={l.label_ar}
                    onChange={(e) =>
                      setSiteLinks((s) => ({
                        ...s,
                        headerLinks: (s.headerLinks || []).map((x) => (x.key === l.key ? { ...x, label_ar: e.target.value } : x)),
                      }))
                    }
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none"
                    placeholder="label_ar"
                  />
                  <input
                    value={l.label_en}
                    onChange={(e) =>
                      setSiteLinks((s) => ({
                        ...s,
                        headerLinks: (s.headerLinks || []).map((x) => (x.key === l.key ? { ...x, label_en: e.target.value } : x)),
                      }))
                    }
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none"
                    placeholder="label_en"
                  />
                  <input
                    value={l.href}
                    onChange={(e) =>
                      setSiteLinks((s) => ({
                        ...s,
                        headerLinks: (s.headerLinks || []).map((x) => (x.key === l.key ? { ...x, href: e.target.value } : x)),
                      }))
                    }
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none md:col-span-2"
                    placeholder="/p/privacy or https://..."
                  />
                  <label className="flex items-center gap-2 text-xs font-extrabold text-gray-700">
                    <input
                      type="checkbox"
                      checked={!!l.external}
                      onChange={(e) =>
                        setSiteLinks((s) => ({
                          ...s,
                          headerLinks: (s.headerLinks || []).map((x) => (x.key === l.key ? { ...x, external: e.target.checked } : x)),
                        }))
                      }
                    />
                    external
                  </label>
                  <button
                    type="button"
                    className="text-xs font-extrabold text-red-600"
                    onClick={() => setSiteLinks((s) => ({ ...s, headerLinks: (s.headerLinks || []).filter((x) => x.key !== l.key) }))}
                  >
                    {isRTL ? 'حذف' : 'Remove'}
                  </button>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-extrabold text-gray-900">{isRTL ? 'أعمدة الفوتر' : 'Footer columns'}</div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  setSiteLinks((s) => ({
                    ...s,
                    footerColumns: [...(s.footerColumns || []), { title_ar: 'عمود', title_en: 'Column', links: [] }],
                  }))
                }
              >
                {isRTL ? 'إضافة عمود' : 'Add column'}
              </Button>
            </div>

            <div className="space-y-3">
              {(siteLinks.footerColumns || []).map((c, cIdx) => (
                <Card key={`${c.title_ar}-${cIdx}`} className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-extrabold text-gray-700">{isRTL ? 'عمود' : 'Column'} #{cIdx + 1}</div>
                    <button
                      type="button"
                      className="text-xs font-extrabold text-red-600"
                      onClick={() => setSiteLinks((s) => ({ ...s, footerColumns: (s.footerColumns || []).filter((_, i) => i !== cIdx) }))}
                    >
                      {isRTL ? 'حذف' : 'Remove'}
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input
                      value={c.title_ar}
                      onChange={(e) =>
                        setSiteLinks((s) => ({
                          ...s,
                          footerColumns: (s.footerColumns || []).map((x, i) => (i === cIdx ? { ...x, title_ar: e.target.value } : x)),
                        }))
                      }
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none"
                      placeholder="title_ar"
                    />
                    <input
                      value={c.title_en}
                      onChange={(e) =>
                        setSiteLinks((s) => ({
                          ...s,
                          footerColumns: (s.footerColumns || []).map((x, i) => (i === cIdx ? { ...x, title_en: e.target.value } : x)),
                        }))
                      }
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none"
                      placeholder="title_en"
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="text-xs font-extrabold text-gray-700">{isRTL ? 'روابط' : 'Links'}</div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setSiteLinks((s) => ({
                          ...s,
                          footerColumns: (s.footerColumns || []).map((x, i) =>
                            i === cIdx ? { ...x, links: [...x.links, { label_ar: 'رابط', label_en: 'Link', href: '/', external: false }] } : x
                          ),
                        }))
                      }
                    >
                      {isRTL ? 'إضافة رابط' : 'Add link'}
                    </Button>
                  </div>

                  <div className="mt-2 space-y-2">
                    {c.links.map((l, lIdx) => (
                      <div key={`${l.href}-${lIdx}`} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
                        <input
                          value={l.label_ar}
                          onChange={(e) =>
                            setSiteLinks((s) => ({
                              ...s,
                              footerColumns: (s.footerColumns || []).map((x, i) =>
                                i === cIdx
                                  ? { ...x, links: x.links.map((y, j) => (j === lIdx ? { ...y, label_ar: e.target.value } : y)) }
                                  : x
                              ),
                            }))
                          }
                          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none"
                          placeholder="label_ar"
                        />
                        <input
                          value={l.label_en}
                          onChange={(e) =>
                            setSiteLinks((s) => ({
                              ...s,
                              footerColumns: (s.footerColumns || []).map((x, i) =>
                                i === cIdx
                                  ? { ...x, links: x.links.map((y, j) => (j === lIdx ? { ...y, label_en: e.target.value } : y)) }
                                  : x
                              ),
                            }))
                          }
                          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none"
                          placeholder="label_en"
                        />
                        <input
                          value={l.href}
                          onChange={(e) =>
                            setSiteLinks((s) => ({
                              ...s,
                              footerColumns: (s.footerColumns || []).map((x, i) =>
                                i === cIdx ? { ...x, links: x.links.map((y, j) => (j === lIdx ? { ...y, href: e.target.value } : y)) } : x
                              ),
                            }))
                          }
                          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none md:col-span-2"
                          placeholder="/p/privacy or https://..."
                        />
                        <label className="flex items-center gap-2 text-xs font-extrabold text-gray-700">
                          <input
                            type="checkbox"
                            checked={!!l.external}
                            onChange={(e) =>
                              setSiteLinks((s) => ({
                                ...s,
                                footerColumns: (s.footerColumns || []).map((x, i) =>
                                  i === cIdx ? { ...x, links: x.links.map((y, j) => (j === lIdx ? { ...y, external: e.target.checked } : y)) } : x
                                ),
                              }))
                            }
                          />
                          external
                        </label>
                        <button
                          type="button"
                          className="text-xs font-extrabold text-red-600"
                          onClick={() =>
                            setSiteLinks((s) => ({
                              ...s,
                              footerColumns: (s.footerColumns || []).map((x, i) =>
                                i === cIdx ? { ...x, links: x.links.filter((_, j) => j !== lIdx) } : x
                              ),
                            }))
                          }
                        >
                          {isRTL ? 'حذف' : 'Remove'}
                        </button>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </div>
      ) : null}

      {tab === 'pages' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="p-4 lg:col-span-1">
            <div className="text-base font-extrabold text-gray-900">{isRTL ? 'Site Pages' : 'Site Pages'}</div>
            <div className="mt-1 text-xs font-bold text-gray-600">{isRTL ? 'إدارة صفحات الموقع داخل settings.sitePages' : 'Manage pages stored in settings.sitePages'}</div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-extrabold text-gray-900">{isRTL ? 'الصفحات' : 'Pages'}</div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const slug = `page-${Math.floor(Date.now() / 1000)}`
                  const next: SitePage = { slug, titleAr: 'صفحة جديدة', titleEn: 'New page', contentAr: '', contentEn: '', published: false }
                  setSitePages((s) => [next, ...(s || [])])
                  setSelectedSlug(slug)
                  setShowPreview(false)
                  setSlugConflict(false)
                }}
              >
                {isRTL ? 'إضافة' : 'Add'}
              </Button>
            </div>
            <div className="mt-3 space-y-2">
              {(sitePages || []).map((p) => (
                <button
                  key={p.slug}
                  type="button"
                  onClick={() => setSelectedSlug(p.slug)}
                  className={`w-full text-left rounded-2xl border px-3 py-2 text-sm font-extrabold transition ${
                    selectedSlug === p.slug ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {isRTL ? p.titleAr || p.slug : p.titleEn || p.slug}
                  <div className={`text-[11px] font-bold opacity-80 ${selectedSlug === p.slug ? 'text-white/80' : 'text-gray-500'}`}>/p/{p.slug}</div>
                </button>
              ))}
            </div>
          </Card>

          <div className="lg:col-span-2 space-y-4">
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-extrabold text-gray-900">{isRTL ? 'تحرير الصفحة' : 'Edit page'}</div>
                <div className="flex items-center gap-2">
                  {selectedPage ? (
                    <Button variant="secondary" size="sm" onClick={() => setShowPreview((v) => !v)}>
                      {isRTL ? 'Preview' : 'Preview'}
                    </Button>
                  ) : null}
                  <Button variant="primary" size="sm" disabled={!canSave} onClick={onSave}>
                    {saving ? (isRTL ? 'جارٍ الحفظ…' : 'Saving…') : isRTL ? 'Save' : 'Save'}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={onReset}>
                    {isRTL ? 'Reset' : 'Reset'}
                  </Button>
                  {selectedPage ? (
                    <button
                      type="button"
                      className="text-xs font-extrabold text-red-600"
                      onClick={() => {
                        const nextPages = (sitePages || []).filter((x) => x.slug !== selectedPage.slug)
                        setSitePages(nextPages)
                        setSelectedSlug(nextPages[0]?.slug || '')
                        setShowPreview(false)
                        setSlugConflict(false)
                      }}
                    >
                      {isRTL ? 'حذف' : 'Delete'}
                    </button>
                  ) : null}
                </div>
              </div>

              {!selectedPage ? (
                <div className="text-sm font-bold text-gray-600">{isRTL ? 'اختر صفحة' : 'Select a page'}</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs font-extrabold text-gray-700 mb-1">slug</div>
                      <input
                        value={selectedPage.slug}
                        onChange={(e) => {
                          const nextSlug = slugify(e.target.value) || selectedPage.slug
                          const taken = (sitePages || []).some((x) => x.slug === nextSlug && x.slug !== selectedPage.slug)
                          setSlugConflict(taken)
                          if (taken) return
                          setSitePages((s) => (s || []).map((x) => (x.slug === selectedPage.slug ? { ...x, slug: nextSlug } : x)))
                          setSelectedSlug(nextSlug)
                        }}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none"
                      />
                      {slugConflict ? <div className="mt-1 text-[11px] font-bold text-amber-700">{isRTL ? 'slug مستخدم بالفعل' : 'Slug already exists'}</div> : null}
                    </div>
                    <label className="flex items-center gap-2 text-sm font-extrabold text-gray-700 mt-6">
                      <input
                        type="checkbox"
                        checked={selectedPage.published === true}
                        onChange={(e) =>
                          setSitePages((s) => (s || []).map((x) => (x.slug === selectedPage.slug ? { ...x, published: e.target.checked } : x)))
                        }
                      />
                      {isRTL ? 'منشورة' : 'Published'}
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input
                      value={selectedPage.titleAr}
                      onChange={(e) =>
                        setSitePages((s) => (s || []).map((x) => (x.slug === selectedPage.slug ? { ...x, titleAr: e.target.value } : x)))
                      }
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none"
                      placeholder="titleAR"
                    />
                    <input
                      value={selectedPage.titleEn}
                      onChange={(e) =>
                        setSitePages((s) => (s || []).map((x) => (x.slug === selectedPage.slug ? { ...x, titleEn: e.target.value } : x)))
                      }
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none"
                      placeholder="titleEN"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs font-extrabold text-gray-700 mb-1">contentAR (Markdown)</div>
                      <textarea
                        value={selectedPage.contentAr}
                        onChange={(e) =>
                          setSitePages((s) => (s || []).map((x) => (x.slug === selectedPage.slug ? { ...x, contentAr: e.target.value } : x)))
                        }
                        rows={16}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none"
                      />
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-gray-700 mb-1">contentEN (Markdown)</div>
                      <textarea
                        value={selectedPage.contentEn}
                        onChange={(e) =>
                          setSitePages((s) => (s || []).map((x) => (x.slug === selectedPage.slug ? { ...x, contentEn: e.target.value } : x)))
                        }
                        rows={16}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none"
                      />
                    </div>
                  </div>
                </>
              )}
            </Card>

            {selectedPage && showPreview ? (
              <Card className="p-4">
                <div className="text-sm font-extrabold text-gray-900 mb-2">{isRTL ? 'Preview' : 'Preview'}</div>
                <div className="prose prose-slate max-w-none" dir={isRTL ? 'rtl' : 'ltr'}>
                  <ReactMarkdown>{isRTL ? selectedPage.contentAr : selectedPage.contentEn}</ReactMarkdown>
                </div>
              </Card>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === 'support' ? (
        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <div className="text-sm font-extrabold text-gray-900">{isRTL ? 'بيانات الدعم' : 'Support info'}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                value={siteSupport.whatsappNumber || ''}
                onChange={(e) => setSiteSupport((s) => ({ ...s, whatsappNumber: e.target.value || null }))}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none"
                placeholder="whatsappNumber (no +)"
              />
              <input
                value={siteSupport.phone || ''}
                onChange={(e) => setSiteSupport((s) => ({ ...s, phone: e.target.value || null }))}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none"
                placeholder="phone"
              />
              <input
                value={siteSupport.email || ''}
                onChange={(e) => setSiteSupport((s) => ({ ...s, email: e.target.value || null }))}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none"
                placeholder="email"
              />
              <input
                value={siteSupport.hours_ar || ''}
                onChange={(e) => setSiteSupport((s) => ({ ...s, hours_ar: e.target.value || null }))}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none"
                placeholder="hours_ar"
              />
              <input
                value={siteSupport.hours_en || ''}
                onChange={(e) => setSiteSupport((s) => ({ ...s, hours_en: e.target.value || null }))}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none"
                placeholder="hours_en"
              />
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-extrabold text-gray-900">{isRTL ? 'ميزات الثقة' : 'Trust features'}</div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  setTrustFeatures((s) =>
                    [...(Array.isArray(s) ? s : []), { icon: 'truck' as const, color: '#10b981', labelAr: '', labelEn: '', enabled: true }].slice(0, 8)
                  )
                }
              >
                {isRTL ? 'إضافة' : 'Add'}
              </Button>
            </div>
            <div className="space-y-2">
              {(trustFeatures || []).map((it, idx) => (
                <div key={`${it.icon}-${idx}`} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
                  <select
                    value={it.icon}
                    onChange={(e) =>
                      setTrustFeatures((s) => (Array.isArray(s) ? s.map((x, i) => (i === idx ? { ...x, icon: e.target.value as any } : x)) : []))
                    }
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none"
                  >
                    <option value="truck">truck</option>
                    <option value="lock">lock</option>
                    <option value="phone">phone</option>
                  </select>
                  <input
                    type="color"
                    value={it.color || '#10b981'}
                    onChange={(e) =>
                      setTrustFeatures((s) => (Array.isArray(s) ? s.map((x, i) => (i === idx ? { ...x, color: e.target.value } : x)) : []))
                    }
                    className="h-[42px] w-full rounded-xl border border-gray-200 bg-white px-2 py-2"
                    aria-label="color"
                    title="color"
                  />
                  <input
                    value={it.labelAr}
                    onChange={(e) =>
                      setTrustFeatures((s) => (Array.isArray(s) ? s.map((x, i) => (i === idx ? { ...x, labelAr: e.target.value } : x)) : []))
                    }
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none"
                    placeholder="labelAr"
                  />
                  <input
                    value={it.labelEn}
                    onChange={(e) =>
                      setTrustFeatures((s) => (Array.isArray(s) ? s.map((x, i) => (i === idx ? { ...x, labelEn: e.target.value } : x)) : []))
                    }
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none"
                    placeholder="labelEn"
                  />
                  <label className="flex items-center gap-2 text-xs font-extrabold text-gray-700">
                    <input
                      type="checkbox"
                      checked={it.enabled !== false}
                      onChange={(e) =>
                        setTrustFeatures((s) => (Array.isArray(s) ? s.map((x, i) => (i === idx ? { ...x, enabled: e.target.checked } : x)) : []))
                      }
                    />
                    enabled
                  </label>
                  <button
                    type="button"
                    className="text-xs font-extrabold text-red-600"
                    onClick={() => setTrustFeatures((s) => (Array.isArray(s) ? s.filter((_, i) => i !== idx) : []))}
                  >
                    {isRTL ? 'حذف' : 'Remove'}
                  </button>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
              <div className="text-xs font-extrabold text-gray-700 mb-2">{isRTL ? 'Preview' : 'Preview'}</div>
              <div className="flex flex-wrap gap-2">
                {(trustFeatures || []).filter((x) => x.enabled !== false).slice(0, 5).map((it, idx) => (
                  <span key={`${it.icon}-${idx}`} className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200 bg-white">
                    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: it.color || '#64748b' }} />
                    <span className="text-xs font-extrabold text-gray-700">{isRTL ? it.labelAr : it.labelEn}</span>
                  </span>
                ))}
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  )
}

