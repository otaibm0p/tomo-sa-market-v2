/**
 * Push notifications — scaffold.
 * Use expo-notifications; register and handle tokens when backend is ready.
 */
import * as Notifications from 'expo-notifications'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

export async function getExpoPushToken(): Promise<string | null> {
  const ok = await requestNotificationPermission()
  if (!ok) return null
  const token = (await Notifications.getExpoPushTokenAsync()).data
  return token ?? null
}
