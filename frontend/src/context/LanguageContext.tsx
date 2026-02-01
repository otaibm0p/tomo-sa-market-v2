import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { translations, TranslationKey } from '../i18n/translations'

type Language = 'ar' | 'en'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: TranslationKey | string) => string
  // Backward compatibility - support for old format
  translate: (key: string, ar: string, en?: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    // جلب اللغة من localStorage أو استخدام العربية كافتراضي
    const saved = localStorage.getItem('tomo_language') as Language
    return saved === 'en' ? 'en' : 'ar'
  })

  // Set document direction and language on mount and when language changes
  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = language
  }, [language])

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang)
    localStorage.setItem('tomo_language', lang)
    // تغيير اتجاه الصفحة
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  }

  // New translation function using translations file
  const t = (key: TranslationKey | string): string => {
    const translationsDict = translations[language]
    if (key in translationsDict) {
      return translationsDict[key as TranslationKey]
    }
    // Fallback: return the key if not found
    console.warn(`Translation key "${key}" not found for language "${language}"`)
    return key
  }

  // Backward compatibility - support for old format (key, ar, en)
  const translate = (key: string, ar: string, en?: string): string => {
    // First try to use the translations file
    if (key in translations[language]) {
      return translations[language][key as TranslationKey]
    }
    // Fallback to provided translations
    if (language === 'en' && en) return en
    return ar
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t, translate }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return context
}

// Helper function to get product name based on language
export function getProductName(product: any, language: Language): string {
  if (language === 'en' && product.name_en) {
    return product.name_en
  }
  return product.name_ar || product.name || ''
}

// Helper function to get product description based on language
export function getProductDescription(product: any, language: Language): string {
  if (language === 'en' && product.description_en) {
    return product.description_en
  }
  return product.description_ar || product.description || ''
}

// Helper function to get category name based on language
export function getCategoryName(category: any, language: Language): string {
  if (language === 'en' && category.name_en) {
    return category.name_en
  }
  return category.name_ar || category.name || ''
}


