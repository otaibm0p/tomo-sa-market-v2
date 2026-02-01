#!/bin/bash
# Create Header.tsx and Footer.tsx on server

cat > /var/www/tomo-app/frontend/src/components/Header.tsx << 'EOFHEADER'
import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useCart } from '../context/CartContext'
import { authAPI } from '../utils/api'
import { useLanguage } from '../context/LanguageContext'

interface HeaderProps {
  onCartClick?: () => void
}

export default function Header({ onCartClick }: HeaderProps) {
  const { cart } = useCart()
  const { language, setLanguage, t } = useLanguage()
  // Use local state as a fallback/primary listener for immediate updates
  const [localCount, setLocalCount] = useState(0)

  // Sync with Context
  useEffect(() => {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0)
    setLocalCount(count)
  }, [cart])

  // Listen for direct updates (Fallback for fast interactions)
  useEffect(() => {
    const handleCartUpdate = (e: any) => {
        if (e.detail && typeof e.detail.count === 'number') {
            setLocalCount(e.detail.count)
        }
    }
    window.addEventListener('cart-updated', handleCartUpdate)
    return () => window.removeEventListener('cart-updated', handleCartUpdate)
  }, [])

  const handleCartClick = (e: React.MouseEvent) => {
    if (onCartClick) {
      e.preventDefault()
      onCartClick()
    }
  }

  return (
    <header className="sticky top-0 z-[100] bg-white shadow-sm border-b border-gray-100 px-4 py-3 font-['Tajawal'] transition-all duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="hidden md:flex items-center gap-2 hover:opacity-80 transition-opacity">
           <span className="text-2xl font-extrabold text-emerald-700 tracking-tight">Tomo Market</span>
        </Link>

        {/* Mobile User Icon */}
        <Link to="/profile" className="md:hidden text-gray-600 hover:text-emerald-600 transition-colors p-1">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
        </Link>

        {/* Search Bar */}
        <div className="flex-1 relative max-w-2xl mx-2">
          <input
            type="text"
            placeholder={language === 'en' ? 'Search products...' : 'ابحث عن منتج...'}
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-2.5 px-4 pr-10 text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all shadow-sm"
          />
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 text-gray-400 absolute top-2.5 ${language === 'ar' ? 'left-3' : 'right-3'}`}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          <Link to="/" className="text-gray-600 hover:text-emerald-600 font-bold transition-colors">{language === 'en' ? 'Home' : 'الرئيسية'}</Link>
          <Link to="/categories" className="text-gray-600 hover:text-emerald-600 font-bold transition-colors">{language === 'en' ? 'Categories' : 'الأقسام'}</Link>
          <Link to="/orders" className="text-gray-600 hover:text-emerald-600 font-bold transition-colors">{language === 'en' ? 'My Orders' : 'طلباتي'}</Link>
           <button onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')} className="font-extrabold text-sm hover:text-emerald-600 transition-colors">
              {language === 'ar' ? 'EN' : 'عربي'}
           </button>
        </div>

        {/* Cart Icon */}
        <button 
          onClick={handleCartClick} 
          className="text-gray-600 hover:text-emerald-600 relative flex items-center gap-2 p-1 transition-transform active:scale-95"
          aria-label="Open cart"
        >
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
            {localCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[11px] font-bold min-w-[20px] h-[20px] rounded-full flex items-center justify-center animate-bounce shadow-sm border-2 border-white z-50">
                {localCount}
              </span>
            )}
          </div>
          <span className="hidden md:inline font-bold text-sm">{language === 'en' ? 'Cart' : 'السلة'}</span>
        </button>
        
        {/* Profile */}
         <Link to="/profile" className="hidden md:block text-gray-600 hover:text-green-600">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        </Link>
      </div>
    </header>
  )
}
EOFHEADER

cat > /var/www/tomo-app/frontend/src/components/Footer.tsx << 'EOFFOOTER'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api'
import { useLanguage } from '../context/LanguageContext'

interface Settings {
  site_name: string
  footer_logo: string | null
  phone: string
  whatsapp: string
  email: string
  location: string
  social_x: string
  social_instagram: string
  social_tiktok: string
  social_snapchat: string
}

export default function Footer() {
  const { language, t } = useLanguage()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const res = await api.get('/api/settings')
      setSettings(res.data)
    } catch (err) {
      console.error('Error loading settings:', err)
      setSettings({
        site_name: 'TOMO Market',
        footer_logo: null,
        phone: '',
        whatsapp: '',
        email: '',
        location: '',
        social_x: '',
        social_instagram: '',
        social_tiktok: '',
        social_snapchat: '',
      })
    } finally {
      setLoading(false)
    }
  }

  const displaySettings = settings || {
    site_name: 'TOMO Market',
    footer_logo: null,
    phone: '',
    whatsapp: '',
    email: '',
    location: '',
    social_x: '',
    social_instagram: '',
    social_tiktok: '',
    social_snapchat: '',
  }

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto text-gray-800" style={{ fontFamily: 'Cairo, sans-serif' }}>
      <div className="container mx-auto px-6 py-12 max-w-[1200px]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Column 1: About Us */}
          <div className="space-y-4">
            {displaySettings.footer_logo ? (
              <img
                src={displaySettings.footer_logo}
                alt="TOMO Market Logo"
                className="h-20 object-contain mb-4"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <h2 className="text-2xl font-bold mb-4 text-emerald-700">{displaySettings.site_name || 'TOMO Market'}</h2>
            )}
            <h3 className="text-lg font-bold mb-3 text-gray-900">{t('aboutUs')}</h3>
            <p className="text-gray-600 text-sm leading-relaxed" style={{ lineHeight: '1.8' }}>
              {t('aboutUsDescription')}
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-5 text-gray-900">{t('quickLinks')}</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/" className="text-gray-600 hover:text-emerald-600 transition-all text-sm flex items-center gap-2 hover:translate-x-[-4px] duration-200">
                  <span>🏠</span>
                  <span>{t('home')}</span>
                </Link>
              </li>
              <li>
                <Link to="/categories" className="text-gray-600 hover:text-emerald-600 transition-all text-sm flex items-center gap-2 hover:translate-x-[-4px] duration-200">
                  <span>🛍️</span>
                  <span>{t('allProducts')}</span>
                </Link>
              </li>
              <li>
                <Link to="/categories" className="text-gray-600 hover:text-emerald-600 transition-all text-sm flex items-center gap-2 hover:translate-x-[-4px] duration-200">
                  <span>📁</span>
                  <span>{t('categories')}</span>
                </Link>
              </li>
              <li>
                <Link to="/orders" className="text-gray-600 hover:text-emerald-600 transition-all text-sm flex items-center gap-2 hover:translate-x-[-4px] duration-200">
                  <span>📦</span>
                  <span>{t('trackOrder')}</span>
                </Link>
              </li>
              <li>
                <Link to="/driver-signup" className="text-gray-600 hover:text-emerald-600 transition-all text-sm flex items-center gap-2 hover:translate-x-[-4px] duration-200">
                  <span>🚚</span>
                  <span>{t('joinAsDriver')}</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Categories */}
          <div>
            <h3 className="text-lg font-bold mb-5 text-gray-900">{t('categories')}</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/categories" className="text-gray-600 hover:text-emerald-600 transition-all text-sm flex items-center gap-2 hover:translate-x-[-4px] duration-200">
                  <span>🛍️</span>
                  <span>{t('allProducts')}</span>
                </Link>
              </li>
              <li>
                <Link to="/categories" className="text-gray-600 hover:text-emerald-600 transition-all text-sm flex items-center gap-2 hover:translate-x-[-4px] duration-200">
                  <span>📁</span>
                  <span>{t('categories')}</span>
                </Link>
              </li>
              <li>
                <Link to="/orders" className="text-gray-600 hover:text-emerald-600 transition-all text-sm flex items-center gap-2 hover:translate-x-[-4px] duration-200">
                  <span>📦</span>
                  <span>{t('trackOrder')}</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact Us & Newsletter */}
          <div>
            <h3 className="text-lg font-bold mb-5 text-gray-900">{t('contactUs')}</h3>
            <ul className="space-y-3 mb-4">
              {displaySettings.phone && (
                <li className="flex items-center gap-3">
                  <span className="text-xl">📞</span>
                  <a
                    href={`tel:${displaySettings.phone}`}
                    className="text-gray-600 hover:text-emerald-600 transition-colors text-sm"
                  >
                    {displaySettings.phone}
                  </a>
                </li>
              )}
              {displaySettings.email && (
                <li className="flex items-center gap-3">
                  <span className="text-xl">✉️</span>
                  <a
                    href={`mailto:${displaySettings.email}`}
                    className="text-gray-600 hover:text-emerald-600 transition-colors text-sm"
                  >
                    {displaySettings.email}
                  </a>
                </li>
              )}
              {displaySettings.location && (
                <li className="flex items-center gap-3">
                  <span className="text-xl">📍</span>
                  <span className="text-gray-600 text-sm">{displaySettings.location}</span>
                </li>
              )}
              {!displaySettings.location && (
                <li className="flex items-center gap-3">
                  <span className="text-xl">📍</span>
                  <span className="text-gray-600 text-sm">{t('saudiArabia')}</span>
                </li>
              )}
            </ul>
            {displaySettings.whatsapp && (
              <a
                href={`https://wa.me/${displaySettings.whatsapp.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-white px-5 py-2.5 rounded-lg transition-all duration-200 hover:shadow-xl font-semibold bg-emerald-600 hover:bg-emerald-700"
              >
                <span className="text-xl">💬</span>
                <span>{t('whatsappSupport')}</span>
              </a>
            )}

            {/* Newsletter Section */}
            <div className="mt-6">
              <h4 className="text-sm font-semibold mb-3 text-gray-900">{t('newsletter')}</h4>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder={t('emailPlaceholder')}
                  className="flex-1 px-3 py-2 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2"
                  style={{ focusRingColor: '#d4af37' }}
                />
                <button
                  className="px-4 py-2 rounded-lg font-semibold text-sm transition-all hover:scale-105 bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  {t('subscribe')}
                </button>
              </div>
            </div>

            {/* Social Media Icons */}
            <div className="mt-6">
              <h4 className="text-sm font-semibold mb-3 text-gray-900">{t('followUs')}</h4>
              <div className="flex gap-3">
                {displaySettings.social_instagram && (
                  <a
                    href={displaySettings.social_instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
                  >
                    <span className="text-white text-lg">📷</span>
                  </a>
                )}
                {displaySettings.social_x && (
                  <a
                    href={displaySettings.social_x}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-black rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
                  >
                    <span className="text-white text-sm font-bold">𝕏</span>
                  </a>
                )}
                {displaySettings.social_tiktok && (
                  <a
                    href={displaySettings.social_tiktok}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-black rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
                  >
                    <span className="text-white text-lg">🎵</span>
                  </a>
                )}
                {displaySettings.social_snapchat && (
                  <a
                    href={displaySettings.social_snapchat}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
                  >
                    <span className="text-white text-lg font-bold">👻</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods & Bottom Bar */}
        <div className="border-t border-gray-200 mt-10 pt-6">
          {/* Payment Methods */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold mb-3 text-center text-gray-900">{t('paymentMethods')}</h4>
            <div className="flex justify-center items-center gap-4 flex-wrap">
              <div className="px-4 py-2 bg-gray-100 rounded-lg">
                <span className="text-gray-800 font-bold text-sm">مدى</span>
              </div>
              <div className="px-4 py-2 bg-gray-100 rounded-lg">
                <span className="text-gray-800 font-bold text-sm">Visa</span>
              </div>
              <div className="px-4 py-2 bg-gray-100 rounded-lg">
                <span className="text-gray-800 font-bold text-sm">STC Pay</span>
              </div>
              <div className="px-4 py-2 bg-gray-100 rounded-lg">
                <span className="text-gray-800 font-bold text-sm">{t('cod')}</span>
              </div>
            </div>
          </div>
          
          {/* Copyright */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-600 text-sm text-center md:text-right">
              {t('allRightsReserved')} © {new Date().getFullYear()} TOMO Market
            </p>
            <p className="text-gray-600 text-sm text-center md:text-right">
              {t('poweredBy')} <span className="font-bold text-emerald-700">TOMO Market</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
EOFFOOTER

cd /var/www/tomo-app/frontend
npm run build
chmod -R 755 dist
chown -R www-data:www-data dist
systemctl reload nginx

echo "✅ Header and Footer are now white on tomo-sa.com"

