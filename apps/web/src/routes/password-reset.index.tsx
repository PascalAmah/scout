import { useMutation } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'

import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { resetPasswordRequest } from '../features/auth/api'
import { ApiRequestError } from '../lib/api-client'

export const Route = createFileRoute('/password-reset/')({
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const navigate = Route.useNavigate()

  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (em: string) => resetPasswordRequest(em),
    onSuccess: () =>
      setMessage(
        'If an account exists for that email, we sent a reset link. Check your inbox.',
      ),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    mutation.mutate(email, {
      onError: (err) =>
        setError(
          err instanceof ApiRequestError ? err.message : 'Something went wrong. Try again.',
        ),
    })
  }

  return (
    <>
      <h1 className="text-lg font-semibold text-[#1F2937] mb-1">Reset your password</h1>
      <p className="text-sm text-[#6B7280] mb-6">
        Enter your account email and we'll send you a reset link.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#1F2937] mb-1" htmlFor="em">
            Email
          </label>
          <Input
            id="em"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-[#A23B2A]">{error}</p>}
        {message && <p className="text-sm text-[#0F6E56]">{message}</p>}
        <div className="space-y-3">
          <Button type="submit" loading={mutation.isPending} className="w-full">
            {mutation.isPending ? 'Sending…' : 'Send reset link'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => navigate({ to: '/login' })}
          >
            Back to sign in
          </Button>
        </div>
      </form>
      <p className="mt-6 text-center text-sm text-[#6B7280]">
        Remembered it?{' '}
        <Link to="/login" className="font-medium text-[#0F6E56] hover:underline">
          Sign in
        </Link>
      </p>
    </>
  )
}