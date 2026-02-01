import { useEffect, useMemo, useState } from 'react'
import api from '../../utils/api'
import { useLanguage } from '../../context/LanguageContext'
import { Card } from '../../shared/admin/ui/components/Card'
import { SectionHeader } from '../../shared/admin/ui/components/SectionHeader'
import { Button } from '../../shared/admin/ui/components/Button'

type SiteLink = { id: string; labelAr: string; labelEn: string; url: string; external: boolean }
type SiteColumn = { id: string; titleAr: string; titleEn: string; links: SiteLink[] }
type TrustItem = { id: string; textAr: string; textEn: string; icon: string }

type SiteLinks = {
  support: { whatsappNumber: string | null; whatsappMessageAr: string | null; whatsappMessageEn: string | null }
  header: { showSupportButton: boolean; supportLabelAr: string; supportLabelEn: string }
  footer: { columns: SiteColumn[]; trustItems: TrustItem[] }
}

const defaults: SiteLinks = {
  support: { whatsappNumber: null, whatsappMessageAr: null, whatsappMessageEn: null },
  header: { showSupportButton: true, supportLabelAr: 'خدمة العملاء', supportLabelEn: 'Support' },
  footer: {
    columns: [
      {
        id: 'about',
        titleAr: 'عن تومو',
        titleEn: 'About',
        links: [
          { id: 'about', labelAr: 'عن تومو', labelEn: 'About', url: '/about', external: false },
          { id: 'shipping', labelAr: 'الشحن والاسترجاع', labelEn: 'Shipping & Returns', url: '/shipping-returns', external: false },
        ],
      },
      {
        id: 'links',
        titleAr: 'روابط سريعة',
        titleEn: 'Links',
        links: [
          { id: 'home', labelAr: 'الرئيسية', labelEn: 'Home', url: '/', external: false },
          { id: 'categories', labelAr: 'الأقسام', labelEn: 'Categories', url: '/categories', external: false },
          { id: 'products', labelAr: 'جميع المنتجات', labelEn: 'Products', url: '/products', external: false },
          { id: 'orders', labelAr: 'تتبع الطلب', labelEn: 'Orders', url: '/orders', external: false },
        ],
      },
      {
        id: 'support',
        titleAr: 'الدعم',
        titleEn: 'Support',
        links: [
          { id: 'contact', labelAr: 'تواصل معنا', labelEn: 'Contact', url: '/contact', external: false },
          { id: 'privacy', labelAr: 'الخصوصية', labelEn: 'Privacy', url: '/privacy', external: false },
          { id: 'terms', labelAr: 'الشروط', labelEn: 'Terms', url: '/terms', external: false },
        ],
      },
    ],
    trustItems: [
      { id: 'fast', textAr: 'توصيل سريع', textEn: 'Fast delivery', icon: '🚚' },
      { id: 'secure', textAr: 'دفع آمن', textEn: 'Secure payment', icon: '🔒' },
      { id: 'support', textAr: 'دعم عملاء', textEn: 'Support', icon: '📞' },
    ],
  },
}

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export default function SiteLinksSettings() {
  const { language } = useLanguage()
  const isRTL = language === 'ar'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [base, setBase] = useState<any>(null)
  const [siteLinks, setSiteLinks] = useState<SiteLinks>(defaults)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const res = await api.get('/api/settings')
        if (cancelled) return
        const s = res.data || {}
        setBase(s)
        setSiteLinks((s.siteLinks || s.site_links || defaults) as SiteLinks)
      } catch {
        if (!cancelled) {
          setBase(null)
          setSiteLinks(defaults)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const onReset = () => setSiteLinks(defaults)

  const canSave = useMemo(() => !!base && !saving, [base, saving])

  const onSave = async () => {
    if (!base) return
    try {
      setSaving(true)
      const payload = { ...base, siteLinks }
      const res = await api.put('/api/settings', payload)
      setBase(res.data || payload)
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

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <SectionHeader title="Site Links" description={isRTL ? 'إدارة روابط الهيدر/الفوتر' : 'Manage header/footer links'} />
        <Card className="p-4">Loading…</Card>
      </div>
    )
  }

  const supportLabel = isRTL ? siteLinks.header.supportLabelAr : siteLinks.header.supportLabelEn
  const waUrl = siteLinks.support.whatsappNumber
    ? `https://wa.me/${siteLinks.support.whatsappNumber}`
    : '/contact'

  return (
    <div className="max-w-5xl mx-auto space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <SectionHeader
        title={isRTL ? 'Site Links' : 'Site Links'}
        description={isRTL ? 'تحكم بروابط الهيدر والفوتر (باستخدام /api/settings فقط)' : 'Control header/footer links (via /api/settings only)'}
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

      {/* Support */}
      <Card className="p-4 space-y-4">
        <div className="text-sm font-extrabold text-gray-900">{isRTL ? 'Support' : 'Support'}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-extrabold text-gray-700 mb-1">{isRTL ? 'WhatsApp number (بدون +)' : 'WhatsApp number (no +)'}</div>
            <input
              value={siteLinks.support.whatsappNumber || ''}
              onChange={(e) => setSiteLinks((s) => ({ ...s, support: { ...s.support, whatsappNumber: e.target.value || null } }))}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none"
              placeholder="9665XXXXXXX"
            />
          </div>
          <div>
            <div className="text-xs font-extrabold text-gray-700 mb-1">{isRTL ? 'Message AR (اختياري)' : 'Message AR (optional)'}</div>
            <input
              value={siteLinks.support.whatsappMessageAr || ''}
              onChange={(e) => setSiteLinks((s) => ({ ...s, support: { ...s.support, whatsappMessageAr: e.target.value || null } }))}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none"
            />
          </div>
          <div>
            <div className="text-xs font-extrabold text-gray-700 mb-1">{isRTL ? 'Message EN (اختياري)' : 'Message EN (optional)'}</div>
            <input
              value={siteLinks.support.whatsappMessageEn || ''}
              onChange={(e) => setSiteLinks((s) => ({ ...s, support: { ...s.support, whatsappMessageEn: e.target.value || null } }))}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
            <input
              type="checkbox"
              checked={siteLinks.header.showSupportButton}
              onChange={(e) => setSiteLinks((s) => ({ ...s, header: { ...s.header, showSupportButton: e.target.checked } }))}
            />
            {isRTL ? 'Show support button' : 'Show support button'}
          </label>
          <div />
          <div>
            <div className="text-xs font-extrabold text-gray-700 mb-1">{isRTL ? 'Label AR' : 'Label AR'}</div>
            <input
              value={siteLinks.header.supportLabelAr}
              onChange={(e) => setSiteLinks((s) => ({ ...s, header: { ...s.header, supportLabelAr: e.target.value } }))}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none"
            />
          </div>
          <div>
            <div className="text-xs font-extrabold text-gray-700 mb-1">{isRTL ? 'Label EN' : 'Label EN'}</div>
            <input
              value={siteLinks.header.supportLabelEn}
              onChange={(e) => setSiteLinks((s) => ({ ...s, header: { ...s.header, supportLabelEn: e.target.value } }))}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
          <div className="text-xs font-extrabold text-gray-700 mb-2">{isRTL ? 'Preview' : 'Preview'}</div>
          <a href={waUrl} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 font-extrabold text-sm">
            <span>💬</span>
            <span>{supportLabel}</span>
          </a>
        </div>
      </Card>

      {/* Footer columns */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-extrabold text-gray-900">{isRTL ? 'Footer columns' : 'Footer columns'}</div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              setSiteLinks((s) => ({
                ...s,
                footer: {
                  ...s.footer,
                  columns: [...s.footer.columns, { id: uid(), titleAr: 'عمود', titleEn: 'Column', links: [] }],
                },
              }))
            }
          >
            {isRTL ? 'Add column' : 'Add column'}
          </Button>
        </div>

        <div className="space-y-3">
          {siteLinks.footer.columns.map((col, colIdx) => (
            <Card key={col.id} className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-extrabold text-gray-700">{isRTL ? 'Column' : 'Column'} #{colIdx + 1}</div>
                <button
                  className="text-xs font-extrabold text-red-600"
                  type="button"
                  onClick={() =>
                    setSiteLinks((s) => ({
                      ...s,
                      footer: { ...s.footer, columns: s.footer.columns.filter((c) => c.id !== col.id) },
                    }))
                  }
                >
                  {isRTL ? 'Remove' : 'Remove'}
                </button>
              </div>

              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                <input
                  value={col.titleAr}
                  onChange={(e) =>
                    setSiteLinks((s) => ({
                      ...s,
                      footer: {
                        ...s.footer,
                        columns: s.footer.columns.map((c) => (c.id === col.id ? { ...c, titleAr: e.target.value } : c)),
                      },
                    }))
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none"
                  placeholder="العنوان (AR)"
                />
                <input
                  value={col.titleEn}
                  onChange={(e) =>
                    setSiteLinks((s) => ({
                      ...s,
                      footer: {
                        ...s.footer,
                        columns: s.footer.columns.map((c) => (c.id === col.id ? { ...c, titleEn: e.target.value } : c)),
                      },
                    }))
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none"
                  placeholder="Title (EN)"
                />
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="text-xs font-extrabold text-gray-700">{isRTL ? 'Links' : 'Links'}</div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setSiteLinks((s) => ({
                      ...s,
                      footer: {
                        ...s.footer,
                        columns: s.footer.columns.map((c) =>
                          c.id === col.id
                            ? {
                                ...c,
                                links: [
                                  ...c.links,
                                  { id: uid(), labelAr: 'رابط', labelEn: 'Link', url: '/', external: false },
                                ],
                              }
                            : c
                        ),
                      },
                    }))
                  }
                >
                  {isRTL ? 'Add link' : 'Add link'}
                </Button>
              </div>

              <div className="mt-2 space-y-2">
                {col.links.map((l) => (
                  <div key={l.id} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
                    <input
                      value={l.labelAr}
                      onChange={(e) =>
                        setSiteLinks((s) => ({
                          ...s,
                          footer: {
                            ...s.footer,
                            columns: s.footer.columns.map((c) =>
                              c.id === col.id
                                ? { ...c, links: c.links.map((x) => (x.id === l.id ? { ...x, labelAr: e.target.value } : x)) }
                                : c
                            ),
                          },
                        }))
                      }
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none"
                      placeholder="Label AR"
                    />
                    <input
                      value={l.labelEn}
                      onChange={(e) =>
                        setSiteLinks((s) => ({
                          ...s,
                          footer: {
                            ...s.footer,
                            columns: s.footer.columns.map((c) =>
                              c.id === col.id
                                ? { ...c, links: c.links.map((x) => (x.id === l.id ? { ...x, labelEn: e.target.value } : x)) }
                                : c
                            ),
                          },
                        }))
                      }
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none"
                      placeholder="Label EN"
                    />
                    <input
                      value={l.url}
                      onChange={(e) =>
                        setSiteLinks((s) => ({
                          ...s,
                          footer: {
                            ...s.footer,
                            columns: s.footer.columns.map((c) =>
                              c.id === col.id
                                ? { ...c, links: c.links.map((x) => (x.id === l.id ? { ...x, url: e.target.value } : x)) }
                                : c
                            ),
                          },
                        }))
                      }
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none md:col-span-2"
                      placeholder="/contact or https://..."
                    />
                    <label className="flex items-center gap-2 text-xs font-extrabold text-gray-700">
                      <input
                        type="checkbox"
                        checked={l.external}
                        onChange={(e) =>
                          setSiteLinks((s) => ({
                            ...s,
                            footer: {
                              ...s.footer,
                              columns: s.footer.columns.map((c) =>
                                c.id === col.id
                                  ? { ...c, links: c.links.map((x) => (x.id === l.id ? { ...x, external: e.target.checked } : x)) }
                                  : c
                              ),
                            },
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
                          footer: {
                            ...s.footer,
                            columns: s.footer.columns.map((c) =>
                              c.id === col.id ? { ...c, links: c.links.filter((x) => x.id !== l.id) } : c
                            ),
                          },
                        }))
                      }
                    >
                      {isRTL ? 'Remove' : 'Remove'}
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Trust items */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-extrabold text-gray-900">{isRTL ? 'Trust items' : 'Trust items'}</div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              setSiteLinks((s) => ({
                ...s,
                footer: { ...s.footer, trustItems: [...s.footer.trustItems, { id: uid(), icon: '✨', textAr: '', textEn: '' }].slice(0, 5) },
              }))
            }
          >
            {isRTL ? 'Add item' : 'Add item'}
          </Button>
        </div>

        <div className="space-y-2">
          {siteLinks.footer.trustItems.map((it) => (
            <div key={it.id} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
              <input
                value={it.icon}
                onChange={(e) =>
                  setSiteLinks((s) => ({
                    ...s,
                    footer: { ...s.footer, trustItems: s.footer.trustItems.map((x) => (x.id === it.id ? { ...x, icon: e.target.value } : x)) },
                  }))
                }
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none"
                placeholder="icon"
              />
              <input
                value={it.textAr}
                onChange={(e) =>
                  setSiteLinks((s) => ({
                    ...s,
                    footer: { ...s.footer, trustItems: s.footer.trustItems.map((x) => (x.id === it.id ? { ...x, textAr: e.target.value } : x)) },
                  }))
                }
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none"
                placeholder="textAr"
              />
              <input
                value={it.textEn}
                onChange={(e) =>
                  setSiteLinks((s) => ({
                    ...s,
                    footer: { ...s.footer, trustItems: s.footer.trustItems.map((x) => (x.id === it.id ? { ...x, textEn: e.target.value } : x)) },
                  }))
                }
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none"
                placeholder="textEn"
              />
              <button
                type="button"
                className="text-xs font-extrabold text-red-600"
                onClick={() =>
                  setSiteLinks((s) => ({
                    ...s,
                    footer: { ...s.footer, trustItems: s.footer.trustItems.filter((x) => x.id !== it.id) },
                  }))
                }
              >
                {isRTL ? 'Remove' : 'Remove'}
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

