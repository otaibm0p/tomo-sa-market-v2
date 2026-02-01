export type MvpOrderStatus =
  | 'CREATED'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'DELIVERED'
  | 'CANCELLED'

export const MVP_STATUS_ORDER: MvpOrderStatus[] = [
  'CREATED',
  'ACCEPTED',
  'PREPARING',
  'READY',
  'ASSIGNED',
  'PICKED_UP',
  'DELIVERED',
]

export const MVP_STATUSES: MvpOrderStatus[] = [...MVP_STATUS_ORDER, 'CANCELLED']

export const STATUS_LABELS: Record<MvpOrderStatus, { ar: string; en: string }> = {
  CREATED: { ar: 'تم إنشاء الطلب', en: 'Order Created' },
  ACCEPTED: { ar: 'تم قبول الطلب', en: 'Order Accepted' },
  PREPARING: { ar: 'جاري التجهيز', en: 'Preparing' },
  READY: { ar: 'جاهز للاستلام', en: 'Ready' },
  ASSIGNED: { ar: 'تم تعيين مندوب', en: 'Driver Assigned' },
  PICKED_UP: { ar: 'تم الاستلام', en: 'Picked Up' },
  DELIVERED: { ar: 'تم التوصيل', en: 'Delivered' },
  CANCELLED: { ar: 'ملغي', en: 'Cancelled' },
}

export const VALID_TRANSITIONS: Record<MvpOrderStatus, MvpOrderStatus[]> = {
  CREATED: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
}

const LEGACY_TO_MVP: Record<string, MvpOrderStatus> = {
  pending: 'CREATED',
  pending_payment: 'CREATED',
  paid: 'CREATED',
  store_accepted: 'ACCEPTED',
  preparing: 'PREPARING',
  ready: 'READY',
  driver_assigned: 'ASSIGNED',
  assigned: 'ASSIGNED',
  confirmed: 'ASSIGNED',
  out_for_delivery: 'PICKED_UP',
  picked_up: 'PICKED_UP',
  delivered: 'DELIVERED',
  completed: 'DELIVERED',
  refunded: 'CANCELLED',
  cancelled: 'CANCELLED',
}

export function normalizeOrderStatus(status: string | null | undefined): MvpOrderStatus | null {
  if (!status) return null
  const s = String(status).trim()
  if (!s) return null
  const upper = s.toUpperCase()
  if ((MVP_STATUSES as string[]).includes(upper)) return upper as MvpOrderStatus
  const mapped = LEGACY_TO_MVP[s.toLowerCase()]
  return mapped || null
}

export function getStatusLabel(status: string | null | undefined, lang: 'ar' | 'en'): string {
  const normalized = normalizeOrderStatus(status)
  if (!normalized) return lang === 'ar' ? 'حالة غير معروفة' : 'Unknown Status'
  return STATUS_LABELS[normalized][lang]
}

export function canTransition(from: string | null | undefined, to: MvpOrderStatus): boolean {
  const current = normalizeOrderStatus(from)
  if (!current) return false
  return (VALID_TRANSITIONS[current] || []).includes(to)
}

