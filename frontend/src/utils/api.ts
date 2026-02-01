import axios from 'axios'

// API base: in dev use '' so requests go to same origin and Vite proxy forwards to backend; production uses VITE_API_URL or same-origin.
export function getApiBase(): string {
  if (import.meta.env.DEV) return ''; // dev: same-origin → Vite proxy → localhost:3000
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return '';
}

const API_BASE = getApiBase()

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000, // 30 seconds
  withCredentials: true, // Enable cookies for session management
})

// Retry logic for network errors
const retryRequest = async (config: any, retries = 1): Promise<any> => {
  try {
    return await axios(config)
  } catch (error: any) {
    // Only retry on network errors, not HTTP errors
    if (retries > 0 && (!error.response || error.code === 'ECONNREFUSED' || error.message?.includes('Network Error'))) {
      await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1s before retry
      return retryRequest(config, retries - 1)
    }
    throw error
  }
}

// Request interceptor to ensure Content-Type is set and add /api prefix
api.interceptors.request.use(
  (config) => {
    // Ensure all requests use /api prefix
    if (config.url && !config.url.startsWith('/api') && !config.url.startsWith('http')) {
      config.url = `/api${config.url.startsWith('/') ? '' : '/'}${config.url}`
    }
    
    // Ensure Content-Type is set for POST/PUT requests with data
    if ((config.method === 'post' || config.method === 'put' || config.method === 'patch') && config.data) {
      if (!config.headers['Content-Type']) {
        config.headers['Content-Type'] = 'application/json'
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Helper function to get user-friendly error message (uses backend code + message when present)
function getUserFriendlyError(error: any): string {
  if (!error.response) {
    if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
      return 'تعذر الاتصال بالخادم. يرجى المحاولة لاحقاً'
    }
    return 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى'
  }

  const data = error.response.data
  const status = error.response.status
  const contentType = error.response.headers?.['content-type'] || ''
  const body = data

  // Backend returned HTML (wrong server / proxy misconfigured)
  if (typeof body === 'string' && body.trimStart().startsWith('<')) {
    return 'Backend route not found / proxy misconfigured. Check Vite proxy and backend port.'
  }
  if (contentType.includes('text/html')) {
    return 'Backend route not found / proxy misconfigured. Check Vite proxy and backend port.'
  }

  const code = data?.code
  const message = data?.message || ''

  // Use backend code + message when present (e.g. INVALID_CREDENTIALS, DB_UNAVAILABLE)
  if (code && message) {
    return message
  }
  if (message && !message.includes('Token') && !message.includes('JWT') && !message.includes('unauthorized')) {
    return message
  }

  if (status === 401) return message || 'بيانات الدخول غير صحيحة'
  if (status === 403) return message || 'يجب تسجيل الدخول للوصول إلى هذه الصفحة'
  if (status === 503) return message || 'الخدمة غير متاحة مؤقتًا.'
  if (status === 404) return 'المحتوى المطلوب غير موجود'
  if (status === 500) return message || 'حدث خطأ في الخادم. يرجى المحاولة لاحقاً'

  return 'حدث خطأ. يرجى المحاولة مرة أخرى'
}

// Response interceptor with retry logic and error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle 401/403 errors - Smart Redirect (before any other processing)
    if (error.response) {
      const status = error.response.status
      const isAuthError = status === 401 || status === 403

      if (isAuthError) {
        const currentPath = window.location.pathname + window.location.search
        const isLoginOrRegister = currentPath.includes('/login') || currentPath.includes('/register') || currentPath.includes('/signup') || currentPath.includes('/admin/login')
        const authUrl = error.config?.url || ''
        const isAuthRequest = authUrl.includes('/api/auth/login') || authUrl.includes('/api/auth/register') || authUrl.includes('/api/auth/customer/signup') || authUrl.includes('/api/auth/customer/login')

        // Don't redirect when 401 is from login/register attempt (wrong credentials)
        if (isAuthRequest) {
          // Clear auth so UI can show error; do not redirect
          localStorage.removeItem('tomo_token')
          localStorage.removeItem('tomo_user')
        } else {
          if (!isLoginOrRegister) localStorage.setItem('intended_url', currentPath)
          localStorage.removeItem('tomo_token')
          localStorage.removeItem('tomo_user')
          if (!isLoginOrRegister) {
            const isAdminPath = currentPath.startsWith('/admin') && !currentPath.startsWith('/admin/login')
            const loginPath = isAdminPath ? '/admin/login' : '/login'
            const redirectParam = isAdminPath ? '?redirect=' + encodeURIComponent(currentPath) : ''
            window.location.href = loginPath + redirectParam
            return Promise.reject(new Error('Redirecting to login...'))
          }
        }
      }
    }

    // Retry once on network errors
    const originalRequest = error.config
    if (
      (!error.response || error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true
      try {
        await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1s
        return await api(originalRequest)
      } catch (retryError) {
        // Retry failed, continue with error handling
      }
    }

    // For non-auth errors, log technical details but don't expose to user
    if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
      console.error('❌ Network Error: Backend server may not be running')
    } else {
      const data = error.response?.data
      const code = data?.code
      const message = data?.message
      console.error('API Error:', code ? `[${code}] ${message}` : message || error.message, { status: error.response?.status, url: error.config?.url })
    }

    // Attach user-friendly message to error object
    error.userMessage = getUserFriendlyError(error)
    
    return Promise.reject(error)
  }
)

// إضافة التوكن تلقائياً للطلبات المحمية
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tomo_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export interface Product {
  id: number
  name: string
  name_ar?: string
  name_en?: string
  price: number | string
  description?: string
  description_ar?: string
  description_en?: string
  image_url?: string
  unit?: string
  price_per_unit?: number
  unit_step?: number
  category_id?: number
  is_featured?: boolean | string | number
  discount_price?: number | string
  discount_percentage?: number
}

export interface User {
  id: number
  name: string
  full_name?: string
  phone?: string
  email: string
  role?: string
  status?: string
  force_password_change?: boolean
}

export interface CartItem {
  product: Product
  quantity: number
}

// Auth APIs
export const authAPI = {
  register: async (name: string, email: string, password: string, phone?: string) => {
    const res = await api.post('/api/auth/register', { 
      name, 
      full_name: name,
      email, 
      password,
      phone: phone || null
    })
    if (res.data.token) {
      localStorage.setItem('tomo_token', res.data.token)
      // حفظ بيانات المستخدم مع role
      const userData = {
        id: res.data.user.id,
        name: res.data.user.full_name || res.data.user.name,
        full_name: res.data.user.full_name || res.data.user.name,
        email: res.data.user.email,
        phone: res.data.user.phone,
        role: res.data.user.role || 'customer',
        status: res.data.user.status || 'active'
      }
      localStorage.setItem('tomo_user', JSON.stringify(userData))
    }
    return res.data
  },
  login: async (email: string, password: string) => {
    const res = await api.post('/api/auth/login', { email, password })
    if (res.data.token) {
      localStorage.setItem('tomo_token', res.data.token)
      const u = res.data.user
      const userData: User = {
        id: u.id,
        name: u.full_name || u.name,
        full_name: u.full_name || u.name,
        email: u.email,
        phone: u.phone,
        role: u.role || 'customer',
        status: u.status || 'active',
        force_password_change: !!u.force_password_change
      }
      localStorage.setItem('tomo_user', JSON.stringify(userData))
    }
    return res.data
  },
  logout: () => {
    localStorage.removeItem('tomo_token')
    localStorage.removeItem('tomo_user')
  },
  getCurrentUser: (): User | null => {
    try {
      const userStr = localStorage.getItem('tomo_user')
      return userStr ? JSON.parse(userStr) : null
    } catch {
      return null
    }
  },
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('tomo_token')
  },
  changePassword: async (newPassword: string, confirmPassword: string) => {
    const res = await api.post('/api/auth/change-password', { newPassword, confirmPassword })
    return res.data
  },
  updateStoredUser: (updates: Partial<User>) => {
    const user = authAPI.getCurrentUser()
    if (!user) return
    const next = { ...user, ...updates }
    localStorage.setItem('tomo_user', JSON.stringify(next))
  },
}

