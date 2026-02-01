import { useState, useEffect } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import { useTheme } from '../../context/ThemeContext'
import api from '../../utils/api'
import { Save, Layout, FileText, Link as LinkIcon } from 'lucide-react'

interface FooterConfig {
  columns: Array<{
    id: string
    title_ar: string
    title_en: string
    links: Array<{
      text_ar: string
      text_en: string
      url: string
    }>
  }>
  copyright_ar: string
  copyright_en: string
}

interface HeaderConfig {
  links: Array<{
    text_ar: string
    text_en: string
    url: string
  }>
}

export default function AppearanceManager() {
  const { language } = useLanguage()
  const { theme } = useTheme()
  const [footer, setFooter] = useState<FooterConfig>({
    columns: [],
    copyright_ar: '',
    copyright_en: ''
  })
  const [header, setHeader] = useState<HeaderConfig>({
    links: []
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const res = await api.get('/api/admin/appearance')
      if (res.data.footer) {
        setFooter(res.data.footer)
      }
      if (res.data.header) {
        setHeader(res.data.header)
      }
    } catch (err) {
      console.error('Error loading appearance settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      await api.put('/api/admin/appearance', { footer, header })
      alert(language === 'ar' ? 'تم حفظ الإعدادات بنجاح' : 'Settings saved successfully')
    } catch (err: any) {
      alert(err.response?.data?.message || (language === 'ar' ? 'حدث خطأ' : 'An error occurred'))
    } finally {
      setSaving(false)
    }
  }

  const addFooterColumn = () => {
    setFooter({
      ...footer,
      columns: [
        ...footer.columns,
        {
          id: `col_${Date.now()}`,
          title_ar: '',
          title_en: '',
          links: []
        }
      ]
    })
  }

  const removeFooterColumn = (columnId: string) => {
    setFooter({
      ...footer,
      columns: footer.columns.filter(col => col.id !== columnId)
    })
  }

  const addFooterLink = (columnId: string) => {
    setFooter({
      ...footer,
      columns: footer.columns.map(col =>
        col.id === columnId
          ? {
              ...col,
              links: [
                ...col.links,
                { text_ar: '', text_en: '', url: '' }
              ]
            }
          : col
      )
    })
  }

  const removeFooterLink = (columnId: string, linkIndex: number) => {
    setFooter({
      ...footer,
      columns: footer.columns.map(col =>
        col.id === columnId
          ? {
              ...col,
              links: col.links.filter((_, idx) => idx !== linkIndex)
            }
          : col
      )
    })
  }

  const addHeaderLink = () => {
    setHeader({
      ...header,
      links: [
        ...header.links,
        { text_ar: '', text_en: '', url: '' }
      ]
    })
  }

  const removeHeaderLink = (linkIndex: number) => {
    setHeader({
      ...header,
      links: header.links.filter((_, idx) => idx !== linkIndex)
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          {language === 'ar' ? 'المظهر والمحتوى' : 'Appearance & Content'}
        </h1>
        <p className={`mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          {language === 'ar' 
            ? 'إدارة رأس الصفحة وتذييلها والمحتوى الثابت' 
            : 'Manage header, footer, and static content'
          }
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Configuration */}
        <div className={`
          ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}
          rounded-xl shadow-lg p-6
          border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}
        `}>
          <h2 className={`text-xl font-bold mb-6 flex items-center gap-2 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            <Layout size={24} />
            {language === 'ar' ? 'رأس الصفحة' : 'Header'}
          </h2>

          <div className="space-y-4">
            {header.links.map((link, index) => (
              <div key={index} className="flex gap-4 items-end">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {language === 'ar' ? 'النص (عربي)' : 'Text (Arabic)'}
                    </label>
                    <input
                      type="text"
                      value={link.text_ar}
                      onChange={(e) => {
                        const newLinks = [...header.links]
                        newLinks[index].text_ar = e.target.value
                        setHeader({ ...header, links: newLinks })
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
                      {language === 'ar' ? 'النص (إنجليزي)' : 'Text (English)'}
                    </label>
                    <input
                      type="text"
                      value={link.text_en}
                      onChange={(e) => {
                        const newLinks = [...header.links]
                        newLinks[index].text_en = e.target.value
                        setHeader({ ...header, links: newLinks })
                      }}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        theme === 'dark' 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500`}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {language === 'ar' ? 'الرابط' : 'URL'}
                    </label>
                    <input
                      type="url"
                      value={link.url}
                      onChange={(e) => {
                        const newLinks = [...header.links]
                        newLinks[index].url = e.target.value
                        setHeader({ ...header, links: newLinks })
                      }}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        theme === 'dark' 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500`}
                      placeholder="/about"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeHeaderLink(index)}
                  className={`
                    px-4 py-2 rounded-lg
                    ${theme === 'dark' 
                      ? 'bg-red-600 text-white hover:bg-red-700' 
                      : 'bg-red-50 text-red-700 hover:bg-red-100'
                    }
                  `}
                >
                  {language === 'ar' ? 'حذف' : 'Remove'}
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addHeaderLink}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg
                ${theme === 'dark' 
                  ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              <LinkIcon size={18} />
              {language === 'ar' ? 'إضافة رابط' : 'Add Link'}
            </button>
          </div>
        </div>

        {/* Footer Configuration */}
        <div className={`
          ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}
          rounded-xl shadow-lg p-6
          border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}
        `}>
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-xl font-bold flex items-center gap-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              <FileText size={24} />
              {language === 'ar' ? 'تذييل الصفحة' : 'Footer'}
            </h2>
            <button
              type="button"
              onClick={addFooterColumn}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium
                ${theme === 'dark' 
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }
              `}
            >
              {language === 'ar' ? 'إضافة عمود' : 'Add Column'}
            </button>
          </div>

          <div className="space-y-6">
            {footer.columns.map((column) => (
              <div
                key={column.id}
                className={`
                  p-4 rounded-lg border
                  ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}
                `}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {language === 'ar' ? 'عنوان العمود (عربي)' : 'Column Title (Arabic)'}
                      </label>
                      <input
                        type="text"
                        value={column.title_ar}
                        onChange={(e) => {
                          setFooter({
                            ...footer,
                            columns: footer.columns.map(col =>
                              col.id === column.id ? { ...col, title_ar: e.target.value } : col
                            )
                          })
                        }}
                        className={`w-full px-4 py-2 rounded-lg border ${
                          theme === 'dark' 
                            ? 'bg-gray-600 border-gray-500 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        } focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {language === 'ar' ? 'عنوان العمود (إنجليزي)' : 'Column Title (English)'}
                      </label>
                      <input
                        type="text"
                        value={column.title_en}
                        onChange={(e) => {
                          setFooter({
                            ...footer,
                            columns: footer.columns.map(col =>
                              col.id === column.id ? { ...col, title_en: e.target.value } : col
                            )
                          })
                        }}
                        className={`w-full px-4 py-2 rounded-lg border ${
                          theme === 'dark' 
                            ? 'bg-gray-600 border-gray-500 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        } focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500`}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFooterColumn(column.id)}
                    className={`
                      ml-4 px-4 py-2 rounded-lg text-sm
                      ${theme === 'dark' 
                        ? 'bg-red-600 text-white hover:bg-red-700' 
                        : 'bg-red-50 text-red-700 hover:bg-red-100'
                      }
                    `}
                  >
                    {language === 'ar' ? 'حذف العمود' : 'Remove Column'}
                  </button>
                </div>

                <div className="space-y-3">
                  {column.links.map((link, linkIndex) => (
                    <div key={linkIndex} className="flex gap-4 items-end">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${
                            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            {language === 'ar' ? 'النص (عربي)' : 'Text (Arabic)'}
                          </label>
                          <input
                            type="text"
                            value={link.text_ar}
                            onChange={(e) => {
                              setFooter({
                                ...footer,
                                columns: footer.columns.map(col =>
                                  col.id === column.id
                                    ? {
                                        ...col,
                                        links: col.links.map((l, idx) =>
                                          idx === linkIndex ? { ...l, text_ar: e.target.value } : l
                                        )
                                      }
                                    : col
                                )
                              })
                            }}
                            className={`w-full px-4 py-2 rounded-lg border ${
                              theme === 'dark' 
                                ? 'bg-gray-600 border-gray-500 text-white' 
                                : 'bg-white border-gray-300 text-gray-900'
                            } focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500`}
                          />
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${
                            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            {language === 'ar' ? 'النص (إنجليزي)' : 'Text (English)'}
                          </label>
                          <input
                            type="text"
                            value={link.text_en}
                            onChange={(e) => {
                              setFooter({
                                ...footer,
                                columns: footer.columns.map(col =>
                                  col.id === column.id
                                    ? {
                                        ...col,
                                        links: col.links.map((l, idx) =>
                                          idx === linkIndex ? { ...l, text_en: e.target.value } : l
                                        )
                                      }
                                    : col
                                )
                              })
                            }}
                            className={`w-full px-4 py-2 rounded-lg border ${
                              theme === 'dark' 
                                ? 'bg-gray-600 border-gray-500 text-white' 
                                : 'bg-white border-gray-300 text-gray-900'
                            } focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500`}
                          />
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${
                            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            {language === 'ar' ? 'الرابط' : 'URL'}
                          </label>
                          <input
                            type="url"
                            value={link.url}
                            onChange={(e) => {
                              setFooter({
                                ...footer,
                                columns: footer.columns.map(col =>
                                  col.id === column.id
                                    ? {
                                        ...col,
                                        links: col.links.map((l, idx) =>
                                          idx === linkIndex ? { ...l, url: e.target.value } : l
                                        )
                                      }
                                    : col
                                )
                              })
                            }}
                            className={`w-full px-4 py-2 rounded-lg border ${
                              theme === 'dark' 
                                ? 'bg-gray-600 border-gray-500 text-white' 
                                : 'bg-white border-gray-300 text-gray-900'
                            } focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500`}
                            placeholder="/about"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFooterLink(column.id, linkIndex)}
                        className={`
                          px-4 py-2 rounded-lg text-sm
                          ${theme === 'dark' 
                            ? 'bg-red-600 text-white hover:bg-red-700' 
                            : 'bg-red-50 text-red-700 hover:bg-red-100'
                          }
                        `}
                      >
                        {language === 'ar' ? 'حذف' : 'Remove'}
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => addFooterLink(column.id)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg text-sm
                      ${theme === 'dark' 
                        ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    <LinkIcon size={16} />
                    {language === 'ar' ? 'إضافة رابط' : 'Add Link'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Copyright */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {language === 'ar' ? 'حقوق النشر (عربي)' : 'Copyright (Arabic)'}
              </label>
              <textarea
                value={footer.copyright_ar}
                onChange={(e) => setFooter({ ...footer, copyright_ar: e.target.value })}
                rows={3}
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
                {language === 'ar' ? 'حقوق النشر (إنجليزي)' : 'Copyright (English)'}
              </label>
              <textarea
                value={footer.copyright_en}
                onChange={(e) => setFooter({ ...footer, copyright_en: e.target.value })}
                rows={3}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500`}
              />
            </div>
          </div>
        </div>

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
              : (language === 'ar' ? 'حفظ الإعدادات' : 'Save Settings')
            }
          </button>
        </div>
      </form>
    </div>
  )
}
