import { useState } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import FooterBuilder from './FooterBuilder'
import StaticPagesManagement from './StaticPagesManagement'

type TabType = 'footer' | 'pages' | 'contact' | 'seo'

export default function SiteContentManagement() {
  const { language, t } = useLanguage()
  const [activeTab, setActiveTab] = useState<TabType>('footer')

  const tabs = [
    { id: 'footer' as TabType, label_ar: 'بناء الفوتر', label_en: 'Footer Builder', icon: '🏗️' },
    { id: 'pages' as TabType, label_ar: 'الصفحات الثابتة', label_en: 'Static Pages', icon: '📄' },
    { id: 'contact' as TabType, label_ar: 'معلومات التواصل', label_en: 'Contact & Social', icon: '📞' },
  ]

  return (
    <div className="p-6 space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          {language === 'en' ? 'Site Content Management' : 'إدارة محتوى الموقع'}
        </h1>
        <p className="text-gray-600 text-sm">
          {language === 'en' 
            ? 'Manage footer, static pages, contact information, and social media links'
            : 'إدارة الفوتر، الصفحات الثابتة، معلومات التواصل، وروابط وسائل التواصل الاجتماعي'}
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-4 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {language === 'en' ? tab.label_en : tab.label_ar}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'footer' && <FooterBuilder />}
        {activeTab === 'pages' && <StaticPagesManagement />}
        {activeTab === 'contact' && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">
              {language === 'en' ? 'Contact & Social Settings' : 'إعدادات التواصل والاجتماعي'}
            </h2>
            <p className="text-gray-600">
              {language === 'en' 
                ? 'Contact and social settings are managed in the Footer Builder tab.'
                : 'إعدادات التواصل والاجتماعي يتم إدارتها في تبويب بناء الفوتر.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

