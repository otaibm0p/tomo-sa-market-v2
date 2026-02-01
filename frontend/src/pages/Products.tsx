import { useMemo, useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Product, productAPI } from '../utils/api'
import { useCart } from '../context/CartContext'
import { useLanguage, getProductName, getCategoryName } from '../context/LanguageContext'
import { ProductCard } from '../components/ProductCard'
import api from '../utils/api'
import { formatNumber } from '../utils/numberFormat'
import { Chip } from '../shared/ui/components/Chip'
import { Input } from '../shared/ui/components/Input'
import { debounce, spacing } from '../shared/ui/tokens'

interface Category {
  id: number
  name: string
  name_ar?: string
  name_en?: string
  image_url: string | null
}

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { language, t } = useLanguage()
  const { addToCart, lockedStoreId, lockedStoreName } = useCart()
  
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [hasData, setHasData] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [searchDraft, setSearchDraft] = useState(searchParams.get('q') || '')
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || '')
  const [sortBy, setSortBy] = useState<string>(searchParams.get('sort') || 'newest')
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({
    min: searchParams.get('min_price') ? parseFloat(searchParams.get('min_price')!) : 0,
    max: searchParams.get('max_price') ? parseFloat(searchParams.get('max_price')!) : 10000
  })
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'))
  const itemsPerPage = 24

  const [recentIds, setRecentIds] = useState<number[]>([])

  useEffect(() => {
    loadCategories()
    loadProducts()
  }, [currentPage, selectedCategory, sortBy, searchQuery, priceRange, lockedStoreId])

  useEffect(() => {
    // Recently viewed (local, lightweight)
    try {
      const raw = localStorage.getItem('recently_viewed_products')
      if (!raw) {
        localStorage.setItem('recently_viewed_products', JSON.stringify([]))
        setRecentIds([])
        return
      }
      const list = JSON.parse(raw) as any
      const ids = Array.isArray(list) ? list : []
      setRecentIds(ids.filter((x) => Number.isFinite(Number(x))).map((x) => Number(x)).slice(0, 12))
    } catch {
      try {
        localStorage.setItem('recently_viewed_products', JSON.stringify([]))
      } catch {
        // ignore
      }
      setRecentIds([])
    }
  }, [])

  useEffect(() => {
    // Update URL params when filters change
    const params = new URLSearchParams()
    if (searchQuery) params.set('q', searchQuery)
    if (selectedCategory) params.set('category', selectedCategory)
    if (sortBy !== 'newest') params.set('sort', sortBy)
    if (priceRange.min > 0) params.set('min_price', priceRange.min.toString())
    if (priceRange.max < 10000) params.set('max_price', priceRange.max.toString())
    if (currentPage > 1) params.set('page', currentPage.toString())
    setSearchParams(params, { replace: true })
  }, [searchQuery, selectedCategory, sortBy, priceRange, currentPage])

  const loadCategories = async () => {
    try {
      const response = await api.get('/api/categories')
      setCategories(response.data || [])
    } catch (err) {
      console.error('Error loading categories:', err)
    }
  }

  const loadProducts = async () => {
    try {
      setLoading(true)
      setHasData(true)
      const params: any = {
        page: currentPage,
        limit: itemsPerPage,
        ...(lockedStoreId ? { store_id: lockedStoreId } : {}),
        ...(selectedCategory ? { category_id: selectedCategory } : {}),
        ...(searchQuery ? { search: searchQuery } : {}),
        ...(priceRange.min > 0 ? { min_price: priceRange.min } : {}),
        ...(priceRange.max < 10000 ? { max_price: priceRange.max } : {}),
        sort: sortBy
      }

      const response = await api.get('/api/products', { params })
      const data = response.data
      
      // Handle both old format (array) and new format (object with products array)
      if (Array.isArray(data)) {
        setProducts(data)
        setTotalCount(data.length)
      } else {
        setProducts(data?.products || [])
        setTotalCount(data?.total || data?.products?.length || 0)
      }
      try {
        localStorage.setItem('products_cache', JSON.stringify((Array.isArray(data) ? data : (data?.products || [])).slice(0, 800)))
      } catch {
        // ignore
      }
    } catch (err) {
      console.error('Error loading products:', err)
      setProducts([])
      setTotalCount(0)
      setHasData(false)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = () => {
    setCurrentPage(1) // Reset to first page when filters change
  }

  const totalPages = Math.ceil(totalCount / itemsPerPage)

  const debouncedSearch = useMemo(
    () =>
      debounce((val: string) => {
        setSearchQuery(val)
        handleFilterChange()
      }, 300),
    []
  )

  const sortChips = [
    { id: 'newest', label: language === 'ar' ? 'الأحدث' : 'Newest' },
    { id: 'price_low', label: language === 'ar' ? 'الأرخص' : 'Cheapest' },
    { id: 'price_high', label: language === 'ar' ? 'الأغلى' : 'Most expensive' },
  ]

  const recentProducts = useMemo(() => {
    if (!recentIds.length) return []

    // Prefer cache to avoid extra loading / paging limitations
    let cache: Product[] = []
    try {
      const raw = localStorage.getItem('products_cache')
      const parsed = raw ? (JSON.parse(raw) as any) : []
      if (Array.isArray(parsed)) cache = parsed as any
    } catch {
      cache = []
    }

    const map = new Map<number, Product>()
    ;(cache || []).forEach((p: any) => {
      const id = Number(p?.id)
      if (Number.isFinite(id)) map.set(id, p as any)
    })
    ;(products || []).forEach((p) => map.set(Number(p.id), p))

    const list = recentIds.map((id) => map.get(Number(id))).filter(Boolean) as Product[]
    return list.slice(0, 8)
  }, [recentIds, products])

  return (
    <div className="min-h-screen bg-gray-50" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className={spacing.pageMax}>
        <div className="px-4 py-5">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              {language === 'ar' ? 'جميع المنتجات' : 'All Products'}
            </h1>
            <div className="text-sm text-gray-600">
              {language === 'ar' ? 'إجمالي' : 'Total'}: <span className="font-bold">{formatNumber(totalCount)}</span>
            </div>
          </div>

          {/* Recently viewed (local) */}
          {recentProducts.length ? (
            <div className="mb-5">
              <div className="flex items-end justify-between gap-3 mb-3">
                <div className="text-base md:text-lg font-extrabold text-gray-900">
                  {language === 'ar' ? 'شوهد مؤخرًا' : 'Recently viewed'}
                </div>
                <Link to="/products" className="text-sm font-extrabold text-emerald-700 hover:text-emerald-800">
                  {language === 'ar' ? 'عرض الكل' : 'View all'}
                </Link>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                {recentProducts.map((p) => (
                  <div key={p.id} className="min-w-[170px] sm:min-w-[190px] flex-shrink-0">
                    <ProductCard
                      product={p}
                      compact
                      onAdd={(x) => addToCart(x, lockedStoreId || undefined, lockedStoreName || undefined)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Search Bar */}
          <div className="mb-4">
            <Input
              value={searchDraft}
              onChange={(v) => {
                setSearchDraft(v)
                debouncedSearch(v)
              }}
              placeholder={language === 'ar' ? 'ابحث عن منتج…' : 'Search products…'}
            />
          </div>

          {/* Sort chips */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {sortChips.map((c) => (
              <Chip
                key={c.id}
                active={sortBy === c.id}
                onClick={() => {
                  setSortBy(c.id)
                  handleFilterChange()
                }}
              >
                {c.label}
              </Chip>
            ))}
          </div>

          {/* Category chips */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
            <Chip
              active={!selectedCategory}
              onClick={() => {
                setSelectedCategory('')
                handleFilterChange()
              }}
            >
              {language === 'ar' ? 'الكل' : 'All'}
            </Chip>
            {categories.slice(0, 24).map((cat) => (
              <Chip
                key={cat.id}
                active={selectedCategory === String(cat.id)}
                onClick={() => {
                  setSelectedCategory(String(cat.id))
                  handleFilterChange()
                }}
                className="whitespace-nowrap"
              >
                {getCategoryName(cat, language)}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className={spacing.pageMax}>
      <div className="px-4 py-4 pb-44">
        {!loading && hasData === false ? (
          <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <div className="text-sm font-extrabold text-gray-900">{language === 'ar' ? 'لا توجد بيانات حالياً' : 'No data right now'}</div>
            <div className="mt-1 text-sm font-bold text-gray-700">
              {language === 'ar' ? 'تحقق من الاتصال ثم أعد المحاولة.' : 'Check connection then retry.'}
            </div>
            <button
              type="button"
              className="mt-3 px-4 py-2 rounded-xl font-extrabold border border-gray-200 bg-white text-gray-900 hover:bg-gray-50"
              onClick={loadProducts}
            >
              {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : null}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm p-3 animate-pulse">
                <div className="aspect-square bg-gray-200 rounded-lg mb-3"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-5 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🛒</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {language === 'ar' ? 'لا توجد منتجات' : 'No Products Found'}
            </h3>
            <p className="text-gray-600 mb-6">
              {language === 'ar' 
                ? 'جرب تغيير الفلاتر أو البحث عن منتج آخر' 
                : 'Try changing filters or search for a different product'}
            </p>
            <Link
              to="/"
              className="inline-block px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
            >
              {language === 'ar' ? 'العودة للصفحة الرئيسية' : 'Back to Home'}
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 lg:gap-6">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAdd={(p) => addToCart(p, lockedStoreId || undefined, lockedStoreName || undefined)}
                  highlight={searchDraft}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {language === 'ar' ? 'السابق' : 'Previous'}
                </button>
                
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-4 py-2 border rounded-lg transition-colors ${
                          currentPage === pageNum
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {language === 'ar' ? 'التالي' : 'Next'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
      </div>
    </div>
  )
}

