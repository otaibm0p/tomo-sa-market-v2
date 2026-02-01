import { useState, useEffect } from 'react'
import api from '../../utils/api'
import { useLanguage } from '../../context/LanguageContext'

interface HeroSlide {
  id: number
  title_ar?: string
  title_en?: string
  subtitle_ar?: string
  subtitle_en?: string
  image_url: string
  bg_gradient?: string
  link_url?: string
  is_active: boolean
  display_order: number
}

export default function HeroSliderManagement() {
  const { language } = useLanguage()
  const [slides, setSlides] = useState<HeroSlide[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null)
  const [formData, setFormData] = useState({
    title_ar: '',
    title_en: '',
    subtitle_ar: '',
    subtitle_en: '',
    image_url: '',
    bg_gradient: 'from-emerald-500 to-green-600',
    link_url: '',
    is_active: true,
    display_order: 0,
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadSlides()
  }, [])

  const loadSlides = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/admin/hero-slides')
      
      // معالجة الاستجابة - قد تكون مصفوفة مباشرة أو كائن يحتوي على slides
      let slidesData: HeroSlide[] = []
      if (Array.isArray(res.data)) {
        slidesData = res.data
      } else if (res.data && Array.isArray(res.data.slides)) {
        slidesData = res.data.slides
      } else if (res.data && res.data.rows && Array.isArray(res.data.rows)) {
        slidesData = res.data.rows
      }
      
      setSlides(slidesData)
      console.log(`✅ Loaded ${slidesData.length} hero slides for admin`)
    } catch (err: any) {
      console.error('Error loading hero slides:', err)
      console.error('Error details:', err.response?.data || err.message)
      setSlides([]) // تعيين مصفوفة فارغة بدلاً من إظهار خطأ
      // لا نعرض alert إذا كانت المصفوفة فارغة (قد يكون الجدول غير موجود بعد)
      if (err.response?.status !== 500) {
        alert(language === 'en' ? 'Failed to load hero slides' : 'فشل تحميل شرائح Hero')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      if (editingSlide) {
        await api.put(`/api/admin/hero-slides/${editingSlide.id}`, formData)
      } else {
        await api.post('/api/admin/hero-slides', formData)
      }
      setShowForm(false)
      setEditingSlide(null)
      setFormData({
        title_ar: '',
        title_en: '',
        subtitle_ar: '',
        subtitle_en: '',
        image_url: '',
        bg_gradient: 'from-emerald-500 to-green-600',
        link_url: '',
        is_active: true,
        display_order: 0,
      })
      loadSlides()
    } catch (err: any) {
      alert(err.response?.data?.message || (language === 'en' ? 'Failed to save slide' : 'فشل حفظ الشريحة'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm(language === 'en' ? 'Are you sure you want to delete this slide?' : 'هل أنت متأكد من حذف هذه الشريحة؟')) return

    try {
      await api.delete(`/api/admin/hero-slides/${id}`)
      loadSlides()
    } catch (err: any) {
      alert(err.response?.data?.message || (language === 'en' ? 'Failed to delete slide' : 'فشل حذف الشريحة'))
    }
  }

  const startEdit = (slide: HeroSlide) => {
    setEditingSlide(slide)
    setFormData({
      title_ar: slide.title_ar || '',
      title_en: slide.title_en || '',
      subtitle_ar: slide.subtitle_ar || '',
      subtitle_en: slide.subtitle_en || '',
      image_url: slide.image_url,
      bg_gradient: slide.bg_gradient || 'from-emerald-500 to-green-600',
      link_url: slide.link_url || '',
      is_active: slide.is_active,
      display_order: slide.display_order,
    })
    setShowForm(true)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-lg">{language === 'en' ? 'Loading...' : 'جاري التحميل...'}</div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold" style={{ color: '#064e3b' }}>
            {language === 'en' ? 'Hero Slider Management' : 'إدارة شرائح Hero'}
          </h2>
          <button
            onClick={() => {
              setShowForm(true)
              setEditingSlide(null)
              setFormData({
                title_ar: '',
                title_en: '',
                subtitle_ar: '',
                subtitle_en: '',
                image_url: '',
                bg_gradient: 'from-emerald-500 to-green-600',
                link_url: '',
                is_active: true,
                display_order: slides.length,
              })
            }}
            className="px-4 py-2 rounded-lg font-semibold text-white transition-all hover:scale-105"
            style={{ backgroundColor: '#064e3b' }}
          >
            {language === 'en' ? '+ Add Slide' : '+ إضافة شريحة'}
          </button>
        </div>
        
        {/* Info Banner */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-4 rounded-lg mb-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">ℹ️</div>
            <div className="flex-1">
              <h3 className="font-bold text-blue-900 mb-2">
                {language === 'en' ? 'About Hero Slider' : 'عن شرائح Hero'}
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>
                  <strong>{language === 'en' ? 'Location: ' : 'الموقع: '}</strong>
                  {language === 'en' 
                    ? 'Appears at the very top of the homepage, above all product sections and categories.'
                    : 'تظهر في أعلى الصفحة الرئيسية، فوق جميع أقسام المنتجات والفئات.'}
                </li>
                <li>
                  <strong>{language === 'en' ? 'Recommended Size: ' : 'الحجم الموصى به: '}</strong>
                  {language === 'en' 
                    ? '1920x600px (16:9 ratio) for best quality on all devices.'
                    : '1920x600 بكسل (نسبة 16:9) للحصول على أفضل جودة على جميع الأجهزة.'}
                </li>
                <li>
                  <strong>{language === 'en' ? 'Auto-rotation: ' : 'التدوير التلقائي: '}</strong>
                  {language === 'en' 
                    ? 'Slides change automatically every 5 seconds. Users can also click dots to navigate.'
                    : 'تتغير الشرائح تلقائياً كل 5 ثوانٍ. يمكن للمستخدمين أيضاً النقر على النقاط للتنقل.'}
                </li>
                <li>
                  <strong>{language === 'en' ? 'Display Order: ' : 'ترتيب العرض: '}</strong>
                  {language === 'en' 
                    ? 'Lower numbers appear first. Use this to control which slide shows first.'
                    : 'الأرقام الأقل تظهر أولاً. استخدم هذا للتحكم في الشريحة التي تظهر أولاً.'}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border-2" style={{ borderColor: '#064e3b' }}>
          <h3 className="text-xl font-bold mb-4" style={{ color: '#064e3b' }}>
            {editingSlide ? (language === 'en' ? 'Edit Slide' : 'تعديل شريحة') : (language === 'en' ? 'Add New Slide' : 'إضافة شريحة جديدة')}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">{language === 'en' ? 'Title (Arabic)' : 'العنوان (عربي)'}</label>
                <input
                  type="text"
                  value={formData.title_ar}
                  onChange={(e) => setFormData({ ...formData, title_ar: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{language === 'en' ? 'Title (English)' : 'العنوان (إنجليزي)'}</label>
                <input
                  type="text"
                  value={formData.title_en}
                  onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">{language === 'en' ? 'Subtitle (Arabic)' : 'العنوان الفرعي (عربي)'}</label>
                <input
                  type="text"
                  value={formData.subtitle_ar}
                  onChange={(e) => setFormData({ ...formData, subtitle_ar: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{language === 'en' ? 'Subtitle (English)' : 'العنوان الفرعي (إنجليزي)'}</label>
                <input
                  type="text"
                  value={formData.subtitle_en}
                  onChange={(e) => setFormData({ ...formData, subtitle_en: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">{language === 'en' ? 'Image URL' : 'رابط الصورة'}</label>
              <input
                type="url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                required
                placeholder="https://example.com/image.jpg"
              />
              
              {/* Image Size Guidelines */}
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs font-semibold text-blue-900 mb-1">
                  {language === 'en' ? '📐 Recommended Image Size:' : '📐 الحجم الموصى به للصورة:'}
                </p>
                <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                  <li>{language === 'en' ? 'Width: 1920px (Full HD)' : 'العرض: 1920 بكسل (Full HD)'}</li>
                  <li>{language === 'en' ? 'Height: 450px - 600px' : 'الارتفاع: 450 - 600 بكسل'}</li>
                  <li>{language === 'en' ? 'Aspect Ratio: 16:9 or 21:9 (Wide)' : 'نسبة العرض إلى الارتفاع: 16:9 أو 21:9 (عريض)'}</li>
                  <li>{language === 'en' ? 'Format: JPG, PNG, or WebP' : 'الصيغة: JPG أو PNG أو WebP'}</li>
                  <li>{language === 'en' ? 'File Size: Under 500KB (optimized)' : 'حجم الملف: أقل من 500 كيلوبايت (محسّن)'}</li>
                </ul>
              </div>

              {/* Where it appears */}
              <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-xs font-semibold text-emerald-900 mb-1">
                  {language === 'en' ? '📍 Where it appears:' : '📍 مكان الظهور:'}
                </p>
                <p className="text-xs text-emerald-800">
                  {language === 'en' 
                    ? 'This slide will appear at the top of the homepage (above all sections) as a banner slider. Multiple slides will rotate automatically every 5 seconds.'
                    : 'ستظهر هذه الشريحة في أعلى الصفحة الرئيسية (فوق جميع الأقسام) كبانر متحرك. الشرائح المتعددة ستدور تلقائياً كل 5 ثوانٍ.'}
                </p>
              </div>

              {formData.image_url && (
                <div className="mt-3">
                  <p className="text-xs text-gray-600 mb-2">{language === 'en' ? 'Preview:' : 'معاينة:'}</p>
                  <div className="relative rounded-lg overflow-hidden border-2 border-gray-200" style={{ aspectRatio: '16/9', maxHeight: '300px' }}>
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/1920x600?text=Image+Not+Found'
                      }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2">
                      {language === 'en' ? 'This is how it will look on the homepage' : 'هكذا ستبدو في الصفحة الرئيسية'}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">{language === 'en' ? 'Background Gradient' : 'تدرج الخلفية'}</label>
                <select
                  value={formData.bg_gradient}
                  onChange={(e) => setFormData({ ...formData, bg_gradient: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="from-emerald-500 to-green-600">Emerald Green</option>
                  <option value="from-blue-500 to-cyan-500">Blue Cyan</option>
                  <option value="from-purple-500 to-pink-500">Purple Pink</option>
                  <option value="from-yellow-500 to-orange-500">Yellow Orange</option>
                  <option value="from-red-500 to-pink-500">Red Pink</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{language === 'en' ? 'Link URL (Optional)' : 'رابط (اختياري)'}</label>
                <input
                  type="url"
                  value={formData.link_url}
                  onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="https://example.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">{language === 'en' ? 'Display Order' : 'ترتيب العرض'}</label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border rounded-lg"
                  min="0"
                />
              </div>
              <div className="flex items-center gap-4 mt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <span>{language === 'en' ? 'Active' : 'نشط'}</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 rounded-lg font-semibold text-white transition-all hover:scale-105 disabled:opacity-50"
                style={{ backgroundColor: '#064e3b' }}
              >
                {submitting ? (language === 'en' ? 'Saving...' : 'جاري الحفظ...') : (editingSlide ? (language === 'en' ? 'Update' : 'تحديث') : (language === 'en' ? 'Add' : 'إضافة'))}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditingSlide(null)
                  setFormData({
                    title_ar: '',
                    title_en: '',
                    subtitle_ar: '',
                    subtitle_en: '',
                    image_url: '',
                    bg_gradient: 'from-emerald-500 to-green-600',
                    link_url: '',
                    is_active: true,
                    display_order: 0,
                  })
                }}
                className="px-6 py-2 rounded-lg font-semibold bg-gray-300 text-gray-800 hover:bg-gray-400 transition-all"
              >
                {language === 'en' ? 'Cancel' : 'إلغاء'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {slides.map((slide) => (
          <div key={slide.id} className="bg-white rounded-2xl shadow-lg overflow-hidden border-2" style={{ borderColor: slide.is_active ? '#064e3b' : '#e5e7eb' }}>
            <div className="relative h-48">
              <img
                src={slide.image_url}
                alt={slide.title_ar || slide.title_en || 'Slide'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = 'https://via.placeholder.com/400x200?text=No+Image'
                }}
              />
              {!slide.is_active && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white font-bold">{language === 'en' ? 'Inactive' : 'غير نشط'}</span>
                </div>
              )}
            </div>
            <div className="p-4">
              <h4 className="font-bold mb-2" style={{ color: '#064e3b' }}>
                {language === 'en' ? (slide.title_en || slide.title_ar) : (slide.title_ar || slide.title_en)}
              </h4>
              <p className="text-gray-600 text-sm mb-4">
                {language === 'en' ? (slide.subtitle_en || slide.subtitle_ar) : (slide.subtitle_ar || slide.subtitle_en)}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(slide)}
                  className="flex-1 px-3 py-2 rounded-lg font-semibold text-white transition-all hover:scale-105"
                  style={{ backgroundColor: '#064e3b' }}
                >
                  {language === 'en' ? 'Edit' : 'تعديل'}
                </button>
                <button
                  onClick={() => handleDelete(slide.id)}
                  className="flex-1 px-3 py-2 rounded-lg font-semibold bg-red-600 text-white hover:bg-red-700 transition-all hover:scale-105"
                >
                  {language === 'en' ? 'Delete' : 'حذف'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

