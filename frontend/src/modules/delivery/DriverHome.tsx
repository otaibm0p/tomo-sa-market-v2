import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../context/LanguageContext'
import api from '../../utils/api'
import { Package, MapPin } from 'lucide-react'

export default function DriverHome() {
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const [activeCount, setActiveCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    api.get('/api/drivers/tasks')
      .then((res) => {
        if (cancelled) return
        const orders = res.data?.orders || []
        const active = orders.filter(
          (o: { status?: string }) =>
            ['ASSIGNED', 'PICKED_UP', 'assigned', 'picked_up'].includes(String(o.status || '').toUpperCase())
        )
        setActiveCount(active.length)
      })
      .catch(() => {
        if (!cancelled) setActiveCount(0)
      })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="max-w-md mx-auto space-y-6">
      <h2 className="text-lg font-bold text-gray-900">
        {isAr ? 'الرئيسية' : 'Home'}
      </h2>
      <Link
        to="/driver/dashboard"
        className="block rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Package className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="font-bold text-gray-900">
              {isAr ? 'المهام النشطة' : 'Active tasks'}
            </p>
            <p className="text-sm text-gray-500">
              {activeCount !== null
                ? isAr
                  ? `${activeCount} طلب`
                  : `${activeCount} order(s)`
                : isAr ? 'جاري التحميل...' : 'Loading...'}
            </p>
          </div>
        </div>
      </Link>
      <p className="text-sm text-gray-500">
        {isAr ? 'افتح المهام لعرض الطلبات والعروض وتحديث الحالة.' : 'Open Tasks to view orders, offers, and update status.'}
      </p>
    </div>
  )
}
