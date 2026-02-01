/**
 * Foreground location — guarded by permissions. Background behind feature flag (scaffold).
 */
import * as Location from 'expo-location'
import { postDriverLocation } from '@/lib/api'

let watchId: Location.LocationSubscription | null = null
let onLocationSent: ((at: string) => void) | null = null

export function setOnLocationSent(fn: ((at: string) => void) | null): void {
  onLocationSent = fn
}

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync()
  return status === 'granted'
}

export async function requestBackgroundLocationPermission(): Promise<boolean> {
  const fg = await requestLocationPermission()
  if (!fg) return false
  const bg = await Location.requestBackgroundPermissionsAsync()
  return bg.status === 'granted'
}

export async function startLocationUpdates(): Promise<boolean> {
  const ok = await requestLocationPermission()
  if (!ok) return false
  watchId = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.Balanced, timeInterval: 30000, distanceInterval: 50 },
    (loc) => {
      const { latitude, longitude } = loc.coords
      postDriverLocation(latitude, longitude)
        .then(() => {
          const at = new Date().toISOString()
          if (onLocationSent) onLocationSent(at)
        })
        .catch(() => {})
    }
  )
  return true
}

export function stopLocationUpdates(): void {
  if (watchId) {
    watchId.remove()
    watchId = null
  }
}
