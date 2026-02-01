import { MIN_ORDER_AMOUNT } from './tokens'

export type MinOrderStatus = {
  min: number
  subtotal: number
  remaining: number
  ready: boolean
  ratio: number // 0..1
}

export function getMinOrderStatus(subtotal: number, min = MIN_ORDER_AMOUNT): MinOrderStatus {
  const safeMin = Number.isFinite(min) && min > 0 ? min : MIN_ORDER_AMOUNT
  const safeSubtotal = Number.isFinite(subtotal) ? Math.max(0, subtotal) : 0
  const remaining = Math.max(0, safeMin - safeSubtotal)
  const ready = remaining <= 0
  const ratio = safeMin > 0 ? Math.min(1, safeSubtotal / safeMin) : 1
  return { min: safeMin, subtotal: safeSubtotal, remaining, ready, ratio }
}

