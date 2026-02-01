import { useMemo, useState } from 'react'
import { Search, Trash2 } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { Card } from '../../shared/admin/ui/components/Card'
import { SectionHeader } from '../../shared/admin/ui/components/SectionHeader'
import { Button } from '../../shared/admin/ui/components/Button'
import { Badge } from '../../shared/admin/ui/components/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { clearAdminEvents, getAdminEvents, type AdminEvent } from '../../shared/admin/activityLog'

type FilterKey = 'all' | 'navigation' | 'retry' | 'orders'

function chipClass(active: boolean) {
  return active
    ? 'rounded-full px-3 py-1 text-xs font-extrabold bg-gray-900 text-white'
    : 'rounded-full px-3 py-1 text-xs font-extrabold bg-white border border-gray-200 text-gray-900 hover:bg-gray-50'
}

function toneForType(type: AdminEvent['type']) {
  if (type === 'retry') return 'warning'
  if (type === 'orders') return 'info'
  return 'neutral'
}

export default function ActivityLog() {
  const { language, t } = useLanguage()
  const isRTL = language === 'ar'

  const [filter, setFilter] = useState<FilterKey>('all')
  const [q, setQ] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [tick, setTick] = useState(0) // force refresh after clear

  const all = useMemo(() => {
    void tick
    return getAdminEvents()
  }, [tick])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return all
      .filter((e) => (filter === 'all' ? true : e.type === filter))
      .filter((e) => (!query ? true : e.label.toLowerCase().includes(query)))
  }, [all, filter, q])

  const title = t('admin.activity.title') || (isRTL ? 'سجل النشاط' : 'Activity Log')
  const empty = t('admin.activity.empty') || (isRTL ? 'لا يوجد نشاط بعد.' : 'No activity yet.')

  return (
    <div className="max-w-7xl mx-auto space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <SectionHeader
        title={title}
        description={t('admin.activity.subtitle') || (isRTL ? 'سجل محلي (read-only)' : 'Local read-only log')}
        right={
          <Button variant="secondary" size="sm" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="w-4 h-4" />
            {t('admin.activity.clear') || (isRTL ? 'مسح السجل' : 'Clear log')}
          </Button>
        }
      />

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="flex flex-wrap gap-2">
            <button className={chipClass(filter === 'all')} onClick={() => setFilter('all')}>
              {t('admin.activity.filters.all') || (isRTL ? 'الكل' : 'All')}
            </button>
            <button className={chipClass(filter === 'navigation')} onClick={() => setFilter('navigation')}>
              {t('admin.activity.filters.navigation') || (isRTL ? 'تنقل' : 'Navigation')}
            </button>
            <button className={chipClass(filter === 'retry')} onClick={() => setFilter('retry')}>
              {t('admin.activity.filters.retry') || (isRTL ? 'إعادة محاولة' : 'Retry')}
            </button>
            <button className={chipClass(filter === 'orders')} onClick={() => setFilter('orders')}>
              {t('admin.activity.filters.orders') || (isRTL ? 'طلبات' : 'Orders')}
            </button>
          </div>

          <div className="mt-3 md:mt-0 w-full md:w-[360px]">
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
              <Search className="w-4 h-4 text-gray-500" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('admin.activity.search') || (isRTL ? 'بحث في السجل…' : 'Search log…')}
                className="w-full outline-none bg-transparent text-sm font-bold text-gray-900 placeholder:text-gray-400"
              />
            </div>
          </div>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-4">
          <div className="text-sm font-bold text-gray-600">{empty}</div>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((e) => (
            <Card key={e.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-gray-900 truncate">{e.label}</div>
                  <div className="mt-1 text-xs text-gray-500" dir="ltr">
                    {new Date(e.ts).toLocaleString()}
                  </div>
                  {e.meta?.path ? <div className="mt-1 text-xs text-gray-500">{String(e.meta.path)}</div> : null}
                </div>
                <Badge tone={toneForType(e.type) as any}>{e.type}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={t('admin.activity.confirmTitle') || (isRTL ? 'تأكيد المسح' : 'Confirm clear')}
        description={t('admin.activity.confirmDesc') || (isRTL ? 'سيتم حذف السجل المحلي نهائيًا.' : 'This will permanently delete the local log.')}
        confirmText={t('admin.activity.clear') || (isRTL ? 'مسح السجل' : 'Clear log')}
        cancelText={t('cancel') || (isRTL ? 'إلغاء' : 'Cancel')}
        variant="danger"
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          clearAdminEvents()
          setConfirmOpen(false)
          setTick((x) => x + 1)
        }}
      />
    </div>
  )
}

