export type GuardrailsConfig = {
  MAX_ASSIGN_DISTANCE_KM: number
  MAX_READY_WITHOUT_DRIVER: number
  MAX_CANCEL_RATE: number
  MAX_ORDERS_LAST_HOUR: number
}

export const DEFAULT_GUARDRAILS: GuardrailsConfig = {
  MAX_ASSIGN_DISTANCE_KM: 3,
  MAX_READY_WITHOUT_DRIVER: 5,
  MAX_CANCEL_RATE: 0.08,
  MAX_ORDERS_LAST_HOUR: 20,
}

const KEY_GUARDRAILS = 'tomo_ops_guardrails_v1'

function clampNum(v: unknown, fallback: number) {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return fallback
  if (n < 0) return fallback
  return n
}

export function getGuardrails(): GuardrailsConfig {
  try {
    const raw = localStorage.getItem(KEY_GUARDRAILS)
    if (!raw) return DEFAULT_GUARDRAILS
    const obj = JSON.parse(raw) as Partial<GuardrailsConfig>
    return {
      MAX_ASSIGN_DISTANCE_KM: clampNum(obj.MAX_ASSIGN_DISTANCE_KM, DEFAULT_GUARDRAILS.MAX_ASSIGN_DISTANCE_KM),
      MAX_READY_WITHOUT_DRIVER: clampNum(obj.MAX_READY_WITHOUT_DRIVER, DEFAULT_GUARDRAILS.MAX_READY_WITHOUT_DRIVER),
      MAX_CANCEL_RATE: clampNum(obj.MAX_CANCEL_RATE, DEFAULT_GUARDRAILS.MAX_CANCEL_RATE),
      MAX_ORDERS_LAST_HOUR: clampNum(obj.MAX_ORDERS_LAST_HOUR, DEFAULT_GUARDRAILS.MAX_ORDERS_LAST_HOUR),
    }
  } catch {
    return DEFAULT_GUARDRAILS
  }
}

export function setGuardrails(next: GuardrailsConfig) {
  try {
    localStorage.setItem(KEY_GUARDRAILS, JSON.stringify(next))
  } catch {
    // ignore
  }
}

export function resetGuardrailsToDefaults() {
  try {
    localStorage.removeItem(KEY_GUARDRAILS)
  } catch {
    // ignore
  }
}

