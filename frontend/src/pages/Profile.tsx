import { useLanguage } from '../context/LanguageContext'
import { authAPI } from '../utils/api'

export default function Profile() {
  const { language } = useLanguage()
  const user = authAPI.getCurrentUser()

  return (
    <div className="max-w-4xl mx-auto py-8 font-['Tajawal']" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <h1 className="text-3xl font-bold mb-6 text-gray-900">
        {language === 'ar' ? 'حسابي' : 'My Profile'}
      </h1>
      
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        {user ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-500">{language === 'ar' ? 'الاسم' : 'Name'}</label>
              <p className="text-lg font-bold text-gray-900">{user.full_name || user.name}</p>
            </div>
            {user.phone && (
              <div>
                <label className="text-sm text-gray-500">{language === 'ar' ? 'الهاتف' : 'Phone'}</label>
                <p className="text-lg font-bold text-gray-900">{user.phone}</p>
              </div>
            )}
            <div>
              <label className="text-sm text-gray-500">{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</label>
              <p className="text-lg font-bold text-gray-900">{user.email}</p>
            </div>
            {user.status && (
              <div>
                <label className="text-sm text-gray-500">{language === 'ar' ? 'الحالة' : 'Status'}</label>
                <p className={`text-lg font-bold ${user.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                  {user.status === 'active' ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'معطل' : 'Disabled')}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500">{language === 'ar' ? 'يرجى تسجيل الدخول' : 'Please log in'}</p>
        )}
      </div>
    </div>
  )
}

