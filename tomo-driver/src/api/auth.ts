import { apiFetch } from './client'
import { setToken, clearToken, getToken, setAuthUser, clearAuthUser } from './authStorage'

export type LoginResponse = {
  token: string
  user?: { id: number; role?: string; name?: string; phone?: string; email?: string }
}

export async function loginWithEmail(email: string, password: string) {
  const res = await apiFetch<LoginResponse>('/auth/login', { method: 'POST', body: { email, password } })
  if (res?.token) await setToken(res.token)
  if (res?.user) await setAuthUser(res.user)
  return res
}

export async function logout() {
  await clearToken()
  await clearAuthUser()
}

export async function isLoggedIn() {
  const t = await getToken()
  return !!t
}

