import * as SecureStore from 'expo-secure-store'

const KEY = 'tomo_driver_live_tracking_enabled'

export async function getLiveTrackingEnabled(): Promise<boolean> {
  try {
    const raw = await SecureStore.getItemAsync(KEY)
    if (raw === null || raw === undefined) return true
    if (raw === '1') return true
    if (raw === '0') return false
    return raw === 'true'
  } catch {
    return true
  }
}

export async function setLiveTrackingEnabled(enabled: boolean): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, enabled ? '1' : '0')
  } catch {
    // ignore
  }
}

