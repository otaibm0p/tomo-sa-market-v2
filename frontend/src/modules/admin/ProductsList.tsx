import { useState, useEffect } from 'react'
import { Product, productAPI } from '../../utils/api'
import api from '../../utils/api'

export default function ProductsList() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    category_id: '',
    unit: 'piece',
    price_per_unit: '',
    unit_step: '1',
    image_url: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const data = await productAPI.getAll()
      setProducts(data)
    } catch (err) {
      console.error('Error loading products:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      if (editingProduct) {
        await api.put(`/api/products/${editingProduct.id}`, {
          name: formData.name,
          price: parseFloat(formData.price) || parseFloat(formData.price_per_unit),
          description: formData.description,
          category_id: formData.category_id ? parseInt(formData.category_id) : null,
          unit: formData.unit,
          price_per_unit: parseFloat(formData.price_per_unit) || parseFloat(formData.price),
          unit_step: parseFloat(formData.unit_step) || 1,
          image_url: formData.image_url || null,
        })
        setEditingProduct(null)
      }
      setFormData({
        name: '',
        price: '',
        description: '',
        category_id: '',
        unit: 'piece',
        price_per_unit: '',
        unit_step: '1',
        image_url: '',
      })
      loadProducts()
    } catch (err: any) {
      alert(err.response?.data?.message || 'حدث خطأ')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return

    try {
      await api.delete(`/api/products/${id}`)
      loadProducts()
    } catch (err: any) {
      alert(err.response?.data?.message || 'حدث خطأ في حذف المنتج')
    }
  }

  const startEdit = (product: Product) => {
    setEditingProduct(product)
    const p = product as any
    setFormData({
      name: product.name,
      price: String(product.price),
      description: product.description || '',
      category_id: p.category_id ? String(p.category_id) : '',
      unit: p.unit || 'piece',
      price_per_unit: p.price_per_unit ? String(p.price_per_unit) : String(product.price),
      unit_step: p.unit_step ? String(p.unit_step) : '1',
      image_url: p.image_url || '',
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-lg" style={{ fontFamily: 'Cairo, sans-serif' }}>جاري التحميل...</div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'Cairo, sans-serif' }}>
      <h1 className="text-3xl font-bold mb-8" style={{ color: '#1a237e' }}>
        قائمة المنتجات
      </h1>

      {/* Edit Form */}
      {editingProduct && (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-200">
          <h2 className="text-xl font-semibold mb-4" style={{ color: '#1a237e' }}>
            تعديل منتج
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">اسم المنتج</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">السعر (ريال)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price_per_unit}
                  onChange={(e) =>
                    setFormData({ ...formData, price_per_unit: e.target.value, price: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e7d32] focus:border-[#2e7d32]"
                  required
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 rounded-lg font-semibold text-white transition-all"
                style={{ backgroundColor: '#2e7d32' }}
              >
                {submitting ? 'جاري الحفظ...' : 'تحديث'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null)
                  setFormData({
                    name: '',
                    price: '',
                    description: '',
                    category_id: '',
                    unit: 'piece',
                    price_per_unit: '',
                    unit_step: '1',
                    image_url: '',
                  })
                }}
                className="px-6 py-2 rounded-lg font-semibold bg-gray-300 hover:bg-gray-400 text-gray-800"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-[#1a237e] to-[#283593] text-white">
            <tr>
              <th className="px-6 py-4 text-right font-semibold">الصورة</th>
              <th className="px-6 py-4 text-right font-semibold">الاسم</th>
              <th className="px-6 py-4 text-right font-semibold">السعر</th>
              <th className="px-6 py-4 text-right font-semibold">الوحدة</th>
              <th className="px-6 py-4 text-right font-semibold">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  لا توجد منتجات
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const p = product as any
                return (
                  <tr key={product.id} className="border-t hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={product.name}
                          className="w-20 h-20 object-cover rounded-lg shadow-md"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center text-3xl">
                          📦
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-800">{product.name}</div>
                      {product.description && (
                        <div className="text-sm text-gray-600 mt-1">{product.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-lg" style={{ color: '#2e7d32' }}>
                        {Number(p.price_per_unit || product.price).toFixed(2)} ريال
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        {p.unit || 'piece'}
                      </span>
                      {p.unit_step && p.unit_step !== 1 && (
                        <div className="text-xs text-gray-500 mt-1">خطوة: {p.unit_step}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(product)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg"
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

