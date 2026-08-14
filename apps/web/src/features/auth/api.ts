import { queryOptions } from '@tanstack/react-query'

import { api, type TokenResponse, type User } from '../../lib/api-client'

export const sessionQueryOptions = queryOptions({
  queryKey: ['me'],
  queryFn: () => api<User>('/auth/me'),
  retry: false,
})

export interface LoginBody {
  email: string
  password: string
}

export function loginRequest(body: LoginBody): Promise<TokenResponse> {
  return api<TokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export interface RegisterBody {
  email: string
  password: string
  fullName?: string
}

export function registerRequest(body: RegisterBody): Promise<TokenResponse> {
  return api<TokenResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: body.email, password: body.password, full_name: body.fullName ?? null }),
  })
}

export function logoutRequest(refreshToken: string): Promise<void> {
  return api<void>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
}

export interface UserPatchBody {
  email_reminders_enabled?: boolean
}

export function patchUser(body: UserPatchBody): Promise<User> {
  return api<User>('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function resetPasswordRequest(email: string): Promise<void> {
  return api<void>('/auth/password/reset-request', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function resetPasswordConfirm(token: string, password: string): Promise<void> {
  return api<void>('/auth/password/reset', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  })
}