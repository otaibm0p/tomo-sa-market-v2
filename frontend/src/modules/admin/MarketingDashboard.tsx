import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '../../context/LanguageContext'
import api from '../../utils/api'

interface Campaign {
  id: number
  name_ar: string
  name_en: string
  description_ar: string
  description_en: string
  type: 'email' | 'sms' | 'push' | 'banner' | 'popup'
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed'
  start_date: string
  end_date: string
  budget: number
  spent: number
  impressions: number
  clicks: number
  conversions: number
  target_audience: string
  created_at: string
}

interface Ad {
  id: number
  title_ar: string
  title_en: string
  description_ar: string
  description_en: string
  image_url: string
  link_url: string
  position: 'homepage_hero' | 'homepage_banner' | 'product_page' | 'checkout' | 'sidebar'
  status: 'active' | 'inactive' | 'scheduled'
  start_date: string
  end_date: string
  clicks: number
  impressions: number
  ctr: number
  created_at: string
}

interface Coupon {
  id: number
  code: string
  name_ar: string
  name_en: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_purchase_amount: number
  max_discount_amount: number | null
  usage_limit: number | null
  used_count: number
  valid_from: string
  valid_until: string
  is_active: boolean
}

interface MarketingStats {
  total_campaigns: number
  active_campaigns: number
  total_ads: number
  active_ads: number
  total_coupons: number
  active_coupons: number
  total_impressions: number
  total_clicks: number
  total_conversions: number
  total_budget: number
  total_spent: number
  ctr: number
  conversion_rate: number
}

// Helper function to format numbers in English
const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    useGrouping: true
  }).format(num)
}

