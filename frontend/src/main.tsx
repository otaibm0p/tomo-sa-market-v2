import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { showToast } from './shared/toast'

console.log('🚀 Starting TOMO Market app...')

const rootElement = document.getElementById('root')
if (!rootElement) {
  console.error('❌ Root element not found!')
  throw new Error('Root element not found')
}

console.log('✅ Root element found, rendering app...')

try {
  // Replace blocking alert() with non-blocking toasts (production UX)
  if (typeof window !== 'undefined') {
    const originalAlert = window.alert
    window.alert = (msg?: any) => {
      const text =
        typeof msg === 'string'
          ? msg
          : msg == null
            ? ''
            : (() => {
                try {
                  return JSON.stringify(msg)
                } catch {
                  return String(msg)
                }
              })()
      const isSuccess = /✅|success|saved|تم|نجح|تمت/i.test(text)
      showToast(text || (isSuccess ? 'تم' : 'حدث خطأ'), isSuccess ? 'success' : 'error')
      console.warn('alert() was called and converted to toast:', text)
      return undefined as any
    }
    ;(window.alert as any)._original = originalAlert
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
  console.log('✅ App rendered successfully!')
} catch (error) {
  console.error('❌ Error rendering app:', error)
  rootElement.innerHTML = `
    <div style="padding: 20px; font-family: Arial;">
      <h1 style="color: red;">خطأ في تحميل التطبيق</h1>
      <p>${error instanceof Error ? error.message : 'خطأ غير معروف'}</p>
      <button onclick="window.location.reload()" style="padding: 10px 20px; background: #2e7d32; color: white; border: none; border-radius: 4px; cursor: pointer;">
        إعادة تحميل الصفحة
      </button>
    </div>
  `
}

