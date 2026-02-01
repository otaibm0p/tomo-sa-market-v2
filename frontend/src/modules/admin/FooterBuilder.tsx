import { useState, useEffect } from 'react'
import api from '../../utils/api'
import { useLanguage } from '../../context/LanguageContext'

interface FooterColumn {
  id: string
  type: 'about' | 'links' | 'contact' | 'social' | 'newsletter' | 'custom'
  title_ar: string
  title_en: string
  content_ar?: string
  content_en?: string
  links?: Array<{ label_ar: string; label_en: string; url: string; order: number }>
  phone?: string
  whatsapp?: string
  email?: string
  address_ar?: string
  address_en?: string
  social_links?: Array<{ platform: string; url: string; order: number }>
  enabled: boolean
  order: number
}

interface FooterConfig {
  columns: FooterColumn[]
  bottom_bar: {
    copyright_text_ar: string
    copyright_text_en: string
    company_name: string
    show_year: boolean
  }
}

export default function FooterBuilder() {
  const { language, t } = useLanguage()
  const [config, setConfig] = useState<FooterConfig>({
    columns: [],
    bottom_bar: {
      copyright_text_ar: 'جميع الحقوق محفوظة',
      copyright_text_en: 'All rights reserved',
      company_name: 'TOMO Market',
      show_year: true
    }
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    loadFooter()
  }, [])

  const loadFooter = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/admin/site/footer')
      if (res.data && res.data.columns) {
        setConfig(res.data)
      }
    } catch (err) {
      console.error('Error loading footer:', err)
      // Use default config
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setMessage(null)
      await api.put('/api/admin/site/footer', { footer_config: config })
      setMessage({ text: language === 'en' ? 'Footer saved successfully!' : 'تم حفظ الفوتر بنجاح!', type: 'success' })
    } catch (err) {
      console.error('Error saving footer:', err)
      setMessage({ text: language === 'en' ? 'Failed to save footer' : 'فشل حفظ الفوتر', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const addColumn = () => {
    const newColumn: FooterColumn = {
      id: `col_${Date.now()}`,
      type: 'links',
      title_ar: 'عمود جديد',
      title_en: 'New Column',
      enabled: true,
      order: config.columns.length + 1,
      links: []
    }
    setConfig({ ...config, columns: [...config.columns, newColumn] })
  }

  const updateColumn = (columnId: string, field: keyof FooterColumn, value: any) => {
    setConfig({
      ...config,
      columns: config.columns.map(col =>
        col.id === columnId ? { ...col, [field]: value } : col
      )
    })
  }

  const deleteColumn = (columnId: string) => {
    if (!confirm(language === 'en' ? 'Delete this column?' : 'حذف هذا العمود؟')) return
    setConfig({
      ...config,
      columns: config.columns.filter(col => col.id !== columnId).map((col, idx) => ({ ...col, order: idx + 1 }))
    })
  }

  const addLink = (columnId: string) => {
    setConfig({
      ...config,
      columns: config.columns.map(col => {
        if (col.id === columnId) {
          const links = col.links || []
          return {
            ...col,
            links: [...links, { label_ar: '', label_en: '', url: '', order: links.length + 1 }]
          }
        }
        return col
      })
    })
  }

  const updateLink = (columnId: string, linkIndex: number, field: string, value: string) => {
    setConfig({
      ...config,
      columns: config.columns.map(col => {
        if (col.id === columnId && col.links) {
          const newLinks = [...col.links]
          newLinks[linkIndex] = { ...newLinks[linkIndex], [field]: value }
          return { ...col, links: newLinks }
        }
        return col
      })
    })
  }

  const deleteLink = (columnId: string, linkIndex: number) => {
    setConfig({
      ...config,
      columns: config.columns.map(col => {
        if (col.id === columnId && col.links) {
          return { ...col, links: col.links.filter((_, idx) => idx !== linkIndex) }
        }
        return col
      })
    })
  }

  const moveColumn = (columnId: string, direction: 'up' | 'down') => {
    const currentIndex = config.columns.findIndex(col => col.id === columnId)
    if (currentIndex === -1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= config.columns.length) return

    const items = [...config.columns]
    const [movedItem] = items.splice(currentIndex, 1)
    items.splice(newIndex, 0, movedItem)

    const reordered = items.map((item, idx) => ({ ...item, order: idx + 1 }))
    setConfig({ ...config, columns: reordered })
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
      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}

      {/* Bottom Bar Settings */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">
          {language === 'en' ? 'Bottom Bar Settings' : 'إعدادات الشريط السفلي'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              {language === 'en' ? 'Copyright Text (Arabic)' : 'نص حقوق النشر (عربي)'}
            </label>
            <input
              type="text"
              value={config.bottom_bar.copyright_text_ar}
              onChange={(e) => setConfig({
                ...config,
                bottom_bar: { ...config.bottom_bar, copyright_text_ar: e.target.value }
              })}
              className="w-full px-4 py-2 border rounded-lg"
              dir="rtl"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              {language === 'en' ? 'Copyright Text (English)' : 'نص حقوق النشر (إنجليزي)'}
            </label>
            <input
              type="text"
              value={config.bottom_bar.copyright_text_en}
              onChange={(e) => setConfig({
                ...config,
                bottom_bar: { ...config.bottom_bar, copyright_text_en: e.target.value }
              })}
              className="w-full px-4 py-2 border rounded-lg"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              {language === 'en' ? 'Company Name' : 'اسم الشركة'}
            </label>
            <input
              type="text"
              value={config.bottom_bar.company_name}
              onChange={(e) => setConfig({
                ...config,
                bottom_bar: { ...config.bottom_bar, company_name: e.target.value }
              })}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          <div className="flex items-center gap-2 mt-6">
            <input
              type="checkbox"
              checked={config.bottom_bar.show_year}
              onChange={(e) => setConfig({
                ...config,
                bottom_bar: { ...config.bottom_bar, show_year: e.target.checked }
              })}
              className="w-5 h-5"
            />
            <label className="text-sm font-medium">
              {language === 'en' ? 'Show Year' : 'عرض السنة'}
            </label>
          </div>
        </div>
      </div>

      {/* Columns */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {language === 'en' ? 'Footer Columns' : 'أعمدة الفوتر'}
          </h2>
          <button
            onClick={addColumn}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            {language === 'en' ? '+ Add Column' : '+ إضافة عمود'}
          </button>
        </div>

        <div className="space-y-4">
          {config.columns
            .sort((a, b) => a.order - b.order)
            .map((column, index) => (
              <div
                key={column.id}
                className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => moveColumn(column.id, 'up')}
                      disabled={index === 0}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      title={language === 'en' ? 'Move up' : 'نقل لأعلى'}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                      </svg>
                    </button>
                    <button
                      onClick={() => moveColumn(column.id, 'down')}
                      disabled={index === config.columns.length - 1}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      title={language === 'en' ? 'Move down' : 'نقل لأسفل'}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                  </div>
                  <select
                    value={column.type}
                    onChange={(e) => updateColumn(column.id, 'type', e.target.value)}
                    className="px-3 py-2 border rounded-lg"
                  >
                    <option value="about">{language === 'en' ? 'About' : 'من نحن'}</option>
                    <option value="links">{language === 'en' ? 'Links' : 'روابط'}</option>
                    <option value="contact">{language === 'en' ? 'Contact' : 'تواصل'}</option>
                    <option value="social">{language === 'en' ? 'Social' : 'اجتماعي'}</option>
                    <option value="newsletter">{language === 'en' ? 'Newsletter' : 'النشرة'}</option>
                  </select>
                  <input
                    type="text"
                    value={language === 'en' ? column.title_en : column.title_ar}
                    onChange={(e) => updateColumn(column.id, language === 'en' ? 'title_en' : 'title_ar', e.target.value)}
                    placeholder={language === 'en' ? 'Column Title' : 'عنوان العمود'}
                    className="flex-1 px-3 py-2 border rounded-lg"
                    dir={language === 'ar' ? 'rtl' : 'ltr'}
                  />
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={column.enabled}
                      onChange={(e) => updateColumn(column.id, 'enabled', e.target.checked)}
                      className="w-5 h-5"
                    />
                    <span className="text-sm">{language === 'en' ? 'Enabled' : 'مفعل'}</span>
                  </label>
                  <button
                    onClick={() => deleteColumn(column.id)}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    {language === 'en' ? 'Delete' : 'حذف'}
                  </button>
                </div>

                {/* Column Content Based on Type */}
                {column.type === 'about' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {language === 'en' ? 'Content (Arabic)' : 'المحتوى (عربي)'}
                      </label>
                      <textarea
                        value={column.content_ar || ''}
                        onChange={(e) => updateColumn(column.id, 'content_ar', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                        rows={3}
                        dir="rtl"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {language === 'en' ? 'Content (English)' : 'المحتوى (إنجليزي)'}
                      </label>
                      <textarea
                        value={column.content_en || ''}
                        onChange={(e) => updateColumn(column.id, 'content_en', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                        rows={3}
                        dir="ltr"
                      />
                    </div>
                  </div>
                )}

                {column.type === 'links' && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="block text-sm font-medium">
                        {language === 'en' ? 'Links' : 'الروابط'}
                      </label>
                      <button
                        onClick={() => addLink(column.id)}
                        className="px-3 py-1 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700"
                      >
                        {language === 'en' ? '+ Add Link' : '+ إضافة رابط'}
                      </button>
                    </div>
                    {(column.links || []).map((link, linkIdx) => (
                      <div key={linkIdx} className="flex gap-2 items-center bg-white p-3 rounded">
                        <input
                          type="text"
                          value={link.label_ar}
                          onChange={(e) => updateLink(column.id, linkIdx, 'label_ar', e.target.value)}
                          placeholder={language === 'en' ? 'Label (AR)' : 'التسمية (عربي)'}
                          className="flex-1 px-2 py-1 border rounded text-sm"
                          dir="rtl"
                        />
                        <input
                          type="text"
                          value={link.label_en}
                          onChange={(e) => updateLink(column.id, linkIdx, 'label_en', e.target.value)}
                          placeholder={language === 'en' ? 'Label (EN)' : 'التسمية (إنجليزي)'}
                          className="flex-1 px-2 py-1 border rounded text-sm"
                          dir="ltr"
                        />
                        <input
                          type="text"
                          value={link.url}
                          onChange={(e) => updateLink(column.id, linkIdx, 'url', e.target.value)}
                          placeholder={language === 'en' ? 'URL' : 'الرابط'}
                          className="flex-1 px-2 py-1 border rounded text-sm"
                        />
                        <button
                          onClick={() => deleteLink(column.id, linkIdx)}
                          className="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {column.type === 'contact' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {language === 'en' ? 'Phone' : 'الهاتف'}
                      </label>
                      <input
                        type="text"
                        value={column.phone || ''}
                        onChange={(e) => updateColumn(column.id, 'phone', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {language === 'en' ? 'WhatsApp' : 'واتساب'}
                      </label>
                      <input
                        type="text"
                        value={column.whatsapp || ''}
                        onChange={(e) => updateColumn(column.id, 'whatsapp', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {language === 'en' ? 'Email' : 'البريد الإلكتروني'}
                      </label>
                      <input
                        type="email"
                        value={column.email || ''}
                        onChange={(e) => updateColumn(column.id, 'email', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {language === 'en' ? 'Address (Arabic)' : 'العنوان (عربي)'}
                      </label>
                      <input
                        type="text"
                        value={column.address_ar || ''}
                        onChange={(e) => updateColumn(column.id, 'address_ar', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                        dir="rtl"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {language === 'en' ? 'Address (English)' : 'العنوان (إنجليزي)'}
                      </label>
                      <input
                        type="text"
                        value={column.address_en || ''}
                        onChange={(e) => updateColumn(column.id, 'address_en', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                        dir="ltr"
                      />
                    </div>
                  </div>
                )}

                {column.type === 'social' && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      {language === 'en' 
                        ? 'Social links are managed in Contact and Social tab'
                        : 'روابط وسائل التواصل الاجتماعي يتم إدارتها في تبويب التواصل والاجتماعي'}
                    </p>
                  </div>
                )}
              </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          {saving ? (language === 'en' ? 'Saving...' : 'جاري الحفظ...') : (language === 'en' ? 'Save Footer' : 'حفظ الفوتر')}
        </button>
      </div>
    </div>
  )
}

