import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { productAPI } from '../utils/api'
import { useLanguage, getProductName, getProductDescription, getCategoryName } from '../context/LanguageContext'
import { useCart } from '../context/CartContext'
import { ProductCard } from '../components/ProductCard'
import { Chip } from '../shared/ui/components/Chip'
import { Input } from '../shared/ui/components/Input'
import { debounce, spacing } from '../shared/ui/tokens'

interface Category {
  id: number
  name: string
  name_ar?: string
  name_en?: string
  image_url: string | null
  description: string | null
  description_ar?: string
  description_en?: string
}

interface Product {
  id: number
  name: string
  price: number | string
  description?: string
  category_id?: number
  unit?: string
  price_per_unit?: number
  unit_step?: number
  image_url?: string
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [hasData, setHasData] = useState(true)
  const navigate = useNavigate()
  const { language } = useLanguage()
  const { addToCart, lockedStoreId, lockedStoreName } = useCart()
  const [q, setQ] = useState('')
  const [qApplied, setQApplied] = useState('')

  useEffect(() => {
    loadCategories()
    loadProducts()
  }, [])

  const loadCategories = async () => {
    try {
      const res = await api.get('/api/categories')
      const catsData = res.data
      if (Array.isArray(catsData)) {
        setCategories(catsData)
      } else if (catsData?.categories) {
        setCategories(catsData.categories)
      } else {
        setCategories([])
      }
    } catch (err) {
      console.error('Error loading categories:', err)
      setCategories([])
    }
  }

  const loadProducts = async () => {
    try {
      setLoading(true)
      setHasData(true)
      const data = await productAPI.getAll()
      // Ensure data is an array
      let productsList: Product[] = []
      if (Array.isArray(data)) {
        productsList = data
      } else if (data && Array.isArray((data as any).products)) {
        productsList = (data as any).products
      }
      setProducts(productsList)
    } catch (err) {
      console.error('Error loading products:', err)
      setProducts([]) // Fallback to empty array
      setHasData(false)
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = useMemo(() => {
    const base = selectedCategory ? (products || []).filter((p) => p.category_id === selectedCategory) : (products || [])
    const qq = (qApplied || '').trim().toLowerCase()
    if (!qq) return base
    return base.filter((p: any) => {
      const name = getProductName(p as any, language).toLowerCase()
      return name.includes(qq)
    })
  }, [products, selectedCategory, qApplied, language])

  const debouncedSearch = useMemo(
    () =>
      debounce((val: string) => {
        setQApplied(val)
      }, 300),
    []
  )

  // ألوان متدرجة للتصنيفات
  const categoryColors = [
    'from-blue-500 to-cyan-500',
    'from-purple-500 to-pink-500',
    'from-green-500 to-emerald-500',
    'from-orange-500 to-red-500',
    'from-indigo-500 to-blue-500',
    'from-teal-500 to-green-500',
    'from-yellow-500 to-orange-500',
    'from-rose-500 to-pink-500',
  ]

  const getCategoryColor = (index: number) => {
    return categoryColors[index % categoryColors.length]
  }

  // Real category images mapping
  const categoryImageMap: { [key: string]: string } = {
    'ألبان': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&q=80',
    'مشروبات': 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80',
    'مخبوزات': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80',
    'لحوم': 'https://images.unsplash.com/photo-1603048297172-c92544790e5c?w=400&q=80',
    'فواكه': 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&q=80',
    'خضروات': 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400&q=80',
    'منتجات جافة': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80',
    'حلويات': 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&q=80',
    'Dairy': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&q=80',
    'Beverages': 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80',
    'Bakery': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80',
    'Meat': 'https://images.unsplash.com/photo-1603048297172-c92544790e5c?w=400&q=80',
    'Fruits': 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&q=80',
    'Vegetables': 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400&q=80',
  }

  return (
    <div className={spacing.pageMax} dir={language === 'ar' ? 'rtl' : 'ltr'}>
    <div className="px-4 py-6 pb-44">
      {/* Header Section */}
      <div className="mb-5">
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">{language === 'en' ? 'Categories' : 'الأقسام'}</h1>
        <p className="mt-1 text-sm font-bold text-gray-600">{language === 'en' ? 'Pick a category and shop fast.' : 'اختر قسم وابدأ التسوق بسرعة.'}</p>
      </div>

      {!loading && hasData === false ? (
        <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <div className="text-sm font-extrabold text-gray-900">{language === 'ar' ? 'لا توجد بيانات حالياً' : 'No data right now'}</div>
          <div className="mt-1 text-sm font-bold text-gray-700">{language === 'ar' ? 'تحقق من الاتصال ثم أعد المحاولة.' : 'Check connection then retry.'}</div>
          <button
            type="button"
            className="mt-3 px-4 py-2 rounded-xl font-extrabold border border-gray-200 bg-white text-gray-900 hover:bg-gray-50"
            onClick={() => {
              loadCategories()
              loadProducts()
            }}
          >
            {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      ) : null}

      {/* Search (local, fast) */}
      <div className="mb-4">
        <Input
          value={q}
          onChange={(v) => {
            setQ(v)
            debouncedSearch(v)
          }}
          placeholder={language === 'en' ? 'Search inside category…' : 'ابحث داخل القسم…'}
        />
      </div>

      {/* عرض الفئات - Premium Design */}
      <section className="mb-16">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg md:text-xl font-extrabold text-gray-900">
            {language === 'en' ? 'Browse' : 'تصفح'}
          </h2>
          <div className="text-xs font-bold text-gray-500">
            {selectedCategory ? `${filteredProducts.length}` : `${products.length}`} {language === 'en' ? 'items' : 'منتج'}
          </div>
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          <Chip active={selectedCategory === null} onClick={() => setSelectedCategory(null)}>
            {language === 'en' ? 'All' : 'الكل'}
          </Chip>

          {categories.map((category) => (
            <Chip
              key={category.id}
              active={selectedCategory === category.id}
              onClick={() => setSelectedCategory(category.id)}
              className="whitespace-nowrap"
            >
              {getCategoryName(category, language)}
            </Chip>
          ))}
        </div>
      </section>

      {/* عرض المنتجات - Premium Design */}
      <section>
        {loading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <div className="text-lg text-gray-600">جاري التحميل...</div>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">لا توجد منتجات</h3>
            <p className="text-gray-600">لا توجد منتجات في هذه الفئة حالياً</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
            {filteredProducts.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onAdd={(p) => {
                  if (lockedStoreId) {
                    addToCart(p, lockedStoreId, lockedStoreName || undefined)
                  } else {
                    addToCart(p)
                  }
                }} 
                highlight={qApplied}
              />
            ))}
          </div>
        )}
      </section>
    </div>
    </div>
  )
}


