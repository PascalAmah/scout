import { useMutation } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'

import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useRegister } from '../features/auth/hooks'
import { ApiRequestError } from '../lib/api-client'

export const Route = createFileRoute('/_auth/register')({
  component: RegisterPage,
})

function RegisterPage() {
  const register = useRegister()
  const navigate = Route.useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => register(email, password, fullName || undefined),
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
      <h1 className="text-lg font-semibold text-[#1F2937] mb-1">Create your workspace</h1>
      <p className="text-sm text-[#6B7280] mb-6">Save startups, and Scout researches them.</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#1F2937] mb-1" htmlFor="fullName">
            Full name
          </label>
          <Input
            id="fullName"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
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
          <label className="block text-sm font-medium text-[#1F2937] mb-1" htmlFor="password">
            Password
          </label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-[#A23B2A]">{error}</p>}
        <Button type="submit" loading={mutation.isPending} className="w-full">
          {mutation.isPending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-[#6B7280]">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-[#0F6E56] hover:underline">
          Sign in
        </Link>
      </p>
    </>
  )
}