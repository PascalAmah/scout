import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useMemo, type ReactNode } from 'react'

import { tokens } from '../../lib/auth'
import { type TokenResponse, type User } from '../../lib/api-client'
import {
  loginRequest,
  logoutRequest,
  patchUser,
  registerRequest,
  sessionQueryOptions,
  type LoginBody,
  type RegisterBody,
  type UserPatchBody,
} from './api'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName?: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function applySession(tokensResult: TokenResponse) {
  tokens.set(tokensResult.access_token, tokensResult.refresh_token)
  return tokensResult.user
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  const sessionQuery = useQuery(sessionQueryOptions)

  const loginMutation = useMutation({
    mutationFn: (body: LoginBody) => loginRequest(body),
    onSuccess: (data) => {
      const user = applySession(data)
      queryClient.setQueryData(['me'], user)
    },
  })

  const registerMutation = useMutation({
    mutationFn: (body: RegisterBody) => registerRequest(body),
    onSuccess: (data) => {
      const user = applySession(data)
      queryClient.setQueryData(['me'], user)
    },
  })

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const refresh = tokens.refresh
      if (refresh) {
        try {
          await logoutRequest(refresh)
        } catch {
          // token may already be revoked — clear locally regardless
        }
      }
      tokens.clear()
      queryClient.setQueryData(['me'], null)
      queryClient.clear()
    },
  })

  const value = useMemo<AuthContextValue>(
    () => ({
      user: sessionQuery.data ?? null,
      isLoading: sessionQuery.isLoading,
      login: (email, password) =>
        loginMutation.mutateAsync({ email, password }).then(() => undefined),
      register: (email, password, fullName) =>
        registerMutation.mutateAsync({ email, password, fullName }).then(() => undefined),
      logout: () => logoutMutation.mutateAsync(undefined).then(() => undefined),
    }),
    [sessionQuery.data, sessionQuery.isLoading, loginMutation, registerMutation, logoutMutation],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function useSession(): { user: User | null; isLoading: boolean } {
  const { user, isLoading } = useAuth()
  return { user, isLoading }
}

export function useLogin() {
  return useAuth().login
}

export function useRegister() {
  return useAuth().register
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UserPatchBody) => patchUser(body),
    onSuccess: (updated) => {
      queryClient.setQueryData(['me'], updated)
    },
  })
}