export const adminUserAPI = {
  resetPassword: async (userId: number) => {
    const res = await api.post(`/api/admin/users/${userId}/reset-password`)
    return res.data
  },
}

// Customer auth (signup/login) — phone or email, stores token same as authAPI
export type CustomerSignupPayload = {
  name: string
  password: string
  marketing_opt_in?: boolean
  channel_opt_in?: { whatsapp?: boolean; sms?: boolean; email?: boolean; push?: boolean }
} & ({ phone: string; email?: never } | { email: string; phone?: never })
export type CustomerLoginPayload = { password: string } & ({ phone: string; email?: never } | { email: string; phone?: never })

function isEmailLike(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((s || '').trim())
}

export const customerAuthAPI = {
  signup: async (payload: CustomerSignupPayload) => {
    const body: Record<string, unknown> = { name: payload.name.trim(), password: payload.password }
    if ('phone' in payload && payload.phone?.trim()) body.phone = payload.phone.trim()
    else if ('email' in payload && payload.email?.trim()) body.email = payload.email.trim()
    if (payload.marketing_opt_in === true) {
      body.marketing_opt_in = true
      body.channel_opt_in = payload.channel_opt_in || { whatsapp: true }
    }
    const res = await api.post('/api/auth/customer/signup', body)
    if (res.data?.token) {
      localStorage.setItem('tomo_token', res.data.token)
      const u = res.data.user
      const userData = { id: u.id, name: u.name, full_name: u.name, email: null as string | null, phone: null as string | null, role: u.role || 'customer', status: 'active' }
      localStorage.setItem('tomo_user', JSON.stringify(userData))
    }
    return res.data
  },
  login: async (phoneOrEmail: string, password: string) => {
    const body = isEmailLike(phoneOrEmail)
      ? { email: phoneOrEmail.trim(), password }
      : { phone: phoneOrEmail.trim(), password }
    const res = await api.post('/api/auth/customer/login', body)
    if (res.data?.token) {
      localStorage.setItem('tomo_token', res.data.token)
      const u = res.data.user
      const userData = { id: u.id, name: u.name, full_name: u.name, email: null as string | null, phone: null as string | null, role: u.role || 'customer', status: 'active' }
      localStorage.setItem('tomo_user', JSON.stringify(userData))
    }
    return res.data
  },
}

