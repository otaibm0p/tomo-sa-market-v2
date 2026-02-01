import { Alert } from 'react-native'

let toastFn: ((msg: string) => void) | null = null

export function setToastHandler(fn: (msg: string) => void) {
  toastFn = fn
}

export function showToast(message: string) {
  if (toastFn) toastFn(message)
  else Alert.alert('', message)
}
