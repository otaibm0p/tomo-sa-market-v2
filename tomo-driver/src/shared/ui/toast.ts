import Toast from 'react-native-toast-message'

export function showToast(msg: string) {
  if (!msg) return
  Toast.show({
    type: 'info',
    text1: msg,
    position: 'bottom',
    visibilityTime: 2200,
  })
}
