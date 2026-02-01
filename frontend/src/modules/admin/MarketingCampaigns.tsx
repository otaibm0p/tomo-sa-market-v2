import { useState, useEffect } from 'react'
import api from '../../utils/api'
import { useLanguage } from '../../context/LanguageContext'
import { SectionHeader } from '../../shared/admin/ui/components/SectionHeader'
import { Button } from '../../shared/admin/ui/components/Button'
import { Badge } from '../../shared/admin/ui/components/Badge'
import { EmptyState } from '../../shared/admin/ui/components/EmptyState'
import { CardModern } from '../../shared/admin/ui/components/CardModern'
import { cx, adminTokens } from '../../shared/admin/ui/tokens'
import { Megaphone, Play, Send, Trash2, FileSearch, FileText, Link as LinkIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

export interface MarketingCampaignRecord {
  id: string
  name_ar: string | null
  name_en: string | null
  channel: string
  template_key: string | null
  status: 'draft' | 'ready' | 'paused'
  created_by: number | null
  created_at: string
  updated_at: string
  audience_filters: Record<string, unknown>
}

export default function MarketingCampaigns() {
  const { language, t } = useLanguage()
  const [campaigns, setCampaigns] = useState<MarketingCampaignRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [whatsappConfigured, setWhatsappConfigured] = useState(false)
  const [dryRunResult, setDryRunResult] = useState<{
    total: number
    valid_phones?: number
    invalid_phones?: number
    missing_phone_count?: number
    opted_out_count?: number
    sample: Array<{ id: number; full_name: string | null; phone: string | null }>
  } | null>(null)
  const [dryRunId, setDryRunId] = useState<string | null>(null)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [templates, setTemplates] = useState<Array<{ key: string; name: string; languageCode: string; enabled: boolean }>>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [createNameAr, setCreateNameAr] = useState('')
  const [createNameEn, setCreateNameEn] = useState('')
  const [createTemplateKey, setCreateTemplateKey] = useState('')
  const [creating, setCreating] = useState(false)

  const enabledTemplates = templates.filter((t) => t.enabled)

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const [campRes, setRes, templatesRes] = await Promise.all([
        api.get('/api/admin/marketing/campaigns'),
        api.get('/api/settings'),
        api.get('/api/admin/marketing/templates').catch(() => ({ data: { templates: [] } })),
      ])
      setCampaigns(campRes.data?.campaigns ?? [])
      const wa = setRes.data?.whatsapp
      setWhatsappConfigured(!!(wa?.enabled && wa?.token_configured))
      setTemplates(templatesRes.data?.templates ?? [])
    } catch (_) {
      setError(language === 'ar' ? 'لا يمكن تحميل الحملات' : 'Could not load campaigns')
      setCampaigns([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleDryRun = async (id: string) => {
    try {
      setDryRunId(id)
      setDryRunResult(null)
      const res = await api.post(`/api/admin/marketing/campaigns/${id}/dry-run`)
      setDryRunResult({
        campaignId: id,
        total: res.data?.total ?? 0,
        valid_phones: res.data?.valid_phones,
        invalid_phones: res.data?.invalid_phones,
        missing_phone_count: res.data?.missing_phone_count,
        opted_out_count: res.data?.opted_out_count,
        sample: res.data?.sample ?? [],
      })
    } catch {
      setDryRunResult(null)
    } finally {
      setDryRunId(null)
    }
  }

  const handleSend = async (id: string) => {
    if (!whatsappConfigured) return
    try {
      setSendingId(id)
      await api.post(`/api/admin/marketing/campaigns/${id}/send`)
      await load()
    } catch (err: any) {
      const code = err.response?.data?.code
      const msg = err.response?.data?.message
      setError(code === 'WHATSAPP_NOT_CONFIGURED' ? (language === 'ar' ? 'واتساب غير مُعدّ. لا يتم إرسال أي رسائل حتى تكتمل الإعدادات.' : msg) : (msg || (language === 'ar' ? 'فشل الإرسال' : 'Send failed')))
    } finally {
      setSendingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm(language === 'ar' ? 'حذف الحملة؟' : 'Delete this campaign?')) return
    try {
      await api.delete(`/api/admin/marketing/campaigns/${id}`)
      await load()
    } catch {
      setError(language === 'ar' ? 'فشل الحذف' : 'Delete failed')
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const nameAr = createNameAr.trim() || createNameEn.trim() || undefined
    const nameEn = createNameEn.trim() || createNameAr.trim() || undefined
    if (!nameAr && !nameEn) {
      setError(language === 'ar' ? 'أدخل اسم الحملة (عربي أو إنجليزي)' : 'Enter campaign name (Arabic or English)')
      return
    }
    if (!createTemplateKey && enabledTemplates.length > 0) {
      setError(language === 'ar' ? 'اختر قالباً من القائمة أو أضف قوالباً من صفحة القوالب' : 'Select a template or add templates from the Templates page')
      return
    }
    setCreating(true)
    setError(null)
    try {
      await api.post('/api/admin/marketing/campaigns', {
        name_ar: nameAr,
        name_en: nameEn,
        channel: 'whatsapp',
        template_key: createTemplateKey || (enabledTemplates[0]?.key) || null,
        status: 'draft',
        audience_filters: {},
      })
      setCreateOpen(false)
      setCreateNameAr('')
      setCreateNameEn('')
      setCreateTemplateKey('')
      await load()
    } catch (err: any) {
      setError(err.response?.data?.message || (language === 'ar' ? 'فشل إنشاء الحملة' : 'Create failed'))
    } finally {
      setCreating(false)
    }
  }

  const isTemplateEnabled = (key: string | null) => !key || enabledTemplates.some((t) => t.key === key)
  const isRTL = language === 'ar'

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
      </div>
    )
  }

  return (
    <div className={cx(adminTokens.spacing.page, 'max-w-5xl')} dir={isRTL ? 'rtl' : 'ltr'}>
      <SectionHeader
        title={t('admin.marketing.campaigns.title') || (language === 'ar' ? 'حملات واتساب' : 'WhatsApp Campaigns')}
        description={t('admin.marketing.campaigns.description') || (language === 'ar' ? 'إنشاء حملات واتساب مع جمهور مستهدف ومحاكاة قبل الإرسال. الإرسال الفعلي يتطلب إعداد واتساب.' : 'Create WhatsApp campaigns with audience filters and dry-run. Actual sending requires WhatsApp to be configured.')}
      />

      {!whatsappConfigured && (
        <div className={cx('mb-4 p-4 rounded-xl border', adminTokens.status.warn.bg, adminTokens.status.warn.border, adminTokens.status.warn.text)}>
          <p className="font-medium">
            {language === 'ar' ? 'واتساب غير مُعدّ أو غير مفعّل.' : 'WhatsApp is not configured or not enabled.'}
          </p>
          <p className="text-sm mt-1">
            {language === 'ar' ? 'لإرسال رسائل واتساب: فعّل وحدة التسويق من مركز التحكم، ثم أضف WHATSAPP_ACCESS_TOKEN في البيئة وفعّل واتساب من إعدادات واتساب في مركز التحكم.' : 'To send WhatsApp messages: enable the Marketing module in Control Center, then set WHATSAPP_ACCESS_TOKEN in the environment and enable WhatsApp in Control Center WhatsApp settings.'}
          </p>
        </div>
      )}

      {error && (
        <div className={cx('mb-4 p-3 rounded-xl border', adminTokens.status.danger.bg, adminTokens.status.danger.border, adminTokens.status.danger.text)}>{error}</div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="primary" size="sm" onClick={() => setCreateOpen((v) => !v)}>
          <Megaphone className="w-4 h-4" />
          {createOpen ? (language === 'ar' ? 'إلغاء' : 'Cancel') : (language === 'ar' ? 'إنشاء حملة' : 'Create campaign')}
        </Button>
        <Link to="/admin/marketing/templates" className="text-sm text-emerald-600 hover:underline flex items-center gap-1">
          <FileText className="w-4 h-4" />
          {language === 'ar' ? 'إدارة القوالب' : 'Manage templates'}
        </Link>
      </div>

      {createOpen && (
        <CardModern className="mb-6">
          <form onSubmit={handleCreate}>
            <h4 className={cx(adminTokens.text.h3, adminTokens.color.text, 'mb-3')}>{language === 'ar' ? 'إنشاء حملة واتساب' : 'Create WhatsApp campaign'}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-3">
            <div>
              <label className="block text-gray-600 mb-1">{language === 'ar' ? 'اسم الحملة (عربي)' : 'Campaign name (Arabic)'}</label>
              <input type="text" value={createNameAr} onChange={(e) => setCreateNameAr(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder={language === 'ar' ? 'عرض الصيف' : 'Summer offer'} />
            </div>
            <div>
              <label className="block text-gray-600 mb-1">{language === 'ar' ? 'اسم الحملة (إنجليزي)' : 'Campaign name (English)'}</label>
              <input type="text" value={createNameEn} onChange={(e) => setCreateNameEn(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Summer offer" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-gray-600 mb-1">{language === 'ar' ? 'قالب واتساب (من القوالب المفعّلة)' : 'WhatsApp template (enabled only)'}</label>
              <select value={createTemplateKey} onChange={(e) => setCreateTemplateKey(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="">{language === 'ar' ? '-- اختر قالباً --' : '-- Select template --'}</option>
                {enabledTemplates.map((t) => (
                  <option key={t.key} value={t.key}>{t.name || t.key} ({t.languageCode})</option>
                ))}
                {enabledTemplates.length === 0 && <option value="" disabled>{language === 'ar' ? 'لا توجد قوالب مفعّلة. أضف من صفحة القوالب.' : 'No enabled templates. Add from Templates page.'}</option>}
              </select>
            </div>
          </div>
          <Button type="submit" variant="primary" size="sm" disabled={creating}>
            {creating ? (language === 'ar' ? 'جاري الإنشاء...' : 'Creating...') : (language === 'ar' ? 'إنشاء' : 'Create')}
          </Button>
          </form>
        </CardModern>
      )}

      <div className="space-y-4">
        {campaigns.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title={t('admin.marketing.campaigns.emptyTitle') || (language === 'ar' ? 'لا توجد حملات' : 'No campaigns')}
            description={t('admin.marketing.campaigns.emptyDesc') || (language === 'ar' ? 'أنشئ حملة جديدة من الزر أعلاه، ثم اختر القالب والجمهور وشغّل المحاكاة قبل الإرسال.' : 'Create a new campaign with the button above, then choose template and audience and run dry-run before sending.')}
          />
        ) : (
          campaigns.map((c) => (
            <CardModern key={c.id}>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-bold text-gray-900">{c.name_ar || c.name_en || c.id}</span>
                <Badge variant={c.status === 'ready' ? 'success' : c.status === 'paused' ? 'warn' : 'neutral'} size="sm">
                  {c.status === 'draft' ? (language === 'ar' ? 'مسودة' : 'Draft') : c.status === 'ready' ? (language === 'ar' ? 'جاهز' : 'Ready') : (language === 'ar' ? 'متوقف' : 'Paused')}
                </Badge>
                <Badge variant="neutral" size="sm">{c.channel}</Badge>
              </div>
              <div className="text-sm text-gray-600 mb-3 flex flex-wrap items-center gap-2">
                {c.template_key && <span>{language === 'ar' ? 'قالب:' : 'Template:'} {c.template_key}</span>}
                {c.template_key && !isTemplateEnabled(c.template_key) && (
                  <Badge variant="warn" size="sm">{language === 'ar' ? 'القالب غير مفعّل' : 'Template not enabled'}</Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDryRun(c.id)}
                  disabled={!!dryRunId}
                >
                  <FileSearch className="w-4 h-4" />
                  {dryRunId === c.id ? (language === 'ar' ? 'جاري المحاكاة...' : 'Running...') : (language === 'ar' ? 'محاكاة (عدد المستهدف)' : 'Dry run')}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleSend(c.id)}
                  disabled={!whatsappConfigured || c.channel !== 'whatsapp' || !!sendingId}
                  title={!whatsappConfigured ? (language === 'ar' ? 'واتساب غير مُعدّ' : 'WhatsApp not configured') : ''}
                >
                  <Send className="w-4 h-4" />
                  {sendingId === c.id ? (language === 'ar' ? 'جاري الإرسال...' : 'Sending...') : (language === 'ar' ? 'إرسال' : 'Send')}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDelete(c.id)}
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  {language === 'ar' ? 'حذف' : 'Delete'}
                </Button>
              </div>
              {dryRunResult && (dryRunResult as any).campaignId === c.id && dryRunId === null && (
                <div className="mt-3 p-3 rounded-lg bg-gray-50 border border-gray-200 text-sm">
                  <div className="font-medium">{language === 'ar' ? 'عدد المستهدف:' : 'Targeted:'} {dryRunResult.total}</div>
                  {(dryRunResult.valid_phones != null || dryRunResult.invalid_phones != null || dryRunResult.missing_phone_count != null) && (
                    <div className="mt-2 flex flex-wrap gap-3 text-gray-600">
                      {dryRunResult.valid_phones != null && <span>{language === 'ar' ? 'أرقام صالحة:' : 'Valid phones:'} {dryRunResult.valid_phones}</span>}
                      {dryRunResult.invalid_phones != null && dryRunResult.invalid_phones > 0 && <span className="text-amber-700">{language === 'ar' ? 'أرقام غير صالحة:' : 'Invalid:'} {dryRunResult.invalid_phones}</span>}
                      {dryRunResult.missing_phone_count != null && dryRunResult.missing_phone_count > 0 && <span className="text-gray-500">{language === 'ar' ? 'بدون جوال:' : 'Missing phone:'} {dryRunResult.missing_phone_count}</span>}
                      {dryRunResult.opted_out_count != null && dryRunResult.opted_out_count > 0 && <span>{language === 'ar' ? 'غير موافقين:' : 'Opted out:'} {dryRunResult.opted_out_count}</span>}
                    </div>
                  )}
                  {dryRunResult.sample.length > 0 && (
                    <ul className="mt-2 list-disc list-inside text-gray-600">
                      {dryRunResult.sample.slice(0, 5).map((s) => (
                        <li key={s.id}>{s.full_name || s.phone || s.id}</li>
                      ))}
                      {dryRunResult.sample.length > 5 && <li>…</li>}
                    </ul>
                  )}
                </div>
              )}
            </CardModern>
          ))
        )}
      </div>
    </div>
  )
}
