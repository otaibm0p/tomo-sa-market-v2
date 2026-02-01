import { useState, useEffect } from 'react'
import api from '../../utils/api'
import { useLanguage } from '../../context/LanguageContext'

interface HomepageSection {
  id: number
  section_key: string
  enabled: boolean
  title_ar: string
  title_en: string
  layout_type: 'slider' | 'grid'
  item_limit: number
  sort_mode: string
  image_ratio: '1:1' | '4:5'
  hide_missing_images: boolean
  cta_text_ar?: string
  cta_text_en?: string
  cta_link?: string
  sort_priority: number
}

export default function HomepageSectionsManagement() {
  const { language } = useLanguage()
  const [sections, setSections] = useState<HomepageSection[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  useEffect(() => {
    loadSections()
  }, [])

  const loadSections = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/admin/homepage/sections')
      const sectionsData = response.data?.sections || response.data || []
      setSections(Array.isArray(sectionsData) ? sectionsData : [])
    } catch (err: any) {
      console.error('Error loading sections:', err)
      setSections([])
    } finally {
      setLoading(false)
    }
  }

  const updateSection = async (id: number, updates: Partial<HomepageSection>) => {
    try {
      setSaving(true)
      const response = await api.put(`/api/admin/homepage/sections/${id}`, updates)
      setSections(sections.map(s => s.id === id ? response.data.section : s))
    } catch (err) {
      console.error('Error updating section:', err)
      alert(language === 'en' ? 'Failed to update section' : 'فشل تحديث القسم')
    } finally {
      setSaving(false)
    }
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newSections = [...sections]
    const draggedSection = newSections[draggedIndex]
    newSections.splice(draggedIndex, 1)
    newSections.splice(index, 0, draggedSection)
    setSections(newSections)
    setDraggedIndex(index)
  }

  const handleDragEnd = async () => {
    if (draggedIndex === null) return

    try {
      setSaving(true)
      // Update sort_priority for all sections based on new order
      const updates = sections.map((section, index) => ({
        id: section.id,
        sort_priority: index + 1
      }))

      // Update all sections in parallel
      await Promise.all(
        updates.map(update => 
          api.put(`/api/admin/homepage/sections/${update.id}`, { sort_priority: update.sort_priority })
        )
      )

      // Reload to get fresh data
      await loadSections()
    } catch (err) {
      console.error('Error reordering sections:', err)
      alert(language === 'en' ? 'Failed to reorder sections' : 'فشل إعادة ترتيب الأقسام')
      // Reload on error to restore original order
      await loadSections()
    } finally {
      setDraggedIndex(null)
      setSaving(false)
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
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        {language === 'en' ? 'Homepage Sections Management' : 'إدارة أقسام الصفحة الرئيسية'}
      </h1>

      {sections.length === 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <p className="text-blue-800 mb-4">
            {language === 'en' 
              ? 'No homepage sections found. Sections will be created automatically when the homepage loads.'
              : 'لم يتم العثور على أقسام الصفحة الرئيسية. سيتم إنشاء الأقسام تلقائياً عند تحميل الصفحة الرئيسية.'}
          </p>
          <p className="text-sm text-blue-600">
            {language === 'en' 
              ? 'Default sections (Best Sellers, Deals of the Day, Featured) should be created automatically in the database.'
              : 'يجب إنشاء الأقسام الافتراضية (الأكثر مبيعاً، عروض اليوم، منتجات مميزة) تلقائياً في قاعدة البيانات.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              {language === 'en' 
                ? '💡 Drag sections to reorder them. Changes are saved automatically.'
                : '💡 اسحب الأقسام لإعادة ترتيبها. يتم حفظ التغييرات تلقائياً.'}
            </p>
          </div>
          {sections.map((section, index) => (
          <div 
            key={section.id} 
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`bg-white rounded-lg shadow p-6 cursor-move transition-all ${
              draggedIndex === index ? 'opacity-50 scale-95' : 'hover:shadow-lg'
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="text-gray-400 text-xl">☰</div>
              <h3 className="text-lg font-semibold flex-1">{section.section_key}</h3>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={section.enabled}
                  onChange={(e) => updateSection(section.id, { enabled: e.target.checked })}
                  className="w-5 h-5"
                />
                <span>{language === 'en' ? 'Enabled' : 'مفعل'}</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {language === 'en' ? 'Title (Arabic)' : 'العنوان (عربي)'}
                </label>
                <input
                  type="text"
                  value={section.title_ar}
                  onChange={(e) => updateSection(section.id, { title_ar: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {language === 'en' ? 'Title (English)' : 'العنوان (إنجليزي)'}
                </label>
                <input
                  type="text"
                  value={section.title_en}
                  onChange={(e) => updateSection(section.id, { title_en: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {language === 'en' ? 'Layout Type' : 'نوع التخطيط'}
                </label>
                <select
                  value={section.layout_type}
                  onChange={(e) => updateSection(section.id, { layout_type: e.target.value as 'slider' | 'grid' })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="slider">{language === 'en' ? 'Slider' : 'سلايدر'}</option>
                  <option value="grid">{language === 'en' ? 'Grid' : 'شبكة'}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {language === 'en' ? 'Item Limit' : 'عدد العناصر'}
                </label>
                <input
                  type="number"
                  value={section.item_limit}
                  onChange={(e) => updateSection(section.id, { item_limit: parseInt(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2"
                  min="1"
                  max="50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {language === 'en' ? 'Sort Mode' : 'طريقة الترتيب'}
                </label>
                <select
                  value={section.sort_mode}
                  onChange={(e) => updateSection(section.id, { sort_mode: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="popularity">{language === 'en' ? 'Popularity' : 'الشعبية'}</option>
                  <option value="deals">{language === 'en' ? 'Deals of the Day' : 'عروض اليوم'}</option>
                  <option value="featured">{language === 'en' ? 'Featured' : 'مميز'}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {language === 'en' ? 'Image Ratio' : 'نسبة الصورة'}
                </label>
                <select
                  value={section.image_ratio}
                  onChange={(e) => updateSection(section.id, { image_ratio: e.target.value as '1:1' | '4:5' })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="1:1">1:1</option>
                  <option value="4:5">4:5</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={section.hide_missing_images}
                    onChange={(e) => updateSection(section.id, { hide_missing_images: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <span>{language === 'en' ? 'Hide Missing Images' : 'إخفاء المنتجات بدون صور'}</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {language === 'en' ? 'Sort Priority' : 'أولوية الترتيب'}
                </label>
                <input
                  type="number"
                  value={section.sort_priority}
                  onChange={(e) => updateSection(section.id, { sort_priority: parseInt(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>
          </div>
        ))}
        </div>
      )}
    </div>
  )
}