export default function MarketingDashboard() {
  const { language, t } = useLanguage()
  const [activeTab, setActiveTab] = useState<'overview' | 'campaigns' | 'ads' | 'coupons'>('overview')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<MarketingStats>({
    total_campaigns: 0,
    active_campaigns: 0,
    total_ads: 0,
    active_ads: 0,
    total_coupons: 0,
    active_coupons: 0,
    total_impressions: 0,
    total_clicks: 0,
    total_conversions: 0,
    total_budget: 0,
    total_spent: 0,
    ctr: 0,
    conversion_rate: 0,
  })
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [ads, setAds] = useState<Ad[]>([])
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [showCampaignForm, setShowCampaignForm] = useState(false)
  const [showAdForm, setShowAdForm] = useState(false)
  const [showCouponForm, setShowCouponForm] = useState(false)

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [activeTab])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load stats, campaigns, ads, and coupons in parallel
      const [statsRes, campaignsRes, adsRes, couponsRes] = await Promise.allSettled([
        api.get('/api/admin/marketing/stats').catch(() => ({ data: {} })),
        api.get('/api/admin/marketing/campaigns').catch(() => ({ data: { campaigns: [] } })),
        api.get('/api/admin/marketing/ads').catch(() => ({ data: { ads: [] } })),
        api.get('/api/admin/marketing/coupons').catch(() => ({ data: { coupons: [] } }))
      ])

      const statsData = statsRes.status === 'fulfilled' ? statsRes.value.data : {}
      const campaignsData = campaignsRes.status === 'fulfilled' ? campaignsRes.value.data : { campaigns: [] }
      const adsData = adsRes.status === 'fulfilled' ? adsRes.value.data : { ads: [] }
      const couponsData = couponsRes.status === 'fulfilled' ? couponsRes.value.data : { coupons: [] }

      setStats({
        total_campaigns: statsData.total_campaigns || 0,
        active_campaigns: statsData.active_campaigns || 0,
        total_ads: statsData.total_ads || 0,
        active_ads: statsData.active_ads || 0,
        total_coupons: statsData.total_coupons || 0,
        active_coupons: statsData.active_coupons || 0,
        total_impressions: statsData.total_impressions || 0,
        total_clicks: statsData.total_clicks || 0,
        total_conversions: statsData.total_conversions || 0,
        total_budget: statsData.total_budget || 0,
        total_spent: statsData.total_spent || 0,
        ctr: statsData.ctr || 0,
        conversion_rate: statsData.conversion_rate || 0,
      })

      setCampaigns(campaignsData.campaigns || [])
      setAds(adsData.ads || [])
      setCoupons(couponsData.coupons || [])
    } catch (err) {
      console.error('Error loading marketing data:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string, type: 'campaign' | 'ad' | 'coupon' = 'campaign') => {
    const statusMap: { [key: string]: { label: string; color: string } } = {
      active: { 
        label: language === 'ar' ? 'نشط' : 'Active', 
        color: 'bg-emerald-100 text-emerald-800 border-emerald-300' 
      },
      inactive: { 
        label: language === 'ar' ? 'غير نشط' : 'Inactive', 
        color: 'bg-gray-100 text-gray-800 border-gray-300' 
      },
      paused: { 
        label: language === 'ar' ? 'متوقف' : 'Paused', 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300' 
      },
      draft: { 
        label: language === 'ar' ? 'مسودة' : 'Draft', 
        color: 'bg-gray-100 text-gray-800 border-gray-300' 
      },
      scheduled: { 
        label: language === 'ar' ? 'مجدول' : 'Scheduled', 
        color: 'bg-blue-100 text-blue-800 border-blue-300' 
      },
      completed: { 
        label: language === 'ar' ? 'مكتمل' : 'Completed', 
        color: 'bg-purple-100 text-purple-800 border-purple-300' 
      },
    }

    const statusInfo = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800 border-gray-300' }
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    )
  }

  if (loading && activeTab === 'overview') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
          <div className="text-gray-600 font-['Tajawal']">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 font-['Tajawal'] p-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <span>📣</span>
            {language === 'ar' ? 'مركز التسويق والإعلان' : 'Marketing & Advertising Center'}
          </h1>
          <p className="text-gray-600">
            {language === 'ar' ? 'إدارة الحملات التسويقية والإعلانات والعروض الترويجية' : 'Manage marketing campaigns, ads, and promotional offers'}
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-6">
          <div className="flex flex-wrap border-b border-gray-200">
            {[
              { id: 'overview', label: language === 'ar' ? 'نظرة عامة' : 'Overview', icon: '📊' },
              { id: 'campaigns', label: language === 'ar' ? 'الحملات' : 'Campaigns', icon: '🎯' },
              { id: 'ads', label: language === 'ar' ? 'الإعلانات' : 'Ads', icon: '📢' },
              { id: 'coupons', label: language === 'ar' ? 'الكوبونات' : 'Coupons', icon: '🎁' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-4 font-bold transition-all ${
                  activeTab === tab.id
                    ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
                    : 'text-gray-600 hover:text-emerald-600 hover:bg-gray-50'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Statistics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200 shadow-lg"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl">🎯</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${stats.active_campaigns > 0 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-gray-100 text-gray-800 border-gray-300'}`}>
                    {stats.active_campaigns} {language === 'ar' ? 'نشط' : 'Active'}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">{language === 'ar' ? 'إجمالي الحملات' : 'Total Campaigns'}</h3>
                <p className="text-3xl font-bold text-blue-700" dir="ltr">{formatNumber(stats.total_campaigns)}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200 shadow-lg"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl">📢</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${stats.active_ads > 0 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-gray-100 text-gray-800 border-gray-300'}`}>
                    {stats.active_ads} {language === 'ar' ? 'نشط' : 'Active'}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">{language === 'ar' ? 'إجمالي الإعلانات' : 'Total Ads'}</h3>
                <p className="text-3xl font-bold text-purple-700" dir="ltr">{formatNumber(stats.total_ads)}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-6 border border-emerald-200 shadow-lg"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl">🎁</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${stats.active_coupons > 0 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-gray-100 text-gray-800 border-gray-300'}`}>
                    {stats.active_coupons} {language === 'ar' ? 'نشط' : 'Active'}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">{language === 'ar' ? 'إجمالي الكوبونات' : 'Total Coupons'}</h3>
                <p className="text-3xl font-bold text-emerald-700" dir="ltr">{formatNumber(stats.total_coupons)}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200 shadow-lg"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl">👁️</span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold border bg-blue-100 text-blue-800 border-blue-300">
                    CTR: {stats.ctr.toFixed(2)}%
                  </span>
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">{language === 'ar' ? 'إجمالي المشاهدات' : 'Total Impressions'}</h3>
                <p className="text-3xl font-bold text-orange-700" dir="ltr">{formatNumber(stats.total_impressions)}</p>
              </motion.div>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">🖱️</span>
                  <h3 className="text-sm font-bold text-gray-700">{language === 'ar' ? 'إجمالي النقرات' : 'Total Clicks'}</h3>
                </div>
                <p className="text-2xl font-bold text-gray-900" dir="ltr">{formatNumber(stats.total_clicks)}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">💰</span>
                  <h3 className="text-sm font-bold text-gray-700">{language === 'ar' ? 'إجمالي التحويلات' : 'Total Conversions'}</h3>
                </div>
                <p className="text-2xl font-bold text-gray-900" dir="ltr">{formatNumber(stats.total_conversions)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {language === 'ar' ? 'معدل التحويل:' : 'Conversion Rate:'} {stats.conversion_rate.toFixed(2)}%
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">💵</span>
                  <h3 className="text-sm font-bold text-gray-700">{language === 'ar' ? 'الميزانية' : 'Budget'}</h3>
                </div>
                <p className="text-2xl font-bold text-gray-900" dir="ltr">{formatNumber(stats.total_budget)} {t('currency')}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">💸</span>
                  <h3 className="text-sm font-bold text-gray-700">{language === 'ar' ? 'المصروف' : 'Spent'}</h3>
                </div>
                <p className="text-2xl font-bold text-gray-900" dir="ltr">{formatNumber(stats.total_spent)} {t('currency')}</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-emerald-600 h-2 rounded-full"
                    style={{ width: `${stats.total_budget > 0 ? (stats.total_spent / stats.total_budget * 100) : 0}%` }}
                  ></div>
                </div>
              </motion.div>
            </div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>⚡</span>
                {language === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Link
                  to="/admin/hero-slider"
                  className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200 hover:shadow-lg transition-all"
                >
                  <span className="text-2xl">🖼️</span>
                  <div>
                    <h3 className="font-bold text-gray-900">{language === 'ar' ? 'Hero Slider' : 'Hero Slider'}</h3>
                    <p className="text-xs text-gray-600">{language === 'ar' ? 'إدارة البانر الرئيسي' : 'Manage homepage banner'}</p>
                  </div>
                </Link>
                <Link
                  to="/admin/promotions"
                  className="flex items-center gap-3 p-4 bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200 hover:shadow-lg transition-all"
                >
                  <span className="text-2xl">🎁</span>
                  <div>
                    <h3 className="font-bold text-gray-900">{language === 'ar' ? 'العروض الترويجية' : 'Promotions'}</h3>
                    <p className="text-xs text-gray-600">{language === 'ar' ? 'إدارة العروض الخاصة' : 'Manage special offers'}</p>
                  </div>
                </Link>
                <button
                  onClick={() => setShowCouponForm(true)}
                  className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl border border-purple-200 hover:shadow-lg transition-all text-right"
                >
                  <span className="text-2xl">🎫</span>
                  <div>
                    <h3 className="font-bold text-gray-900">{language === 'ar' ? 'إنشاء كوبون' : 'Create Coupon'}</h3>
                    <p className="text-xs text-gray-600">{language === 'ar' ? 'كوبون خصم جديد' : 'New discount coupon'}</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Campaigns Tab */}
        {activeTab === 'campaigns' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <span>🎯</span>
                  {language === 'ar' ? 'الحملات التسويقية' : 'Marketing Campaigns'}
                </h2>
                <button
                  onClick={() => setShowCampaignForm(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all"
                >
                  + {language === 'ar' ? 'إضافة حملة' : 'Add Campaign'}
                </button>
              </div>
              <div className="text-center py-12 text-gray-500">
                <span className="text-6xl mb-4 block">🎯</span>
                <p className="text-lg font-bold">{language === 'ar' ? 'قريباً: إدارة الحملات التسويقية' : 'Coming Soon: Campaign Management'}</p>
                <p className="text-sm mt-2">{language === 'ar' ? 'سيتم إضافة هذه الميزة قريباً' : 'This feature will be added soon'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Ads Tab */}
        {activeTab === 'ads' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <span>📢</span>
                  {language === 'ar' ? 'الإعلانات' : 'Advertisements'}
                </h2>
                <button
                  onClick={() => setShowAdForm(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all"
                >
                  + {language === 'ar' ? 'إضافة إعلان' : 'Add Ad'}
                </button>
              </div>
              <div className="text-center py-12 text-gray-500">
                <span className="text-6xl mb-4 block">📢</span>
                <p className="text-lg font-bold">{language === 'ar' ? 'قريباً: إدارة الإعلانات' : 'Coming Soon: Ad Management'}</p>
                <p className="text-sm mt-2">{language === 'ar' ? 'سيتم إضافة هذه الميزة قريباً' : 'This feature will be added soon'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Coupons Tab */}
        {activeTab === 'coupons' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <span>🎁</span>
                  {language === 'ar' ? 'الكوبونات والعروض' : 'Coupons & Offers'}
                </h2>
                <button
                  onClick={() => setShowCouponForm(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all"
                >
                  + {language === 'ar' ? 'إضافة كوبون' : 'Add Coupon'}
                </button>
              </div>
              <Link
                to="/admin/promotions"
                className="block text-center py-12 text-gray-500 hover:text-emerald-600 transition-all"
              >
                <span className="text-6xl mb-4 block">🎁</span>
                <p className="text-lg font-bold">{language === 'ar' ? 'إدارة الكوبونات والعروض' : 'Manage Coupons & Promotions'}</p>
                <p className="text-sm mt-2">{language === 'ar' ? 'انقر للانتقال إلى صفحة العروض الترويجية' : 'Click to go to Promotions page'}</p>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
