import { Navigate, useLocation } from 'react-router-dom'
import { authAPI } from '../utils/api'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
  requireRole?: string[]
}

export default function ProtectedRoute({ 
  children, 
  requireAuth = true,
  requireRole 
}: ProtectedRouteProps) {
  const location = useLocation()
  const isAuthenticated = authAPI.isAuthenticated()
  const user = authAPI.getCurrentUser()

  // If authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    // Save intended URL
    const currentPath = location.pathname + location.search
    localStorage.setItem('intended_url', currentPath)
    
    // Redirect to login
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // If role is required, check user role
  if (requireRole && user) {
    const hasRequiredRole = requireRole.includes(user.role || 'customer')
    
    if (!hasRequiredRole) {
      // User doesn't have required role - redirect to home or admin dashboard
      const redirectTo = user.role === 'admin' || user.role === 'super_admin' ? '/admin' : '/'
      return <Navigate to={redirectTo} replace />
    }
  }

  // User is authenticated and has required role (if specified)
  return <>{children}</>
}

