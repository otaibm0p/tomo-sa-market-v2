import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Product } from '../utils/api'
import { ProductCard } from './ProductCard'
import { HomeProductCard } from './HomeProductCard'
import { useLanguage } from '../context/LanguageContext'
import api from '../utils/api'

interface HomepageSection {
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

interface Category {
  id: number
  name: string
  name_ar?: string
  name_en?: string
  image_url: string | null
  description: string | null
}

interface HomepageSectionProps {
  section: HomepageSection
  lockedStoreId?: number | null
  onAddToCart?: (product: Product) => void
  categories?: Category[]
}

export const HomepageSection = ({ section, lockedStoreId, onAddToCart, categories = [] }: HomepageSectionProps) => {
  const { language } = useLanguage()
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSectionProducts()
  }, [section.section_key, lockedStoreId])

  const loadSectionProducts = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/api/homepage/sections/${section.section_key}/products`, {
        params: {
          ...(lockedStoreId ? { store_id: lockedStoreId } : {})
        }
      })
      
      const sectionProducts = response.data?.products || []
      setProducts(sectionProducts)
    } catch (err) {
      console.error(`Error loading ${section.section_key} products:`, err)
      // Don't show error to user, just set empty array
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const title = language === 'ar' ? section.title_ar : section.title_en
  const ctaText = section.cta_text_ar || section.cta_text_en || (language === 'ar' ? 'عرض المزيد' : 'View More')
  const ctaLink = section.cta_link || `/products?section=${section.section_key}`

  if (loading) {
    return (
      <div className="px-4 md:px-0 mb-8">
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="flex gap-2 sm:gap-3 md:gap-4 overflow-hidden">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="min-w-[140px] sm:min-w-[160px] md:min-w-[180px] flex-shrink-0">
              <div className="aspect-square bg-gray-200 rounded-lg sm:rounded-xl animate-pulse mb-2 sm:mb-3"></div>
              <div className="h-3 sm:h-4 bg-gray-200 rounded animate-pulse mb-1.5 sm:mb-2"></div>
              <div className="h-5 sm:h-6 bg-gray-200 rounded animate-pulse w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (products.length === 0) {
    return null
  }

  // Check if this is a homepage section that should use HomeProductCard
  // Featured, Best Sellers, and Deals of the Day use the premium card
  const useHomeCard = ['featured', 'best_sellers', 'deals_of_day'].includes(section.section_key.toLowerCase())
  const isDealSection = section.section_key.toLowerCase() === 'deals_of_day'

  // Render card component
  const renderCard = (product: Product) => {
    if (useHomeCard) {
      // Get deal end time from product metadata
      const dealEndTime = isDealSection ? ((product as any).deal_end_time || (product as any).deal_end_at) : null
      return (
        <HomeProductCard 
          key={product.id}
          product={product} 
          onAdd={onAddToCart || (() => {})}
          isDeal={isDealSection}
          dealEndTime={dealEndTime}
        />
      )
    }
    // Use standard ProductCard for other sections
    return <ProductCard key={product.id} product={product} onAdd={onAddToCart || (() => {})} />
  }

  // For homepage sections (Featured, Best Sellers, Deals), ALWAYS use CSS Grid (not slider)
  if (useHomeCard) {
    return (
      <div className="px-4 md:px-0 mb-8">
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <h3 className="font-bold text-xl md:text-2xl text-gray-900">{title}</h3>
          {products.length > 0 && (
            <Link 
              to={ctaLink}
              className="text-emerald-600 hover:text-emerald-700 text-sm md:text-base font-semibold flex items-center gap-1 transition-colors"
            >
              {ctaText}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 ${language === 'ar' ? 'rotate-180' : ''}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          )}
        </div>
        {/* CSS Grid Layout - Mobile: 2 cols, Tablet: 3 cols, Desktop: 5 cols */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
          {products.map((product) => {
            const dealEndTime = isDealSection ? ((product as any).deal_end_time || (product as any).deal_end_at) : null
            return (
              <div key={product.id} className="flex justify-center items-start">
                <HomeProductCard 
                  product={product} 
                  onAdd={onAddToCart || (() => {})}
                  isDeal={isDealSection}
                  dealEndTime={dealEndTime}
                />
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Grid layout for other sections
  if (section.layout_type === 'grid') {
    return (
      <div className="px-4 md:px-0 mb-8">
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <h3 className="font-bold text-xl md:text-2xl text-gray-900">{title}</h3>
          {products.length > 0 && (
            <Link 
              to={ctaLink}
              className="text-emerald-600 hover:text-emerald-700 text-sm md:text-base font-semibold flex items-center gap-1 transition-colors"
            >
              {ctaText}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 ${language === 'ar' ? 'rotate-180' : ''}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
          {products.map(renderCard)}
        </div>
      </div>
    )
  }

  // Slider layout for other sections (non-homepage sections)
  return (
    <div className="px-4 md:px-0 mb-8">
      <div className="flex justify-between items-center mb-4 md:mb-6">
        <h3 className="font-bold text-xl md:text-2xl text-gray-900">{title}</h3>
        {products.length > 0 && (
          <Link 
            to={ctaLink}
            className="text-emerald-600 hover:text-emerald-700 text-sm md:text-base font-semibold flex items-center gap-1 transition-colors"
          >
            {ctaText}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 ${language === 'ar' ? 'rotate-180' : ''}`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        )}
      </div>
      <div className="flex gap-2 sm:gap-3 md:gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 scroll-smooth">
        {products.map((product) => (
          <div key={product.id} className="min-w-[140px] sm:min-w-[160px] md:min-w-[180px] lg:min-w-[200px] flex-shrink-0">
            {renderCard(product)}
          </div>
        ))}
      </div>
    </div>
  )
}

