import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { productAPI, Product } from '../utils/api'
import { useCart } from '../context/CartContext'
import { useLanguage, getProductName, getProductDescription } from '../context/LanguageContext'
import { ProductCard } from '../components/ProductCard'
import { ImageLightbox } from '../components/ImageLightbox'
import api from '../utils/api'
import { Button } from '../shared/ui/components/Button'
import { Card } from '../shared/ui/components/Card'
import { spacing } from '../shared/ui/tokens'
import { MinOrderProgress } from '../shared/ui/components/MinOrderProgress'
import { useOrderCalculations } from '../hooks/useOrderCalculations'

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { addToCart, lockedStoreId, lockedStoreName, items: cartItems } = useCart()
  const { language, t } = useLanguage()
  const { subtotal } = useOrderCalculations()
  const [product, setProduct] = useState<Product | null>(null)
  const [productImages, setProductImages] = useState<Array<{ id?: number | null; url: string; is_primary?: boolean }>>([])
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [similarProducts, setSimilarProducts] = useState<Product[]>([])
  const [bundleProducts, setBundleProducts] = useState<Product[]>([])
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingSimilar, setLoadingSimilar] = useState(false)
  const [activeTab, setActiveTab] = useState<'description' | 'ingredients' | 'nutrition' | 'allergens' | 'storage' | 'details' | 'shipping'>('description')

  useEffect(() => {
    if (id) {
      loadProduct(parseInt(id))
    }
  }, [id])

  const loadProduct = async (productId: number) => {
    try {
      setLoading(true)
      const data = await productAPI.getById(productId)
      setProduct(data)
      setQuantity((data as any).unit_step || 1)

      // Recently viewed (local)
      try {
        const raw = localStorage.getItem('recently_viewed_products')
        const list = raw ? (JSON.parse(raw) as number[]) : []
        const next = [productId, ...(Array.isArray(list) ? list : [])].filter((x, i, a) => a.indexOf(x) === i).slice(0, 10)
        localStorage.setItem('recently_viewed_products', JSON.stringify(next))
      } catch {
        // ignore
      }
      
      // Get images from API response
      const images = (data as any).images || []
      if (images.length > 0) {
        setProductImages(images)
      } else {
        // Fallback to image_url if no images array
        const imageUrl = (data as any).primary_image_url || (data as any).image_url
        if (imageUrl) {
          setProductImages([{ url: imageUrl, is_primary: true }])
        }
      }
      
      // Suggested products: prefer cached products list (no extra endpoint), fallback to existing similar endpoint.
      const catId = Number((data as any)?.category_id)
      let suggested: Product[] = []
      try {
        const rawCache = localStorage.getItem('products_cache')
        const cache = rawCache ? (JSON.parse(rawCache) as any[]) : []
        if (Array.isArray(cache) && Number.isFinite(catId)) {
          suggested = cache.filter((p) => Number(p?.id) !== productId && Number(p?.category_id) === catId).slice(0, 8)
        }
      } catch {
        suggested = []
      }
      if (suggested.length) {
        setSimilarProducts(suggested as any)
      } else {
        loadSimilarProducts(productId)
      }

      // Bundles: "يُشترى معه" (rule-based, same category) from cache
      try {
        const rawCache = localStorage.getItem('products_cache')
        const cache = rawCache ? (JSON.parse(rawCache) as any[]) : []
        if (Array.isArray(cache) && Number.isFinite(catId)) {
          const pool = cache.filter((p) => Number(p?.id) !== productId && Number(p?.category_id) === catId)
          setBundleProducts(pool.slice(0, 3) as any)
        } else {
          setBundleProducts([])
        }
      } catch {
        setBundleProducts([])
      }
    } catch (err) {
      console.error('Error loading product:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadSimilarProducts = async (productId: number) => {
    try {
      setLoadingSimilar(true)
      const response = await api.get(`/api/products/${productId}/similar`, {
        params: {
          limit: 8,
          strategy: 'category'
        }
      })
      
      const products = response.data?.products || []
      setSimilarProducts(products)
    } catch (err) {
      console.error('Error loading similar products:', err)
      setSimilarProducts([])
    } finally {
      setLoadingSimilar(false)
    }
  }

  const handleAddToCart = () => {
    if (!product) return

    const times = Math.floor(quantity / ((product as any).unit_step || 1))
    for (let i = 0; i < times; i++) {
      addToCart(product, lockedStoreId || undefined, lockedStoreName || undefined)
    }
  }

  const adjustQuantity = (delta: number) => {
    const step = (product as any)?.unit_step || 1
    const newQuantity = Math.max(step, quantity + delta)
    handleQuantityChange(newQuantity)
  }

  const handleQuantityChange = (newQuantity: number) => {
    const step = (product as any)?.unit_step || 1
    const adjustedQuantity = Math.max(step, Math.round(newQuantity / step) * step)
    setQuantity(adjustedQuantity)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="text-center py-12 px-4">
        <p className="text-gray-500 text-lg mb-4">{language === 'en' ? 'Product not found' : 'المنتج غير موجود'}</p>
        <button
          onClick={() => navigate('/')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          {language === 'en' ? 'Back to Home' : 'العودة للصفحة الرئيسية'}
        </button>
      </div>
    )
  }

  const unitLabel: { [key: string]: { ar: string; en: string } } = {
    kg: { ar: 'كيلوغرام', en: 'kilogram' },
    g: { ar: 'غرام', en: 'gram' },
    piece: { ar: 'قطعة', en: 'piece' },
    bag: { ar: 'كيس', en: 'bag' },
  }

  const productName = getProductName(product, language)
  const productDescription = getProductDescription(product, language)
  const price = Number((product as any).price_per_unit || product.price || 0)
  const totalPrice = price * quantity
  const currency = t('currency') || (language === 'ar' ? 'ريال' : 'SAR')
  const availableQty = (product as any).available_quantity
  const isAvailable = availableQty === null || availableQty === undefined || availableQty > 0

  // Get primary image or first image
  const primaryImage = productImages.find(img => img.is_primary) || productImages[0] || { url: 'https://placehold.co/600x600/f3f4f6/9ca3af?text=No+Image' }
  const currentImage = productImages[selectedImageIndex] || primaryImage

  const cartCount = (cartItems || []).reduce((sum, it: any) => sum + Number(it?.quantity || 0), 0)

  return (
    <div className={spacing.pageMax}>
    <div className="px-4 py-6 md:py-8 pb-44 md:pb-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-gray-600">
        <button onClick={() => navigate('/')} className="hover:text-emerald-600 transition-colors">
          {language === 'en' ? 'Home' : 'الرئيسية'}
        </button>
        <span className="mx-2">/</span>
        <span className="text-gray-900 font-medium">{productName}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-12">
        {/* Image Gallery */}
        <div className="relative">
          {/* Main Image */}
          <div 
            className="aspect-square relative flex items-center justify-center bg-gray-50 rounded-2xl overflow-hidden shadow-lg cursor-zoom-in group"
            onClick={() => setLightboxOpen(true)}
          >
            <img
              src={currentImage.url}
              alt={productName}
              className="w-full h-full object-contain transition-transform duration-500 mix-blend-multiply p-4 group-hover:scale-105"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.onerror = null
                e.currentTarget.src = 'https://placehold.co/600x600/f3f4f6/9ca3af?text=No+Image'
              }}
            />
            {!isAvailable && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center z-10 rounded-2xl">
                <span className="bg-red-500 text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg">
                  {language === 'en' ? 'Out of Stock' : 'نفد'}
                </span>
              </div>
            )}
            {/* Zoom indicator */}
            <div className="absolute top-4 right-4 bg-black/50 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
              </svg>
            </div>
          </div>

          {/* Thumbnails */}
          {productImages.length > 1 && (
            <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
              {productImages.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImageIndex === index
                      ? 'border-emerald-600 ring-2 ring-emerald-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img
                    src={img.url}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.onerror = null
                      e.currentTarget.src = 'https://placehold.co/80x80/f3f4f6/9ca3af?text=No+Image'
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="flex flex-col">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">{productName}</h1>
          
          {/* Brand */}
          {(product as any).brand && (
            <span className="text-sm text-gray-500 mb-4 uppercase tracking-wide">
              {(product as any).brand}
            </span>
          )}

          {/* Price */}
          <div className="mb-6">
            <div className="flex items-baseline gap-3 mb-2">
              <p className="text-4xl font-bold text-emerald-700">
                {price.toFixed(2)} <span className="text-lg font-normal text-gray-500">{currency}</span>
              </p>
              {(product as any).discount_price && (
                <>
                  <span className="text-xl text-gray-400 line-through decoration-2">
                    {(product as any).discount_price} {currency}
                  </span>
                  {(product as any).discount_percentage && (
                    <span className="bg-red-500 text-white text-sm font-bold px-2 py-1 rounded">
                      -{(product as any).discount_percentage}%
                    </span>
                  )}
                </>
              )}
            </div>
            {(product as any).unit && (product as any).unit !== 'piece' && (
              <p className="text-sm text-gray-600">
                {language === 'en' ? 'Per' : 'لكل'} {unitLabel[(product as any).unit]?.[language] || (product as any).unit}
              </p>
            )}
          </div>

          {/* Description Tabs - Professional Grocery Style */}
          <div className="mb-6">
            <div className="border-b border-gray-200 mb-4 overflow-x-auto">
              <div className="flex gap-2 md:gap-4 min-w-max">
                {((product as any).full_description_ar || (product as any).full_description_en || productDescription) && (
                <button
                  onClick={() => setActiveTab('description')}
                  className={`pb-2 px-2 md:px-3 font-semibold text-sm md:text-base transition-colors whitespace-nowrap ${
                    activeTab === 'description'
                      ? 'text-emerald-600 border-b-2 border-emerald-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {language === 'en' ? 'Description' : 'الوصف'}
                </button>
                )}
                {((product as any).ingredients_ar || (product as any).ingredients_en) && (
                <button
                  onClick={() => setActiveTab('ingredients')}
                  className={`pb-2 px-2 md:px-3 font-semibold text-sm md:text-base transition-colors whitespace-nowrap ${
                    activeTab === 'ingredients'
                      ? 'text-emerald-600 border-b-2 border-emerald-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {language === 'en' ? 'Ingredients' : 'المكونات'}
                </button>
                )}
                {((product as any).nutrition_facts_ar || (product as any).nutrition_facts_en) && (
                <button
                  onClick={() => setActiveTab('nutrition')}
                  className={`pb-2 px-2 md:px-3 font-semibold text-sm md:text-base transition-colors whitespace-nowrap ${
                    activeTab === 'nutrition'
                      ? 'text-emerald-600 border-b-2 border-emerald-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {language === 'en' ? 'Nutrition' : 'القيمة الغذائية'}
                </button>
                )}
                {((product as any).allergens_ar || (product as any).allergens_en) && (
                <button
                  onClick={() => setActiveTab('allergens')}
                  className={`pb-2 px-2 md:px-3 font-semibold text-sm md:text-base transition-colors whitespace-nowrap ${
                    activeTab === 'allergens'
                      ? 'text-emerald-600 border-b-2 border-emerald-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {language === 'en' ? 'Allergens' : 'مسببات الحساسية'}
                </button>
                )}
                {((product as any).storage_instructions_ar || (product as any).storage_instructions_en) && (
                <button
                  onClick={() => setActiveTab('storage')}
                  className={`pb-2 px-2 md:px-3 font-semibold text-sm md:text-base transition-colors whitespace-nowrap ${
                    activeTab === 'storage'
                      ? 'text-emerald-600 border-b-2 border-emerald-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {language === 'en' ? 'Storage' : 'التخزين'}
                </button>
                )}
                <button
                  onClick={() => setActiveTab('details')}
                  className={`pb-2 px-2 md:px-3 font-semibold text-sm md:text-base transition-colors whitespace-nowrap ${
                    activeTab === 'details'
                      ? 'text-emerald-600 border-b-2 border-emerald-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {language === 'en' ? 'Details' : 'التفاصيل'}
                </button>
              </div>
            </div>

            <div className="min-h-[100px]">
              {activeTab === 'description' && (
                <div className="text-gray-700 leading-relaxed">
                  {((product as any).full_description_ar || (product as any).full_description_en) ? (
                    <p className="whitespace-pre-line">
                      {language === 'ar' 
                        ? ((product as any).full_description_ar || (product as any).full_description_en || '')
                        : ((product as any).full_description_en || (product as any).full_description_ar || '')}
                    </p>
                  ) : productDescription ? (
                    <p className="whitespace-pre-line">{productDescription}</p>
                  ) : (
                    <p className="text-gray-400 italic">{language === 'en' ? 'No description available' : 'لا يوجد وصف متاح'}</p>
                  )}
                </div>
              )}
              {activeTab === 'ingredients' && (
                <div className="text-gray-700 leading-relaxed">
                  <p className="whitespace-pre-line">
                    {language === 'ar' 
                      ? ((product as any).ingredients_ar || (product as any).ingredients_en || '')
                      : ((product as any).ingredients_en || (product as any).ingredients_ar || '')}
                  </p>
                </div>
              )}
              {activeTab === 'nutrition' && (
                <div className="text-gray-700 leading-relaxed">
                  <p className="whitespace-pre-line">
                    {language === 'ar' 
                      ? ((product as any).nutrition_facts_ar || (product as any).nutrition_facts_en || '')
                      : ((product as any).nutrition_facts_en || (product as any).nutrition_facts_ar || '')}
                  </p>
                </div>
              )}
              {activeTab === 'allergens' && (
                <div className="text-gray-700 leading-relaxed">
                  <p className="whitespace-pre-line">
                    {language === 'ar' 
                      ? ((product as any).allergens_ar || (product as any).allergens_en || '')
                      : ((product as any).allergens_en || (product as any).allergens_ar || '')}
                  </p>
                </div>
              )}
              {activeTab === 'storage' && (
                <div className="text-gray-700 leading-relaxed">
                  <p className="whitespace-pre-line">
                    {language === 'ar' 
                      ? ((product as any).storage_instructions_ar || (product as any).storage_instructions_en || '')
                      : ((product as any).storage_instructions_en || (product as any).storage_instructions_ar || '')}
                  </p>
                </div>
              )}
              {activeTab === 'details' && (
                <div className="space-y-3">
                  {(product as any).brand && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-600">{language === 'en' ? 'Brand:' : 'العلامة التجارية:'}</span>
                      <span className="text-gray-900">{(product as any).brand}</span>
                    </div>
                  )}
                  {(product as any).origin_country && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-600">{language === 'en' ? 'Origin:' : 'البلد الأصلي:'}</span>
                      <span className="text-gray-900">{(product as any).origin_country}</span>
                    </div>
                  )}
                  {(product as any).barcode && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-600">{language === 'en' ? 'Barcode:' : 'الباركود:'}</span>
                      <span className="text-gray-900">{(product as any).barcode}</span>
                    </div>
                  )}
                  {(product as any).category_id && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-600">{language === 'en' ? 'Category ID:' : 'رقم التصنيف:'}</span>
                      <span className="text-gray-900">{(product as any).category_id}</span>
                    </div>
                  )}
                  {(product as any).unit && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-600">{language === 'en' ? 'Unit:' : 'الوحدة:'}</span>
                      <span className="text-gray-900">{unitLabel[(product as any).unit]?.[language] || (product as any).unit}</span>
                    </div>
                  )}
                  {(product as any).price_per_unit && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-600">{language === 'en' ? 'Price per unit:' : 'السعر لكل وحدة:'}</span>
                      <span className="text-gray-900">{(product as any).price_per_unit} {currency}</span>
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'shipping' && (
                <div className="text-gray-700 leading-relaxed">
                  <p className="mb-4">
                    {language === 'en' 
                      ? 'Free shipping on orders over 100 SAR. Delivery within 24-48 hours.'
                      : 'شحن مجاني للطلبات التي تزيد عن 100 ريال. التوصيل خلال 24-48 ساعة.'}
                  </p>
                  <p>
                    {language === 'en'
                      ? 'Returns accepted within 7 days of delivery. Items must be unopened and in original packaging.'
                      : 'يمكن إرجاع المنتجات خلال 7 أيام من الاستلام. يجب أن تكون المنتجات غير مفتوحة وفي التغليف الأصلي.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quantity Selector */}
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-3 text-gray-900">
              {language === 'en' ? 'Quantity' : 'الكمية'}
              {(product as any).unit && (product as any).unit !== 'piece' && (
                <span className="text-gray-500 font-normal ml-2">
                  ({unitLabel[(product as any).unit]?.[language] || (product as any).unit})
                </span>
              )}
            </label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => adjustQuantity(-((product as any).unit_step || 1))}
                className="bg-gray-200 hover:bg-gray-300 w-12 h-12 rounded-xl font-bold text-xl transition-colors active:scale-95"
                disabled={quantity <= ((product as any).unit_step || 1)}
              >
                −
              </button>
              <input
                type="number"
                value={quantity % 1 === 0 ? quantity.toString() : quantity.toFixed(3).replace(/\.?0+$/, '')}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || ((product as any).unit_step || 1)
                  handleQuantityChange(val)
                }}
                step={(product as any).unit_step || 1}
                min={(product as any).unit_step || 1}
                className="w-24 text-center text-xl font-semibold border-2 border-gray-200 rounded-xl py-2 focus:border-emerald-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                onClick={() => adjustQuantity((product as any).unit_step || 1)}
                className="bg-gray-200 hover:bg-gray-300 w-12 h-12 rounded-xl font-bold text-xl transition-colors active:scale-95"
              >
                +
              </button>
              {(product as any).unit_step && (product as any).unit_step > 1 && (
                <span className="text-sm text-gray-600">
                  {language === 'en' ? 'Step:' : 'خطوة:'} {(product as any).unit_step} {unitLabel[(product as any).unit]?.[language] || (product as any).unit}
                </span>
              )}
            </div>
          </div>

          {/* Total Price */}
          {quantity > ((product as any).unit_step || 1) && (
            <div className="mb-6 p-4 bg-emerald-50 rounded-xl">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-900">
                  {language === 'en' ? 'Total:' : 'الإجمالي:'}
                </span>
                <span className="text-2xl font-bold text-emerald-700">
                  {totalPrice.toFixed(2)} {currency}
                </span>
              </div>
            </div>
          )}

          {/* Add to Cart Button */}
          <div className="hidden md:block">
            <Button
              full
              size="lg"
              variant={isAvailable ? 'primary' : 'secondary'}
              disabled={!isAvailable}
              onClick={handleAddToCart}
            >
              {isAvailable
                ? `${language === 'en' ? 'Add to Cart' : 'إضافة للسلة'} — ${totalPrice.toFixed(2)} ${currency}`
                : language === 'en'
                  ? 'Out of Stock'
                  : 'نفد المخزون'}
            </Button>
          </div>
        </div>
      </div>

      {/* Similar Products Section */}
      {bundleProducts.length > 0 ? (
        <div className="mt-12">
          <div className="flex items-end justify-between gap-3 mb-4">
            <div>
              <div className="text-xl md:text-2xl font-extrabold text-gray-900">{language === 'ar' ? 'يُشترى معه' : 'Frequently bought with'}</div>
              <div className="text-sm font-bold text-gray-600">{language === 'ar' ? 'اقتراحات من نفس القسم' : 'Suggested from same category'}</div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                bundleProducts.forEach((p: any) => {
                  const sq = (p as any)?.stock_quantity
                  if (sq != null && Number.isFinite(Number(sq)) && Number(sq) <= 0) return
                  addToCart(p, lockedStoreId || undefined, lockedStoreName || undefined)
                })
              }}
            >
              {language === 'ar' ? 'أضف الكل' : 'Add all'}
            </Button>
          </div>
          <Card className="p-4">
            <div className="grid grid-cols-3 gap-3">
              {bundleProducts.map((p) => (
                <ProductCard key={p.id} product={p} onAdd={(x) => addToCart(x, lockedStoreId || undefined, lockedStoreName || undefined)} compact />
              ))}
            </div>
          </Card>
        </div>
      ) : null}

      {similarProducts.length > 0 && (
        <div className="mt-16 border-t border-gray-200 pt-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-gray-900">
            {language === 'en' ? 'Similar Products' : 'منتجات مشابهة'}
          </h2>
          {loadingSimilar ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {similarProducts.map((similarProduct) => (
                <ProductCard
                  key={similarProduct.id}
                  product={similarProduct}
                  onAdd={(p) => addToCart(p, lockedStoreId || undefined, lockedStoreName || undefined)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mobile sticky add-to-cart */}
      <div className="fixed bottom-0 left-0 right-0 z-[95] md:hidden">
        <div className="bg-white/95 backdrop-blur border-t border-gray-200 px-4 py-3 pb-safe">
          <div className={spacing.pageMax}>
            {cartCount > 0 ? (
              <div className="mb-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-bold text-gray-600">
                    {language === 'ar' ? 'في السلة' : 'In cart'} • <span className="text-gray-900 font-extrabold">{cartCount}</span>
                  </div>
                  <button onClick={() => navigate('/checkout')} className="text-sm font-extrabold text-emerald-700">
                    {language === 'ar' ? 'إتمام الطلب' : 'Checkout'}
                  </button>
                </div>
                <div className="mt-2">
                  <MinOrderProgress subtotal={subtotal} />
                </div>
              </div>
            ) : null}

            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold text-gray-500">{language === 'ar' ? 'الإجمالي' : 'Total'}</div>
                <div className="text-lg font-extrabold text-emerald-700" dir="ltr">
                  {totalPrice.toFixed(2)} <span className="text-sm font-bold text-gray-500">{currency}</span>
                </div>
              </div>
              <Button
                variant={isAvailable ? 'primary' : 'secondary'}
                size="lg"
                disabled={!isAvailable}
                onClick={handleAddToCart}
                className="flex-[1.3]"
              >
                {language === 'ar' ? 'إضافة للسلة' : 'Add'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      <ImageLightbox
        images={productImages}
        initialIndex={selectedImageIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
    </div>
  )
}
