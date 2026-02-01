export type LatLng = { lat: number; lng: number }

const EARTH_RADIUS_M = 6371000

export function haversineMeters(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  return EARTH_RADIUS_M * c
}

export function estimateSpeedMps(points: Array<{ lat: number; lng: number; ts: number }>): number | null {
  const last = points.slice(-3)
  if (last.length < 2) return null

  const segs: number[] = []
  for (let i = 1; i < last.length; i++) {
    const a = last[i - 1]
    const b = last[i]
    const dtMs = (b.ts ?? 0) - (a.ts ?? 0)
    if (!Number.isFinite(dtMs) || dtMs <= 0) continue
    const d = haversineMeters({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng })
    const s = d / (dtMs / 1000)
    if (Number.isFinite(s) && s > 0) segs.push(s)
  }

  if (segs.length === 0) return null

  const avg = segs.reduce((sum, v) => sum + v, 0) / segs.length
  // Clamp speed to a reasonable range for riders/cars
  return Math.min(25, Math.max(1, avg))
}

export function estimateEtaMinutes(distanceMeters: number, speedMps: number): number {
  const safeDist = Number.isFinite(distanceMeters) ? Math.max(0, distanceMeters) : 0
  const safeSpeed = Number.isFinite(speedMps) && speedMps > 0 ? speedMps : 6
  const mins = safeDist / safeSpeed / 60
  const clamped = Math.min(45, Math.max(3, mins))
  return Math.max(1, Math.round(clamped))
}

