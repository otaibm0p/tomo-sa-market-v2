import * as SecureStore from 'expo-secure-store'

const TOKEN_KEY = 'tomo_driver_token'
const USER_KEY = 'tomo_driver_user'

export type AuthUser = {
  id: number
  role?: string
  name?: string
  phone?: string
  email?: string
}

export async function setToken(token: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token)
}

export async function getToken() {
  return await SecureStore.getItemAsync(TOKEN_KEY)
}

export async function clearToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY)
}

export async function setAuthUser(user: AuthUser | null) {
  if (!user) {
    await SecureStore.deleteItemAsync(USER_KEY)
    return
  }
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user))
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export async function clearAuthUser() {
  await SecureStore.deleteItemAsync(USER_KEY)
}

