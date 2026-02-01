import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { authAPI } from '../utils/api'
import api from '../utils/api'

export default function DriverSignup() {
  const { language } = useLanguage()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    city: '',
    vehicleType: '',
    plateNumber: '',
    idNumber: '',
    identityCard: null as File | null,
    drivingLicense: null as File | null,
  })

  const vehicleTypes = [
    { value: 'car', labelAr: 'سيارة', labelEn: 'Car' },
    { value: 'motorcycle', labelAr: 'دراجة نارية', labelEn: 'Motorcycle' },
    { value: 'bicycle', labelAr: 'دراجة هوائية', labelEn: 'Bicycle' },
    { value: 'van', labelAr: 'شاحنة صغيرة', labelEn: 'Van' },
  ]

  const saudiCities = [
    { value: 'riyadh', labelAr: 'الرياض', labelEn: 'Riyadh' },
    { value: 'jeddah', labelAr: 'جدة', labelEn: 'Jeddah' },
    { value: 'dammam', labelAr: 'الدمام', labelEn: 'Dammam' },
    { value: 'khobar', labelAr: 'الخبر', labelEn: 'Khobar' },
    { value: 'makkah', labelAr: 'مكة المكرمة', labelEn: 'Makkah' },
    { value: 'madinah', labelAr: 'المدينة المنورة', labelEn: 'Madinah' },
    { value: 'taif', labelAr: 'الطائف', labelEn: 'Taif' },
    { value: 'abha', labelAr: 'أبها', labelEn: 'Abha' },
  ]

  const handleFileChange = (field: 'identityCard' | 'drivingLicense', e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, [field]: e.target.files[0] })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Create user account first (if not logged in)
      let userId: number | null = null
      
      if (!authAPI.isAuthenticated()) {
        // Create a temporary email for the rider
        const tempEmail = `driver_${Date.now()}@tomo.com`
        const tempPassword = Math.random().toString(36).slice(-8)
        
        // Register user
        const registerRes = await api.post('/api/auth/register', {
          name: formData.name,
          email: tempEmail,
          password: tempPassword,
        })
        
        // Login to get token
        const loginRes = await authAPI.login(tempEmail, tempPassword)
        if (loginRes) {
          const user = authAPI.getCurrentUser()
          userId = user?.id || null
        }
      } else {
        const user = authAPI.getCurrentUser()
        userId = user?.id || null
      }

      if (!userId) {
        throw new Error(language === 'en' ? 'Failed to create user account' : 'فشل إنشاء حساب المستخدم')
      }

      // Register as rider
      const formDataToSend = new FormData()
      formDataToSend.append('phone', formData.phone)
      formDataToSend.append('vehicle_type', formData.vehicleType)
      formDataToSend.append('plate_number', formData.plateNumber)
      formDataToSend.append('id_number', formData.idNumber)
      formDataToSend.append('city', formData.city)
      
      if (formData.identityCard) {
        formDataToSend.append('identity_card', formData.identityCard)
      }
      if (formData.drivingLicense) {
        formDataToSend.append('driving_license', formData.drivingLicense)
      }

      const response = await api.post('/api/drivers/register', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      if (response.data) {
        // Success - show message and redirect
        alert(language === 'en' 
          ? 'Registration successful! Your application is under review. You will be notified once approved.' 
          : 'تم التسجيل بنجاح! طلبك قيد المراجعة. سيتم إشعارك عند الموافقة.')
        navigate('/')
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8fafc', fontFamily: 'Cairo, sans-serif' }}>
      {/* Hero Section - Royal Theme */}
      <div className="text-white py-16 px-4" style={{ background: 'linear-gradient(to right, #064e3b, #065f46)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: '#d4af37' }}>
            {language === 'en' ? 'Join Our Delivery Team' : 'انضم إلى فريق التوصيل'}
          </h1>
          <p className="text-xl md:text-2xl" style={{ color: '#f0f0f0' }}>
            {language === 'en'
              ? 'Become a delivery captain and start earning today!'
              : 'كن كابتن توصيل وابدأ في كسب المال اليوم!'}
          </p>
        </div>
      </div>

      {/* Registration Form */}
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 border-2" style={{ borderColor: '#064e3b' }}>
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4" style={{ backgroundColor: '#064e3b' }}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12"
                style={{ color: '#d4af37' }}
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
            <h2 className="text-3xl font-bold mb-2" style={{ color: '#064e3b' }}>
              {language === 'en' ? 'Rider Registration' : 'تسجيل Rider'}
            </h2>
            <p className="text-gray-600">
              {language === 'en'
                ? 'Fill in your details to get started'
                : 'املأ بياناتك للبدء'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information Section */}
            <div className="border-2 rounded-2xl p-6" style={{ borderColor: '#e5e7eb' }}>
              <h3 className="text-xl font-bold mb-4" style={{ color: '#064e3b' }}>
                {language === 'en' ? 'Personal Information' : 'المعلومات الشخصية'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#064e3b' }}>
                    {language === 'en' ? 'Full Name' : 'الاسم الكامل'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border-2 rounded-xl focus:ring-2 transition-all"
                    style={{ 
                      borderColor: '#e5e7eb',
                      focusRingColor: '#064e3b'
                    }}
                    required
                    placeholder={language === 'en' ? 'Enter your full name' : 'أدخل اسمك الكامل'}
                  />
                </div>

                {/* Phone with Saudi Flag */}
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#064e3b' }}>
                    {language === 'en' ? 'Phone Number' : 'رقم الهاتف'} <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-3 border-2 rounded-xl" style={{ borderColor: '#e5e7eb' }}>
                      <span className="text-xl">🇸🇦</span>
                      <span className="font-semibold" style={{ color: '#064e3b' }}>+966</span>
                    </div>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                      className="flex-1 px-4 py-3 border-2 rounded-xl focus:ring-2 transition-all"
                      style={{ 
                        borderColor: '#e5e7eb',
                        focusRingColor: '#064e3b'
                      }}
                      required
                      placeholder="5xxxxxxxx"
                      pattern="[0-9]{9}"
                      maxLength={9}
                    />
                  </div>
                </div>

                {/* City */}
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#064e3b' }}>
                    {language === 'en' ? 'City' : 'المدينة'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-3 border-2 rounded-xl focus:ring-2 transition-all"
                    style={{ 
                      borderColor: '#e5e7eb',
                      focusRingColor: '#064e3b'
                    }}
                    required
                  >
                    <option value="">
                      {language === 'en' ? 'Select city' : 'اختر المدينة'}
                    </option>
                    {saudiCities.map((city) => (
                      <option key={city.value} value={city.value}>
                        {language === 'en' ? city.labelEn : city.labelAr}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ID Number */}
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#064e3b' }}>
                    {language === 'en' ? 'ID Number' : 'رقم الهوية'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.idNumber}
                    onChange={(e) => setFormData({ ...formData, idNumber: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-4 py-3 border-2 rounded-xl focus:ring-2 transition-all"
                    style={{ 
                      borderColor: '#e5e7eb',
                      focusRingColor: '#064e3b'
                    }}
                    required
                    placeholder={language === 'en' ? 'Enter your ID number' : 'أدخل رقم الهوية'}
                    minLength={10}
                    maxLength={10}
                  />
                </div>
              </div>
            </div>

            {/* Vehicle Information Section */}
            <div className="border-2 rounded-2xl p-6" style={{ borderColor: '#e5e7eb' }}>
              <h3 className="text-xl font-bold mb-4" style={{ color: '#064e3b' }}>
                {language === 'en' ? 'Vehicle Information' : 'معلومات المركبة'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Vehicle Type */}
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#064e3b' }}>
                    {language === 'en' ? 'Vehicle Type' : 'نوع المركبة'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                    className="w-full px-4 py-3 border-2 rounded-xl focus:ring-2 transition-all"
                    style={{ 
                      borderColor: '#e5e7eb',
                      focusRingColor: '#064e3b'
                    }}
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

                {/* Plate Number */}
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#064e3b' }}>
                    {language === 'en' ? 'Plate Number' : 'رقم اللوحة'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.plateNumber}
                    onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 border-2 rounded-xl focus:ring-2 transition-all"
                    style={{ 
                      borderColor: '#e5e7eb',
                      focusRingColor: '#064e3b'
                    }}
                    required
                    placeholder={language === 'en' ? 'ABC 1234' : 'أ ب ج 1234'}
                  />
                </div>
              </div>
            </div>

            {/* Document Upload Section */}
            <div className="border-2 rounded-2xl p-6" style={{ borderColor: '#e5e7eb' }}>
              <h3 className="text-xl font-bold mb-4" style={{ color: '#064e3b' }}>
                {language === 'en' ? 'Document Upload' : 'رفع المستندات'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Identity Card */}
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#064e3b' }}>
                    {language === 'en' ? 'Identity Card' : 'بطاقة الهوية'} <span className="text-red-500">*</span>
                  </label>
                  <div className="border-2 border-dashed rounded-xl p-6 text-center" style={{ borderColor: '#e5e7eb' }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange('identityCard', e)}
                      className="hidden"
                      id="identityCard"
                      required
                    />
                    <label
                      htmlFor="identityCard"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#064e3b' }}>
                        <svg className="w-8 h-8" style={{ color: '#d4af37' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium" style={{ color: '#064e3b' }}>
                        {formData.identityCard 
                          ? formData.identityCard.name 
                          : (language === 'en' ? 'Click to upload' : 'اضغط للرفع')}
                      </span>
                      <span className="text-xs text-gray-500">
                        {language === 'en' ? 'JPG, PNG (Max 5MB)' : 'JPG, PNG (حد أقصى 5MB)'}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Driving License */}
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#064e3b' }}>
                    {language === 'en' ? 'Driving License' : 'رخصة القيادة'} <span className="text-red-500">*</span>
                  </label>
                  <div className="border-2 border-dashed rounded-xl p-6 text-center" style={{ borderColor: '#e5e7eb' }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange('drivingLicense', e)}
                      className="hidden"
                      id="drivingLicense"
                      required
                    />
                    <label
                      htmlFor="drivingLicense"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#064e3b' }}>
                        <svg className="w-8 h-8" style={{ color: '#d4af37' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium" style={{ color: '#064e3b' }}>
                        {formData.drivingLicense 
                          ? formData.drivingLicense.name 
                          : (language === 'en' ? 'Click to upload' : 'اضغط للرفع')}
                      </span>
                      <span className="text-xs text-gray-500">
                        {language === 'en' ? 'JPG, PNG (Max 5MB)' : 'JPG, PNG (حد أقصى 5MB)'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-white"
              style={{ background: 'linear-gradient(to right, #064e3b, #065f46)' }}
            >
              {loading
                ? language === 'en'
                  ? 'Registering...'
                  : 'جاري التسجيل...'
                : language === 'en'
                ? 'Submit Application'
                : 'إرسال الطلب'}
            </button>

            {/* Back to Home */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="font-medium hover:underline"
                style={{ color: '#064e3b' }}
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

