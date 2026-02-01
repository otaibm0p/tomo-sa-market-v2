import { type MvpOrderStatus, normalizeOrderStatus } from '../orderStatus'

export const spacing = {
  pageX: 'px-4',
  pageY: 'py-4',
  sectionGap: 'gap-4',
  pageMax: 'max-w-7xl mx-auto',
} as const

export const radius = {
  card: 'rounded-2xl',
  chip: 'rounded-full',
  button: 'rounded-xl',
} as const

export const shadow = {
  card: 'shadow-sm',
  cardHover: 'hover:shadow-md',
  pop: 'shadow-lg',
} as const

export const font = {
  title: 'text-lg font-extrabold',
  h1: 'text-2xl font-extrabold',
  body: 'text-sm',
  muted: 'text-sm text-gray-600',
  ui: "font-['Tajawal']",
} as const

export const colors = {
  bg: 'bg-gray-50',
  panel: 'bg-white',
  border: 'border border-gray-100',
  borderStrong: 'border border-gray-200',
  text: 'text-gray-900',
  muted: 'text-gray-600',
  brand: 'text-emerald-700',
} as const

// Sales UX (UI-only)
export const MIN_ORDER_AMOUNT = 35

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export function debounce<T extends (...args: any[]) => void>(fn: T, waitMs: number) {
  let t: any
  const debounced = (...args: Parameters<T>) => {
    if (t) clearTimeout(t)
    t = setTimeout(() => fn(...args), waitMs)
  }
  ;(debounced as any).cancel = () => {
    if (t) clearTimeout(t)
  }
  return debounced as T & { cancel: () => void }
}

type StatusTone = {
  badge: string
  dot: string
  subtleBg: string
}

const STATUS_TONES: Record<MvpOrderStatus, StatusTone> = {
  CREATED: { badge: 'bg-yellow-50 text-yellow-800 border-yellow-200', dot: 'bg-yellow-500', subtleBg: 'bg-yellow-50' },
  ACCEPTED: { badge: 'bg-blue-50 text-blue-800 border-blue-200', dot: 'bg-blue-500', subtleBg: 'bg-blue-50' },
  PREPARING: { badge: 'bg-purple-50 text-purple-800 border-purple-200', dot: 'bg-purple-500', subtleBg: 'bg-purple-50' },
  READY: { badge: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-600', subtleBg: 'bg-emerald-50' },
  ASSIGNED: { badge: 'bg-indigo-50 text-indigo-800 border-indigo-200', dot: 'bg-indigo-600', subtleBg: 'bg-indigo-50' },
  PICKED_UP: { badge: 'bg-orange-50 text-orange-800 border-orange-200', dot: 'bg-orange-600', subtleBg: 'bg-orange-50' },
  DELIVERED: { badge: 'bg-green-50 text-green-800 border-green-200', dot: 'bg-green-600', subtleBg: 'bg-green-50' },
  CANCELLED: { badge: 'bg-red-50 text-red-800 border-red-200', dot: 'bg-red-600', subtleBg: 'bg-red-50' },
}

export function getStatusTone(status: string | null | undefined): StatusTone & { normalized: MvpOrderStatus | null } {
  const normalized = normalizeOrderStatus(status)
  if (!normalized) {
    return {
      normalized: null,
      badge: 'bg-gray-50 text-gray-700 border-gray-200',
      dot: 'bg-gray-400',
      subtleBg: 'bg-gray-50',
    }
  }
  return { normalized, ...STATUS_TONES[normalized] }
}

export function chipClass(active: boolean) {
  return cx(
    'px-3 py-1.5 text-xs font-bold border',
    radius.chip,
    active ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
  )
}

export function cardClass() {
  return cx('bg-white border border-gray-100', radius.card, shadow.card)
}

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const buttonVariant: Record<ButtonVariant, string> = {
  primary: 'bg-gray-900 text-white hover:bg-gray-800',
  secondary: 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50',
  ghost: 'bg-transparent text-gray-900 hover:bg-gray-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
}

const buttonSize: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-5 py-3 text-base',
}

export function buttonClass(opts?: { variant?: ButtonVariant; size?: ButtonSize; full?: boolean; disabled?: boolean }) {
  const v = opts?.variant ?? 'primary'
  const s = opts?.size ?? 'md'
  return cx(
    radius.button,
    'inline-flex items-center justify-center gap-2 font-extrabold transition-colors active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed',
    opts?.full && 'w-full',
    buttonVariant[v],
    buttonSize[s]
  )
}

export function inputClass(opts?: { invalid?: boolean }) {
  return cx(
    radius.button,
    'w-full bg-white border px-4 py-3 text-sm font-bold outline-none transition',
    opts?.invalid ? 'border-red-300 focus:ring-2 focus:ring-red-200' : 'border-gray-200 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400',
    'placeholder:text-gray-400'
  )
}

