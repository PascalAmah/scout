import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'

import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { ApiRequestError } from '../../../lib/api-client'
import { resetPasswordRequest } from '../api'
import { AuthBrandPanel } from '../components/AuthBrandPanel'
import { AuthField } from '../components/AuthField'
import { AuthFormShell } from '../components/AuthFormShell'
import { AuthSplit } from '../components/AuthSplit'

/**
 * Forgot-password request + sent states (scout_forgot_password.html), presented
 * in the two-column auth split like login/signup. Submitting a valid email
 * transitions the form column to the "Check your email" confirmation with the
 * submitted address and a resend action. The reset endpoint always succeeds to
 * avoid leaking whether an account exists, so this is a client-side transition.
 */
export function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sentFor, setSentFor] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (em: string) => resetPasswordRequest(em),
    onSuccess: (_data, em) => {
      setError(null)
      setSentFor(em)
    },
  })

  function send(em: string) {
    setError(null)
    mutation.mutate(em, {
      onError: (err) =>
        setError(
          err instanceof ApiRequestError ? err.message : 'Something went wrong. Try again.',
        ),
    })
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    send(email)
  }

  const form = (
    <AuthFormShell
      title={sentFor ? 'Check your email' : 'Forgot your password?'}
      lede={
        sentFor
          ? "If an account exists for that address, we've sent a link to reset your password. It expires in 60 minutes."
          : "Enter the email on your Scout account and we'll send you a link to set a new one."
      }
      footer={
        <Link to="/login" className="font-semibold text-emerald-dark underline hover:text-charcoal">
          ← Back to sign in
        </Link>
      }
    >
      {sentFor ? (
        <>
          <div className="mb-4 flex items-center gap-3 rounded-[14px] border border-line bg-paper p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-tint">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="h-5 w-5 stroke-emerald-dark" aria-hidden>
                <path d="M4 4h16v16H4z" />
                <path d="M4 6l8 7 8-7" />
              </svg>
            </div>
            <span className="font-mono text-[13px] text-charcoal">{sentFor}</span>
          </div>
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs text-muted-2">Didn't get it?</span>
            <button
              type="button"
              onClick={() => send(sentFor)}
              disabled={mutation.isPending}
              className="text-xs font-semibold text-emerald-dark transition-colors hover:underline disabled:opacity-50"
            >
              {mutation.isPending ? 'Sending…' : 'Resend link'}
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={onSubmit}>
          <AuthField label="Email">
            <Input
              id="fp-email"
              type="email"
              required
              autoComplete="email"
              placeholder="jane@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </AuthField>
          {error ? (
            <p className="mb-4 flex items-center gap-1.5 text-xs text-brick" role="alert">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="h-[13px] w-[13px] shrink-0 stroke-brick" aria-hidden>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5M12 16h.01" />
              </svg>
              {error}
            </p>
          ) : null}
          <Button type="submit" variant="accent" loading={mutation.isPending} className="w-full">
            {mutation.isPending ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      )}
    </AuthFormShell>
  )

  return (
    <AuthSplit
      form={form}
      brand={
        <AuthBrandPanel foot="© 2026 Scout · You always click send">
          <h2 className="font-serif text-[32px] font-semibold leading-[1.2] tracking-[-0.5px]">
            Reset happens in your inbox.
          </h2>
          <p className="mb-7 mt-3.5 text-[14.5px] leading-relaxed text-[#9AA6B2]">
            We'll send a secure reset link to the address on your account. It stays valid for 60
            minutes, and you're back in — no friction.
          </p>
          <div className="mb-3.5 flex items-center gap-4 rounded-[22px] border border-[#232B36] bg-[#141A22] p-5">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="h-6 w-6 shrink-0 stroke-[#7FCBA0]" aria-hidden>
              <path d="M4 4h16v16H4z" />
              <path d="M4 6l8 7 8-7" />
            </svg>
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-semibold text-white">Secure reset links</p>
              <p className="text-xs text-[#8B96A4]">Valid for 60 minutes</p>
            </div>
          </div>
          <div className="mt-1.5 flex gap-[22px]">
            <div>
              <p className="font-mono text-xl font-semibold text-white">60</p>
              <p className="text-[11.5px] text-[#8B96A4]">Minutes</p>
            </div>
            <div>
              <p className="font-mono text-xl font-semibold text-white">1</p>
              <p className="text-[11.5px] text-[#8B96A4]">Email sent</p>
            </div>
            <div>
              <p className="font-mono text-xl font-semibold text-white">0</p>
              <p className="text-[11.5px] text-[#8B96A4]">Lockouts</p>
            </div>
          </div>
        </AuthBrandPanel>
      }
    />
  )
}