// Product APIs
export const productAPI = {
  getAll: async (storeId?: number, customerLat?: number, customerLon?: number): Promise<Product[]> => {
    try {
      const params: any = { _t: Date.now() }
      if (storeId) params.store_id = storeId
      if (customerLat) params.customer_lat = customerLat
      if (customerLon) params.customer_lon = customerLon
      const res = await api.get('/api/products', { params })
      console.log('📦 API Response type:', typeof res.data, 'Is array:', Array.isArray(res.data))
      
      // Backend returns { products: [...], store: {...} } or just array
      if (Array.isArray(res.data)) {
        console.log('✅ Returning array directly, count:', res.data.length)
        return res.data
      } else if (res.data && Array.isArray(res.data.products)) {
        console.log('✅ Returning products from object, count:', res.data.products.length)
        return res.data.products
      } else {
        console.warn('⚠️ No products found in response')
        return []
      }
    } catch (error) {
      console.error('❌ Error fetching products:', error)
      return []
    }
  },
  getById: async (id: number): Promise<Product> => {
    const res = await api.get(`/api/products/${id}?_t=${Date.now()}`)
    return res.data
  },
}

// Order APIs
export const orderAPI = {
  create: async (data: {
    items: { product_id: number; quantity: number; unit_price: number; unit?: string }[]
    delivery_address?: string
    delivery_latitude?: number | null
    delivery_longitude?: number | null
    delivery_notes?: string
    payment_method?: 'cod' | 'online' | 'wallet'
  }) => {
    const res = await api.post('/api/orders', data)
    return res.data
  },
  getAll: async () => {
    const res = await api.get('/api/orders')
    return res.data
  },
  getById: async (id: number) => {
    const res = await api.get(`/api/orders/${id}`)
    return res.data
  },
  getStatusHistory: async (orderId: number) => {
    const res = await api.get(`/api/orders/${orderId}/status-history`)
    return res.data
  },
}

// Customer Addresses API
export const addressAPI = {
  getAll: async () => {
    const res = await api.get('/api/customer-addresses')
    return res.data
  },
  create: async (data: {
    label?: string
    lat: number
    lng: number
    address_text?: string
    zone_id?: number
  }) => {
    const res = await api.post('/api/customer-addresses', data)
    return res.data
  },
  update: async (id: number, data: {
    label?: string
    lat?: number
    lng?: number
    address_text?: string
    zone_id?: number
  }) => {
    const res = await api.put(`/api/customer-addresses/${id}`, data)
    return res.data
  },
  delete: async (id: number) => {
    const res = await api.delete(`/api/customer-addresses/${id}`)
    return res.data
  },
}

export default api

