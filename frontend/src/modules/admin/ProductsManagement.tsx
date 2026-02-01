import { useState, useEffect, useRef } from 'react'
import { Product, productAPI } from '../../utils/api'
import api from '../../utils/api'
import * as XLSX from 'xlsx'
import { useLanguage } from '../../context/LanguageContext'
import { formatNumber, parseNumber, formatAdminNumber, cleanDecimalInput } from '../../utils/numberFormat'
import { logAdminEvent } from '../../shared/admin/activityLog'

export default function ProductsManagement() {
  const { t, language } = useLanguage()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasData, setHasData] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    name_en: '',
    price: '',
    description: '',
    description_ar: '',
    description_en: '',
    short_description_ar: '',
    short_description_en: '',
    full_description_ar: '',
    full_description_en: '',
    ingredients_ar: '',
    ingredients_en: '',
    nutrition_facts_ar: '',
    nutrition_facts_en: '',
    allergens_ar: '',
    allergens_en: '',
    storage_instructions_ar: '',
    storage_instructions_en: '',
    brand: '',
    origin_country: '',
    category_id: '',
    unit: 'piece',
    price_per_unit: '',
    unit_step: '1',
    image_url: '',
    stock_quantity: '',
    is_featured: false,
    discount_price: '',
    discount_percentage: '',
    cost_price: '',
    is_price_locked: false,
    images: ['', '', '', '', ''] // Array of 5 empty strings
  })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [showImportModal, setShowImportModal] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
  const [importResults, setImportResults] = useState<{ success: number; errors: number; skipped: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [stockFilter, setStockFilter] = useState('') // 'in_stock', 'out_of_stock', 'low_stock'
  const [sortBy, setSortBy] = useState('newest') // 'newest', 'oldest', 'price_high', 'price_low', 'name'
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  useEffect(() => {
    loadProducts()
    loadCategories()
  }, [])

  const loadProducts = async () => {
    try {
      setLoading(true)
      setError(null)
      setHasData(true)
      // Use dedicated admin endpoint instead of public API
      const res = await api.get('/api/admin/products')
      const data = res.data
      
      let productsList: Product[] = []
      if (Array.isArray(data)) {
        productsList = data
      } else if (data && Array.isArray(data.products)) {
        productsList = data.products
      }
      
      setProducts(productsList)
      setHasData(true)
    } catch (err: any) {
      console.error('Error loading products:', err)
      // Graceful fallback (no scary raw error text)
      setItemsSafeEmpty()
      setProducts([])
      setHasData(false)
    } finally {
      setLoading(false)
    }
  }

  const setItemsSafeEmpty = () => {
    setError(null)
    setMessage(null)
  }

  const loadCategories = async () => {
    try {
      const res = await api.get('/api/categories')
      setCategories(res.data || [])
    } catch (err: any) {
      console.error('Error loading categories:', err)
      setCategories([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      // 1. Data Preparation & Validation
      const name_ar = formData.name_ar || formData.name;
      if (!name_ar || name_ar.trim() === '') {
        setMessage({ text: 'اسم المنتج (عربي) مطلوب', type: 'error' });
        setSubmitting(false);
        return;
      }

      // Sanitize Price
      const rawPrice = String(formData.price || formData.price_per_unit).replace(/[^0-9.]/g, '');
      const price = parseFloat(rawPrice);
      
      if (isNaN(price)) {
        setMessage({ text: 'السعر غير صالح', type: 'error' });
        setSubmitting(false);
        return;
      }

      // Prepare Payload
      const productData: any = {
        name_ar: name_ar.trim(),
        name_en: formData.name_en?.trim() || null,
        name: name_ar.trim(), // Legacy support
        price: price,
        description_ar: formData.description_ar?.trim() || formData.description?.trim() || null,
        description_en: formData.description_en?.trim() || null,
        short_description_ar: formData.short_description_ar?.trim() || null,
        short_description_en: formData.short_description_en?.trim() || null,
        full_description_ar: formData.full_description_ar?.trim() || null,
        full_description_en: formData.full_description_en?.trim() || null,
        ingredients_ar: formData.ingredients_ar?.trim() || null,
        ingredients_en: formData.ingredients_en?.trim() || null,
        nutrition_facts_ar: formData.nutrition_facts_ar?.trim() || null,
        nutrition_facts_en: formData.nutrition_facts_en?.trim() || null,
        allergens_ar: formData.allergens_ar?.trim() || null,
        allergens_en: formData.allergens_en?.trim() || null,
        storage_instructions_ar: formData.storage_instructions_ar?.trim() || null,
        storage_instructions_en: formData.storage_instructions_en?.trim() || null,
        brand: formData.brand?.trim() || null,
        origin_country: formData.origin_country?.trim() || null,
        // Ensure category_id is either a valid string or null (not undefined, not empty string)
        category_id: formData.category_id && formData.category_id !== 'null' ? formData.category_id : null,
        unit: formData.unit || 'piece',
        price_per_unit: price, // Sync with main price
        unit_step: parseFloat(formData.unit_step) || 1,
        image_url: formData.image_url?.trim() || null,
        is_featured: Boolean(formData.is_featured),
        discount_price: formData.discount_price ? parseFloat(formData.discount_price) : null,
        discount_percentage: formData.discount_percentage ? parseInt(formData.discount_percentage) : null,
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
        is_price_locked: Boolean(formData.is_price_locked),
        images: formData.images.filter(img => img.trim() !== '') // Filter out empty images
      };

      if (formData.stock_quantity !== '' && formData.stock_quantity !== null) {
        const qty = parseInt(formData.stock_quantity);
        if (!isNaN(qty)) {
          productData.stock_quantity = qty;
        }
      }

      // Prepare images array for the images endpoint (with is_primary and sort_order)
      const validImages = formData.images.filter(img => img && img.trim() !== '')
      const imagesForAPI = validImages.map((url, index) => ({
        url: url.trim(),
        is_primary: index === 0, // First image is primary
        sort_order: index
      }))

      console.log("🚀 Submitting Product Data:", productData);

      // 2. API Call
      let response;
      let productId: number;
      
      if (editingProduct) {
        console.log(`Updating product ID: ${editingProduct.id}`);
        productId = editingProduct.id;
        response = await api.put(`/api/products/${productId}`, productData);
        setMessage({ text: 'تم تحديث المنتج بنجاح! ✅', type: 'success' });
        
        // 3. Local State Sync (Optimistic UI Update)
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...response.data } : p));
      } else {
        console.log("Creating new product");
        response = await api.post('/api/products', productData);
        productId = response.data.id;
        setMessage({ text: 'تم إضافة المنتج بنجاح! ✅', type: 'success' });
        
        // Add to local list
        setProducts(prev => [response.data, ...prev]);
      }

      // 4. Update product images using dedicated endpoint (if we have valid images)
      if (imagesForAPI.length > 0 && productId) {
        try {
          await api.put(`/api/admin/products/${productId}/images`, { images: imagesForAPI });
          console.log('✅ Product images updated successfully');
        } catch (imgErr: any) {
          console.warn('⚠️ Failed to update product images:', imgErr);
          // Don't fail the whole operation if images update fails
        }
      }

      // Cleanup
      setShowForm(false);
      setEditingProduct(null);
      resetForm();
      
      // Optional: Background refresh
      // loadProducts(); 

    } catch (err: any) {
      console.error("❌ Submit Error Details:", err);
      console.error("❌ Response Data:", err.response?.data);
      
      const serverMsg = err.response?.data?.message;
      const errorText = serverMsg 
        ? `خطأ من السيرفر: ${serverMsg}` 
        : `حدث خطأ في الاتصال: ${err.message}`;
        
      setMessage({
        text: errorText,
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      name_ar: '',
      name_en: '',
      price: '',
      description: '',
      description_ar: '',
      description_en: '',
      short_description_ar: '',
      short_description_en: '',
      full_description_ar: '',
      full_description_en: '',
      ingredients_ar: '',
      ingredients_en: '',
      nutrition_facts_ar: '',
      nutrition_facts_en: '',
      allergens_ar: '',
      allergens_en: '',
      storage_instructions_ar: '',
      storage_instructions_en: '',
      brand: '',
      origin_country: '',
      category_id: '',
      unit: 'piece',
      price_per_unit: '',
      unit_step: '1',
      image_url: '',
      stock_quantity: '',
      is_featured: false,
      discount_price: '',
      discount_percentage: '',
      cost_price: '',
      is_price_locked: false,
      images: ['', '', '', '', '']
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return

    try {
      await api.delete(`/api/products/${id}`)
      loadProducts()
    } catch (err: any) {
      alert(err.response?.data?.message || 'حدث خطأ في حذف المنتج')
    }
  }

  const startEdit = async (product: Product) => {
    setEditingProduct(product)
    const p = product as any
    
    // Fetch full product details including images
    try {
      const res = await api.get(`/api/products/${product.id}`)
      const fullProduct = res.data
      
      // Extract images from API response
      let productImages: string[] = []
      if (fullProduct.images && Array.isArray(fullProduct.images) && fullProduct.images.length > 0) {
        // Sort by is_primary and sort_order
        const sortedImages = [...fullProduct.images].sort((a, b) => {
          if (a.is_primary && !b.is_primary) return -1
          if (!a.is_primary && b.is_primary) return 1
          return (a.sort_order || 0) - (b.sort_order || 0)
        })
        productImages = sortedImages.map((img: any) => img.url || img).filter((url: string) => url && url.trim())
      }
      
      // If no images from product_images table, use image_url
      if (productImages.length === 0 && (fullProduct.image_url || p.image_url)) {
        productImages = [fullProduct.image_url || p.image_url]
      }
      
      // Ensure we have at least 5 slots, fill empty ones
      while (productImages.length < 5) {
        productImages.push('')
      }
      productImages = productImages.slice(0, 10) // Max 10 images
      
      setFormData({
        name: fullProduct.name || p.name_ar || product.name || '',
        name_ar: fullProduct.name_ar || p.name_ar || product.name || '',
        name_en: fullProduct.name_en || p.name_en || '',
        price: String(fullProduct.price || product.price),
        description: fullProduct.description_ar || p.description_ar || product.description || '',
        description_ar: fullProduct.description_ar || p.description_ar || product.description || '',
        description_en: fullProduct.description_en || p.description_en || '',
        short_description_ar: fullProduct.short_description_ar || p.short_description_ar || '',
        short_description_en: fullProduct.short_description_en || p.short_description_en || '',
        full_description_ar: fullProduct.full_description_ar || p.full_description_ar || '',
        full_description_en: fullProduct.full_description_en || p.full_description_en || '',
        ingredients_ar: fullProduct.ingredients_ar || p.ingredients_ar || '',
        ingredients_en: fullProduct.ingredients_en || p.ingredients_en || '',
        nutrition_facts_ar: fullProduct.nutrition_facts_ar || p.nutrition_facts_ar || '',
        nutrition_facts_en: fullProduct.nutrition_facts_en || p.nutrition_facts_en || '',
        allergens_ar: fullProduct.allergens_ar || p.allergens_ar || '',
        allergens_en: fullProduct.allergens_en || p.allergens_en || '',
        storage_instructions_ar: fullProduct.storage_instructions_ar || p.storage_instructions_ar || '',
        storage_instructions_en: fullProduct.storage_instructions_en || p.storage_instructions_en || '',
        brand: fullProduct.brand || p.brand || '',
        origin_country: fullProduct.origin_country || p.origin_country || '',
        category_id: fullProduct.category_id ? String(fullProduct.category_id) : (p.category_id ? String(p.category_id) : ''),
        unit: fullProduct.unit || p.unit || 'piece',
        price_per_unit: fullProduct.price_per_unit ? String(fullProduct.price_per_unit) : (p.price_per_unit ? String(p.price_per_unit) : String(product.price)),
        unit_step: fullProduct.unit_step ? String(fullProduct.unit_step) : (p.unit_step ? String(p.unit_step) : '1'),
        image_url: fullProduct.primary_image_url || fullProduct.image_url || p.image_url || '',
        stock_quantity: fullProduct.stock_quantity ? String(fullProduct.stock_quantity) : (p.stock_quantity ? String(p.stock_quantity) : ''),
        is_featured: fullProduct.is_featured || p.is_featured || false,
        discount_price: fullProduct.discount_price ? String(fullProduct.discount_price) : (p.discount_price ? String(p.discount_price) : ''),
        discount_percentage: fullProduct.discount_percentage ? String(fullProduct.discount_percentage) : (p.discount_percentage ? String(p.discount_percentage) : ''),
        cost_price: fullProduct.cost_price ? String(fullProduct.cost_price) : (p.cost_price ? String(p.cost_price) : ''),
        is_price_locked: fullProduct.is_price_locked || p.is_price_locked || false,
        images: productImages
      })
    } catch (err) {
      console.error('Error loading product details:', err)
      // Fallback to basic product data if API fails
      setFormData({
        name: product.name || p.name_ar || '',
        name_ar: p.name_ar || product.name || '',
        name_en: p.name_en || '',
        price: String(product.price),
        description: product.description || p.description_ar || '',
        description_ar: p.description_ar || product.description || '',
        description_en: p.description_en || '',
        short_description_ar: p.short_description_ar || '',
        short_description_en: p.short_description_en || '',
        full_description_ar: p.full_description_ar || '',
        full_description_en: p.full_description_en || '',
        ingredients_ar: p.ingredients_ar || '',
        ingredients_en: p.ingredients_en || '',
        nutrition_facts_ar: p.nutrition_facts_ar || '',
        nutrition_facts_en: p.nutrition_facts_en || '',
        allergens_ar: p.allergens_ar || '',
        allergens_en: p.allergens_en || '',
        storage_instructions_ar: p.storage_instructions_ar || '',
        storage_instructions_en: p.storage_instructions_en || '',
        brand: p.brand || '',
        origin_country: p.origin_country || '',
        category_id: p.category_id ? String(p.category_id) : '',
        unit: p.unit || 'piece',
        price_per_unit: p.price_per_unit ? String(p.price_per_unit) : String(product.price),
        unit_step: p.unit_step ? String(p.unit_step) : '1',
        image_url: p.image_url || '',
        stock_quantity: p.stock_quantity ? String(p.stock_quantity) : '',
        is_featured: p.is_featured || false,
        discount_price: p.discount_price ? String(p.discount_price) : '',
        discount_percentage: p.discount_percentage ? String(p.discount_percentage) : '',
        cost_price: p.cost_price ? String(p.cost_price) : '',
        is_price_locked: p.is_price_locked || false,
        images: (p.images && Array.isArray(p.images) && p.images.length > 0) 
          ? [...p.images, '', '', '', '', ''].slice(0, 5)
          : [p.image_url || '', '', '', '', '']
      })
    }
    setShowForm(true)
  }

  const isLowStock = (product: Product) => {
    const p = product as any
    const stock = p.stock_quantity ?? p.quantity ?? p.countInStock
    return stock !== null && stock !== undefined && stock < 10
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(fileExtension || '')) {
      setMessage({ text: 'يرجى اختيار ملف Excel (.xlsx, .xls) أو CSV', type: 'error' })
      return
    }

    setImporting(true)
    setImportProgress({ current: 0, total: 0 })
    setImportResults(null)
    setMessage(null)

    try {
      const fileData = await file.arrayBuffer()
      const workbook = XLSX.read(fileData, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData: any[] = XLSX.utils.sheet_to_json(firstSheet)

      if (jsonData.length === 0) {
        setMessage({ text: 'الملف فارغ أو لا يحتوي على بيانات', type: 'error' })
        setImporting(false)
        return
      }

      setImportProgress({ current: 0, total: jsonData.length })

      // إرسال البيانات إلى Backend
      const response = await api.post('/api/admin/products/bulk-import', {
        products: jsonData,
      }, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            setImportProgress({
              current: Math.round((percentCompleted / 100) * jsonData.length),
              total: jsonData.length,
            })
          }
        },
      })

      setImportResults(response.data.results)
      setMessage({
        text: `تم استيراد ${response.data.results.success} منتج بنجاح! ✅`,
        type: 'success',
      })
      
      // إعادة تحميل المنتجات
      await loadProducts()
      await loadCategories()

      // إغلاق Modal بعد 2 ثانية
      setTimeout(() => {
        setShowImportModal(false)
        setImportResults(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }, 2000)
    } catch (err: any) {
      console.error('Import error:', err)
      setMessage({
        text: err.response?.data?.message || 'حدث خطأ في استيراد الملف',
        type: 'error',
      })
    } finally {
      setImporting(false)
    }
  }

  // Filter Logic
  const filteredProducts = products.filter((product: any) => {
    // 1. Search Filter
    const searchLower = searchQuery.toLowerCase()
    const matchesSearch = 
      (product.name && product.name.toLowerCase().includes(searchLower)) ||
      (product.name_ar && product.name_ar.toLowerCase().includes(searchLower)) ||
      (product.name_en && product.name_en.toLowerCase().includes(searchLower)) ||
      (product.barcode && product.barcode.toLowerCase().includes(searchLower))

    // 2. Category Filter
    const matchesCategory = selectedCategory ? String(product.category_id) === String(selectedCategory) : true

    // 3. Stock Filter
    const stock = product.stock_quantity ?? product.quantity ?? product.countInStock ?? 0
    let matchesStock = true
    if (stockFilter === 'in_stock') matchesStock = stock > 0
    if (stockFilter === 'out_of_stock') matchesStock = stock <= 0
    if (stockFilter === 'low_stock') matchesStock = stock > 0 && stock < 10

    return matchesSearch && matchesCategory && matchesStock
  }).sort((a: any, b: any) => {
    // 4. Sort Logic
    if (sortBy === 'newest') return (b.id || 0) - (a.id || 0) // Assuming higher ID is newer
    if (sortBy === 'oldest') return (a.id || 0) - (b.id || 0)
    if (sortBy === 'price_high') return (b.price || 0) - (a.price || 0)
    if (sortBy === 'price_low') return (a.price || 0) - (b.price || 0)
    if (sortBy === 'name') return (a.name_ar || a.name || '').localeCompare(b.name_ar || b.name || '')
    return 0
  })

  // Bulk Selection Logic
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredProducts.map((p: any) => p.id))
    }
  }

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(sid => sid !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const handleBulkDelete = async () => {
    if (!confirm(language === 'en' ? `Are you sure you want to delete ${selectedIds.length} products?` : `هل أنت متأكد من حذف ${selectedIds.length} منتج؟`)) return

    try {
      setLoading(true)
      const response = await api.post('/api/admin/products/bulk-delete', { ids: selectedIds })
      
      console.log('Bulk delete response:', response.data)

      if (response.data.success) {
         // Update local state properly
         const deletedIds = selectedIds; // Capture current selection
         setProducts(prev => prev.filter(p => !deletedIds.includes(p.id)))
         setSelectedIds([])
         
         setMessage({
           text: language === 'en' ? 'Selected products deleted successfully' : 'تم حذف المنتجات المحددة بنجاح',
           type: 'success'
         })
         
         // Force reload to be safe
         setTimeout(() => loadProducts(), 500);
      }
    } catch (err: any) {
      console.error('Bulk delete error:', err)
      setMessage({
        text: err.response?.data?.message || 'Error deleting products',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-lg" style={{ fontFamily: 'Cairo, sans-serif' }}>جاري التحميل...</div>
      </div>
    )
  }

  if (!loading && hasData === false && products.length === 0 && !showForm) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px] px-4">
        <div className="w-full max-w-xl rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <div className="text-lg font-extrabold text-gray-900">{t('admin.banner.products.title')}</div>
          <div className="mt-1 text-sm text-gray-700">{t('admin.banner.products.subtitle')}</div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => {
                logAdminEvent('retry', t('admin.items.products') || 'Products', { page: 'products' })
                loadProducts()
              }}
              className="px-4 py-2 rounded-xl font-extrabold border border-gray-200 bg-white text-gray-900 hover:bg-gray-50"
            >
              {t('admin.banner.retry')}
            </button>
            <button
              onClick={() => {
                setShowForm(true)
                setEditingProduct(null)
                setFormData({
                  name: '',
                  name_ar: '',
                  name_en: '',
                  price: '',
                  description: '',
                  description_ar: '',
                  description_en: '',
                  category_id: '',
                  unit: 'piece',
                  price_per_unit: '',
                  unit_step: '1',
                  image_url: '',
                  stock_quantity: '',
                  is_featured: false,
                  discount_price: '',
                  discount_percentage: '',
                  cost_price: '',
                  is_price_locked: false,
                  images: ['', '', '', '', ''],
                })
              }}
              className="px-4 py-2 rounded-xl font-extrabold text-white border border-emerald-600 bg-emerald-600 hover:bg-emerald-700"
            >
              {t('addProduct') || (language === 'en' ? 'Add New Product' : 'إضافة منتج جديد')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'Cairo, sans-serif' }} className="w-full max-w-full">
      {/* Header Section */}
      <div className="mb-6 lg:mb-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold mb-2" style={{ color: '#1a237e' }}>
              {t('productsManagement')}
            </h1>
            <p className="text-gray-600 text-sm lg:text-base">{t('manageProductsDesc')}</p>
          </div>
          <div className="flex flex-wrap gap-2 lg:gap-3 w-full lg:w-auto">
            {products.length > 0 && (
              <div className="px-3 lg:px-4 py-2 bg-white rounded-lg shadow-md border border-gray-200">
                <p className="text-xs text-gray-600 mb-1">{t('totalProducts')}</p>
                <p className="text-xl lg:text-2xl font-bold" style={{ color: '#1a237e' }}>
                  {products.length}
                </p>
              </div>
            )}
            {products.filter((p: any) => {
              const stock = p.stock_quantity ?? p.quantity ?? p.countInStock
              return stock !== null && stock !== undefined && stock < 10
            }).length > 0 && (
              <div className="px-3 lg:px-4 py-2 bg-red-50 rounded-lg shadow-md border border-red-200">
                <p className="text-xs text-red-600 mb-1">⚠️ {t('lowStock')}</p>
                <p className="text-xl lg:text-2xl font-bold text-red-600">
                  {products.filter((p: any) => {
                    const stock = p.stock_quantity ?? p.quantity ?? p.countInStock
                    return stock !== null && stock !== undefined && stock < 10
                  }).length}
                </p>
              </div>
            )}
          </div>
        </div>
            <div className="flex flex-wrap gap-2 lg:gap-3 w-full lg:w-auto">
            <div className="bg-white rounded-lg border border-gray-200 p-1 flex">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-gray-100 text-[#1a237e]' : 'text-gray-400 hover:text-gray-600'}`}
                title="List View"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gray-100 text-[#1a237e]' : 'text-gray-400 hover:text-gray-600'}`}
                title="Grid View"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
            </div>

            {selectedIds.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 hover:shadow-xl flex items-center gap-2"
                style={{ backgroundColor: '#dc2626' }}
              >
                <span className="text-xl">🗑️</span>
                <span>{language === 'en' ? `Delete (${selectedIds.length})` : `حذف (${selectedIds.length})`}</span>
              </button>
            )}
            <button
              onClick={() => {
                setShowForm(true)
                setEditingProduct(null)
                setFormData({
                  name: '',
                  name_ar: '',
                  name_en: '',
                  price: '',
                  description: '',
                  description_ar: '',
                  description_en: '',
                  category_id: '',
                  unit: 'piece',
                  price_per_unit: '',
                  unit_step: '1',
      image_url: '',
      stock_quantity: '',
      is_featured: false,
      discount_price: '',
      discount_percentage: '',
      cost_price: '',
      is_price_locked: false,
      images: ['', '', '', '', '']
    })
  }}
              className="px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 hover:shadow-xl flex items-center gap-2"
              style={{ backgroundColor: '#2e7d32' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1b5e20'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2e7d32'}
            >
              <span className="text-xl">➕</span>
              <span>{t('addProduct') || (language === 'en' ? 'Add New Product' : 'إضافة منتج جديد')}</span>
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 hover:shadow-xl flex items-center gap-2"
              style={{ backgroundColor: '#1a237e' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0d47a1'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1a237e'}
            >
              <span className="text-xl">📥</span>
              <span>{t('bulkImport') || (language === 'en' ? 'Bulk Import' : 'استيراد جماعي')}</span>
            </button>
          </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-md border border-gray-100 mb-6 space-y-4 lg:space-y-0 lg:flex lg:items-center lg:gap-4">
        {/* Search Input */}
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder={t('search') + '...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a237e] focus:border-[#1a237e] transition-all"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        </div>

        {/* Filters Wrapper */}
        <div className="flex flex-wrap gap-2 lg:gap-4">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a237e] bg-white"
          >
            <option value="">{t('allCategories')}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {language === 'en' ? cat.name_en || cat.name : cat.name_ar || cat.name}
              </option>
            ))}
          </select>

          {/* Stock Filter */}
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a237e] bg-white"
          >
            <option value="">{t('allStock')}</option>
            <option value="in_stock">{t('inStock')}</option>
            <option value="low_stock">{t('lowStockFilter')}</option>
            <option value="out_of_stock">{t('outOfStock')}</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a237e] bg-white"
          >
            <option value="newest">{t('sortNewest')}</option>
            <option value="oldest">{t('sortOldest')}</option>
            <option value="price_high">{t('sortPriceHigh')}</option>
            <option value="price_low">{t('sortPriceLow')}</option>
            <option value="name">{t('sortName')}</option>
          </select>

          {/* Reset Filters */}
          {(searchQuery || selectedCategory || stockFilter) && (
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedCategory('')
                setStockFilter('')
                setSortBy('newest')
              }}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
            >
              {t('clearFilters')}
            </button>
          )}
        </div>
      </div>

      {/* Add/Edit Form - Modal Style */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-8 border border-gray-200 max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold" style={{ color: '#1a237e' }}>
              {editingProduct 
                ? (t('edit') || (language === 'en' ? 'Edit' : 'تعديل')) 
                : (t('addProduct') || (language === 'en' ? 'Add New Product' : 'إضافة منتج جديد'))}
            </h2>
            <button
              onClick={() => {
                setShowForm(false)
                setEditingProduct(null)
              }}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              ✕
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  {t('productNameAr')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  {t('productNameEn')}
                </label>
                <input
                  type="text"
                  value={formData.name_en}
                  onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                  placeholder="Product Name (English)"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">{t('category')}</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                >
                  <option value="">{t('selectCategory') || 'اختر القسم'}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {language === 'en' ? cat.name_en || cat.name : cat.name_ar || cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">{t('unit')}</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                >
                  <option value="piece">{language === 'ar' ? 'قطعة' : 'Piece'}</option>
                  <option value="kg">{language === 'ar' ? 'كيلوغرام' : 'Kg'}</option>
                  <option value="g">{language === 'ar' ? 'غرام' : 'Gram'}</option>
                  <option value="bag">{language === 'ar' ? 'كيس' : 'Bag'}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  {t('pricePerUnit').replace('{currency}', t('currency'))} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formData.price_per_unit === '' ? '' : formatAdminNumber(parseFloat(formData.price_per_unit) || 0, 2)}
                  onChange={(e) => {
                    const cleaned = cleanDecimalInput(e.target.value)
                    if (cleaned === '' || cleaned === '.') {
                      setFormData({ ...formData, price_per_unit: '', price: '' })
                    } else {
                      const parsed = parseNumber(cleaned)
                      if (!isNaN(parsed) && parsed >= 0) {
                        const val = String(parsed)
                        setFormData({ ...formData, price_per_unit: val, price: val })
                      }
                    }
                  }}
                  onBlur={(e) => {
                    const parsed = parseNumber(e.target.value)
                    if (isNaN(parsed) || parsed < 0) {
                      setFormData({ ...formData, price_per_unit: '', price: '' })
                    } else {
                      const val = String(parsed)
                      setFormData({ ...formData, price_per_unit: val, price: val })
                  }
                  }}
                  placeholder="0.00"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all font-mono text-left"
                  dir="ltr"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  {language === 'en' ? 'Cost Price' : 'سعر التكلفة'} <span className="text-gray-400 text-xs">({t('currency')})</span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formData.cost_price === '' ? '' : formatAdminNumber(parseFloat(formData.cost_price) || 0, 2)}
                  onChange={(e) => {
                    const cleaned = cleanDecimalInput(e.target.value)
                    if (cleaned === '' || cleaned === '.') {
                      setFormData({ ...formData, cost_price: '' })
                    } else {
                      const parsed = parseNumber(cleaned)
                      if (!isNaN(parsed) && parsed >= 0) {
                        setFormData({ ...formData, cost_price: String(parsed) })
                      }
                    }
                  }}
                  onBlur={(e) => {
                    const parsed = parseNumber(e.target.value)
                    if (isNaN(parsed) || parsed < 0) {
                      setFormData({ ...formData, cost_price: '' })
                    } else {
                      setFormData({ ...formData, cost_price: String(parsed) })
                    }
                  }}
                  placeholder={language === 'en' ? 'Cost Price' : 'سعر التكلفة'}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all bg-blue-50 font-mono text-left"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">{t('stock')}</label>
                <input
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                  placeholder={t('quantityAvailable') || 'الكمية المتاحة'}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">{t('unitStep')}</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formData.unit_step === '' || formData.unit_step === '1' ? '' : formatAdminNumber(parseFloat(formData.unit_step) || 0, 2)}
                  onChange={(e) => {
                    const cleaned = cleanDecimalInput(e.target.value)
                    if (cleaned === '' || cleaned === '.') {
                      setFormData({ ...formData, unit_step: '1' })
                    } else {
                      const parsed = parseNumber(cleaned)
                      if (!isNaN(parsed) && parsed > 0) {
                        setFormData({ ...formData, unit_step: String(parsed) })
                      }
                    }
                  }}
                  onBlur={(e) => {
                    const parsed = parseNumber(e.target.value)
                    if (isNaN(parsed) || parsed <= 0) {
                      setFormData({ ...formData, unit_step: '1' })
                    } else {
                      setFormData({ ...formData, unit_step: String(parsed) })
                    }
                  }}
                  placeholder="مثال: 0.25"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all font-mono text-left"
                  dir="ltr"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  {language === 'en' ? 'Product Images' : 'صور المنتج'}
                </label>
                <div className="space-y-3 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                  <p className="text-xs text-gray-600 mb-3">
                    {language === 'en' 
                      ? '💡 First image will be set as primary. You can add up to 10 images.'
                      : '💡 الصورة الأولى ستكون الصورة الرئيسية. يمكنك إضافة حتى 10 صور.'}
                  </p>
                  {(formData.images || ['', '', '', '', '']).map((img, index) => (
                    <div key={index} className="flex gap-3 items-start bg-white p-3 rounded-lg border border-gray-200">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-gray-600">
                            {index === 0 
                              ? (language === 'en' ? 'Primary Image' : 'الصورة الرئيسية') 
                              : `${language === 'en' ? 'Image' : 'صورة'} ${index + 1}`}
                          </span>
                          {index === 0 && img && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                              {language === 'en' ? 'Primary' : 'رئيسية'}
                            </span>
                          )}
                        </div>
                        <input
                          type="url"
                          value={img}
                          onChange={(e) => {
                            const newImages = [...(formData.images || ['', '', '', '', ''])];
                            newImages[index] = e.target.value;
                            setFormData({ ...formData, images: newImages });
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all text-sm"
                          placeholder={index === 0 
                            ? (language === 'en' ? 'Primary image URL (required)' : 'رابط الصورة الرئيسية (مطلوب)')
                            : (language === 'en' ? `Additional image ${index} URL` : `رابط الصورة الإضافية ${index}`)}
                        />
                      </div>
                      {img && (
                        <div className="w-20 h-20 bg-gray-100 rounded-lg border-2 border-gray-300 overflow-hidden flex-shrink-0 relative group">
                          <img 
                            src={img} 
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-red-500 text-xs">❌ Invalid</div>';
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newImages = [...(formData.images || ['', '', '', '', ''])];
                              newImages[index] = '';
                              setFormData({ ...formData, images: newImages });
                            }}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs hover:bg-red-600"
                            title={language === 'en' ? 'Remove image' : 'حذف الصورة'}
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {(formData.images || []).filter(img => img.trim()).length < 10 && (
                    <button
                      type="button"
                      onClick={() => {
                        const currentImages = formData.images || ['', '', '', '', ''];
                        const emptyIndex = currentImages.findIndex(img => !img || img.trim() === '');
                        if (emptyIndex === -1 && currentImages.length < 10) {
                          setFormData({ ...formData, images: [...currentImages, ''] });
                        }
                      }}
                      className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-emerald-500 hover:text-emerald-600 transition-colors text-sm font-medium"
                    >
                      + {language === 'en' ? 'Add Another Image' : 'إضافة صورة أخرى'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">{t('descriptionAr')}</label>
                <textarea
                  value={formData.description_ar}
                  onChange={(e) => setFormData({ ...formData, description_ar: e.target.value, description: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">{t('descriptionEn')}</label>
                <textarea
                  value={formData.description_en}
                  onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                  rows={3}
                  placeholder="Description (English)"
                />
              </div>
            </div>

            {/* Structured Content Fields - Professional Grocery Style */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
              <h3 className="text-lg font-bold mb-4 text-gray-800">
                {language === 'en' ? '📋 Structured Product Content' : '📋 محتوى المنتج المنظم'}
              </h3>
              
              {/* Brand & Origin */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">{language === 'en' ? 'Brand' : 'العلامة التجارية'}</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                    placeholder={language === 'en' ? 'Brand name' : 'اسم العلامة التجارية'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">{language === 'en' ? 'Origin Country' : 'البلد الأصلي'}</label>
                  <input
                    type="text"
                    value={formData.origin_country}
                    onChange={(e) => setFormData({ ...formData, origin_country: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                    placeholder={language === 'en' ? 'e.g., Saudi Arabia' : 'مثال: السعودية'}
                  />
                </div>
              </div>

              {/* Full Description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">{language === 'en' ? 'Full Description (AR)' : 'الوصف الكامل (عربي)'}</label>
                  <textarea
                    value={formData.full_description_ar}
                    onChange={(e) => setFormData({ ...formData, full_description_ar: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                    rows={4}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">{language === 'en' ? 'Full Description (EN)' : 'Full Description (EN)'}</label>
                  <textarea
                    value={formData.full_description_en}
                    onChange={(e) => setFormData({ ...formData, full_description_en: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                    rows={4}
                  />
                </div>
              </div>

              {/* Ingredients */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">{language === 'en' ? 'Ingredients (AR)' : 'المكونات (عربي)'}</label>
                  <textarea
                    value={formData.ingredients_ar}
                    onChange={(e) => setFormData({ ...formData, ingredients_ar: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">{language === 'en' ? 'Ingredients (EN)' : 'Ingredients (EN)'}</label>
                  <textarea
                    value={formData.ingredients_en}
                    onChange={(e) => setFormData({ ...formData, ingredients_en: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                    rows={3}
                  />
                </div>
              </div>

              {/* Nutrition Facts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">{language === 'en' ? 'Nutrition Facts (AR)' : 'القيمة الغذائية (عربي)'}</label>
                  <textarea
                    value={formData.nutrition_facts_ar}
                    onChange={(e) => setFormData({ ...formData, nutrition_facts_ar: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                    rows={4}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">{language === 'en' ? 'Nutrition Facts (EN)' : 'Nutrition Facts (EN)'}</label>
                  <textarea
                    value={formData.nutrition_facts_en}
                    onChange={(e) => setFormData({ ...formData, nutrition_facts_en: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                    rows={4}
                  />
                </div>
              </div>

              {/* Allergens */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">{language === 'en' ? 'Allergens (AR)' : 'مسببات الحساسية (عربي)'}</label>
                  <textarea
                    value={formData.allergens_ar}
                    onChange={(e) => setFormData({ ...formData, allergens_ar: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">{language === 'en' ? 'Allergens (EN)' : 'Allergens (EN)'}</label>
                  <textarea
                    value={formData.allergens_en}
                    onChange={(e) => setFormData({ ...formData, allergens_en: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                    rows={2}
                  />
                </div>
              </div>

              {/* Storage Instructions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">{language === 'en' ? 'Storage Instructions (AR)' : 'تعليمات التخزين (عربي)'}</label>
                  <textarea
                    value={formData.storage_instructions_ar}
                    onChange={(e) => setFormData({ ...formData, storage_instructions_ar: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">{language === 'en' ? 'Storage Instructions (EN)' : 'Storage Instructions (EN)'}</label>
                  <textarea
                    value={formData.storage_instructions_en}
                    onChange={(e) => setFormData({ ...formData, storage_instructions_en: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all"
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Featured & Discount Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border-2" style={{ borderColor: '#064e3b' }}>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_featured"
                    checked={formData.is_featured}
                    onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <label htmlFor="is_featured" className="text-sm font-semibold text-gray-700 cursor-pointer">
                    {t('featuredProduct')}
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_price_locked"
                    checked={formData.is_price_locked}
                    onChange={(e) => setFormData({ ...formData, is_price_locked: e.target.checked })}
                    className="w-5 h-5 accent-red-600"
                  />
                  <label htmlFor="is_price_locked" className="text-sm font-semibold text-gray-700 cursor-pointer">
                    {language === 'en' ? '🔒 Lock Price (Exclude from Auto-Markup)' : '🔒 تجميد السعر (استثناء من الزيادة التلقائية)'}
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">{t('discountPrice')}</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formData.discount_price === '' ? '' : formatAdminNumber(parseFloat(formData.discount_price) || 0, 2)}
                  onChange={(e) => {
                    const cleaned = cleanDecimalInput(e.target.value)
                    if (cleaned === '' || cleaned === '.') {
                      setFormData({ ...formData, discount_price: '' })
                    } else {
                      const parsed = parseNumber(cleaned)
                      if (!isNaN(parsed) && parsed >= 0) {
                        setFormData({ ...formData, discount_price: String(parsed) })
                      }
                    }
                  }}
                  onBlur={(e) => {
                    const parsed = parseNumber(e.target.value)
                    if (isNaN(parsed) || parsed < 0) {
                      setFormData({ ...formData, discount_price: '' })
                    } else {
                      setFormData({ ...formData, discount_price: String(parsed) })
                    }
                  }}
                  placeholder="0.00"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#064e3b] focus:border-[#064e3b] transition-all font-mono text-left"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">{t('discountPercentage')}</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.discount_percentage}
                  onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#064e3b] focus:border-[#064e3b] transition-all"
                  placeholder="0"
                />
              </div>
            </div>
            </div>

            {message && (
              <div
                className={`p-4 rounded-lg ${
                  message.type === 'success'
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-red-100 text-red-700 border border-red-300'
                }`}
              >
                {message.text}
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 rounded-lg font-semibold text-white transition-all"
                style={{ backgroundColor: '#2e7d32' }}
              >
                {submitting ? t('loading') : editingProduct ? t('update') : t('add')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditingProduct(null)
                }}
                className="px-6 py-3 rounded-lg font-semibold bg-gray-300 hover:bg-gray-400 text-gray-800"
              >
                {t('cancel')}
              </button>
            </div>
          </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !importing && setShowImportModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-8 border border-gray-200 max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold" style={{ color: '#1a237e' }}>
                {t('bulkImportTitle')}
              </h2>
              {!importing && (
                <button
                  onClick={() => {
                    setShowImportModal(false)
                    setImportResults(null)
                    if (fileInputRef.current) {
                      fileInputRef.current.value = ''
                    }
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="space-y-6">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">{t('importFormatInfo')}</h3>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>{t('importRequiredCols')}</li>
                  <li>{t('importLangCols')}</li>
                  <li>{t('importOptionalCols')}</li>
                  <li>{t('importBarcodeNote')}</li>
                  <li>{t('importCategoryNote')}</li>
                </ul>
              </div>

              {/* File Input */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  {t('chooseFile')}
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  disabled={importing}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32] transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              {/* Progress Bar */}
              {importing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{t('importing')}</span>
                    <span>{importProgress.current} / {importProgress.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-[#2e7d32] h-3 rounded-full transition-all duration-300"
                      style={{
                        width: `${importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Results */}
              {importResults && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-2">{t('importResultsTitle')}</h3>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>✅ {t('importSuccessCount')} <strong>{importResults.success}</strong></li>
                    <li>⚠️ {t('importSkippedCount')} <strong>{importResults.skipped}</strong></li>
                    {importResults.errors > 0 && (
                      <li>❌ {t('importErrorsCount')} <strong>{importResults.errors}</strong></li>
                    )}
                  </ul>
                </div>
              )}

              {message && (
                <div
                  className={`p-4 rounded-lg ${
                    message.type === 'success'
                      ? 'bg-green-100 text-green-700 border border-green-300'
                      : 'bg-red-100 text-red-700 border border-red-300'
                  }`}
                >
                  {message.text}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Products Table/Grid */}
      <div className={viewMode === 'list' ? "bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200" : ""}>
        {viewMode === 'list' ? (
        <table className="w-full">
          <thead className="bg-gradient-to-r from-[#1a237e] to-[#283593] text-white">
            <tr>
              <th className="px-6 py-4 text-right font-semibold w-16">
                <input 
                  type="checkbox" 
                  checked={filteredProducts.length > 0 && selectedIds.length === filteredProducts.length}
                  onChange={toggleSelectAll}
                  className="w-5 h-5 rounded border-gray-300 text-[#2e7d32] focus:ring-[#2e7d32]"
                />
              </th>
              <th className="px-6 py-4 text-right font-semibold">{t('image')}</th>
              <th className="px-6 py-4 text-right font-semibold">{t('name')}</th>
              <th className="px-6 py-4 text-right font-semibold">{t('price')}</th>
              <th className="px-6 py-4 text-right font-semibold">{t('stock')}</th>
              <th className="px-6 py-4 text-right font-semibold">{t('actions') || (language === 'en' ? 'Actions' : 'الإجراءات')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  {products.length === 0 ? (t('noProductsAvailable') || 'لا توجد منتجات') : (t('noResults') || 'لا توجد نتائج تطابق بحثك')}
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => {
                const p = product as any
                const lowStock = isLowStock(product)
                return (
                  <tr
                    key={product.id}
                    className={`border-t hover:bg-gray-50 transition-colors ${
                      lowStock ? 'bg-red-50' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(product.id)}
                        onChange={() => toggleSelect(product.id)}
                        className="w-5 h-5 rounded border-gray-300 text-[#2e7d32] focus:ring-[#2e7d32]"
                      />
                    </td>
                    <td className="px-6 py-4">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name_ar || product.name || t('product') || 'منتج'}
                          className="w-20 h-20 object-contain p-1 rounded-lg shadow-md bg-white border border-gray-100"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.onerror = null
                            e.currentTarget.src = 'https://placehold.co/400x400/f3f4f6/9ca3af?text=No+Image'
                          }}
                        />
                      ) : (
                        <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center text-3xl">
                          📦
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {/* عرض الاسم بناءً على اللغة المختارة */}
                      <div className="font-semibold text-gray-800">
                        {language === 'ar' 
                          ? (p.name_ar || product.name || (t('noName') || 'بدون اسم')) 
                          : (p.name_en || product.name || (t('noName') || 'No Name'))
                        }
                      </div>
                      
                      {/* عرض الاسم الآخر بلون مختلف كمعلومة إضافية (فقط إذا كان مختلفاً) */}
                      {language === 'ar' && p.name_en && p.name_en !== (p.name_ar || product.name) && (
                        <div className="text-xs text-gray-400 mt-1" dir="ltr">{p.name_en}</div>
                      )}
                      {language === 'en' && p.name_ar && p.name_ar !== (p.name_en || product.name) && (
                        <div className="text-xs text-gray-400 mt-1" dir="rtl">{p.name_ar}</div>
                      )}
                      
                      {/* عرض الوصف بناءً على اللغة المختارة */}
                      <div className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {language === 'ar' 
                          ? (p.description_ar || product.description) 
                          : (p.description_en || product.description)
                        }
                      </div>

                      {lowStock && (
                        <div className="text-xs text-red-600 font-semibold mt-1">
                          ⚠️ {t('lowStock')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg" style={{ color: '#2e7d32' }}>
                          {Number(p.price_per_unit || product.price).toFixed(2)} {t('currency')}
                        </span>
                        {(p.is_price_locked) && (
                          <span title={language === 'en' ? 'Price Locked' : 'السعر مجمد'} className="text-gray-400 cursor-help">
                            🔒
                          </span>
                        )}
                        {(p.cost_price > 0) && (
                          <div className="text-xs text-gray-400">
                             ({language === 'en' ? 'Cost:' : 'ت:'} {Number(p.cost_price).toFixed(2)})
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const quantity = p.stock_quantity ?? p.quantity ?? p.countInStock;
                        return (quantity !== null && quantity !== undefined) ? (
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            lowStock
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {quantity}
                        </span>
                      ) : (
                        <span className="text-gray-400">{t('undefined') || 'غير محدد'}</span>
                      )
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(product)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title={t('edit')}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title={t('delete')}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
              const p = product as any
              const lowStock = isLowStock(product)
              const isSelected = selectedIds.includes(product.id)
              
              return (
                <div 
                  key={product.id}
                  className={`bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border overflow-hidden group ${
                    isSelected ? 'ring-2 ring-[#2e7d32] border-[#2e7d32]' : 'border-gray-100'
                  }`}
                >
                  <div className="relative aspect-square bg-gray-50 p-4">
                    <div className="absolute top-3 left-3 z-10">
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => toggleSelect(product.id)}
                        className="w-5 h-5 rounded border-gray-300 text-[#2e7d32] focus:ring-[#2e7d32] shadow-sm"
                      />
                    </div>
                    {lowStock && (
                      <div className="absolute top-3 right-3 z-10 bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded-full shadow-sm">
                        {t('lowStock')}
                      </div>
                    )}
                    {p.is_price_locked && (
                      <div className="absolute top-12 right-3 z-10 bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-full shadow-sm" title="Price Locked">
                        🔒
                      </div>
                    )}
                    
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name_ar || product.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.onerror = null
                          e.currentTarget.src = 'https://placehold.co/400x400/f3f4f6/9ca3af?text=No+Image'
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">
                        📦
                      </div>
                    )}
                    
                    {/* Overlay Actions */}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={() => startEdit(product)}
                        className="bg-white text-blue-600 p-3 rounded-full hover:bg-blue-50 hover:scale-110 transition-all shadow-lg"
                        title={t('edit')}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="bg-white text-red-600 p-3 rounded-full hover:bg-red-50 hover:scale-110 transition-all shadow-lg"
                        title={t('delete')}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <h3 className="font-bold text-gray-800 text-lg mb-1 truncate" title={p.name_ar || product.name}>
                      {language === 'ar' ? (p.name_ar || product.name) : (p.name_en || product.name)}
                    </h3>
                    <p className="text-sm text-gray-500 mb-3 line-clamp-1">
                      {language === 'ar' ? p.description_ar : p.description_en}
                    </p>
                    
                    <div className="flex justify-between items-center">
                      <div className="font-bold text-xl" style={{ color: '#2e7d32' }}>
                        {Number(p.price_per_unit || product.price).toFixed(2)} <span className="text-sm">{t('currency')}</span>
                      </div>
                      
                      {(() => {
                        const quantity = p.stock_quantity ?? p.quantity ?? p.countInStock;
                        return (quantity !== null && quantity !== undefined) ? (
                          <div className={`text-sm font-medium px-2 py-1 rounded ${
                            lowStock ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                          }`}>
                            {t('stock')}: {quantity}
                          </div>
                        ) : null
                      })()}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
