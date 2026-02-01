import { useState, useEffect } from 'react'
import api from '../../utils/api'
import { useLanguage } from '../../context/LanguageContext'

interface LayoutSection {
  id: string
  type: 'banner' | 'categories' | 'product-row' | 'product-grid'
  active: boolean
  title?: string
  titleAr?: string
  filter?: string
  categoryId?: string | null
  slides?: { id: number; image: string; title: string; subtitle?: string }[]
}

interface Category {
  id: number
  name: string
  name_ar: string
}

export default function ManageHome() {
  const { language, t } = useLanguage()
  const [layout, setLayout] = useState<{ sections: LayoutSection[] }>({ sections: [] })
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [layoutRes, catsRes] = await Promise.all([
        api.get('/api/layout/home'),
        api.get('/api/categories')
      ])
      
      // Ensure layout has sections array
      const layoutData = layoutRes.data
      if (!layoutData.sections || !Array.isArray(layoutData.sections)) {
        setLayout({ sections: [] })
      } else {
        setLayout(layoutData)
      }
      
      setCategories(Array.isArray(catsRes.data) ? catsRes.data : catsRes.data?.categories || [])
    } catch (err: any) {
      console.error('Error loading data:', err)
      // Set default empty layout on error
      setLayout({ sections: [] })
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await api.post('/api/admin/layout/home', layout)
      alert(language === 'en' ? 'Layout saved successfully!' : 'تم حفظ التخطيط بنجاح!')
    } catch (err) {
      console.error('Error saving layout:', err)
      alert(language === 'en' ? 'Failed to save layout' : 'فشل حفظ التخطيط')
    } finally {
      setSaving(false)
    }
  }

  const toggleSection = (index: number) => {
    const newSections = [...layout.sections]
    newSections[index].active = !newSections[index].active
    setLayout({ ...layout, sections: newSections })
  }

  const updateSection = (index: number, field: keyof LayoutSection, value: any) => {
    const newSections = [...layout.sections]
    newSections[index] = { ...newSections[index], [field]: value }
    setLayout({ ...layout, sections: newSections })
  }

  const handleSlideUpdate = (sectionIndex: number, slideIndex: number, field: string, value: string) => {
    const newSections = [...layout.sections]
    if (newSections[sectionIndex].slides) {
      newSections[sectionIndex].slides![slideIndex] = { ...newSections[sectionIndex].slides![slideIndex], [field]: value }
      setLayout({ ...layout, sections: newSections })
    }
  }

  if (loading) return <div className="p-8 text-center">Loading...</div>

  return (
    <div className="p-6 max-w-5xl mx-auto" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          {language === 'en' ? 'Manage Home Page' : 'إدارة الصفحة الرئيسية'}
        </h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-bold shadow-md transition-all flex items-center gap-2"
        >
          {saving ? 'Saving...' : (language === 'en' ? 'Save Changes' : 'حفظ التغييرات')}
        </button>
      </div>

      {layout.sections.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800 mb-4">
            {language === 'en' 
              ? 'No layout sections found. The layout will be created when you save changes.'
              : 'لم يتم العثور على أقسام التخطيط. سيتم إنشاء التخطيط عند حفظ التغييرات.'}
          </p>
          <button
            onClick={() => {
              // Add default sections
              setLayout({
                sections: [
                  {
                    id: 'banner-1',
                    type: 'banner',
                    active: true,
                    slides: [{ id: 1, image: '', title: '', subtitle: '' }]
                  },
                  {
                    id: 'categories-1',
                    type: 'categories',
                    active: true
                  },
                  {
                    id: 'product-row-1',
                    type: 'product-row',
                    active: true,
                    title: 'Featured Products',
                    titleAr: 'منتجات مميزة',
                    filter: 'featured',
                    categoryId: null
                  }
                ]
              })
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-semibold"
          >
            {language === 'en' ? 'Add Default Sections' : 'إضافة أقسام افتراضية'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {layout.sections.map((section, index) => (
          <div key={section.id} className={`bg-white rounded-xl shadow-md border-2 p-6 transition-all ${section.active ? 'border-emerald-100' : 'border-gray-100 opacity-75'}`}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs uppercase font-bold tracking-wider">
                  {section.type}
                </span>
                <h3 className="text-xl font-bold text-gray-800">
                  {language === 'en' ? section.title : section.titleAr || section.title}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${section.active ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {section.active ? (language === 'en' ? 'Active' : 'نشط') : (language === 'en' ? 'Inactive' : 'غير نشط')}
                </span>
                <button
                  onClick={() => toggleSection(index)}
                  className={`w-12 h-6 rounded-full p-1 transition-colors ${section.active ? 'bg-emerald-500' : 'bg-gray-300'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${section.active ? (language === 'ar' ? '-translate-x-6' : 'translate-x-6') : ''}`}></div>
                </button>
              </div>
            </div>

            {/* Section Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {section.type !== 'banner' && section.type !== 'categories' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {language === 'en' ? 'English Title' : 'العنوان بالإنجليزية'}
                    </label>
                    <input
                      type="text"
                      value={section.title || ''}
                      onChange={(e) => updateSection(index, 'title', e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {language === 'en' ? 'Arabic Title' : 'العنوان بالعربية'}
                    </label>
                    <input
                      type="text"
                      value={section.titleAr || ''}
                      onChange={(e) => updateSection(index, 'titleAr', e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {language === 'en' ? 'Filter by Category' : 'تصفية حسب الفئة'}
                    </label>
                    <select
                      value={section.categoryId || ''}
                      onChange={(e) => updateSection(index, 'categoryId', e.target.value || null)}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">{language === 'en' ? 'All / No Filter' : 'الكل / بدون تصفية'}</option>
                      <option value="featured">{language === 'en' ? 'Featured Items' : 'منتجات مميزة'}</option>
                      <option value="deals">{language === 'en' ? 'Deals of the Day' : 'عروض اليوم'}</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{language === 'en' ? cat.name : cat.name_ar}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Banner Editor */}
              {section.type === 'banner' && section.slides && (
                <div className="md:col-span-2 space-y-4">
                  {section.slides.map((slide, sIndex) => (
                    <div key={slide.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex gap-4 items-start">
                      <div className="w-24 h-16 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                        <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Image URL"
                          value={slide.image}
                          onChange={(e) => handleSlideUpdate(index, sIndex, 'image', e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Title"
                          value={slide.title}
                          onChange={(e) => handleSlideUpdate(index, sIndex, 'title', e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Subtitle"
                          value={slide.subtitle || ''}
                          onChange={(e) => handleSlideUpdate(index, sIndex, 'subtitle', e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm md:col-span-2"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        </div>
      )}
    </div>
  )
}

