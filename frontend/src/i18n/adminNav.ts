import { useMemo } from 'react'
import { useLanguage } from '../context/LanguageContext'
import adminNavAr from './adminNav.ar'
import adminNavEn from './adminNav.en'

export type AdminNavStrings = typeof adminNavEn

export function getAdminNavStrings(lang: string | undefined | null): AdminNavStrings {
  return lang === 'ar' ? adminNavAr : adminNavEn
}

export function useAdminNavStrings(): AdminNavStrings {
  const { language } = useLanguage()
  return useMemo(() => getAdminNavStrings(language), [language])
}

