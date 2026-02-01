import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../utils/api'
import { useLanguage } from '../../context/LanguageContext'

interface StaticPage {
  id: number
  slug: string
  title_ar: string
  title_en: string
  content_ar: string
  content_en: string
  is_published: boolean
  meta_description_ar?: string
  meta_description_en?: string
  updated_at: string
}

export default function StaticPagesManagement() {
  const { language, t } = useLanguage()
  const [pages, setPages] = useState<StaticPage[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPage, setEditingPage] = useState<StaticPage | null>(null)
  const [formData, setFormData] = useState({
    slug: '',
    title_ar: '',
    title_en: '',
    content_ar: '',
    content_en: '',
    is_published: true,
    meta_description_ar: '',
    meta_description_en: ''
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    loadPages()
  }, [])

  const loadPages = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/admin/site/pages')
      setPages(res.data.pages || [])
    } catch (err) {
      console.error('Error loading pages:', err)
      setMessage({ text: language === 'en' ? 'Failed to load pages' : 'فشل تحميل الصفحات', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      if (editingPage) {
        await api.put(`/api/admin/site/pages/${editingPage.id}`, formData)
        setMessage({ text: language === 'en' ? 'Page updated successfully!' : 'تم تحديث الصفحة بنجاح!', type: 'success' })
      } else {
        await api.post('/api/admin/site/pages', formData)
        setMessage({ text: language === 'en' ? 'Page created successfully!' : 'تم إنشاء الصفحة بنجاح!', type: 'success' })
      }
      setShowForm(false)
      setEditingPage(null)
      setFormData({
        slug: '',
        title_ar: '',
        title_en: '',
        content_ar: '',
        content_en: '',
        is_published: true,
        meta_description_ar: '',
        meta_description_en: ''
      })
      loadPages()
    } catch (err: any) {
      setMessage({ 
        text: err.response?.data?.message || (language === 'en' ? 'Failed to save page' : 'فشل حفظ الصفحة'), 
        type: 'error' 
      })
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (page: StaticPage) => {
    setEditingPage(page)
    setFormData({
      slug: page.slug,
      title_ar: page.title_ar || '',
      title_en: page.title_en || '',
      content_ar: page.content_ar || '',
      content_en: page.content_en || '',
      is_published: page.is_published,
      meta_description_ar: page.meta_description_ar || '',
      meta_description_en: page.meta_description_en || ''
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm(language === 'en' ? 'Delete this page?' : 'حذف هذه الصفحة؟')) return

    try {
      await api.delete(`/api/admin/site/pages/${id}`)
      setMessage({ text: language === 'en' ? 'Page deleted successfully!' : 'تم حذف الصفحة بنجاح!', type: 'success' })
      loadPages()
    } catch (err: any) {
      setMessage({ 
        text: err.response?.data?.message || (language === 'en' ? 'Failed to delete page' : 'فشل حذف الصفحة'), 
        type: 'error' 
      })
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
      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">
          {language === 'en' ? 'Static Pages' : 'الصفحات الثابتة'}
        </h2>
        <button
          onClick={() => {
            setShowForm(true)
            setEditingPage(null)
            setFormData({
              slug: '',
              title_ar: '',
              title_en: '',
              content_ar: '',
              content_en: '',
              is_published: true,
              meta_description_ar: '',
              meta_description_en: ''
            })
          }}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          {language === 'en' ? '+ Add Page' : '+ إضافة صفحة'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold mb-4">
            {editingPage ? (language === 'en' ? 'Edit Page' : 'تعديل الصفحة') : (language === 'en' ? 'Add New Page' : 'إضافة صفحة جديدة')}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {language === 'en' ? 'Slug (URL)' : 'الرابط (URL)'}
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                  placeholder="about, privacy, terms"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {language === 'en' ? 'URL-friendly identifier (e.g., about, privacy)' : 'معرف مناسب للرابط (مثل: about, privacy)'}
                </p>
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                  className="w-5 h-5"
                />
                <label className="text-sm font-medium">
                  {language === 'en' ? 'Published' : 'منشور'}
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {language === 'en' ? 'Title (Arabic)' : 'العنوان (عربي)'}
                </label>
                <input
                  type="text"
                  value={formData.title_ar}
                  onChange={(e) => setFormData({ ...formData, title_ar: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  dir="rtl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  {language === 'en' ? 'Title (English)' : 'العنوان (إنجليزي)'}
                </label>
                <input
                  type="text"
                  value={formData.title_en}
                  onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {language === 'en' ? 'Content (Arabic)' : 'المحتوى (عربي)'}
                </label>
                <textarea
                  value={formData.content_ar}
                  onChange={(e) => setFormData({ ...formData, content_ar: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  rows={10}
                  dir="rtl"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {language === 'en' ? 'Supports HTML and markdown' : 'يدعم HTML و Markdown'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  {language === 'en' ? 'Content (English)' : 'المحتوى (إنجليزي)'}
                </label>
                <textarea
                  value={formData.content_en}
                  onChange={(e) => setFormData({ ...formData, content_en: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  rows={10}
                  dir="ltr"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {language === 'en' ? 'Supports HTML and markdown' : 'يدعم HTML و Markdown'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {language === 'en' ? 'Meta Description (Arabic)' : 'وصف SEO (عربي)'}
                </label>
                <textarea
                  value={formData.meta_description_ar}
                  onChange={(e) => setFormData({ ...formData, meta_description_ar: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  rows={2}
                  dir="rtl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  {language === 'en' ? 'Meta Description (English)' : 'وصف SEO (إنجليزي)'}
                </label>
                <textarea
                  value={formData.meta_description_en}
                  onChange={(e) => setFormData({ ...formData, meta_description_en: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  rows={2}
                  dir="ltr"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? (language === 'en' ? 'Saving...' : 'جاري الحفظ...') : (editingPage ? (language === 'en' ? 'Update' : 'تحديث') : (language === 'en' ? 'Create' : 'إنشاء'))}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditingPage(null)
                }}
                className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
              >
                {language === 'en' ? 'Cancel' : 'إلغاء'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pages List */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                {language === 'en' ? 'Slug' : 'الرابط'}
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                {language === 'en' ? 'Title' : 'العنوان'}
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                {language === 'en' ? 'Status' : 'الحالة'}
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                {language === 'en' ? 'Updated' : 'آخر تحديث'}
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                {language === 'en' ? 'Actions' : 'الإجراءات'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {pages.map((page) => (
              <tr key={page.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">
                  <Link to={`/${page.slug}`} target="_blank" className="text-emerald-600 hover:underline">
                    /{page.slug}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm">
                  {language === 'en' ? page.title_en || page.title_ar : page.title_ar || page.title_en}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    page.is_published 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {page.is_published ? (language === 'en' ? 'Published' : 'منشور') : (language === 'en' ? 'Draft' : 'مسودة')}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(page.updated_at).toLocaleDateString(language === 'en' ? 'en-US' : 'ar-SA')}
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(page)}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                    >
                      {language === 'en' ? 'Edit' : 'تعديل'}
                    </button>
                    <button
                      onClick={() => handleDelete(page.id)}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                    >
                      {language === 'en' ? 'Delete' : 'حذف'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

