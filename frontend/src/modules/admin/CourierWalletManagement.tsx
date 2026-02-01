import { useState, useEffect } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import api from '../../utils/api'
import { formatNumber } from '../../utils/numberFormat'

interface CourierWallet {
  id: number
  driver_id: number
  driver_name: string
  phone: string
  payable_balance: number
  cod_balance?: number // Legacy field - kept for backwards compatibility
  total_collected: number
  total_returned: number
  last_updated: string
}

export default function CourierWalletManagement() {
  const { language } = useLanguage()
  const [wallets, setWallets] = useState<CourierWallet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWallets()
  }, [])

  const loadWallets = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/admin/delivery/courier-wallets')
      setWallets(res.data.wallets || [])
    } catch (err) {
      console.error('Error loading wallets:', err)
    } finally {
      setLoading(false)
    }
  }

  const totalPayable = wallets.reduce((sum, w) => sum + parseFloat((w.payable_balance || 0).toString()), 0)
  const totalCollected = wallets.reduce((sum, w) => sum + parseFloat(w.total_collected.toString()), 0)

  return (
    <div className="p-6 space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold" style={{ color: '#064e3b' }}>
          {language === 'en' ? 'Rider Wallet Management' : 'إدارة محافظ Riders'}
        </h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl shadow-xl p-6 text-white">
          <div className="text-sm opacity-90 mb-2">
            {language === 'en' ? 'Total Payable Balance' : 'إجمالي الرصيد المستحق'}
          </div>
          <div className="text-3xl font-bold" dir="ltr">{formatNumber(totalPayable, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س</div>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-xl p-6 text-white">
          <div className="text-sm opacity-90 mb-2">
            {language === 'en' ? 'Total Collected' : 'إجمالي المحصل'}
          </div>
          <div className="text-3xl font-bold" dir="ltr">{formatNumber(totalCollected, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-xl p-6 text-white">
          <div className="text-sm opacity-90 mb-2">
            {language === 'en' ? 'Active Riders' : 'Riders النشطون'}
          </div>
          <div className="text-3xl font-bold" dir="ltr">{formatNumber(wallets.length)}</div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {language === 'en' ? 'Rider Name' : 'اسم Rider'}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {language === 'en' ? 'Phone' : 'الهاتف'}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {language === 'en' ? 'Payable Balance' : 'الرصيد المستحق'}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {language === 'en' ? 'Total Collected' : 'إجمالي المحصل'}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {language === 'en' ? 'Total Returned' : 'إجمالي المرتجع'}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {language === 'en' ? 'Last Updated' : 'آخر تحديث'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {wallets.map((wallet) => (
                  <tr key={wallet.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold">{wallet.driver_name}</td>
                    <td className="px-6 py-4">{wallet.phone}</td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-emerald-600">
                        <span dir="ltr">{formatNumber(parseFloat((wallet.payable_balance || 0).toString()), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> ر.س
                      </span>
                    </td>
                    <td className="px-6 py-4 text-green-600">
                      <span dir="ltr">{formatNumber(parseFloat(wallet.total_collected.toString()), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> ر.س
                    </td>
                    <td className="px-6 py-4 text-red-600">
                      <span dir="ltr">{formatNumber(parseFloat(wallet.total_returned.toString()), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> ر.س
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(wallet.last_updated).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

