import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { authAPI } from '../utils/api'
import api from '../utils/api'

export default function Login() {
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    full_name: '',
    phone: '',
    email: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreateAdmin, setShowCreateAdmin] = useState(false)
  const [createAdminData, setCreateAdminData] = useState({ name: 'مدير النظام', email: 'admin@tomo.com', password: '123456' })
  const [createAdminLoading, setCreateAdminLoading] = useState(false)
  const [createAdminError, setCreateAdminError] = useState<string | null>(null)
  const [createAdminSuccess, setCreateAdminSuccess] = useState<string | null>(null)
  const [health, setHealth] = useState<{ server: boolean; db: boolean } | null>(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/admin/login') {
      api.get('/api/health').then((r) => {
        setHealth({ server: true, db: !!r.data?.db })
      }).catch(() => setHealth({ server: false, db: false }))
    }
  }, [])

  // إذا كان المستخدم مسجل دخول بالفعل، توجيهه للصفحة المطلوبة
  useEffect(() => {
    if (authAPI.isAuthenticated()) {
      const user = authAPI.getCurrentUser()
      const adminRoles = ['super_admin', 'admin']
      const isAdmin = user && adminRoles.includes(user.role || '')

      // Check for intended URL first (from localStorage), then location state, then default
      const intendedUrl = localStorage.getItem('intended_url')
      const fromState = (location.state as any)?.from
      let redirectTo = intendedUrl || fromState || '/'
      
      // Clear intended URL
      if (intendedUrl) {
        localStorage.removeItem('intended_url')
      }
      
      // Clear admin redirecting flag if set
      sessionStorage.removeItem('admin_redirecting')
      
      // Admin users should go to /admin if no intended URL
      if (isAdmin && !intendedUrl && !fromState) {
        redirectTo = '/admin'
      }
      
      // Don't redirect if user is trying to access login page directly
      if (window.location.pathname === '/login' && !intendedUrl && !fromState) {
        // Allow user to stay on login page or go to admin if admin
        if (isAdmin) {
          navigate('/admin', { replace: true })
        }
        return
      }
      
      navigate(redirectTo, { replace: true })
    }
  }, [navigate, location])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      let response
      if (isLogin) {
        response = await authAPI.login(formData.email, formData.password)
      } else {
        if (!formData.name) {
          setError('الاسم مطلوب')
          setLoading(false)
          return
        }
        response = await authAPI.register(
          formData.full_name || formData.name, 
          formData.email, 
          formData.password,
          formData.phone
        )
      }
      
      await new Promise(resolve => setTimeout(resolve, 100))

      const user = authAPI.getCurrentUser()
      let redirectPath: string

      // Server can require password change: use redirectPath from response (no other access until changed)
      if (response?.redirectPath) {
        redirectPath = response.redirectPath
      } else {
        const intendedUrl = localStorage.getItem('intended_url')
        const fromState = (location.state as any)?.from
        redirectPath = intendedUrl || fromState || '/'
        if (intendedUrl) localStorage.removeItem('intended_url')

        if (user) {
          const adminRoles = ['super_admin', 'admin']
          const isAdmin = adminRoles.includes(user.role || '')
          const isDriver = user.role === 'driver'
          const isCustomer = user.role === 'customer' || !user.role

          if (isAdmin) {
            redirectPath = redirectPath.startsWith('/admin') ? redirectPath : '/admin'
          } else if (isDriver) {
            redirectPath = redirectPath.startsWith('/driver') ? redirectPath : '/driver/tasks'
          } else if (isCustomer) {
            redirectPath = redirectPath.startsWith('/admin') ? '/' : (redirectPath || '/')
          }
        }
      }

      window.location.href = redirectPath
    } catch (err: any) {
      const code = err.response?.data?.code
      const message = err.response?.data?.message
      const detail = err.response?.data?.detail
      let msg = message || 'حدث خطأ في تسجيل الدخول'
      const status = err.response?.status
      if (!err.response) {
        msg = 'تعذر الاتصال بالخادم. تأكد من تشغيل الخادم الخلفي (Backend) على المنفذ 3000.'
      } else if (status === 503 || code === 'DB_UNAVAILABLE') {
        msg = 'الخدمة غير متاحة مؤقتًا.'
      } else if (status === 500) {
        msg = message || 'حدث خطأ في الخادم. يرجى المحاولة لاحقاً.'
      } else if (code === 'INVALID_CREDENTIALS') {
        msg = 'البريد أو كلمة المرور غير صحيحة.'
      } else if (typeof window !== 'undefined' && import.meta.env?.DEV && detail) {
        msg = message ? `${message} (${detail})` : detail
      }
      setError(msg)
      setLoading(false)
    }
  }

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateAdminError(null)
    setCreateAdminSuccess(null)
    setCreateAdminLoading(true)
    try {
      await api.post('/api/auth/create-admin', {
        name: createAdminData.name.trim(),
        email: createAdminData.email.trim(),
        password: createAdminData.password,
      })
      setCreateAdminSuccess('تم إنشاء المدير. سجّل الدخول بالبريد وكلمة المرور أعلاه.')
      setFormData((prev) => ({ ...prev, email: createAdminData.email, password: createAdminData.password }))
      setIsLogin(true)
    } catch (err: any) {
      const code = err.response?.data?.code
      const message = err.response?.data?.message
      if (!err.response) {
        setCreateAdminError('تعذر الاتصال بالخادم. تأكد من تشغيل الخادم الخلفي (Backend) على المنفذ 3000.')
      } else if (err.response?.status === 503 || code === 'DB_UNAVAILABLE') {
        setCreateAdminError('الخدمة غير متاحة مؤقتًا.')
      } else {
        setCreateAdminError(message || 'فشل إنشاء المدير.')
      }
    } finally {
      setCreateAdminLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-8">
      {health && window.location.pathname === '/admin/login' && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${health.server && health.db ? 'bg-green-50 text-green-800 border border-green-200' : health.server ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {!health.server && <span>الخادم الخلفي غير متصل. شغّل Backend على المنفذ 3000.</span>}
          {health.server && !health.db && <span>الخدمة غير متاحة مؤقتًا.</span>}
          {health.server && health.db && <span>الخادم وقاعدة البيانات متصلان. يمكنك تسجيل الدخول.</span>}
        </div>
      )}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6">
          {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
        </h2>
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">الاسم الكامل</label>
                <input
                  type="text"
                  value={formData.full_name || formData.name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required={!isLogin}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">الهاتف (اختياري)</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="05xxxxxxxx"
                />
              </div>
            </>
          )}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">البريد الإلكتروني</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">كلمة المرور</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              required
            />
          </div>
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-secondary hover:bg-secondary-dark disabled:bg-gray-400 text-white py-2 rounded-lg"
          >
            {loading ? 'جاري المعالجة...' : isLogin ? 'تسجيل الدخول' : 'إنشاء حساب'}
          </button>
        </form>
        <div className="mt-4 text-center text-sm">
          {isLogin ? (
            <span>
              ليس لديك حساب؟{' '}
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className="text-secondary hover:underline"
              >
                إنشاء حساب
              </button>
            </span>
          ) : (
            <span>
              لديك حساب؟{' '}
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className="text-secondary hover:underline"
              >
                تسجيل الدخول
              </button>
            </span>
          )}
        </div>

        {/* إنشاء مدير (للتطوير) - يظهر في صفحة أدمن */}
        {typeof window !== 'undefined' && window.location.pathname === '/admin/login' && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => { setShowCreateAdmin((v) => !v); setCreateAdminError(null); setCreateAdminSuccess(null); }}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              {showCreateAdmin ? '▼ إخفاء' : '▶ إنشاء مدير (تطوير)'}
            </button>
            {showCreateAdmin && (
              <form onSubmit={handleCreateAdmin} className="mt-3 space-y-2">
                <input
                  type="text"
                  value={createAdminData.name}
                  onChange={(e) => setCreateAdminData((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="الاسم"
                  required
                />
                <input
                  type="email"
                  value={createAdminData.email}
                  onChange={(e) => setCreateAdminData((p) => ({ ...p, email: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="البريد الإلكتروني"
                  required
                />
                <input
                  type="password"
                  value={createAdminData.password}
                  onChange={(e) => setCreateAdminData((p) => ({ ...p, password: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="كلمة المرور"
                  required
                  minLength={6}
                />
                {createAdminError && <div className="p-2 bg-red-50 text-red-700 rounded text-sm">{createAdminError}</div>}
                {createAdminSuccess && <div className="p-2 bg-green-50 text-green-700 rounded text-sm">{createAdminSuccess}</div>}
                <button
                  type="submit"
                  disabled={createAdminLoading}
                  className="w-full py-2 px-3 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50"
                >
                  {createAdminLoading ? 'جاري الإنشاء...' : 'إنشاء مدير'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

