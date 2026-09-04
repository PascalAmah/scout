import { ApiRequestError, API_BASE, type TokenResponse } from './api-client'
import { pushSessionToExtension } from './extension-auth'

const ACCESS_KEY = 'scout.access_token'
const REFRESH_KEY = 'scout.refresh_token'

export const tokens = {
  get access(): string | null {
    return localStorage.getItem(ACCESS_KEY)
  },
  get refresh(): string | null {
    return localStorage.getItem(REFRESH_KEY)
  },
  set(access: string, refresh: string): void {
    localStorage.setItem(ACCESS_KEY, access)
    localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear(): void {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

let refreshing: Promise<string> | null = null

export async function refreshAccessToken(): Promise<string> {
  if (!refreshing) {
    refreshing = (async () => {
      const refresh = tokens.refresh
      if (!refresh) {
        tokens.clear()
        throw new ApiRequestError(401, 'NO_REFRESH_TOKEN', 'Not authenticated')
      }
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refresh }),
      })
      if (!res.ok) {
        tokens.clear()
        throw new ApiRequestError(res.status, 'REFRESH_FAILED', 'Session expired')
      }
      const data = (await res.json()) as TokenResponse
      tokens.set(data.access_token, data.refresh_token)
      pushSessionToExtension(data.access_token, data.refresh_token)
      return data.access_token
    })().finally(() => {
      refreshing = null
    })
  }
  return refreshing
}