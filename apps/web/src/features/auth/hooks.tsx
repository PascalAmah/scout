import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react'

import { tokens } from '../../lib/auth'
import { clearExtensionSession, pushSessionToExtension } from '../../lib/extension-auth'
import {
  loadThread,
  saveThread,
  setActiveAssistantUser,
  useAssistantStore,
} from '../../stores/assistant-store'
import { useOnboardingStore } from '../../stores/onboarding-store'
import { type TokenResponse, type User } from '../../lib/api-client'
import {
  completeOnboardingRequest,
  loginRequest,
  logoutRequest,
  patchUser,
  registerRequest,
  sessionQueryOptions,
  type LoginBody,
  type OnboardingBody,
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
  pushSessionToExtension(tokensResult.access_token, tokensResult.refresh_token)
  return tokensResult.user
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  const sessionQuery = useQuery(sessionQueryOptions)

  // The signed-in user's id. When it changes (logout A → null, or A → B) we
  // persist the outgoing user's assistant thread under their own key, load the
  // incoming user's thread (empty when logged out), and drop the previous
  // account's onboarding wizard state — so conversations stay per-account and
  // never leak across accounts. First hydration loads the logged-in user's own
  // persisted thread (full page reload).
  const userId = sessionQuery.data?.id ?? null
  const prevUserId = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    const prev = prevUserId.current
    const next = userId
    prevUserId.current = next

    const assistant = useAssistantStore.getState()

    // First hydration: a returning user (already logged in on page reload) loads
    // their *own* persisted thread — never another account's.
    if (prev === undefined) {
      setActiveAssistantUser(next)
      if (next) assistant.setThread(loadThread(next))
      return
    }

    // Persist the previous identity's thread under their own key before leaving.
    if (prev) saveThread(prev, assistant.thread)

    // Load the incoming identity's thread (empty when logged out).
    setActiveAssistantUser(next)
    assistant.setThread(next ? loadThread(next) : [])

    // Never carry the previous account's onboarding wizard state into another.
    useOnboardingStore.getState().reset()
  }, [userId])

  // On boot (page reload with tokens already in localStorage), re-push the
  // session to the extension so it stays in sync across browser restarts.
  useEffect(() => {
    if (sessionQuery.data) {
      const access = tokens.access
      const refresh = tokens.refresh
      if (access && refresh) pushSessionToExtension(access, refresh)
    }
  }, [sessionQuery.data])

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
      clearExtensionSession()
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

export function useCompleteOnboarding() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: OnboardingBody) => completeOnboardingRequest(body),
    onSuccess: (updated) => {
      queryClient.setQueryData(['me'], updated)
    },
  })
}