import { Link } from 'react-router-dom'
import { useLanguage } from '../../context/LanguageContext'
import { ArrowLeft, Download } from 'lucide-react'
import { adminTokens } from '../../shared/admin/ui/tokens'

export default function CatalogImportPlaceholder() {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  return (
    <div className={`p-6 max-w-2xl mx-auto ${adminTokens.color.page}`} dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-4 mb-6">
        <Link to="/admin/categories" className={`p-2 ${adminTokens.radius.control} ${adminTokens.borders.strong} hover:bg-gray-50 flex items-center gap-2 text-gray-700`}>
          <ArrowLeft className="w-5 h-5" />
          {isAr ? 'رجوع' : 'Back'}
        </Link>
      </div>
      <div className={`${adminTokens.radius.card} ${adminTokens.surfaces.card} ${adminTokens.borders.strong} border p-8 md:p-12 text-center ${adminTokens.shadow.cardPremium}`}>
        <div className="inline-flex p-4 rounded-2xl bg-gray-100 text-gray-400 mb-4">
          <Download className="w-12 h-12" />
        </div>
        <h2 className={`${adminTokens.text.h1} ${adminTokens.color.text} mb-2`}>
          {isAr ? 'استيراد الكتالوج' : 'Catalog Import'}
        </h2>
        <p className={adminTokens.color.muted}>
          {isAr ? 'قريباً — سيتم تفعيل الاستيراد والتصدير عند جاهزية الميزة.' : 'Coming soon — import and export will be enabled when the feature is ready.'}
        </p>
      </div>
    </div>
  )
}
