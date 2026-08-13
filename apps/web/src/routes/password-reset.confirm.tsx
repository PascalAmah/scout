import { useMutation } from '@tanstack/react-query'
import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'

import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { resetPasswordConfirm } from '../features/auth/api'
import { ApiRequestError } from '../lib/api-client'

export const Route = createFileRoute('/password-reset/confirm')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
  beforeLoad: ({ search }) => {
    if (!search.token) throw redirect({ to: '/password-reset' })
  },
  component: ConfirmResetPage,
})

function ConfirmResetPage() {
  const { token } = Route.useSearch()
  const navigate = Route.useNavigate()

  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (pw: string) => resetPasswordConfirm(token, pw),
    onSuccess: () => {
      setMessage('Password updated. You can sign in now.')
      navigate({ to: '/login' })
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    mutation.mutate(password, {
      onError: (err) =>
        setError(
          err instanceof ApiRequestError ? err.message : 'Something went wrong. Try again.',
        ),
    })
  }

  return (
    <>
      <h1 className="text-lg font-semibold text-[#1F2937] mb-1">Set a new password</h1>
      <p className="text-sm text-[#6B7280] mb-6">Choose a new password for your account.</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#1F2937] mb-1" htmlFor="pw">
            New password
          </label>
          <Input
            id="pw"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-[#A23B2A]">{error}</p>}
        {message && <p className="text-sm text-[#0F6E56]">{message}</p>}
        <div className="space-y-3">
          <Button type="submit" loading={mutation.isPending} className="w-full">
            {mutation.isPending ? 'Resetting…' : 'Reset password'}
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