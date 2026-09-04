const API_BASE =
  (typeof process !== 'undefined' && process.env.PLASMO_PUBLIC_API_BASE) ||
  'http://localhost:8000/v1'

/** Base URL of the Scout web app — used by the popup for register/open links. */
export const WEB_BASE =
  (typeof process !== 'undefined' && process.env.PLASMO_PUBLIC_WEB_BASE) ||
  'http://localhost:5173'

if (
  typeof process !== 'undefined' &&
  process.env.NODE_ENV === 'production' &&
  (!process.env.PLASMO_PUBLIC_API_BASE || !process.env.PLASMO_PUBLIC_WEB_BASE)
) {
  console.error(
    '[scout] Production build is missing PLASMO_PUBLIC_API_BASE / PLASMO_PUBLIC_WEB_BASE — ' +
      'check apps/extension/.env.production. Falling back to localhost URLs.',
  )
}

import type { TokenResponse, User } from '@scout/types'

export type { TokenResponse, User }

export class ApiRequestError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.code = code
  }
}

const ACCESS_KEY = 'access_token'
const REFRESH_KEY = 'refresh_token'

export async function getTokens(): Promise<{ access: string; refresh: string } | null> {
  const data = await chrome.storage.local.get([ACCESS_KEY, REFRESH_KEY])
  if (typeof data[ACCESS_KEY] === 'string' && typeof data[REFRESH_KEY] === 'string') {
    return { access: data[ACCESS_KEY], refresh: data[REFRESH_KEY] }
  }
  return null
}

export async function setTokens(access: string, refresh: string): Promise<void> {
  await chrome.storage.local.set({ [ACCESS_KEY]: access, [REFRESH_KEY]: refresh })
}

export async function clearTokens(): Promise<void> {
  await chrome.storage.local.remove([ACCESS_KEY, REFRESH_KEY])
}

/**
 * Exchange the stored refresh token for a fresh pair. Returns false (and
 * clears tokens) when the refresh token itself is invalid/expired, so the
 * popup falls through to its AuthExpired/login state.
 */
async function refreshTokens(): Promise<boolean> {
  const tokens = await getTokens()
  if (!tokens?.refresh) return false
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: tokens.refresh }),
  })
  if (!res.ok) {
    await clearTokens()
    return false
  }
  const data = (await res.json()) as TokenResponse
  await setTokens(data.access_token, data.refresh_token)
  return true
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const request = async (): Promise<Response> => {
    const headers = new Headers(options.headers)
    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    const tokens = await getTokens()
    if (tokens) headers.set('Authorization', `Bearer ${tokens.access}`)
    return fetch(`${API_BASE}${path}`, { ...options, headers })
  }

  let res = await request()
  // Access tokens live 15 min; refresh (with the stored 30-day refresh token)
  // once on 401 so the extension session outlives the web session.
  if (res.status === 401 && (await refreshTokens())) {
    res = await request()
  }

  if (!res.ok) {
    let body: { error?: { code?: string; message?: string } } | undefined
    try {
      body = (await res.json()) as typeof body
    } catch {
      // non-JSON error body
    }
    throw new ApiRequestError(
      res.status,
      body?.error?.code ?? 'HTTP_ERROR',
      body?.error?.message ?? res.statusText,
    )
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
