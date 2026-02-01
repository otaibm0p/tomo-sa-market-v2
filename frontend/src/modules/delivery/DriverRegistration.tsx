import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../../context/LanguageContext'
import { authAPI } from '../../utils/api'
import api from '../../utils/api'

export default function DriverRegistration() {
  const { language, t } = useLanguage()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    vehicleType: '',
    idNumber: '',
  })

  // Check if user is logged in
  if (!authAPI.isAuthenticated()) {
    navigate('/login?redirect=/driver/register')
    return null
  }

  const vehicleTypes = [
    { value: 'car', labelAr: 'سيارة', labelEn: 'Car' },
    { value: 'motorcycle', labelAr: 'دراجة نارية', labelEn: 'Motorcycle' },
    { value: 'bicycle', labelAr: 'دراجة هوائية', labelEn: 'Bicycle' },
    { value: 'van', labelAr: 'شاحنة صغيرة', labelEn: 'Van' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Register as driver
      const response = await api.post('/api/drivers/register', {
        phone: formData.phone,
        vehicle_type: formData.vehicleType,
        license_number: formData.idNumber, // Using ID number as license number
        id_number: formData.idNumber,
      })

      if (response.data) {
        // Success - redirect to driver dashboard
        navigate('/driver/dashboard')
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          (language === 'en'
            ? 'Registration failed. Please try again.'
            : 'فشل التسجيل. يرجى المحاولة مرة أخرى.')
      )
    } finally {
      setLoading(false)
    }
  }

  const isRTL = language === 'ar'

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50" style={{ fontFamily: 'Cairo, sans-serif' }}>
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-emerald-600 to-green-700 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {language === 'en' ? 'Join Our Delivery Team' : 'انضم إلى فريق التوصيل'}
          </h1>
          <p className="text-xl md:text-2xl text-emerald-100">
            {language === 'en'
              ? 'Become a delivery captain and start earning today!'
              : 'كن كابتن توصيل وابدأ في كسب المال اليوم!'}
          </p>
        </div>
      </div>

      {/* Registration Form */}
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 rounded-full mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {language === 'en' ? 'Rider Registration' : 'تسجيل Rider'}
            </h2>
            <p className="text-gray-600">
              {language === 'en'
                ? 'Fill in your details to get started'
                : 'املأ بياناتك للبدء'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                {language === 'en' ? 'Full Name' : 'الاسم الكامل'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                required
                placeholder={language === 'en' ? 'Enter your full name' : 'أدخل اسمك الكامل'}
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                {language === 'en' ? 'Phone Number' : 'رقم الهاتف'} <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                required
                placeholder={language === 'en' ? '05xxxxxxxx' : '05xxxxxxxx'}
                pattern="[0-9]{10}"
              />
            </div>

            {/* Vehicle Type */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                {language === 'en' ? 'Vehicle Type' : 'نوع المركبة'} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.vehicleType}
                onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                required
              >
                <option value="">
                  {language === 'en' ? 'Select vehicle type' : 'اختر نوع المركبة'}
                </option>
                {vehicleTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {language === 'en' ? type.labelEn : type.labelAr}
                  </option>
                ))}
              </select>
            </div>

            {/* ID Number */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                {language === 'en' ? 'ID Number' : 'رقم الهوية'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.idNumber}
                onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                required
                placeholder={language === 'en' ? 'Enter your ID number' : 'أدخل رقم الهوية'}
                minLength={10}
                maxLength={10}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-green-600 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? language === 'en'
                  ? 'Registering...'
                  : 'جاري التسجيل...'
                : language === 'en'
                ? 'Register as Rider'
                : 'تسجيل كـ Rider'}
            </button>

            {/* Back to Home */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="text-emerald-600 hover:text-emerald-700 font-medium"
              >
                {language === 'en' ? '← Back to Home' : '← العودة للصفحة الرئيسية'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

