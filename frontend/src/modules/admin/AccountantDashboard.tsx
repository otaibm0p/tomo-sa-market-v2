import { useState, useEffect } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import { useTheme } from '../../context/ThemeContext'
import api from '../../utils/api'
import DataTable from '../../components/DataTable'
import * as XLSX from 'xlsx'
import { formatNumber } from '../../utils/numberFormat'

interface ProfitReport {
  date: string
  total_orders: number
  total_revenue: number
  total_cost: number
  profit: number
  total_delivery_fees: number
}

interface CostTracking {
  id: number
  name_ar: string
  name_en: string
  cost_price: number
  price: number
  profit_per_unit: number
  profit_margin_percentage: number
}

interface PLStatement {
  revenue: number
  cost_of_goods_sold: number
  gross_profit: number
  operating_expenses: number
  net_profit: number
  profit_margin: string
}

interface SupplierPayment {
  id: number
  supplier_name: string
  invoice_number: string
  invoice_date: string
  amount: number
  vat_amount: number
  total_amount: number
  status: string
  payment_date: string | null
  payment_method: string | null
}

interface SalesAnalytics {
  id: number
  name_ar: string
  name_en: string
  total_quantity_sold: number
  total_revenue: number
  total_cost: number
  total_profit: number
  profit_margin_percentage: number
}

interface ProfitLeakage {
  id: number
  name_ar: string
  name_en: string
  category_name_ar: string
  category_name_en: string
  cost_price: number
  price: number
  expected_margin: number
  actual_margin: number
  leakage_amount: number
}

type TabType = 'overview' | 'pl' | 'suppliers' | 'analytics' | 'leakage'

