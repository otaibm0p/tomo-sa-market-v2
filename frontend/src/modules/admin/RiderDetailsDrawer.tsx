import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../../context/LanguageContext'
import { copyToClipboard } from '../../shared/order-ui/orderUiUtils'
import { showToast } from '../../shared/toast'
import { statusClasses, type StatusVariant } from '../../shared/admin/ui/tokens'
import { adminTokens, cx } from '../../shared/admin/ui/tokens'
import { Button } from '../../shared/admin/ui/components/Button'
import { Copy, MapPin, X, Zap, LayoutGrid } from 'lucide-react'

export interface RiderRow {
  id: number
  user_id?: number
  name: string
  email?: string
  phone?: string
  rider_status: string
  last_seen?: string | null
  last_location_update?: string | null
  active_orders_count?: number
  current_latitude?: number | null
  current_longitude?: number | null
}

interface RiderDetailsDrawerProps {
  open: boolean
  onClose: () => void
  rider: RiderRow | null
  activeOrder: { id: number; status: string; total_amount: number; delivery_address: string | null } | null
}

function statusVariant(s: string): StatusVariant {
  const v = (s || '').toLowerCase()
  if (v === 'offline') return 'danger'
  if (v === 'available' || v === 'online') return 'success'
  if (v === 'busy') return 'warn'
  return 'info'
}

export function RiderDetailsDrawer({ open, onClose, rider, activeOrder }: RiderDetailsDrawerProps) {
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const navigate = useNavigate()

  if (!open || !rider) return null

  const raw = rider as RiderRow & { latitude?: number; longitude?: number; last_latitude?: number; last_longitude?: number }
  const latVal = raw.current_latitude ?? raw.latitude ?? raw.last_latitude
  const lngVal = raw.current_longitude ?? raw.longitude ?? raw.last_longitude
  const hasLocation =
    latVal != null &&
    lngVal != null &&
    Number.isFinite(Number(latVal)) &&
    Number.isFinite(Number(lngVal))
  const lat = Number(latVal)
  const lng = Number(lngVal)
  const mapsUrl = hasLocation
    ? `https://www.google.com/maps?q=${lat},${lng}`
    : null

  const handleCopyPhone = async () => {
    const phone = rider.phone || rider.email || ''
    if (phone && (await copyToClipboard(phone))) showToast(isAr ? 'تم نسخ رقم الجوال' : 'Phone copied', 'success')
  }

  const handleOpenLiveDispatch = () => {
    onClose()
    navigate(`/admin/ops/live-dispatch${rider.id ? `?riderId=${rider.id}` : ''}`)
  }

  const handleOpenBoard = () => {
    onClose()
    navigate('/admin/ops/board')
  }

  return (
    <div className="fixed inset-0 z-[200] flex justify-end" role="dialog" aria-label={isAr ? 'تفاصيل المندوب' : 'Rider details'}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div
        className={cx('relative w-full max-w-md bg-white shadow-xl overflow-y-auto', adminTokens.surfaces.card)}
        dir={isAr ? 'rtl' : 'ltr'}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cx('sticky top-0 border-b px-4 py-3 flex items-center justify-between', adminTokens.borders.soft, adminTokens.surfaces.card)}>
          <h3 className={cx('font-bold', adminTokens.color.text)}>{rider.name || '—'}</h3>
          <button
            type="button"
            onClick={onClose}
            className={cx('p-1 rounded-lg', adminTokens.color.muted, 'hover:bg-gray-100')}
            aria-label={isAr ? 'إغلاق' : 'Close'}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <p className={cx('text-sm', adminTokens.color.muted)}>{isAr ? 'الهاتف' : 'Phone'}</p>
            <p className={cx('font-medium mt-1', adminTokens.color.text)} dir="ltr">{rider.phone || rider.email || '—'}</p>
            <Button variant="secondary" size="sm" className="mt-2 gap-2 font-bold" onClick={handleCopyPhone}>
              <Copy className="w-4 h-4" />
              {isAr ? 'نسخ رقم الجوال' : 'Copy phone'}
            </Button>
          </div>

          <div>
            <p className={cx('text-sm font-bold', adminTokens.color.text)}>{isAr ? 'الحالة' : 'Status'}</p>
            <span className={cx('inline-flex mt-1 px-2 py-1 rounded-full text-xs font-bold border', statusClasses(statusVariant(rider.rider_status)))}>
              {(rider.rider_status || 'offline').toLowerCase()}
            </span>
          </div>

          <div>
            <p className={cx('text-sm font-bold', adminTokens.color.text)}>{isAr ? 'الطلب النشط' : 'Current order'}</p>
            {activeOrder ? (
              <div className={cx('mt-2 p-3 rounded-xl border', adminTokens.borders.soft)}>
                <p className={cx('font-medium', adminTokens.color.text)} dir="ltr">#{activeOrder.id}</p>
                <p className={cx('text-xs mt-1', adminTokens.color.muted)}>{activeOrder.status}</p>
                <p className={cx('text-xs mt-1', adminTokens.color.muted)} dir="ltr">{Number(activeOrder.total_amount).toFixed(2)} {isAr ? 'ريال' : 'SAR'}</p>
                {activeOrder.delivery_address && (
                  <p className={cx('text-xs mt-1 truncate', adminTokens.color.muted)}>{activeOrder.delivery_address}</p>
                )}
              </div>
            ) : (
              <p className={cx('mt-1 text-sm', adminTokens.color.muted)}>{isAr ? 'لا يوجد طلب نشط' : 'No active order'}</p>
            )}
          </div>

          <div>
            <p className={cx('text-sm font-bold', adminTokens.color.text)}>{isAr ? 'الموقع' : 'Location'}</p>
            {hasLocation && mapsUrl ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cx('inline-flex items-center gap-2 mt-2 px-3 py-2 rounded-xl border font-bold text-sm', adminTokens.primary, adminTokens.primaryBorder, 'hover:bg-emerald-50')}
              >
                <MapPin className="w-4 h-4" />
                {isAr ? 'فتح في الخرائط' : 'Open in Maps'}
              </a>
            ) : (
              <p className={cx('mt-1 text-sm', adminTokens.color.muted)}>{isAr ? 'الموقع غير متوفر' : 'Location not available'}</p>
            )}
          </div>

          <div className={cx('border-t pt-4 flex flex-col gap-2', adminTokens.borders.soft)}>
            <Button variant="primary" size="sm" className="w-full gap-2 font-bold" onClick={handleOpenLiveDispatch}>
              <Zap className="w-4 h-4" />
              {isAr ? 'فتح الإرسال المباشر' : 'Open Live Dispatch'}
            </Button>
            <Button variant="secondary" size="sm" className="w-full gap-2 font-bold" onClick={handleOpenBoard}>
              <LayoutGrid className="w-4 h-4" />
              {isAr ? 'لوحة العمليات' : 'Ops board'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
