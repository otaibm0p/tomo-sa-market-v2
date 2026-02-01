import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Product, productAPI } from '../utils/api'
import { useCart } from '../context/CartContext'
import { useLanguage, getProductName, getCategoryName } from '../context/LanguageContext'
import api from '../utils/api'
import { useInventorySync } from '../hooks/useInventorySync'
import { ProductCard } from '../components/ProductCard'
import { HomepageSection } from '../components/HomepageSection'
import { Card } from '../shared/ui/components/Card'
import { Button } from '../shared/ui/components/Button'
import { Skeleton } from '../shared/ui/components/Skeleton'
import { spacing } from '../shared/ui/tokens'
import { getPublicSettings } from '../shared/settings/publicSettings'

interface Category {
  id: number
  name: string
  name_ar?: string
  name_en?: string
  image_url: string | null
  description: string | null
}

interface LayoutSection {
  id: string
  type: 'banner' | 'categories' | 'product-row' | 'product-grid'
  active: boolean
  title?: string
  titleAr?: string
  filter?: string
  categoryId?: string | null
  slides?: { id: number; image: string; title: string; subtitle?: string; link?: string }[]
}

interface HomepageSectionConfig {
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

export default function Home() {
  const [layout, setLayout] = useState<LayoutSection[]>([])
  const [homepageSections, setHomepageSections] = useState<HomepageSectionConfig[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [loadIssue, setLoadIssue] = useState(false)
  const { addToCart, lockedStoreId, lockedStoreName, cart } = useCart()
  const { language, setLanguage, t } = useLanguage()
  const navigate = useNavigate()
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const cartItemCount = (cart || []).reduce((sum, item) => sum + item.quantity, 0)
  const [recentIds, setRecentIds] = useState<number[]>([])
  const [homeHero, setHomeHero] = useState<{ enabled: boolean; height: 'sm' | 'md' | 'lg' }>({ enabled: false, height: 'sm' })

  useEffect(() => {
    try {
      const raw = localStorage.getItem('recently_viewed_products')
      const list = raw ? (JSON.parse(raw) as number[]) : []
      if (Array.isArray(list)) setRecentIds(list.filter((x) => Number.isFinite(Number(x))).map((x) => Number(x)).slice(0, 10))
    } catch {
      setRecentIds([])
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const s = await getPublicSettings()
      const hh: any = (s as any)?.homeHero
      if (!cancelled && hh && typeof hh === 'object') {
        const height = hh.height === 'md' || hh.height === 'lg' ? hh.height : 'sm'
        setHomeHero({ enabled: !!hh.enabled, height })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          })
        },
        () => console.log('لم يتم الحصول على الموقع')
      )
    }
    loadData()
  }, [lockedStoreId])

  useEffect(() => {
    // Auto slide for banner
    const bannerSection = (layout && Array.isArray(layout)) ? layout.find(s => s.type === 'banner' && s.active) : null
    if (bannerSection?.slides?.length) {
      const slideInterval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % (bannerSection.slides?.length || 1))
      }, 5000)
      return () => clearInterval(slideInterval)
    }
  }, [layout])

  const loadData = async () => {
    let anyLoaded = false
    try {
      setLoading(true)
      setLoadIssue(false)
      
      // Use Promise.allSettled to handle partial failures gracefully
      const [layoutResult, sectionsResult, catsResult, prodResult] = await Promise.allSettled([
        api.get('/api/layout/home'),
        api.get('/api/homepage/sections'),
        api.get('/api/categories'),
        api.get('/api/products', {
          params: {
            _t: Date.now(),
            ...(lockedStoreId ? { store_id: lockedStoreId } : {}),
            ...(userLocation?.lat ? { customer_lat: userLocation.lat } : {}),
            ...(userLocation?.lon ? { customer_lon: userLocation.lon } : {})
          }
        })
      ])

      // Handle layout result
      if (layoutResult.status === 'fulfilled') {
        const secs = layoutResult.value.data?.sections || []
        setLayout(secs)
        if (Array.isArray(secs) && secs.length) anyLoaded = true
      } else {
        setLayout([]) // Set empty layout on error
      }

      // Handle homepage sections result
      if (sectionsResult.status === 'fulfilled') {
        const secs = sectionsResult.value.data?.sections || []
        setHomepageSections(secs)
        if (Array.isArray(secs) && secs.length) anyLoaded = true
      } else {
        setHomepageSections([])
      }

      // Handle categories result
      if (catsResult.status === 'fulfilled') {
        const catsData = catsResult.value.data
        if (Array.isArray(catsData)) {
          setCategories(catsData)
          if (catsData.length) anyLoaded = true
        } else if (catsData?.categories) {
          setCategories(catsData.categories)
          if (Array.isArray(catsData.categories) && catsData.categories.length) anyLoaded = true
        } else {
          setCategories([])
        }
      } else {
        setCategories([]) // Set empty categories on error
      }

      // Handle products result
      if (prodResult.status === 'fulfilled') {
        let productsList: Product[] = []
        const response = prodResult.value
        const prodRes = response?.data || response

        // Backend returns: { products: [...], store: {...} }
        if (prodRes && typeof prodRes === 'object') {
          if (Array.isArray(prodRes)) {
            // Direct array response
            productsList = prodRes
          } else if (Array.isArray(prodRes.products)) {
            // Response has products key
            productsList = prodRes.products
          } else {
            // Try to find any array in the response
            const keys = Object.keys(prodRes)
            for (const key of keys) {
              if (Array.isArray(prodRes[key])) {
                productsList = prodRes[key]
                break
              }
            }
          }
        }

        setProducts(productsList)
        if (productsList.length) anyLoaded = true
        try {
          // lightweight cache for ProductDetail suggestions / faster browsing
          localStorage.setItem('products_cache', JSON.stringify(productsList.slice(0, 800)))
        } catch {
          // ignore
        }
      } else {
        setProducts([]) // Set empty products on error
      }

    } catch (err: any) {
      // keep UI calm; no scary banners
    } finally {
      setLoadIssue(!anyLoaded)
      setLoading(false)
    }
  }

  const handleInventoryUpdate = useCallback((data: { product_id: number; store_id: number; quantity: number }) => {
    setProducts((prevProducts) =>
      prevProducts.map((product) =>
        product.id === data.product_id
          ? { ...product, available_quantity: data.quantity }
          : product
      )
    )
  }, [])

  useInventorySync(lockedStoreId, handleInventoryUpdate)

  const handleAddToCart = async (product: Product) => {
    if (lockedStoreId) {
      addToCart(product, lockedStoreId, lockedStoreName || undefined)
      return
    }
    addToCart(product)
  }

  // Helper to filter products for sections
  const getSectionProducts = (section: LayoutSection) => {
    // إذا لم يتم تحميل المنتجات بعد، نعيد مصفوفة فارغة
    if (!products || products.length === 0) {
      return []
    }
    
    let filtered = products;
    
    if (section.filter === 'featured') {
      // التحقق من is_featured كـ boolean أو string
      filtered = products.filter((p: any) => {
        const featured = p.is_featured
        const isFeatured = featured === true || featured === 'true' || featured === 1 || featured === '1'
        return isFeatured
      })
      console.log('⭐ Featured filter result:', filtered.length, 'from', products.length, 'total products')
      // إذا لم توجد منتجات مميزة، نأخذ أول 10 منتجات كبديل
      if (filtered.length === 0 && products.length > 0) {
        console.log('⚠️ No featured products found, using first 10 products as fallback')
        filtered = [...products].slice(0, 10)
      }
    } else if (section.filter === 'best_sellers') {
      // الأكثر مبيعاً - منتجات مميزة أو منتجات بأسعار جيدة
      filtered = products.filter((p: any) => {
        const featured = p.is_featured
        const isFeatured = featured === true || featured === 'true' || featured === 1 || featured === '1'
        const hasDiscount = p.discount_price && parseFloat(String(p.discount_price)) > 0
        return isFeatured || hasDiscount
      })
      // إذا لم توجد منتجات مميزة، نأخذ أول 10 منتجات
      if (filtered.length === 0 && products.length > 0) {
        console.log('⚠️ No best sellers found, using first 10 products as fallback')
        filtered = [...products].slice(0, 10)
      }
      console.log('🔥 Best sellers result:', filtered.length, 'from', products.length, 'total products')
    } else if (section.filter === 'new') {
      // عروض اليوم - Deals of the Day (filtered by deals logic in backend)
      filtered = [...products].filter((p: any) => p.discount_price && p.discount_price > 0 && p.discount_price < p.price).slice(0, 10)
      console.log('🔥 Deals of the Day result:', filtered.length, 'from', products.length, 'total products')
    } else if (section.categoryId) {
      filtered = products.filter((p: any) => p.category_id == section.categoryId) // loose equality for string/number
    }
    
    // تطبيق حد المنتجات إذا كان محدداً
    if (section.limit && filtered.length > section.limit) {
      filtered = filtered.slice(0, section.limit)
    }
    
    // Apply search query globally if present
    if (searchQuery) {
        const query = searchQuery.toLowerCase()
        filtered = filtered.filter(p => getProductName(p, language).toLowerCase().includes(query))
    }
    
    return filtered
  }

  const getCategoryIcon = (name: string) => {
    if (name.includes('خضار') || name.includes('Veg')) return '🥦';
    if (name.includes('فواكه') || name.includes('Fruit')) return '🍎';
    if (name.includes('لحوم') || name.includes('Meat')) return '🥩';
    if (name.includes('ألبان') || name.includes('Dairy')) return '🥛';
    if (name.includes('مخبز') || name.includes('Bakery')) return '🍞';
    if (name.includes('مشروب') || name.includes('Drink')) return '🧃';
    return '🛒';
  }

  return (
    <div className="font-['Tajawal']" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Hero (always visible for sales) */}
      <div className="bg-gradient-to-b from-white to-gray-50">
        <div className={spacing.pageMax}>
          <div className="px-4 pt-4 pb-3 md:pt-6 md:pb-4">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div className="max-w-2xl">
                <div className="text-2xl md:text-4xl font-extrabold text-gray-900 leading-tight">
                  {language === 'ar' ? 'مقاضيك في دقائق — جودة مضمونة' : 'Groceries in minutes — quality guaranteed'}
                </div>
                <div className="mt-2 text-sm md:text-base font-bold text-gray-600">
                  {language === 'ar' ? 'توصيل سريع • أسعار واضحة • دعم محلي' : 'Fast delivery • Clear pricing • Local support'}
                </div>
              </div>
              <div className="flex items-center">
                <Button
                  variant="primary"
                  size="lg"
                  className="px-7 py-4 text-base md:text-lg font-extrabold"
                  onClick={() => {
                    navigate('/products')
                  }}
                >
                  {language === 'ar' ? 'تسوق الآن' : 'Shop now'}
                </Button>
              </div>
            </div>
            <div className="mt-2 text-sm font-bold text-gray-600">
              {language === 'ar' ? 'توصيل خلال دقائق داخل مدينتك' : 'Delivered in minutes in your city'}
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar - Visible in Home Content for easier access */}
      <div className="mb-2 relative max-w-2xl mx-auto md:hidden px-4">
          <input
            type="text"
            placeholder={language === 'en' ? 'Search products...' : 'ابحث عن منتج...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-2xl py-3 px-4 pr-10 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-sm"
          />
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 text-gray-400 absolute top-3.5 ${language === 'ar' ? 'left-7' : 'right-7'}`}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
      </div>

      <div className="space-y-6 pb-6">
        {loading ? (
          <div className={spacing.pageMax}>
            <div className="px-4 py-6 space-y-4">
              <Skeleton className="h-44 w-full rounded-2xl" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-28 w-full rounded-2xl" />
                <Skeleton className="h-28 w-full rounded-2xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-44 w-full rounded-2xl" />
                <Skeleton className="h-44 w-full rounded-2xl" />
              </div>
            </div>
          </div>
        ) : (
          (layout && Array.isArray(layout) ? layout : []).map((section, index) => {
            if (!section.active) return null;

            // --- Banner Section ---
            if (section.type === 'banner' && section.slides && section.slides.length > 0) {
              if (!homeHero.enabled) return null
              const bannerH =
                homeHero.height === 'lg'
                  ? 'h-[280px] md:h-[340px] lg:h-[420px]'
                  : homeHero.height === 'md'
                    ? 'h-[250px] md:h-[310px] lg:h-[380px]'
                    : 'h-[220px] md:h-[280px] lg:h-[320px]' // sm (recommended)
              return (
                <div key={section.id} className="mb-6">
                  <div className={`relative rounded-2xl overflow-hidden ${bannerH} shadow-lg mx-4 md:mx-0`}>
                    {section.slides.map((slide, sIdx) => (
                      <div
                        key={slide.id}
                        className={`absolute inset-0 transition-opacity duration-700 ${currentSlide === sIdx ? 'opacity-100' : 'opacity-0'}`}
                      >
                        <img 
                          src={slide.image} 
                          alt={slide.title} 
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-black/10 to-transparent"></div>
                        <div
                          className={`absolute inset-0 flex flex-col justify-center px-4 sm:px-6 md:px-8 lg:px-10 text-white ${language === 'ar' ? 'items-end text-right' : 'items-start text-left'}`}
                        >
                          <div className="max-w-[520px]">
                            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold mb-2 drop-shadow-lg">
                              {slide.title}
                            </h2>
                            {slide.subtitle ? (
                              <p className="text-sm sm:text-base opacity-95 drop-shadow-md line-clamp-2">
                                {slide.subtitle}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                      {section.slides.map((_, sIdx) => (
                        <button
                          key={sIdx}
                          onClick={() => setCurrentSlide(sIdx)}
                          className={`transition-all ${currentSlide === sIdx ? 'w-8 h-2 bg-white rounded-full' : 'w-2 h-2 bg-white/50 rounded-full hover:bg-white/75'}`}
                          aria-label={`Go to slide ${sIdx + 1}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Trust cards below banner (moved from hero) */}
                  <div className="max-w-[1200px] mx-auto px-4 mt-6">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-2xl bg-white border border-gray-100 py-3 shadow-sm">
                        <div className="text-lg">💳</div>
                        <div className="text-xs font-extrabold text-gray-900">{language === 'ar' ? 'دفع سهل' : 'Easy pay'}</div>
                      </div>
                      <div className="rounded-2xl bg-white border border-gray-100 py-3 shadow-sm">
                        <div className="text-lg">🛡️</div>
                        <div className="text-xs font-extrabold text-gray-900">{language === 'ar' ? 'جودة مضمونة' : 'Quality'}</div>
                      </div>
                      <div className="rounded-2xl bg-white border border-gray-100 py-3 shadow-sm">
                        <div className="text-lg">🚚</div>
                        <div className="text-xs font-extrabold text-gray-900">{language === 'ar' ? 'توصيل سريع' : 'Fast delivery'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            }

            // --- Categories Section ---
            if (section.type === 'categories') {
              return (
                <div key={section.id} className="mb-6">
                  <div className="max-w-[1200px] mx-auto px-4">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-extrabold text-xl md:text-2xl text-gray-900">
                        {language === 'en' ? section.title : section.titleAr || section.title}
                      </h3>
                      <Link
                        to="/categories"
                        className="text-emerald-600 hover:text-emerald-700 text-sm md:text-base font-extrabold flex items-center gap-1 transition-colors"
                      >
                        {language === 'en' ? 'See All' : 'عرض الكل'}
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 ${language === 'ar' ? 'rotate-180' : ''}`}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                  {categories.length > 0 ? (
                    <div className="max-w-[1200px] mx-auto px-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {categories.slice(0, 18).map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => navigate(`/categories?category=${cat.id}`)}
                            className="rounded-2xl bg-white border border-gray-100 p-3 shadow-sm hover:shadow-md transition-all text-center group"
                          >
                            <div className="relative w-full aspect-square rounded-2xl bg-gradient-to-br from-emerald-50 to-white border border-gray-100 overflow-hidden flex items-center justify-center">
                              {cat.image_url ? (
                                <img
                                  src={cat.image_url}
                                  alt={cat.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  loading="lazy"
                                />
                              ) : (
                                <span className="text-4xl">{getCategoryIcon(cat.name_ar || cat.name)}</span>
                              )}
                            </div>
                            <div className="mt-2 text-xs font-extrabold text-gray-800 truncate">{getCategoryName(cat, language)}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-[1200px] mx-auto px-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                          <div key={i} className="rounded-2xl bg-white border border-gray-100 p-3 shadow-sm">
                            <Skeleton className="aspect-square w-full rounded-2xl" />
                            <Skeleton className="h-3 w-2/3 mt-3 rounded-xl" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            }

            // --- Product Row (Horizontal) ---
            if (section.type === 'product-row') {
              const sectionProducts = getSectionProducts(section);
              
              // إذا لم توجد منتجات، لا نعرض القسم نهائياً
              if (sectionProducts.length === 0) {
                return null;
              }

              return (
                <div key={section.id} className="px-4 md:px-0 mb-8">
                  <div className="flex justify-between items-center mb-4 md:mb-6">
                    <h3 className="font-bold text-xl md:text-2xl text-gray-900 flex items-center gap-2">
                      {language === 'en' ? section.title : section.titleAr || section.title}
                    </h3>
                    <Link 
                      to="/categories" 
                      className="text-emerald-600 hover:text-emerald-700 text-sm md:text-base font-semibold flex items-center gap-1 transition-colors"
                    >
                      {language === 'en' ? 'See All' : 'عرض الكل'}
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 ${language === 'ar' ? 'rotate-180' : ''}`}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </Link>
                  </div>
                  <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 scroll-smooth">
                    {sectionProducts.map((product) => (
                        <div key={product.id} className="min-w-[160px] sm:min-w-[180px] md:min-w-[200px] flex-shrink-0">
                            <ProductCard product={product} onAdd={handleAddToCart} />
                        </div>
                    ))}
                  </div>
                </div>
              )
            }

            // --- Product Grid ---
            if (section.type === 'product-grid') {
              const sectionProducts = getSectionProducts(section);
              if (sectionProducts.length === 0) return null;

              return (
                <div key={section.id} className="px-4 md:px-0">
                  <h3 className="font-bold text-lg text-gray-800 mb-4">{language === 'en' ? section.title : section.titleAr || section.title}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6">
                    {sectionProducts.map((product) => (
                        <ProductCard key={product.id} product={product} onAdd={handleAddToCart} />
                    ))}
                  </div>
                </div>
              )
            }

            return null;
          })
        )}

        {/* Calm banner if nothing loaded */}
        {!loading && loadIssue ? (
          <div className={spacing.pageMax}>
            <div className="px-4 md:px-0">
              <Card className="p-5 border border-blue-100 bg-blue-50">
                <div className="text-base font-extrabold text-gray-900">{language === 'ar' ? 'لا توجد بيانات حالياً' : 'No data right now'}</div>
                <div className="mt-1 text-sm font-bold text-gray-700">{language === 'ar' ? 'تحقق من الاتصال ثم أعد المحاولة.' : 'Check connection then retry.'}</div>
                <div className="mt-4">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl font-extrabold border border-gray-200 bg-white text-gray-900 hover:bg-gray-50"
                    onClick={() => {
                      setLoadIssue(false)
                      loadData()
                    }}
                  >
                    {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
                  </button>
                </div>
              </Card>
            </div>
          </div>
        ) : null}

        {/* Deals of the day (fallback section) */}
        {!loading ? (
          <div className={spacing.pageMax}>
            <div className="px-4 md:px-0">
              <div className="flex items-end justify-between mb-4">
                <div className="text-lg md:text-2xl font-extrabold text-gray-900">{language === 'ar' ? 'عروض اليوم' : 'Deals of the day'}</div>
                <Link to="/products?sort=newest" className="text-sm font-extrabold text-emerald-700 hover:text-emerald-800">
                  {language === 'ar' ? 'تسوق' : 'Shop'}
                </Link>
              </div>
              {products.length ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {products
                    .filter((p: any) => p.discount_price && Number(p.discount_price) > 0 && Number(p.discount_price) < Number(p.price))
                    .slice(0, 4)
                    .map((p) => (
                      <ProductCard key={p.id} product={p} onAdd={handleAddToCart} />
                    ))}
                </div>
              ) : (
                <Card className="p-4">
                  <div className="text-sm font-bold text-gray-600">{language === 'ar' ? 'ستظهر العروض هنا تلقائياً عند توفر المنتجات.' : 'Deals will appear here once products are available.'}</div>
                </Card>
              )}
            </div>
          </div>
        ) : null}

        {/* Recently viewed (local) */}
        {!loading && recentIds.length ? (
          <div className={spacing.pageMax}>
            <div className="px-4 md:px-0">
              <div className="flex items-end justify-between mb-4">
                <div className="text-lg md:text-2xl font-extrabold text-gray-900">{language === 'ar' ? 'شاهدت مؤخرًا' : 'Recently viewed'}</div>
                <Link to="/products" className="text-sm font-extrabold text-emerald-700 hover:text-emerald-800">
                  {language === 'ar' ? 'عرض المزيد' : 'View more'}
                </Link>
              </div>
              <Card className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {products
                    .filter((p) => recentIds.includes(Number(p.id)))
                    .slice(0, 8)
                    .map((p) => (
                      <ProductCard key={p.id} product={p} onAdd={handleAddToCart} />
                    ))}
                </div>
              </Card>
            </div>
          </div>
        ) : null}

        {/* Homepage Sections from Admin Config - New Dynamic System */}
        {/* Only show if no old layout sections exist to avoid duplication */}
        {(!layout || layout.length === 0 || !layout.some(s => s.type === 'product-row' || s.type === 'product-grid')) && homepageSections
          .filter(s => s.enabled)
          .sort((a, b) => a.sort_priority - b.sort_priority)
          .map((section) => (
            <HomepageSection
              key={section.id}
              section={section}
              lockedStoreId={lockedStoreId}
              onAddToCart={handleAddToCart}
              categories={categories}
            />
          ))}
      </div>
    </div>
  )
}
