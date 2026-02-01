import { useState, useEffect } from 'react'
import { LayoutGrid, Plus, Pencil, Trash2 } from 'lucide-react'
import api from '../../utils/api'
import { useLanguage } from '../../context/LanguageContext'
import { adminTokens, cx } from '../../shared/admin/ui/tokens'
import { CardModern } from '../../shared/admin/ui/components/CardModern'
import {
  TableModern,
  TableModernHead,
  TableModernTh,
  TableModernBody,
  TableModernRow,
  TableModernTd,
} from '../../shared/admin/ui/components/TableModern'
import { Button } from '../../shared/admin/ui/components/Button'
import { Badge } from '../../shared/admin/ui/components/Badge'
import { Skeleton } from '../../shared/ui/components/Skeleton'

interface Category {
  id: number
  name: string
  name_ar?: string
  name_en?: string
  image_url: string | null
  description: string | null
  description_ar?: string
  description_en?: string
  products_count?: number
  is_hidden?: boolean
}

export default function CategoriesTab() {
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({
    name_ar: '',
    name_en: '',
    image_url: '',
    description_ar: '',
    description_en: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/categories')
      const data = res.data
      setCategories(Array.isArray(data) ? data : data?.categories || [])
    } catch (err) {
      console.error('Error loading categories:', err)
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (editingCategory) {
        await api.put(`/api/categories/${editingCategory.id}`, {
          name_ar: formData.name_ar,
          name_en: formData.name_en,
          image_url: formData.image_url || null,
          description_ar: formData.description_ar || null,
          description_en: formData.description_en || null,
        })
      } else {
        await api.post('/api/categories', {
          name_ar: formData.name_ar,
          name_en: formData.name_en,
          image_url: formData.image_url || null,
          description_ar: formData.description_ar || null,
          description_en: formData.description_en || null,
        })
      }
      setShowForm(false)
      setEditingCategory(null)
      setFormData({ name_ar: '', name_en: '', image_url: '', description_ar: '', description_en: '' })
      loadCategories()
    } catch (err: any) {
      alert(err.response?.data?.message || (isAr ? 'حدث خطأ' : 'An error occurred'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm(isAr ? 'هل أنت متأكد من حذف هذه الفئة؟' : 'Are you sure you want to delete this category?')) return
    try {
      await api.delete(`/api/categories/${id}`)
      loadCategories()
    } catch (err: any) {
      alert(err.response?.data?.message || (isAr ? 'حدث خطأ في حذف الفئة' : 'Failed to delete category'))
    }
  }

  const startEdit = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name_ar: category.name_ar || category.name || '',
      name_en: category.name_en || '',
      image_url: category.image_url || '',
      description_ar: category.description_ar || category.description || '',
      description_en: category.description_en || '',
    })
    setShowForm(true)
  }

  const openAddForm = () => {
    setEditingCategory(null)
    setFormData({ name_ar: '', name_en: '', image_url: '', description_ar: '', description_en: '' })
    setShowForm(true)
  }

  const displayName = (c: Category) =>
    (isAr ? c.name_ar || c.name : c.name_en || c.name_ar || c.name) || '—'

  return (
    <div className={cx('min-h-screen', adminTokens.color.page)} dir={isAr ? 'rtl' : 'ltr'}>
      <div className="max-w-5xl mx-auto space-y-6 pb-10">
        {/* 1) Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              {isAr ? 'إدارة الفئات' : 'Manage categories'}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {isAr ? 'نظّم فئات المتجر لعرض المنتجات بشكل احترافي' : 'Organize store categories to display products professionally'}
            </p>
          </div>
          <div className="shrink-0">
            <Button variant="primary" size="md" onClick={openAddForm} className="gap-2">
              <Plus className="w-5 h-5" />
              {isAr ? 'إضافة فئة' : 'Add category'}
            </Button>
          </div>
        </div>

        {/* 2) Form (add/edit) */}
        {showForm && (
          <CardModern>
            <h2 className={cx('text-lg font-bold mb-4', adminTokens.color.textStrong)}>
              {editingCategory ? (isAr ? 'تعديل فئة' : 'Edit category') : (isAr ? 'إضافة فئة جديدة' : 'Add new category')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={cx('block text-sm font-semibold mb-1.5', adminTokens.color.textStrong)}>
                  {isAr ? 'اسم الفئة (عربي) *' : 'Category name (Arabic) *'}
                </label>
                <input
                  type="text"
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  className={cx('w-full px-4 py-2.5 rounded-xl border border-gray-100 shadow-sm', adminTokens.focus.ringInside)}
                  required
                />
              </div>
              <div>
                <label className={cx('block text-sm font-semibold mb-1.5', adminTokens.color.textStrong)}>
                  {isAr ? 'اسم الفئة (English)' : 'Category name (English)'}
                </label>
                <input
                  type="text"
                  value={formData.name_en}
                  onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                  className={cx('w-full px-4 py-2.5 rounded-xl border border-gray-100 shadow-sm', adminTokens.focus.ringInside)}
                />
              </div>
              <div>
                <label className={cx('block text-sm font-semibold mb-1.5', adminTokens.color.textStrong)}>
                  {isAr ? 'رابط الصورة' : 'Image URL'}
                </label>
                <input
                  type="text"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className={cx('w-full px-4 py-2.5 rounded-xl border border-gray-100 shadow-sm', adminTokens.focus.ringInside)}
                  placeholder="https://example.com/image.jpg"
                />
                {formData.image_url && (
                  <img
                    src={formData.image_url}
                    alt="Preview"
                    className="mt-2 h-32 object-cover rounded-xl border border-gray-100"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                )}
              </div>
              <div>
                <label className={cx('block text-sm font-semibold mb-1.5', adminTokens.color.textStrong)}>
                  {isAr ? 'الوصف (عربي)' : 'Description (Arabic)'}
                </label>
                <textarea
                  value={formData.description_ar}
                  onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                  className={cx('w-full px-4 py-2.5 rounded-xl border border-gray-100 shadow-sm', adminTokens.focus.ringInside)}
                  rows={3}
                />
              </div>
              <div>
                <label className={cx('block text-sm font-semibold mb-1.5', adminTokens.color.textStrong)}>
                  {isAr ? 'الوصف (English)' : 'Description (English)'}
                </label>
                <textarea
                  value={formData.description_en}
                  onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                  className={cx('w-full px-4 py-2.5 rounded-xl border border-gray-100 shadow-sm', adminTokens.focus.ringInside)}
                  rows={3}
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button type="submit" variant="primary" disabled={submitting}>
                  {submitting ? (isAr ? 'جاري الحفظ...' : 'Saving...') : editingCategory ? (isAr ? 'تحديث' : 'Update') : (isAr ? 'إضافة' : 'Add')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowForm(false)
                    setEditingCategory(null)
                    setFormData({ name_ar: '', name_en: '', image_url: '', description_ar: '', description_en: '' })
                  }}
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </Button>
              </div>
            </form>
          </CardModern>
        )}

        {/* 3) Content: Loading */}
        {loading && (
          <CardModern className="overflow-hidden">
            <TableModern>
              <TableModernHead>
                <TableModernTh>{isAr ? 'اسم الفئة' : 'Category name'}</TableModernTh>
                <TableModernTh>{isAr ? 'عدد المنتجات' : 'Products'}</TableModernTh>
                <TableModernTh>{isAr ? 'الحالة' : 'Status'}</TableModernTh>
                <TableModernTh>{isAr ? 'إجراءات' : 'Actions'}</TableModernTh>
              </TableModernHead>
              <TableModernBody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TableModernRow key={i}>
                    <TableModernTd><Skeleton className="h-5 w-32" /></TableModernTd>
                    <TableModernTd><Skeleton className="h-5 w-12" /></TableModernTd>
                    <TableModernTd><Skeleton className="h-6 w-16 rounded-full" /></TableModernTd>
                    <TableModernTd><Skeleton className="h-8 w-24" /></TableModernTd>
                  </TableModernRow>
                ))}
              </TableModernBody>
            </TableModern>
          </CardModern>
        )}

        {/* 4) Content: Empty state */}
        {!loading && categories.length === 0 && (
          <CardModern className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className={cx('w-16 h-16 rounded-2xl flex items-center justify-center mb-4', adminTokens.surfaces.subtle, 'border border-gray-100')}>
              <LayoutGrid className={cx('w-8 h-8', adminTokens.color.textMuted)} />
            </div>
            <h2 className={cx('text-xl font-bold mb-2', adminTokens.color.textStrong)}>
              {isAr ? 'لا توجد فئات حتى الآن' : 'No categories yet'}
            </h2>
            <p className={cx('text-sm mb-6 max-w-sm', adminTokens.color.textMuted)}>
              {isAr ? 'ابدأ بإنشاء أول فئة لتنظيم منتجاتك' : 'Create your first category to organize your products'}
            </p>
            <Button variant="primary" size="md" onClick={openAddForm} className="gap-2">
              <Plus className="w-5 h-5" />
              {isAr ? 'إضافة فئة' : 'Add category'}
            </Button>
          </CardModern>
        )}

        {/* 5) Content: Categories table */}
        {!loading && categories.length > 0 && (
          <CardModern className="overflow-hidden p-0">
            <TableModern className="border-0 shadow-none">
              <TableModernHead>
                <TableModernTh>{isAr ? 'اسم الفئة' : 'Category name'}</TableModernTh>
                <TableModernTh>{isAr ? 'عدد المنتجات' : 'Products'}</TableModernTh>
                <TableModernTh>{isAr ? 'الحالة' : 'Status'}</TableModernTh>
                <TableModernTh>{isAr ? 'إجراءات' : 'Actions'}</TableModernTh>
              </TableModernHead>
              <TableModernBody>
                {categories.map((category) => (
                  <TableModernRow key={category.id}>
                    <TableModernTd className="font-semibold">{displayName(category)}</TableModernTd>
                    <TableModernTd>
                      <span dir="ltr">{category.products_count != null ? category.products_count : '—'}</span>
                    </TableModernTd>
                    <TableModernTd>
                      <Badge tone={category.is_hidden ? 'warning' : 'success'} size="sm">
                        {category.is_hidden ? (isAr ? 'مخفية' : 'Hidden') : (isAr ? 'مفعلة' : 'Active')}
                      </Badge>
                    </TableModernTd>
                    <TableModernTd>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" size="sm" onClick={() => startEdit(category)} className="gap-1.5">
                          <Pencil className="w-4 h-4" />
                          {isAr ? 'تعديل' : 'Edit'}
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(category.id)} className="gap-1.5">
                          <Trash2 className="w-4 h-4" />
                          {isAr ? 'حذف' : 'Delete'}
                        </Button>
                      </div>
                    </TableModernTd>
                  </TableModernRow>
                ))}
              </TableModernBody>
            </TableModern>
          </CardModern>
        )}
      </div>
    </div>
  )
}
