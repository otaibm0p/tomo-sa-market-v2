export type DecisionLogEntry = {
  id: string
  ts: string
  type: 'ALERT' | 'NOTE'
  severity: 'low' | 'med' | 'high'
  title: string
  detail: string
  source: 'ops' | 'guardrails'
  acknowledged: boolean
}

const KEY = 'TOMO_DECISION_LOG'

function safeParse(raw: string | null): DecisionLogEntry[] {
  if (!raw) return []
  try {
    const v = JSON.parse(raw)
    if (!Array.isArray(v)) return []
    return v as DecisionLogEntry[]
  } catch {
    return []
  }
}

function safeWrite(list: DecisionLogEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    // ignore
  }
}

function makeId() {
  // short, human-safe id (no secrets)
  return `d_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function listDecisions(): DecisionLogEntry[] {
  const list = safeParse(localStorage.getItem(KEY))
  return list
    .filter((x) => x && typeof x === 'object' && typeof (x as any).id === 'string' && typeof (x as any).ts === 'string')
    .sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0))
}

export function addDecision(
  entry: Omit<DecisionLogEntry, 'id' | 'ts' | 'acknowledged'> & { id?: string; ts?: string; acknowledged?: boolean }
): DecisionLogEntry {
  const list = safeParse(localStorage.getItem(KEY))
  const e: DecisionLogEntry = {
    id: entry.id || makeId(),
    ts: entry.ts || new Date().toISOString(),
    type: entry.type,
    severity: entry.severity,
    title: entry.title,
    detail: entry.detail,
    source: entry.source,
    acknowledged: entry.acknowledged ?? false,
  }
  list.push(e)
  safeWrite(list)
  return e
}

export function markReviewed(id: string) {
  const list = safeParse(localStorage.getItem(KEY))
  const next = list.map((x) => (x.id === id ? { ...x, acknowledged: true } : x))
  safeWrite(next)
}

export function clearDecisions() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}

