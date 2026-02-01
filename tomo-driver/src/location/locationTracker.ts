import * as Location from 'expo-location'
import type { LocationSubscription } from 'expo-location'
import { getSocket } from '../socket/socketClient'

let sub: LocationSubscription | null = null
let lastSent: { lat: number; lng: number; ts: number } | null = null
const THROTTLE_MS = 5000

function canSend(socketConnectedOnly: boolean) {
  if (!socketConnectedOnly) return true
  const s = getSocket()
  return !!s.connected
}

export async function startLocationTracking(opts: {
  riderId: number | null | undefined
  socketConnectedOnly?: boolean
}): Promise<{ ok: boolean; reason?: string }> {
  const riderId = opts.riderId
  if (!riderId) return { ok: false, reason: 'NO_RIDER_ID' }

  try {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') return { ok: false, reason: 'PERMISSION_DENIED' }

    if (sub) return { ok: true }

    sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 10,
      },
      (loc) => {
        const latitude = loc.coords?.latitude
        const longitude = loc.coords?.longitude
        if (typeof latitude !== 'number' || typeof longitude !== 'number') return
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return
        if (!canSend(!!opts.socketConnectedOnly)) return

        const now = Date.now()
        // Throttle hard: never send more than once per 5s
        if (lastSent && now - lastSent.ts < THROTTLE_MS) return
        lastSent = { lat: latitude, lng: longitude, ts: now }

        const socket = getSocket()
        socket.emit('rider-location-update', {
          riderId,
          latitude,
          longitude,
        })
      }
    )

    return { ok: true }
  } catch (e) {
    return { ok: false, reason: 'ERROR' }
  }
}

export async function stopLocationTracking(): Promise<void> {
  try {
    sub?.remove()
  } catch {
    // ignore
  } finally {
    sub = null
    lastSent = null
  }
}

