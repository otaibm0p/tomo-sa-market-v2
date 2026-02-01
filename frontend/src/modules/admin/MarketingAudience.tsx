import { useState, useEffect, useCallback } from 'react'
import api from '../../utils/api'
import { useLanguage } from '../../context/LanguageContext'
import { SectionHeader } from '../../shared/admin/ui/components/SectionHeader'
import { Button } from '../../shared/admin/ui/components/Button'
import { Badge } from '../../shared/admin/ui/components/Badge'
import { EmptyState } from '../../shared/admin/ui/components/EmptyState'
import { FilterBar } from '../../shared/admin/ui/components/FilterBar'
import { TableModern, TableModernHead, TableModernTh, TableModernBody, TableModernRow, TableModernTd } from '../../shared/admin/ui/components/TableModern'
import { CardModern } from '../../shared/admin/ui/components/CardModern'
import { adminTokens, cx } from '../../shared/admin/ui/tokens'
import { Users, Download } from 'lucide-react'

export interface AudienceFilters {
  marketing_opt_in?: boolean
  channel_whatsapp?: boolean
  has_phone?: boolean
  search?: string
  last_order_days?: number
  orders_count_min?: number
  total_spent_min?: number
  created_since?: string
  zone_id?: number
}

export interface AudienceRow {
  id: number
  full_name: string | null
  email: string | null
  phone: string | null
  whatsapp_phone: string | null
  marketing_opt_in: boolean
  channel_opt_in: Record<string, boolean> | null
  created_at: string
}

