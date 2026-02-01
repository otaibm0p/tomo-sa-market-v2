import { useLanguage } from '../../context/LanguageContext'
import { Clock } from 'lucide-react'
import { adminTokens } from '../../shared/admin/ui/tokens'

export default function OpsSLAPlaceholder() {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  return (
    <div className={`p-6 max-w-2xl mx-auto ${adminTokens.color.page}`} dir={isAr ? 'rtl' : 'ltr'}>
      <div className={`${adminTokens.radius.card} ${adminTokens.surfaces.card} ${adminTokens.borders.strong} border p-8 md:p-12 text-center ${adminTokens.shadow.cardPremium}`}>
        <div className="inline-flex p-4 rounded-2xl bg-gray-100 text-gray-400 mb-4">
          <Clock className="w-12 h-12" />
        </div>
        <h2 className={`${adminTokens.text.h1} ${adminTokens.color.text} mb-2`}>
          {isAr ? 'SLA والمواعيد' : 'SLA & Timers'}
        </h2>
        <p className={adminTokens.color.muted}>
          {isAr ? 'قريباً — مؤقتات الطلبات واتفاقيات مستوى الخدمة ستُضاف عند جاهزية الميزة.' : 'Coming soon — order timers and SLA metrics will be added when the feature is ready.'}
        </p>
      </div>
    </div>
  )
}
