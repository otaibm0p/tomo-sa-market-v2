import { useEffect, useRef } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import { usePublicSettings } from '../../hooks/usePublicSettings'
import { OrderTimeline } from '../../shared/order-ui/OrderTimeline'
import { StatusBadge } from '../../shared/order-ui/StatusBadge'
import { SlaTimerBadge } from '../../shared/order-ui/SlaTimerBadge'
import { getOrderSlaStartAt, formatMoney, formatTimeAgo } from '../../shared/order-ui/orderUiUtils'
import type { OrderDetails } from '../../shared/types/order'
import { MapPin, X, ExternalLink } from 'lucide-react'

interface DriverDetailsDrawerProps {
  open: boolean
  onClose: () => void
  order: OrderDetails | null
  lang?: 'ar' | 'en'
}

export function DriverDetailsDrawer({ open, onClose, order, lang }: DriverDetailsDrawerProps) {
  const { language } = useLanguage()
  const { settings: publicSettings } = usePublicSettings()
  const slaTimerEnabled = publicSettings?.features?.sla_timer_enabled !== false
  const slaLimitMinutes = publicSettings?.features?.sla_timer_limit_minutes ?? 30
  const isAr = (lang || language) === 'ar'
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  const mapUrl = order
    ? order.delivery_latitude != null && order.delivery_longitude != null
      ? `https://www.google.com/maps/search/?api=1&query=${order.delivery_latitude},${order.delivery_longitude}`
      : order.delivery_address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address)}`
        : null
    : null

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="driver-drawer-title"
    >
      <div
        className="absolute inset-0 bg-black/40"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
          <h2 id="driver-drawer-title" className="text-lg font-bold text-gray-900">
            {order ? `#${order.id}` : ''} {isAr ? 'تفاصيل الطلب' : 'Order details'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            aria-label={isAr ? 'إغلاق' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 pb-8">
          {!order ? (
            <p className="text-sm text-gray-500">{isAr ? 'لا يوجد طلب محدد.' : 'No order selected.'}</p>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-gray-900">#{order.id}</span>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatTimeAgo(order.updated_at || order.created_at, isAr ? 'ar' : 'en')}
                  </p>
                  {slaTimerEnabled && !['DELIVERED', 'CANCELLED'].includes(String(order.status).toUpperCase()) && (
                    <div className="mt-2">
                      <SlaTimerBadge
                        slaStartAt={getOrderSlaStartAt(order)}
                        hideWhenNoStart
                        lang={isAr ? 'ar' : 'en'}
                        fullBlock
                        limitMinutes={slaLimitMinutes}
                      />
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-lg font-extrabold text-gray-900" dir="ltr">
                    {formatMoney(order.total_amount, isAr ? 'ريال' : 'SAR', isAr ? 'ar' : 'en')}
                  </span>
                </div>
              </div>

              {order.delivery_address && (
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-1">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    {isAr ? 'عنوان التوصيل' : 'Delivery address'}
                  </div>
                  <p className="text-sm text-gray-700">{order.delivery_address}</p>
                  {mapUrl && (
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {isAr ? 'فتح في الخريطة' : 'Open in Maps'}
                    </a>
                  )}
                </div>
              )}

              {order.items && order.items.length > 0 && (
                <div>
                  <div className="text-sm font-bold text-gray-800 mb-2">
                    {isAr ? 'العناصر' : 'Items'}
                  </div>
                  <ul className="space-y-1">
                    {order.items.slice(0, 10).map((item, i) => (
                      <li key={i} className="text-sm text-gray-700 flex justify-between gap-2">
                        <span>
                          {(item.product_name_ar || item.product_name_en || item.product_name) ?? '—'} × {(item.quantity ?? item.qty) ?? 0}
                        </span>
                        {item.line_total != null && (
                          <span dir="ltr" className="text-gray-600">
                            {formatMoney(Number(item.line_total), isAr ? 'ريال' : 'SAR', isAr ? 'ar' : 'en')}
                          </span>
                        )}
                      </li>
                    ))}
                    {order.items.length > 10 && (
                      <li className="text-xs text-gray-500">+{order.items.length - 10} more</li>
                    )}
                  </ul>
                </div>
              )}

              <OrderTimeline
                currentStatus={order.status}
                events={[]}
                lang={isAr ? 'ar' : 'en'}
              />

              {mapUrl && (
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full text-center py-3 rounded-xl border-2 border-emerald-600 text-emerald-700 font-bold hover:bg-emerald-50"
                >
                  {isAr ? 'فتح في الخريطة' : 'Open in Maps'}
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