export default function MarketingAudience() {
  const { language, t } = useLanguage()
  const [rows, setRows] = useState<AudienceRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<AudienceFilters>({})
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(0)
  const limit = 50
  const [exporting, setExporting] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params: Record<string, string> = { limit: String(limit), offset: String(page * limit) }
      if (Object.keys(filters).length) params.filters = JSON.stringify(filters)
      const res = await api.get('/api/admin/marketing/audience', { params })
      setRows(res.data?.rows ?? [])
      setTotal(res.data?.total ?? 0)
    } catch (_) {
      setError(language === 'ar' ? 'لا يمكن تحميل الجمهور' : 'Could not load audience')
      setRows([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [filters, page, language])

  useEffect(() => {
    load()
  }, [load])

  const handleExport = async () => {
    try {
      setExporting(true)
      const params: Record<string, string> = {}
      if (Object.keys(filters).length) params.filters = JSON.stringify(filters)
      const res = await api.get('/api/admin/marketing/audience/export.csv', { params, responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = 'audience-export.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      if (err.response?.status === 429) {
        setError(language === 'ar' ? 'تجاوزت حد الطلبات. حاول بعد دقيقة.' : 'Rate limit exceeded. Try again in a minute.')
      } else {
        setError(language === 'ar' ? 'فشل التصدير' : 'Export failed')
      }
    } finally {
      setExporting(false)
    }
  }

  const applySearch = () => {
    setFilters((f) => ({ ...f, search: searchInput.trim() || undefined }))
    setPage(0)
  }

  const isRTL = language === 'ar'
  const channelLabels = { whatsapp: language === 'ar' ? 'واتساب' : 'WhatsApp', sms: 'SMS', email: language === 'ar' ? 'البريد' : 'Email', push: language === 'ar' ? 'الإشعارات' : 'Push' }

  return (
    <div className={cx(adminTokens.spacing.page, 'max-w-6xl')} dir={isRTL ? 'rtl' : 'ltr'}>
      <SectionHeader
        title={t('admin.marketing.audience.title') || (language === 'ar' ? 'جمهور التسويق' : 'Marketing Audience')}
        description={t('admin.marketing.audience.description') || (language === 'ar' ? 'عرض وتصفية الجمهور المستهدف وتصدير القائمة. عرض قنوات الموافقة (واتساب، SMS، بريد، إشعارات).' : 'View and filter target audience and export list. Show opt-in channels (WhatsApp, SMS, Email, Push).')}
        right={
          <Button variant="primary" size="sm" onClick={handleExport} disabled={exporting}>
            <Download className="w-4 h-4 inline-block ltr:mr-1 rtl:ml-1" />
            {exporting ? (language === 'ar' ? 'جاري التصدير...' : 'Exporting...') : (language === 'ar' ? 'تصدير CSV' : 'Export CSV')}
          </Button>
        }
      />

      <CardModern className="mt-4" padding={true}>
        <FilterBar
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          onSearchSubmit={applySearch}
          searchPlaceholder={language === 'ar' ? 'بحث بالاسم أو البريد أو الجوال...' : 'Search by name, email, phone...'}
          searchButtonLabel={t('search') || (language === 'ar' ? 'بحث' : 'Search')}
          right={
            <>
              <label className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={filters.marketing_opt_in === true}
                  onChange={(e) => {
                    setFilters((f) => ({ ...f, marketing_opt_in: e.target.checked ? true : undefined }))
                    setPage(0)
                  }}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                {language === 'ar' ? 'موافقون على التسويق فقط' : 'Opt-in only'}
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={filters.channel_whatsapp === true}
                  onChange={(e) => {
                    setFilters((f) => ({ ...f, channel_whatsapp: e.target.checked ? true : undefined }))
                    setPage(0)
                  }}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                {language === 'ar' ? 'واتساب فقط' : 'WhatsApp only'}
              </label>
            </>
          }
        />
      </CardModern>

      {error && (
        <div className={cx('mt-4 p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm font-medium', adminTokens.radius.control)}>{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center items-center min-h-[200px] mt-4">
          <div className={cx('animate-spin rounded-full h-10 w-10 border-b-2', adminTokens.color.primaryBorder)} />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title={language === 'ar' ? 'لا يوجد جمهور' : 'No audience'}
          description={language === 'ar' ? 'لا يوجد مستلمون مطابقون للفلاتر. غيّر شروط البحث أو انتظر تسجيل عملاء جدد مع الموافقة على التسويق.' : 'No recipients match the filters. Change search criteria or wait for new customer signups with marketing opt-in.'}
        />
      ) : (
        <>
          <div className="mt-4">
            <TableModern>
              <TableModernHead>
                <TableModernTh>ID</TableModernTh>
                <TableModernTh>{language === 'ar' ? 'الاسم' : 'Name'}</TableModernTh>
                <TableModernTh>{language === 'ar' ? 'البريد / الجوال' : 'Email / Phone'}</TableModernTh>
                <TableModernTh>{language === 'ar' ? 'قنوات الموافقة' : 'Opt-in channels'}</TableModernTh>
                <TableModernTh>{language === 'ar' ? 'التاريخ' : 'Date'}</TableModernTh>
              </TableModernHead>
              <TableModernBody>
                {rows.map((r) => (
                  <TableModernRow key={r.id}>
                    <TableModernTd className="text-gray-500">{r.id}</TableModernTd>
                    <TableModernTd className="font-medium">{r.full_name || '—'}</TableModernTd>
                    <TableModernTd className={adminTokens.color.muted}>
                      {r.email || r.phone || r.whatsapp_phone || '—'}
                    </TableModernTd>
                    <TableModernTd>
                      <div className="flex flex-wrap gap-1">
                        {r.channel_opt_in && typeof r.channel_opt_in === 'object'
                          ? Object.entries(r.channel_opt_in).map(([k, v]) =>
                              v ? (
                                <Badge key={k} tone="success">
                                  {channelLabels[k as keyof typeof channelLabels] || k}
                                </Badge>
                              ) : null
                            )
                          : null}
                        {r.marketing_opt_in && (!r.channel_opt_in || Object.keys(r.channel_opt_in).length === 0) && (
                          <Badge tone="neutral">{language === 'ar' ? 'موافق' : 'Opt-in'}</Badge>
                        )}
                        {!r.marketing_opt_in && (
                          <span className="text-gray-400 text-xs">{language === 'ar' ? 'غير موافق' : 'No opt-in'}</span>
                        )}
                      </div>
                    </TableModernTd>
                    <TableModernTd className="text-gray-500">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-GB') : '—'}
                    </TableModernTd>
                  </TableModernRow>
                ))}
              </TableModernBody>
            </TableModern>
          </div>
          <div className={cx('mt-3 flex items-center justify-between text-sm', adminTokens.color.muted)}>
            <span>
              {language === 'ar' ? 'العرض' : 'Showing'} {(page * limit) + 1}–{Math.min((page + 1) * limit, total)} {language === 'ar' ? 'من' : 'of'} {total}
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                {language === 'ar' ? 'السابق' : 'Previous'}
              </Button>
              <Button variant="secondary" size="sm" disabled={(page + 1) * limit >= total} onClick={() => setPage((p) => p + 1)}>
                {language === 'ar' ? 'التالي' : 'Next'}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
