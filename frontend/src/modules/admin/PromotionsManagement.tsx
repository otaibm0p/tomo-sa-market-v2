import { useState, useEffect } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import api from '../../utils/api'

interface BOGOOffer {
  id: number
  name_ar: string
  name_en: string
  buy_product_id: number
  get_product_id: number
  buy_quantity: number
  get_quantity: number
  valid_from: string
  valid_until: string
  is_active: boolean
  buy_product_name_ar?: string
  buy_product_name_en?: string
  get_product_name_ar?: string
  get_product_name_en?: string
}

interface FlashSale {
  id: number
  name_ar: string
  name_en: string
  discount_percentage: number
  start_time: string
  end_time: string
  is_active: boolean
  product_count: number
}

export default function PromotionsManagement() {
  const { language } = useLanguage()
  const [activeTab, setActiveTab] = useState<'bogo' | 'flash'>('bogo')
  const [bogoOffers, setBogoOffers] = useState<BOGOOffer[]>([])
  const [flashSales, setFlashSales] = useState<FlashSale[]>([])
  const [loading, setLoading] = useState(true)
  const [showBOGOForm, setShowBOGOForm] = useState(false)
  const [showFlashForm, setShowFlashForm] = useState(false)
  const [bogoForm, setBogoForm] = useState({
    name_ar: '',
    name_en: '',
    buy_product_id: '',
    get_product_id: '',
    buy_quantity: 1,
    get_quantity: 1,
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  })
  const [flashForm, setFlashForm] = useState({
    name_ar: '',
    name_en: '',
    description_ar: '',
    description_en: '',
    discount_percentage: 0,
    start_time: new Date().toISOString().slice(0, 16),
    end_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  })

  useEffect(() => {
    loadData()
  }, [activeTab])

  const loadData = async () => {
    try {
      setLoading(true)
      if (activeTab === 'bogo') {
        const res = await api.get('/api/admin/promotions/bogo')
        setBogoOffers(res.data.offers || [])
      } else {
        const res = await api.get('/api/admin/promotions/flash-sales')
        setFlashSales(res.data.flash_sales || [])
      }
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBOGO = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/api/admin/promotions/bogo', {
        ...bogoForm,
        buy_product_id: parseInt(bogoForm.buy_product_id),
        get_product_id: parseInt(bogoForm.get_product_id),
        valid_from: new Date(bogoForm.valid_from).toISOString(),
        valid_until: new Date(bogoForm.valid_until).toISOString()
      })
      setShowBOGOForm(false)
      loadData()
    } catch (err) {
      console.error('Error creating BOGO:', err)
      alert(language === 'en' ? 'Failed to create BOGO offer' : 'فشل إنشاء عرض BOGO')
    }
  }

  const handleCreateFlashSale = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/api/admin/promotions/flash-sales', {
        ...flashForm,
        start_time: new Date(flashForm.start_time).toISOString(),
        end_time: new Date(flashForm.end_time).toISOString()
      })
      setShowFlashForm(false)
      loadData()
    } catch (err) {
      console.error('Error creating flash sale:', err)
      alert(language === 'en' ? 'Failed to create flash sale' : 'فشل إنشاء العرض السريع')
    }
  }

  return (
    <div className="p-6 space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold" style={{ color: '#064e3b' }}>
          {language === 'en' ? 'Promotions Management' : 'إدارة العروض الترويجية'}
        </h1>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-lg">
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('bogo')}
              className={`px-6 py-4 font-semibold transition-colors ${
                activeTab === 'bogo'
                  ? 'border-b-2 border-emerald-500 text-emerald-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {language === 'en' ? 'BOGO Offers' : 'عروض اشتري واحصل'}
            </button>
            <button
              onClick={() => setActiveTab('flash')}
              className={`px-6 py-4 font-semibold transition-colors ${
                activeTab === 'flash'
                  ? 'border-b-2 border-emerald-500 text-emerald-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {language === 'en' ? 'Flash Sales' : 'العروض السريعة'}
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'bogo' ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">
                  {language === 'en' ? 'Buy 1 Get 1 Offers' : 'عروض اشتري واحصل'}
                </h2>
                <button
                  onClick={() => setShowBOGOForm(true)}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  {language === 'en' ? '+ New BOGO' : '+ عرض جديد'}
                </button>
              </div>

              {showBOGOForm && (
                <div className="bg-gray-50 rounded-xl p-6 border-2 border-emerald-200">
                  <h3 className="text-lg font-semibold mb-4">
                    {language === 'en' ? 'Create BOGO Offer' : 'إنشاء عرض اشتري واحصل'}
                  </h3>
                  <form onSubmit={handleCreateBOGO} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          {language === 'en' ? 'Name (Arabic)' : 'الاسم (عربي)'}
                        </label>
                        <input
                          type="text"
                          value={bogoForm.name_ar}
                          onChange={(e) => setBogoForm({ ...bogoForm, name_ar: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          {language === 'en' ? 'Name (English)' : 'الاسم (إنجليزي)'}
                        </label>
                        <input
                          type="text"
                          value={bogoForm.name_en}
                          onChange={(e) => setBogoForm({ ...bogoForm, name_en: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          {language === 'en' ? 'Buy Product ID' : 'معرف المنتج للشراء'} *
                        </label>
                        <input
                          type="number"
                          required
                          value={bogoForm.buy_product_id}
                          onChange={(e) => setBogoForm({ ...bogoForm, buy_product_id: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          {language === 'en' ? 'Get Product ID' : 'معرف المنتج المجاني'} *
                        </label>
                        <input
                          type="number"
                          required
                          value={bogoForm.get_product_id}
                          onChange={(e) => setBogoForm({ ...bogoForm, get_product_id: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          {language === 'en' ? 'Buy Quantity' : 'كمية الشراء'}
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={bogoForm.buy_quantity}
                          onChange={(e) => setBogoForm({ ...bogoForm, buy_quantity: parseInt(e.target.value) })}
                          className="w-full px-4 py-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          {language === 'en' ? 'Get Quantity' : 'الكمية المجانية'}
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={bogoForm.get_quantity}
                          onChange={(e) => setBogoForm({ ...bogoForm, get_quantity: parseInt(e.target.value) })}
                          className="w-full px-4 py-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          {language === 'en' ? 'Valid From' : 'صالح من'}
                        </label>
                        <input
                          type="date"
                          value={bogoForm.valid_from}
                          onChange={(e) => setBogoForm({ ...bogoForm, valid_from: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          {language === 'en' ? 'Valid Until' : 'صالح حتى'}
                        </label>
                        <input
                          type="date"
                          value={bogoForm.valid_until}
                          onChange={(e) => setBogoForm({ ...bogoForm, valid_until: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg"
                        />
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <button
                        type="submit"
                        className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                      >
                        {language === 'en' ? 'Create' : 'إنشاء'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowBOGOForm(false)}
                        className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                      >
                        {language === 'en' ? 'Cancel' : 'إلغاء'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          {language === 'en' ? 'Name' : 'الاسم'}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          {language === 'en' ? 'Buy Product' : 'منتج الشراء'}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          {language === 'en' ? 'Get Product' : 'منتج مجاني'}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          {language === 'en' ? 'Valid Until' : 'صالح حتى'}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          {language === 'en' ? 'Status' : 'الحالة'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {bogoOffers.map((offer) => (
                        <tr key={offer.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            {language === 'en' ? offer.name_en || offer.name_ar : offer.name_ar}
                          </td>
                          <td className="px-6 py-4">
                            {language === 'en' 
                              ? offer.buy_product_name_en || offer.buy_product_name_ar || `Product #${offer.buy_product_id}`
                              : offer.buy_product_name_ar || `منتج #${offer.buy_product_id}`
                            }
                          </td>
                          <td className="px-6 py-4">
                            {language === 'en'
                              ? offer.get_product_name_en || offer.get_product_name_ar || `Product #${offer.get_product_id}`
                              : offer.get_product_name_ar || `منتج #${offer.get_product_id}`
                            }
                          </td>
                          <td className="px-6 py-4">{new Date(offer.valid_until).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              offer.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {offer.is_active 
                                ? (language === 'en' ? 'Active' : 'نشط')
                                : (language === 'en' ? 'Inactive' : 'غير نشط')
                              }
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">
                  {language === 'en' ? 'Flash Sales' : 'العروض السريعة'}
                </h2>
                <button
                  onClick={() => setShowFlashForm(true)}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  {language === 'en' ? '+ New Flash Sale' : '+ عرض سريع جديد'}
                </button>
              </div>

              {showFlashForm && (
                <div className="bg-gray-50 rounded-xl p-6 border-2 border-emerald-200">
                  <h3 className="text-lg font-semibold mb-4">
                    {language === 'en' ? 'Create Flash Sale' : 'إنشاء عرض سريع'}
                  </h3>
                  <form onSubmit={handleCreateFlashSale} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          {language === 'en' ? 'Name (Arabic)' : 'الاسم (عربي)'}
                        </label>
                        <input
                          type="text"
                          value={flashForm.name_ar}
                          onChange={(e) => setFlashForm({ ...flashForm, name_ar: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          {language === 'en' ? 'Name (English)' : 'الاسم (إنجليزي)'}
                        </label>
                        <input
                          type="text"
                          value={flashForm.name_en}
                          onChange={(e) => setFlashForm({ ...flashForm, name_en: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          {language === 'en' ? 'Discount %' : 'نسبة الخصم'} *
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          max="100"
                          step="0.01"
                          value={flashForm.discount_percentage}
                          onChange={(e) => setFlashForm({ ...flashForm, discount_percentage: parseFloat(e.target.value) })}
                          className="w-full px-4 py-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          {language === 'en' ? 'Start Time' : 'وقت البداية'} *
                        </label>
                        <input
                          type="datetime-local"
                          required
                          value={flashForm.start_time}
                          onChange={(e) => setFlashForm({ ...flashForm, start_time: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          {language === 'en' ? 'End Time' : 'وقت النهاية'} *
                        </label>
                        <input
                          type="datetime-local"
                          required
                          value={flashForm.end_time}
                          onChange={(e) => setFlashForm({ ...flashForm, end_time: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg"
                        />
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <button
                        type="submit"
                        className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                      >
                        {language === 'en' ? 'Create' : 'إنشاء'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowFlashForm(false)}
                        className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                      >
                        {language === 'en' ? 'Cancel' : 'إلغاء'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          {language === 'en' ? 'Name' : 'الاسم'}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          {language === 'en' ? 'Discount' : 'الخصم'}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          {language === 'en' ? 'Start Time' : 'وقت البداية'}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          {language === 'en' ? 'End Time' : 'وقت النهاية'}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          {language === 'en' ? 'Products' : 'المنتجات'}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          {language === 'en' ? 'Status' : 'الحالة'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {flashSales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            {language === 'en' ? sale.name_en || sale.name_ar : sale.name_ar}
                          </td>
                          <td className="px-6 py-4 font-semibold text-red-600">
                            {sale.discount_percentage}%
                          </td>
                          <td className="px-6 py-4">{new Date(sale.start_time).toLocaleString()}</td>
                          <td className="px-6 py-4">{new Date(sale.end_time).toLocaleString()}</td>
                          <td className="px-6 py-4">{sale.product_count || 0}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              sale.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {sale.is_active 
                                ? (language === 'en' ? 'Active' : 'نشط')
                                : (language === 'en' ? 'Inactive' : 'غير نشط')
                              }
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

