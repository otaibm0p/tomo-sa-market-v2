import { useState, useMemo } from 'react'
import { useLanguage } from '../context/LanguageContext'

interface Column {
  key: string
  label: string
  sortable?: boolean
}

interface DataTableProps {
  data: any[]
  columns: Column[]
  searchable?: boolean
  exportable?: boolean
  onExport?: (format: 'excel' | 'pdf') => void
  renderRow?: (row: any) => React.ReactNode
}

export default function DataTable({ 
  data, 
  columns, 
  searchable = true, 
  exportable = true,
  onExport,
  renderRow 
}: DataTableProps) {
  const { language } = useLanguage()
  const [searchTerm, setSearchTerm] = useState('')
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 25

  // Filter and sort data
  const filteredData = useMemo(() => {
    let filtered = data

    // Search
    if (searchTerm) {
      filtered = filtered.filter((row) =>
        Object.values(row).some((value) =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }

    // Sort
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortColumn]
        const bVal = b[sortColumn]
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [data, searchTerm, sortColumn, sortDirection])

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const exportToCSV = () => {
    const headers = columns.map((c) => c.label).join(',')
    const rows = filteredData.map((row) =>
      columns.map((c) => `"${row[c.key] || ''}"`).join(',')
    )
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `export-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const exportToPDF = () => {
    if (onExport) {
      onExport('pdf')
    } else {
      window.print()
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {searchable && (
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder={language === 'en' ? 'Search...' : 'بحث...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        )}
        
        {exportable && (
          <div className="flex gap-2">
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
            >
              {language === 'en' ? 'Export Excel' : 'تصدير Excel'}
            </button>
            <button
              onClick={exportToPDF}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold"
            >
              {language === 'en' ? 'Export PDF' : 'تصدير PDF'}
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    onClick={() => column.sortable && handleSort(column.key)}
                    className={`px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase ${
                      column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{column.label}</span>
                      {column.sortable && sortColumn === column.key && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-8 text-center text-gray-500">
                    {language === 'en' ? 'No data found' : 'لا توجد بيانات'}
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, idx) => (
                  renderRow ? (
                    renderRow(row)
                  ) : (
                    <tr key={idx} className="hover:bg-gray-50">
                      {columns.map((column) => (
                        <td key={column.key} className="px-6 py-4 text-sm">
                          {row[column.key] || '-'}
                        </td>
                      ))}
                    </tr>
                  )
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t flex justify-between items-center">
            <span className="text-sm text-gray-600">
              {language === 'en' 
                ? `Showing ${(currentPage - 1) * itemsPerPage + 1} to ${Math.min(currentPage * itemsPerPage, filteredData.length)} of ${filteredData.length}`
                : `عرض ${(currentPage - 1) * itemsPerPage + 1} إلى ${Math.min(currentPage * itemsPerPage, filteredData.length)} من ${filteredData.length}`
              }
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                {language === 'en' ? 'Previous' : 'السابق'}
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                {language === 'en' ? 'Next' : 'التالي'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