export default function AccountantDashboard() {
  const { language } = useLanguage()
  const { theme } = useTheme()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [profitReports, setProfitReports] = useState<ProfitReport[]>([])
  const [costTracking, setCostTracking] = useState<CostTracking[]>([])
  const [plStatement, setPLStatement] = useState<PLStatement | null>(null)
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([])
  const [salesAnalytics, setSalesAnalytics] = useState<SalesAnalytics[]>([])
  const [profitLeakage, setProfitLeakage] = useState<ProfitLeakage[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    loadData()
  }, [dateRange, activeTab])

  const loadData = async () => {
    try {
      setLoading(true)
      const requests: Promise<any>[] = [
        api.get('/api/admin/accountant/profit-report', { params: dateRange }),
        api.get('/api/admin/accountant/cost-tracking')
      ]
      
      if (activeTab === 'pl' || activeTab === 'overview') {
        requests.push(api.get('/api/admin/accountant/pl-statement', { params: dateRange }))
      }
      if (activeTab === 'suppliers' || activeTab === 'overview') {
        requests.push(api.get('/api/admin/accountant/supplier-payments'))
      }
      if (activeTab === 'analytics') {
        requests.push(api.get('/api/admin/accountant/sales-analytics', { params: { ...dateRange, limit: 50 } }))
      }
      if (activeTab === 'leakage') {
        requests.push(api.get('/api/admin/accountant/profit-leakage'))
      }

      const results = await Promise.all(requests)
      setProfitReports(results[0].data.reports || [])
      setCostTracking(results[1].data.products || [])
      
      if (results[2]) {
        if (activeTab === 'pl' || activeTab === 'overview') {
          setPLStatement(results[2].data)
        } else if (activeTab === 'suppliers') {
          setSupplierPayments(results[2].data.payments || [])
        } else if (activeTab === 'analytics') {
          setSalesAnalytics(results[2].data.products || [])
        } else if (activeTab === 'leakage') {
          setProfitLeakage(results[2].data.products || [])
        }
      }
      
      // Handle additional results for overview
      if (activeTab === 'overview' && results.length > 3) {
        setSupplierPayments(results[3]?.data?.payments || [])
      }
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const totalRevenue = profitReports.reduce((sum, r) => sum + parseFloat(r.total_revenue.toString()), 0)
  const totalCost = profitReports.reduce((sum, r) => sum + parseFloat(r.total_cost.toString()), 0)
  const totalProfit = profitReports.reduce((sum, r) => sum + parseFloat(r.profit.toString()), 0)
  const totalOrders = profitReports.reduce((sum, r) => sum + r.total_orders, 0)

  // Export to Excel
  const exportToExcel = (data: any[], filename: string, sheetName: string) => {
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    XLSX.writeFile(wb, `${filename}.xlsx`)
  }

  const exportProfitReport = () => {
    exportToExcel(profitReports, `Profit_Report_${dateRange.start_date}_${dateRange.end_date}`, 'Profit Report')
  }

  const exportCostTracking = () => {
    exportToExcel(costTracking, `Cost_Tracking_${new Date().toISOString().split('T')[0]}`, 'Cost Tracking')
  }

  const exportSupplierPayments = () => {
    exportToExcel(supplierPayments, `Supplier_Payments_${new Date().toISOString().split('T')[0]}`, 'Supplier Payments')
  }

  const exportSalesAnalytics = () => {
    exportToExcel(salesAnalytics, `Sales_Analytics_${dateRange.start_date}_${dateRange.end_date}`, 'Sales Analytics')
  }

  // Export to PDF (using window.print for now, can be enhanced with jsPDF)
  const exportToPDF = (title: string) => {
    window.print()
  }

  return (
    <div className="p-6 space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#064e3b' }}>
            {language === 'en' ? 'Professional Accounting Suite' : 'لوحة المحاسبة المتقدمة'}
          </h1>
          <p className="text-gray-600 mt-2">
            {language === 'en' 
              ? 'Comprehensive financial management and reporting'
              : 'إدارة مالية شاملة وإعداد التقارير'
            }
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportProfitReport}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all"
          >
            {language === 'en' ? '📊 Export Excel' : '📊 تصدير Excel'}
          </button>
          <button
            onClick={() => exportToPDF('Accounting Report')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
          >
            {language === 'en' ? '📄 Export PDF' : '📄 تصدير PDF'}
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">
          {language === 'en' ? 'Date Range' : 'نطاق التاريخ'}
        </h2>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">
              {language === 'en' ? 'Start Date' : 'تاريخ البداية'}
            </label>
            <input
              type="date"
              value={dateRange.start_date}
              onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">
              {language === 'en' ? 'End Date' : 'تاريخ النهاية'}
            </label>
            <input
              type="date"
              value={dateRange.end_date}
              onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl shadow-xl p-6 text-white">
          <div className="text-sm opacity-90 mb-2">
            {language === 'en' ? 'Total Revenue' : 'إجمالي الإيرادات'}
          </div>
          <div className="text-3xl font-bold" dir="ltr">{formatNumber(totalRevenue, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س</div>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-xl p-6 text-white">
          <div className="text-sm opacity-90 mb-2">
            {language === 'en' ? 'Total Cost' : 'إجمالي التكلفة'}
          </div>
          <div className="text-3xl font-bold" dir="ltr">{formatNumber(totalCost, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س</div>
        </div>
        <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl shadow-xl p-6 text-white">
          <div className="text-sm opacity-90 mb-2">
            {language === 'en' ? 'Total Profit' : 'إجمالي الربح'}
          </div>
          <div className="text-3xl font-bold" dir="ltr">{formatNumber(totalProfit, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-xl p-6 text-white">
          <div className="text-sm opacity-90 mb-2">
            {language === 'en' ? 'Total Orders' : 'إجمالي الطلبات'}
          </div>
          <div className="text-3xl font-bold">{totalOrders}</div>
        </div>
      </div>

      {/* Profit Report Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            {language === 'en' ? 'Daily Profit Report' : 'تقرير الربح اليومي'}
          </h2>
          <button
            onClick={exportProfitReport}
            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all text-sm"
          >
            📊 {language === 'en' ? 'Export' : 'تصدير'}
          </button>
        </div>
        {loading ? (
          <div className="p-6 text-center">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {language === 'en' ? 'Date' : 'التاريخ'}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {language === 'en' ? 'Orders' : 'الطلبات'}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {language === 'en' ? 'Revenue' : 'الإيرادات'}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {language === 'en' ? 'Cost' : 'التكلفة'}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {language === 'en' ? 'Profit' : 'الربح'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {profitReports.map((report, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{report.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{report.total_orders}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-emerald-600">
                      <span dir="ltr">{formatNumber(parseFloat(report.total_revenue.toString()), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> ر.س
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                      <span dir="ltr">{formatNumber(parseFloat(report.total_cost.toString()), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> ر.س
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                      <span dir="ltr">{formatNumber(parseFloat(report.profit.toString()), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> ر.س
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cost Tracking Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            {language === 'en' ? 'Cost Tracking' : 'تتبع التكاليف'}
          </h2>
          <button
            onClick={exportCostTracking}
            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all text-sm"
          >
            📊 {language === 'en' ? 'Export' : 'تصدير'}
          </button>
        </div>
        {loading ? (
          <div className="p-6 text-center">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {language === 'en' ? 'Product' : 'المنتج'}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {language === 'en' ? 'Cost Price' : 'سعر التكلفة'}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {language === 'en' ? 'Sale Price' : 'سعر البيع'}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {language === 'en' ? 'Profit/Unit' : 'الربح/وحدة'}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {language === 'en' ? 'Margin %' : 'نسبة الهامش'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {costTracking.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">
                      {language === 'en' ? product.name_en || product.name_ar : product.name_ar}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span dir="ltr">{formatNumber(parseFloat(product.cost_price.toString()), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> ر.س
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                      <span dir="ltr">{formatNumber(parseFloat(product.price.toString()), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> ر.س
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                      <span dir="ltr">{formatNumber(parseFloat(product.profit_per_unit.toString()), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> ر.س
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        product.profit_margin_percentage && product.profit_margin_percentage > 30
                          ? 'bg-green-100 text-green-800'
                          : product.profit_margin_percentage && product.profit_margin_percentage > 15
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {product.profit_margin_percentage ? `${product.profit_margin_percentage}%` : 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Settlements (read-only, graceful if backend missing) */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">
            {language === 'en' ? 'Settlements' : 'التسويات'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {language === 'en' ? 'Read-only view. Data from backend when available.' : 'عرض للقراءة فقط. البيانات من الخادم عند التوفر.'}
          </p>
        </div>
        <div className="p-6">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-gray-600">
            {language === 'en' ? 'No settlements data available right now.' : 'لا توجد بيانات تسويات حالياً.'}
          </div>
        </div>
      </div>

      {/* Invoices (placeholder + flag) */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">
            {language === 'en' ? 'Invoices' : 'الفواتير'}
          </h2>
          <p className="text-sm text-amber-600 mt-1">
            {language === 'en' ? 'Placeholder — coming when backend is ready.' : 'مكان مؤقت — سيُفعّل عند جاهزية الخادم.'}
          </p>
        </div>
        <div className="p-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-800">
            {language === 'en' ? 'Invoices module will appear here.' : 'موديول الفواتير سيظهر هنا.'}
          </div>
        </div>
      </div>
    </div>
  )
}

