import { useMutation } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'

import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useLogin } from '../features/auth/hooks'
import { ApiRequestError } from '../lib/api-client'

export const Route = createFileRoute('/_auth/login')({
  component: LoginPage,
})

function LoginPage() {
  const login = useLogin()
  const navigate = Route.useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => login(email, password),
    onSuccess: () => navigate({ to: '/dashboard' }),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    mutation.mutate(undefined, {
      onError: (err) =>
        setError(
          err instanceof ApiRequestError ? err.message : 'Something went wrong. Try again.',
        ),
    })
  }

  return (
    <>
      <h1 className="text-lg font-semibold text-[#1F2937] mb-1">Welcome back</h1>
      <p className="text-sm text-[#6B7280] mb-6">Sign in to your workspace.</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#1F2937] mb-1" htmlFor="email">
            Email
          </label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-[#1F2937]" htmlFor="password">
              Password
            </label>
            <Link
              to="/password-reset"
              className="text-xs text-[#0F6E56] hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-[#A23B2A]">{error}</p>}
        <Button type="submit" loading={mutation.isPending} className="w-full">
          {mutation.isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-[#6B7280]">
        New here?{' '}
        <Link to="/register" className="font-medium text-[#0F6E56] hover:underline">
          Create an account
        </Link>
      </p>
    </>
  )
}