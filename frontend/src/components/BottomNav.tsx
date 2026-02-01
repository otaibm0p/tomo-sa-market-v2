import { Link, useLocation } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useLanguage } from '../context/LanguageContext'
import { cx } from '../shared/ui/tokens'

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

export default function BottomNav({ hidden }: { hidden?: boolean }) {
  const { language } = useLanguage()
  const location = useLocation()
  const { cart, items } = useCart() as any
  const list = (items || cart || []) as Array<{ quantity: number }>
  const count = list.reduce((sum, it) => sum + (it?.quantity ?? 0), 0)

  if (hidden) return null

  const nav = [
    { to: '/', label: language === 'ar' ? 'الرئيسية' : 'Home', icon: 'home' },
    { to: '/categories', label: language === 'ar' ? 'الأقسام' : 'Categories', icon: 'grid' },
    { to: '/orders', label: language === 'ar' ? 'طلباتي' : 'Orders', icon: 'orders' },
    { to: '/cart', label: language === 'ar' ? 'السلة' : 'Cart', icon: 'cart', badge: count },
    { to: '/profile', label: language === 'ar' ? 'حسابي' : 'Profile', icon: 'user' },
  ] as const

  const Icon = ({ name, active }: { name: string; active: boolean }) => {
    const cls = cx('w-6 h-6', active ? 'text-emerald-600' : 'text-gray-400')
    if (name === 'home')
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.47 3.84a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 1-1.06 1.06L12 5.43 3.84 13.59a.75.75 0 1 1-1.06-1.06l8.69-8.69Z" />
          <path d="m12 5.43 8.16 8.16c.03.03.06.06.09.09v6.2A1.88 1.88 0 0 1 18.38 21.75H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.62A1.88 1.88 0 0 1 3.75 19.88v-6.2a2.1 2.1 0 0 0 .09-.09L12 5.43Z" />
        </svg>
      )
    if (name === 'grid')
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25v2.25a2.25 2.25 0 0 1-2.25 2.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
        </svg>
      )
    if (name === 'orders')
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
        </svg>
      )
    if (name === 'user')
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.1a7.5 7.5 0 0 1 15 0A17.9 17.9 0 0 1 12 21.75c-2.68 0-5.22-.58-7.5-1.65Z" />
        </svg>
      )
    // cart
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
      </svg>
    )
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[90] md:hidden bg-white/95 backdrop-blur border-t border-gray-200 pb-safe">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
        {nav.map((it) => {
          const active = isActive(location.pathname, it.to)
          return (
            <Link key={it.to} to={it.to} className={cx('flex flex-col items-center gap-1 min-w-[52px] py-1', active ? 'text-emerald-600' : 'text-gray-400')}>
              <div className="relative">
                <Icon name={it.icon} active={active} />
                {it.badge && it.badge > 0 ? (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-extrabold min-w-[18px] h-[18px] rounded-full flex items-center justify-center border border-white">
                    {it.badge}
                  </span>
                ) : null}
              </div>
              <span className={cx('text-[10px] font-bold', active ? 'text-emerald-600' : 'text-gray-500')}>{it.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

