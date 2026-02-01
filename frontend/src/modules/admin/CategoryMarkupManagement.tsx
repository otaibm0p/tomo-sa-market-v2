import { useState, useEffect } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import api from '../../utils/api'

interface Category {
  id: number
  name_ar: string
  name_en: string
}

interface CategoryMarkup {
  id: number
  category_id: number
  markup_percentage: number
  vat_percentage: number
  is_active: boolean
  name_ar?: string
  name_en?: string
}

interface PriceTierRule {
  id: number
  min_price: number
  max_price: number
  markup_percentage: number
  is_active: boolean
}

export default function CategoryMarkupManagement() {
  const { language } = useLanguage()
  const [activeTab, setActiveTab] = useState<'category' | 'tiers'>('category')
  const [categories, setCategories] = useState<Category[]>([])
  const [markups, setMarkups] = useState<CategoryMarkup[]>([])
  const [tierRules, setTierRules] = useState<PriceTierRule[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  
  // Category Markup Form State
  const [categoryFormData, setCategoryFormData] = useState({
    category_id: '',
    markup_percentage: 25,
    vat_percentage: 15
  })

  // Tier Rule Form State
  const [tierFormData, setTierFormData] = useState({
    min_price: 0,
    max_price: 10,
    markup_percentage: 20
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [markupsRes, categoriesRes, tierRulesRes] = await Promise.all([
        api.get('/api/admin/pricing/category-markups'),
        api.get('/api/categories'),
        api.get('/api/admin/pricing/tier-rules')
      ])
      
      setMarkups(markupsRes.data.markups || [])
      setTierRules(tierRulesRes.data.rules || [])
      
      const categoriesData = categoriesRes.data
      if (Array.isArray(categoriesData)) {
        setCategories(categoriesData)
      } else if (categoriesData.categories && Array.isArray(categoriesData.categories)) {
        setCategories(categoriesData.categories)
      } else {
        setCategories([])
      }
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/api/admin/pricing/category-markups', categoryFormData)
      setShowForm(false)
      setCategoryFormData({ category_id: '', markup_percentage: 25, vat_percentage: 15 })
      loadData()
      alert(language === 'en' ? 'Category Markup Applied!' : 'تم تطبيق هامش الفئة!')
    } catch (err) {
      console.error('Error creating markup:', err)
      alert(language === 'en' ? 'Failed to create markup' : 'فشل إنشاء الهامش')
    }
  }

  const handleTierSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/api/admin/pricing/tier-rules', tierFormData)
      setShowForm(false)
      setTierFormData({ min_price: 0, max_price: 10, markup_percentage: 20 })
      loadData()
      alert(language === 'en' ? 'Tier Rule Created & Applied!' : 'تم إنشاء القاعدة وتطبيقها!')
    } catch (err: any) {
      console.error('Error creating tier rule:', err)
      const errorMsg = err.response?.data?.message || (language === 'en' ? 'Failed to create rule' : 'فشل إنشاء القاعدة')
      alert(errorMsg)
    }
  }

  const handleDeleteTier = async (id: number) => {
    if (!window.confirm(language === 'en' ? 'Are you sure?' : 'هل أنت متأكد؟')) return
    try {
      await api.delete(`/api/admin/pricing/tier-rules/${id}`)
      loadData()
    } catch (err) {
      console.error('Error deleting tier rule:', err)
    }
  }

  return (
    <div className="p-6 space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#064e3b' }}>
            {language === 'en' ? 'Pricing Rules Engine' : 'محرك قواعد التسعير'}
          </h1>
          <p className="text-gray-500 mt-2">
            {language === 'en' ? 'Manage category markups and tiered pricing rules' : 'إدارة هوامش الفئات وقواعد التسعير المتدرج'}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-md"
        >
          {activeTab === 'category' 
            ? (language === 'en' ? '+ New Category Markup' : '+ هامش فئة جديد')
            : (language === 'en' ? '+ New Price Tier' : '+ قاعدة تسعير جديدة')
          }
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('category')}
          className={`pb-3 px-4 text-lg font-medium transition-colors ${
            activeTab === 'category' 
              ? 'text-emerald-600 border-b-2 border-emerald-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {language === 'en' ? 'Category Markups' : 'هوامش الفئات'}
        </button>
        <button
          onClick={() => setActiveTab('tiers')}
          className={`pb-3 px-4 text-lg font-medium transition-colors ${
            activeTab === 'tiers' 
              ? 'text-emerald-600 border-b-2 border-emerald-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {language === 'en' ? 'Tiered Pricing (Shopify Style)' : 'التسعير المتدرج (شرائح)'}
        </button>
      </div>

      {/* Forms */}
      {showForm && (
        <div className="bg-gray-50 rounded-xl p-6 border-2 border-emerald-200 shadow-lg mb-8 animate-fade-in-down">
          {activeTab === 'category' ? (
            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <h3 className="text-lg font-semibold mb-4 text-emerald-800">
                {language === 'en' ? 'Create Category Markup' : 'إنشاء هامش فئة'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    {language === 'en' ? 'Category' : 'الفئة'} *
                  </label>
                  <select
                    required
                    value={categoryFormData.category_id}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, category_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">{language === 'en' ? 'Select Category' : 'اختر الفئة'}</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {language === 'en' ? cat.name_en || cat.name_ar : cat.name_ar}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    {language === 'en' ? 'Markup %' : 'نسبة الهامش (%)'} *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={categoryFormData.markup_percentage}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, markup_percentage: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    {language === 'en' ? 'VAT %' : 'نسبة الضريبة (%)'} *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={categoryFormData.vat_percentage}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, vat_percentage: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="submit" className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                  {language === 'en' ? 'Apply Markup' : 'تطبيق الهامش'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                  {language === 'en' ? 'Cancel' : 'إلغاء'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleTierSubmit} className="space-y-4">
              <h3 className="text-lg font-semibold mb-4 text-blue-800">
                {language === 'en' ? 'Create Tiered Pricing Rule' : 'إنشاء قاعدة تسعير متدرج'}
              </h3>
              <div className="bg-blue-50 p-4 rounded-lg mb-4 text-sm text-blue-800 border border-blue-100">
                {language === 'en' 
                  ? 'This rule will apply automatically to all UNLOCKED products within the price range (based on Cost Price).'
                  : 'ستطبق هذه القاعدة تلقائياً على جميع المنتجات (غير المقفلة) التي تقع تكلفتها ضمن النطاق المحدد.'}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    {language === 'en' ? 'Min Cost Price' : 'أقل سعر تكلفة'} *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={tierFormData.min_price}
                    onChange={(e) => setTierFormData({ ...tierFormData, min_price: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    {language === 'en' ? 'Max Cost Price' : 'أعلى سعر تكلفة'} *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={tierFormData.max_price}
                    onChange={(e) => setTierFormData({ ...tierFormData, max_price: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    {language === 'en' ? 'Markup %' : 'نسبة الزيادة (%)'} *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={tierFormData.markup_percentage}
                    onChange={(e) => setTierFormData({ ...tierFormData, markup_percentage: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-blue-50 font-bold text-blue-900"
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  {language === 'en' ? 'Create & Apply Rule' : 'إنشاء وتطبيق القاعدة'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                  {language === 'en' ? 'Cancel' : 'إلغاء'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">{language === 'en' ? 'Loading data...' : 'جاري تحميل البيانات...'}</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
          {activeTab === 'category' ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 text-gray-500 text-sm uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-4 text-right">{language === 'en' ? 'Category' : 'الفئة'}</th>
                    <th className="px-6 py-4 text-right">{language === 'en' ? 'Markup %' : 'نسبة الهامش'}</th>
                    <th className="px-6 py-4 text-right">{language === 'en' ? 'VAT %' : 'نسبة الضريبة'}</th>
                    <th className="px-6 py-4 text-right">{language === 'en' ? 'Status' : 'الحالة'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {markups.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                        {language === 'en' ? 'No category markups found.' : 'لا توجد هوامش فئات مضافة.'}
                      </td>
                    </tr>
                  ) : (
                    markups.map((markup) => (
                      <tr key={markup.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-800">
                          {language === 'en' ? markup.name_en || markup.name_ar : markup.name_ar}
                        </td>
                        <td className="px-6 py-4 text-emerald-600 font-bold">{markup.markup_percentage}%</td>
                        <td className="px-6 py-4">{markup.vat_percentage}%</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            markup.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {markup.is_active 
                              ? (language === 'en' ? 'Active' : 'نشط')
                              : (language === 'en' ? 'Inactive' : 'غير نشط')
                            }
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-blue-50 text-blue-800 text-sm uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-4 text-right">{language === 'en' ? 'Price Range (Cost)' : 'نطاق السعر (التكلفة)'}</th>
                    <th className="px-6 py-4 text-right">{language === 'en' ? 'Markup Added' : 'الزيادة المضافة'}</th>
                    <th className="px-6 py-4 text-right">{language === 'en' ? 'Example' : 'مثال'}</th>
                    <th className="px-6 py-4 text-right">{language === 'en' ? 'Actions' : 'إجراءات'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tierRules.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                        {language === 'en' ? 'No tier rules found. Add one to start automating prices.' : 'لا توجد قواعد تسعير. أضف قاعدة لبدء التسعير التلقائي.'}
                      </td>
                    </tr>
                  ) : (
                    tierRules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-800">
                          {rule.min_price} - {rule.max_price} <span className="text-xs text-gray-500">SAR</span>
                        </td>
                        <td className="px-6 py-4 text-blue-600 font-bold">
                          +{rule.markup_percentage}%
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {language === 'en' ? '10 SAR Cost ->' : 'تكلفة 10 ريال ->'} 
                          <span className="font-bold text-gray-900 ml-1">
                            {(10 * (1 + rule.markup_percentage / 100)).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => handleDeleteTier(rule.id)}
                            className="text-red-600 hover:text-red-800 font-medium text-sm bg-red-50 hover:bg-red-100 px-3 py-1 rounded transition-colors"
                          >
                            {language === 'en' ? 'Delete' : 'حذف'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
