import { createNavigationContainerRef } from '@react-navigation/native'

export const navigationRef = createNavigationContainerRef<any>()

export function resetToLogin() {
  if (!navigationRef.isReady()) return
  navigationRef.reset({ index: 0, routes: [{ name: 'Login' }] })
}

