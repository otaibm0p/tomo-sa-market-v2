import { useState, useEffect } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import { useTheme } from '../../context/ThemeContext'
import api from '../../utils/api'
import { Save, Home, ToggleLeft, ToggleRight, ArrowUp, ArrowDown } from 'lucide-react'

interface HomepageSection {
  id: number
  section_key: string
  enabled: boolean
  title_ar: string
  title_en: string
  item_limit: number
  sort_priority: number
}

export default function HomepageManager() {
  const { language } = useLanguage()
  const { theme } = useTheme()
  const [sections, setSections] = useState<HomepageSection[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSections()
  }, [])

  const loadSections = async () => {
    try {
      const res = await api.get('/api/admin/homepage')
      setSections(res.data.sections || [])
    } catch (err) {
      console.error('Error loading sections:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = (sectionKey: string) => {
    setSections(sections.map(section => 
      section.section_key === sectionKey 
        ? { ...section, enabled: !section.enabled }
        : section
    ))
  }

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    
    if (targetIndex < 0 || targetIndex >= newSections.length) return

    const newPriority = newSections[targetIndex].sort_priority
    newSections[targetIndex].sort_priority = newSections[index].sort_priority
    newSections[index].sort_priority = newPriority

    setSections(newSections.sort((a, b) => a.sort_priority - b.sort_priority))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      await api.put('/api/admin/homepage', { sections })
      alert(language === 'ar' ? 'تم حفظ التغييرات بنجاح' : 'Changes saved successfully')
    } catch (err: any) {
      alert(err.response?.data?.message || (language === 'ar' ? 'حدث خطأ' : 'An error occurred'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  const sectionLabels: Record<string, { ar: string; en: string }> = {
    featured: { ar: 'منتجات مميزة', en: 'Featured Products' },
    best_sellers: { ar: 'الأكثر مبيعاً', en: 'Best Sellers' },
    deals_of_day: { ar: 'عروض اليوم', en: 'Deals of the Day' }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          {language === 'ar' ? 'إدارة الصفحة الرئيسية' : 'Homepage Manager'}
        </h1>
        <p className={`mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          {language === 'ar' 
            ? 'تحكم في أقسام الصفحة الرئيسية وترتيبها' 
            : 'Control homepage sections and their order'
          }
        </p>
      </div>

      {/* Sections List */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {sections.map((section, index) => (
          <div
            key={section.id}
            className={`
              ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}
              rounded-xl shadow-lg p-6
              border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}
            `}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <Home size={24} className={theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'} />
                  <div>
                    <h3 className={`text-lg font-semibold ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {sectionLabels[section.section_key]?.[language] || section.section_key}
                    </h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {language === 'ar' ? 'مفتاح القسم' : 'Section Key'}: {section.section_key}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {language === 'ar' ? 'العنوان (عربي)' : 'Title (Arabic)'}
                    </label>
                    <input
                      type="text"
                      value={section.title_ar}
                      onChange={(e) => {
                        const newSections = [...sections]
                        newSections[index].title_ar = e.target.value
                        setSections(newSections)
                      }}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        theme === 'dark' 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {language === 'ar' ? 'العنوان (إنجليزي)' : 'Title (English)'}
                    </label>
                    <input
                      type="text"
                      value={section.title_en}
                      onChange={(e) => {
                        const newSections = [...sections]
                        newSections[index].title_en = e.target.value
                        setSections(newSections)
                      }}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        theme === 'dark' 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {language === 'ar' ? 'عدد المنتجات' : 'Number of Products'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={section.item_limit}
                      onChange={(e) => {
                        const newSections = [...sections]
                        newSections[index].item_limit = parseInt(e.target.value) || 10
                        setSections(newSections)
                      }}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        theme === 'dark' 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500`}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 ml-4">
                <button
                  type="button"
                  onClick={() => handleToggle(section.section_key)}
                  className={`
                    p-2 rounded-lg transition-all duration-200
                    ${section.enabled
                      ? theme === 'dark'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-100 text-emerald-700'
                      : theme === 'dark'
                      ? 'bg-gray-700 text-gray-400'
                      : 'bg-gray-100 text-gray-400'
                    }
                  `}
                >
                  {section.enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                </button>

                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => handleMove(index, 'up')}
                    disabled={index === 0}
                    className={`
                      p-1 rounded
                      ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}
                      disabled:opacity-30 disabled:cursor-not-allowed
                    `}
                  >
                    <ArrowUp size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(index, 'down')}
                    disabled={index === sections.length - 1}
                    className={`
                      p-1 rounded
                      ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}
                      disabled:opacity-30 disabled:cursor-not-allowed
                    `}
                  >
                    <ArrowDown size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-lg
              font-semibold text-white
              bg-gradient-to-r from-emerald-600 to-green-600
              hover:from-emerald-700 hover:to-green-700
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200
              shadow-lg hover:shadow-xl
            `}
          >
            <Save size={20} />
            {saving 
              ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
              : (language === 'ar' ? 'حفظ التغييرات' : 'Save Changes')
            }
          </button>
        </div>
      </form>
    </div>
  )
}
