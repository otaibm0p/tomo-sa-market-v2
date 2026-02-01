import { Link } from 'react-router-dom'
import { useLanguage } from '../../context/LanguageContext'
import { ShieldX } from 'lucide-react'

export default function NoAccessPage({ reason }: { reason?: 'module_disabled' | 'permission_denied' }) {
  const { language, t } = useLanguage()
  const isModuleDisabled = reason === 'module_disabled'
  const title = t('admin.noAccess.title') || (language === 'ar' ? 'لا يوجد وصول' : 'No access')
  const subtitle = isModuleDisabled
    ? (t('admin.noAccess.moduleDisabled') || (language === 'ar' ? 'هذه الوحدة معطلة من قبل الأدمن.' : 'This module is disabled by admin.'))
    : (t('admin.noAccess.subtitle') || (language === 'ar' ? 'ليس لديك صلاحية لعرض هذه الصفحة.' : "You don't have permission to view this page."))
  const backLabel = t('admin.noAccess.backToDashboard') || (language === 'ar' ? 'العودة للوحة التحكم' : 'Back to dashboard')

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 bg-gray-50" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 text-amber-700 mb-4">
          <ShieldX className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-600 mb-6">{subtitle}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/admin"
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700"
          >
            {backLabel}
          </Link>
          {isModuleDisabled && (
            <Link
              to="/admin/control"
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl border-2 border-amber-500 text-amber-700 font-bold hover:bg-amber-50"
            >
              {language === 'ar' ? 'مركز التحكم (تفعيل الوحدة)' : 'Control Center (enable module)'}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
