import { useLanguage } from '../../context/LanguageContext'
import { useTheme } from '../../context/ThemeContext'
import { authAPI } from '../../utils/api'
import { Moon, Sun } from 'lucide-react'

export default function AdminTopbar() {
  const { language, setLanguage } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const user = authAPI.getCurrentUser()


  return (
    <header 
      className={`
        sticky top-0 z-30 h-[60px]
        ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
        border-b shadow-sm
      `}
    >
      <div className="h-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-full">
          {/* Left: Page Title */}
          <div className="flex items-center">
            <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {language === 'ar' ? 'لوحة التحكم' : 'Admin Dashboard'}
            </h2>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Language Switch - AR / EN placeholder */}
            <button
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className={`
                flex items-center justify-center w-10 h-10 rounded-lg
                transition-all duration-200
                ${theme === 'dark' 
                  ? 'text-gray-300 hover:bg-gray-700' 
                  : 'text-gray-600 hover:bg-gray-100'
                }
              `}
              title={language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
            >
              <span className="text-sm font-semibold">{language === 'ar' ? 'EN' : 'عربي'}</span>
            </button>

            {/* Theme Toggle - Dark / Light */}
            <button
              onClick={toggleTheme}
              className={`
                flex items-center justify-center w-10 h-10 rounded-lg
                transition-all duration-200
                ${theme === 'dark' 
                  ? 'text-yellow-400 hover:bg-gray-700' 
                  : 'text-gray-600 hover:bg-gray-100'
                }
              `}
              title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* User Menu */}
            <div className="flex items-center gap-3 pl-3 border-l border-gray-300 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  theme === 'dark' ? 'bg-emerald-600' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  <span className="text-xs font-bold">
                    {user?.name?.charAt(0).toUpperCase() || 'A'}
                  </span>
                </div>
                <div className="hidden sm:block">
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {user?.name || 'Admin'}
                  </p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {user?.role || 'admin'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
