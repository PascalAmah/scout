import { refreshAccessToken, tokens } from './auth'

export const API_BASE = import.meta.env.VITE_API_BASE ?? '/v1'

export interface ApiErrorBody {
  error: { code: string; message: string; details?: Record<string, unknown> }
}

export interface User {
  id: string
  email: string
  full_name: string | null
  role: string
  email_reminders_enabled: boolean
  created_at: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user: User
}

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

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const request = async (): Promise<Response> => {
    const headers = new Headers(options.headers)
    if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    const access = tokens.access
    if (access) headers.set('Authorization', `Bearer ${access}`)
    return fetch(`${API_BASE}${path}`, { ...options, headers })
  }

  let res = await request()
  if (res.status === 401 && tokens.refresh) {
    await refreshAccessToken()
    res = await request()
  }

  if (!res.ok) {
    let body: ApiErrorBody | undefined
    try {
      body = (await res.json()) as ApiErrorBody
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