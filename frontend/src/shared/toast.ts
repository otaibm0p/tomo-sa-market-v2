type ToastType = 'success' | 'error'

export function showToast(message: string, type: ToastType = 'error') {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }))
}

