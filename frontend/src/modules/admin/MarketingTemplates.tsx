import { useState, useEffect } from 'react'
import api from '../../utils/api'
import { useLanguage } from '../../context/LanguageContext'
import { SectionHeader } from '../../shared/admin/ui/components/SectionHeader'
import { Button } from '../../shared/admin/ui/components/Button'
import { Badge } from '../../shared/admin/ui/components/Badge'
import { EmptyState } from '../../shared/admin/ui/components/EmptyState'
import { CardModern } from '../../shared/admin/ui/components/CardModern'
import { TableModern, TableModernHead, TableModernTh, TableModernBody, TableModernRow, TableModernTd } from '../../shared/admin/ui/components/TableModern'
import { adminTokens, cx } from '../../shared/admin/ui/tokens'
import { FileText, Plus, Pencil, Check, X } from 'lucide-react'

export interface WhatsAppTemplate {
  key: string
  name: string
  languageCode: string
  description_ar: string
  description_en: string
  variables: string[]
  enabled: boolean
}

export default function MarketingTemplates() {
  const { language, t } = useLanguage()
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<WhatsAppTemplate>>({ key: '', name: '', languageCode: 'ar', description_ar: '', description_en: '', variables: [], enabled: true })

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get('/api/admin/marketing/templates')
      setTemplates(res.data?.templates ?? [])
    } catch (_) {
      setError(language === 'ar' ? 'لا يمكن تحميل القوالب' : 'Could not load templates')
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleSave = async () => {
    if (!form.key?.trim()) return
    setSaving(true)
    setError(null)
    try {
      const list = editingKey
        ? templates.map((t) => (t.key === editingKey ? { ...t, ...form, key: form.key || t.key } : t)).filter((t) => t.key)
        : [...templates.filter((t) => t.key !== form.key), { ...form, key: form.key!, name: form.name || form.key, languageCode: form.languageCode || 'ar', description_ar: form.description_ar || '', description_en: form.description_en || '', variables: form.variables || [], enabled: form.enabled !== false }]
      await api.put('/api/admin/marketing/templates', { templates: list })
      await load()
      setEditingKey(null)
      setForm({ key: '', name: '', languageCode: 'ar', description_ar: '', description_en: '', variables: [], enabled: true })
    } catch (_) {
      setError(language === 'ar' ? 'فشل الحفظ' : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (t: WhatsAppTemplate) => {
    setEditingKey(t.key)
    setForm({ ...t })
  }

  const handleCancel = () => {
    setEditingKey(null)
    setForm({ key: '', name: '', languageCode: 'ar', description_ar: '', description_en: '', variables: [], enabled: true })
  }

  const addVariable = () => {
    setForm((f) => ({ ...f, variables: [...(f.variables || []), ''] }))
  }

  const setVariable = (idx: number, v: string) => {
    setForm((f) => {
      const vars = [...(f.variables || [])]
      vars[idx] = v
      return { ...f, variables: vars }
    })
  }

  const removeVariable = (idx: number) => {
    setForm((f) => ({ ...f, variables: (f.variables || []).filter((_, i) => i !== idx) }))
  }

  const isRTL = language === 'ar'

  return (
    <div className={cx(adminTokens.spacing.page, 'max-w-4xl')} dir={isRTL ? 'rtl' : 'ltr'}>
      <SectionHeader
        title={t('admin.marketing.templates.title') || (language === 'ar' ? 'قوالب واتساب' : 'WhatsApp Templates')}
        description={t('admin.marketing.templates.description') || (language === 'ar' ? 'إدارة قائمة القوالب المُنشأة في Meta Business. لا يُرسل من هنا — يُستخدم في الحملات فقط.' : 'Manage templates created in Meta Business. Not sending from here — used in campaigns only.')}
      />

      {error && (
        <div className={cx('mb-4 p-3 rounded-xl border', adminTokens.status.danger.bg, adminTokens.status.danger.border, adminTokens.status.danger.text)}>{error}</div>
      )}

      {(editingKey || (!editingKey && (form.key || form.name))) && (
        <CardModern className="mb-6">
          <h4 className={cx(adminTokens.text.h3, adminTokens.color.text, 'mb-3')}>{editingKey ? (language === 'ar' ? 'تعديل القالب' : 'Edit template') : (language === 'ar' ? 'إضافة قالب' : 'Add template')}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <label className="block text-gray-600 mb-1">{language === 'ar' ? 'مفتاح القالب (key)' : 'Template key'}</label>
              <input
                type="text"
                value={form.key || ''}
                onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
                disabled={!!editingKey}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="hello_world"
              />
            </div>
            <div>
              <label className="block text-gray-600 mb-1">{language === 'ar' ? 'الاسم' : 'Name'}</label>
              <input
                type="text"
                value={form.name || ''}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-gray-600 mb-1">{language === 'ar' ? 'لغة القالب' : 'Language code'}</label>
              <input
                type="text"
                value={form.languageCode || 'ar'}
                onChange={(e) => setForm((f) => ({ ...f, languageCode: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="ar"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.enabled !== false} onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))} className="rounded border-gray-300" />
                <span className="text-gray-700">{language === 'ar' ? 'مفعّل' : 'Enabled'}</span>
              </label>
            </div>
            <div className="md:col-span-2">
              <label className="block text-gray-600 mb-1">{language === 'ar' ? 'وصف (عربي)' : 'Description (AR)'}</label>
              <input type="text" value={form.description_ar || ''} onChange={(e) => setForm((f) => ({ ...f, description_ar: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-gray-600 mb-1">{language === 'ar' ? 'وصف (إنجليزي)' : 'Description (EN)'}</label>
              <input type="text" value={form.description_en || ''} onChange={(e) => setForm((f) => ({ ...f, description_en: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-gray-600">{language === 'ar' ? 'متغيرات القالب' : 'Template variables'}</label>
                <Button variant="secondary" size="sm" onClick={addVariable}>{language === 'ar' ? 'إضافة' : 'Add'}</Button>
              </div>
              <div className="space-y-2">
                {(form.variables || []).map((v, i) => (
                  <div key={i} className="flex gap-2">
                    <input type="text" value={v} onChange={(e) => setVariable(i, e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg" placeholder="name" />
                    <Button variant="secondary" size="sm" onClick={() => removeVariable(i)}><X className="w-4 h-4" /></Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="primary" size="sm" onClick={handleSave} disabled={saving || !form.key?.trim()}>
              <Check className="w-4 h-4" />
              {saving ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ' : 'Save')}
            </Button>
            <Button variant="secondary" size="sm" onClick={handleCancel}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          </div>
        </CardModern>
      )}

      {!editingKey && !form.key && (
        <div className="mb-4">
          <Button variant="primary" size="sm" onClick={() => setForm({ key: '', name: '', languageCode: 'ar', description_ar: '', description_en: '', variables: [], enabled: true })}>
            <Plus className="w-4 h-4" />
            {language === 'ar' ? 'إضافة قالب' : 'Add template'}
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
        </div>
      ) : templates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={t('admin.marketing.templates.emptyTitle') || (language === 'ar' ? 'لا توجد قوالب' : 'No templates')}
          description={t('admin.marketing.templates.emptyDesc') || (language === 'ar' ? 'أضف قوالبًا أنشأتها في Meta Business Manager ثم فعّلها لاستخدامها في الحملات.' : 'Add templates you created in Meta Business Manager, then enable them for use in campaigns.')}
        />
      ) : (
        <TableModern>
          <TableModernHead>
            <TableModernTh>{language === 'ar' ? 'المفتاح' : 'Key'}</TableModernTh>
            <TableModernTh>{language === 'ar' ? 'الاسم' : 'Name'}</TableModernTh>
            <TableModernTh>{language === 'ar' ? 'اللغة' : 'Language'}</TableModernTh>
            <TableModernTh>{language === 'ar' ? 'المتغيرات' : 'Variables'}</TableModernTh>
            <TableModernTh>{language === 'ar' ? 'الحالة' : 'Status'}</TableModernTh>
            <TableModernTh></TableModernTh>
          </TableModernHead>
          <TableModernBody>
            {templates.map((t) => (
              <TableModernRow key={t.key}>
                <TableModernTd className="font-mono">{t.key}</TableModernTd>
                <TableModernTd className="font-medium">{t.name || '—'}</TableModernTd>
                <TableModernTd className={adminTokens.color.muted}>{t.languageCode || 'ar'}</TableModernTd>
                <TableModernTd className={adminTokens.color.muted}>{(t.variables || []).join(', ') || '—'}</TableModernTd>
                <TableModernTd>
                  <Badge variant={t.enabled ? 'success' : 'neutral'} size="sm">
                    {t.enabled ? (language === 'ar' ? 'مفعّل' : 'Enabled') : (language === 'ar' ? 'معطّل' : 'Disabled')}
                  </Badge>
                </TableModernTd>
                <TableModernTd>
                  <Button variant="secondary" size="sm" onClick={() => handleEdit(t)}>
                    <Pencil className="w-4 h-4" />
                    {language === 'ar' ? 'تعديل' : 'Edit'}
                  </Button>
                </TableModernTd>
              </TableModernRow>
            ))}
          </TableModernBody>
        </TableModern>
      )}
    </div>
  )
}
