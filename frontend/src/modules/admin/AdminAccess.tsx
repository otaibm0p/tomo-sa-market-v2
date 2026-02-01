import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../../utils/api'

export default function AdminAccess() {
  const navigate = useNavigate()

  useEffect(() => {
    // التحقق من المصادقة
    if (!authAPI.isAuthenticated()) {
      console.log('❌ يجب تسجيل الدخول أولاً')
      navigate('/login', { state: { from: '/admin' } })
      return
    }

    // التحقق من أن المستخدم لديه صلاحيات أدمن (يمكن إضافة هذا لاحقاً)
    const user = authAPI.getCurrentUser()
    console.log('✅ المستخدم مسجل دخول:', user)

    // توجيه لصفحة الأدمن
    navigate('/admin', { replace: true })
  }, [navigate])

  return (
    <div className="flex justify-center items-center min-h-[400px]">
      <div className="text-lg">جاري التحقق من الصلاحيات...</div>
    </div>
  )
}


