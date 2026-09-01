import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'

import { Button } from '../../../components/ui/Button'
import { PasswordInput } from '../../../components/ui/PasswordInput'
import { ApiRequestError } from '../../../lib/api-client'
import { resetPasswordConfirm } from '../api'
import { AuthBrandPanel } from '../components/AuthBrandPanel'
import { AuthField } from '../components/AuthField'
import { AuthFormShell } from '../components/AuthFormShell'
import { AuthSplit } from '../components/AuthSplit'

/** Backend error codes that mean the reset link is no longer usable. */
const RESET_LINK_ERROR_CODES = new Set(['TOKEN_EXPIRED', 'INVALID_TOKEN'])

/**
 * Complete-reset flow (scout_forgot_password.html), in the two-column auth
 * split like login/signup. A valid token shows the "Set a new password" form;
 * when the token has expired or is invalid the backend returns
 * TOKEN_EXPIRED/INVALID_TOKEN (400) and we swap in the "This link has expired"
 * edge-case panel with an action back to the request.
 */
export function ConfirmResetPage() {
  const { token } = useSearch({ from: '/password-reset/confirm' })
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [linkExpired, setLinkExpired] = useState(false)

  const mutation = useMutation({
    mutationFn: (pw: string) => resetPasswordConfirm(token, pw),
    onSuccess: () => navigate({ to: '/login' }),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    mutation.mutate(password, {
      onError: (err) => {
        if (err instanceof ApiRequestError && RESET_LINK_ERROR_CODES.has(err.code)) {
          setLinkExpired(true)
          return
        }
        setError(
          err instanceof ApiRequestError ? err.message : 'Something went wrong. Try again.',
        )
      },
    })
  }

  const form = (
    <AuthFormShell
      title={linkExpired ? 'This link has expired' : 'Set a new password'}
      lede={
        linkExpired
          ? "Reset links are only valid for 60 minutes. Request a new one below — your password hasn't been changed."
          : 'Choose a new password for your account.'
      }
      footer={
        <Link to="/login" className="font-semibold text-emerald-dark underline hover:text-charcoal">
          ← Back to sign in
        </Link>
      }
    >
      {linkExpired ? (
        <>
          <div className="mb-4 flex items-center gap-3 rounded-[14px] border border-brick-tint bg-brick-tint/40 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brick-tint">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="h-5 w-5 stroke-brick" aria-hidden>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5M12 16h.01" />
              </svg>
            </div>
            <p className="text-[11.5px] leading-relaxed text-brick">
              <span className="font-semibold">Edge case</span> — the link you opened is no
              longer valid.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => navigate({ to: '/password-reset' })}
          >
            Request a new link
          </Button>
        </>
      ) : (
        <form onSubmit={onSubmit}>
          <AuthField label="New password">
            <PasswordInput
              id="pw"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </AuthField>
          <p className="-mt-1 mb-4 text-xs text-muted-2">Use at least 8 characters.</p>
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
            {mutation.isPending ? 'Resetting…' : 'Reset password'}
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
            A fresh password, in seconds.
          </h2>
          <p className="mb-7 mt-3.5 text-[14.5px] leading-relaxed text-[#9AA6B2]">
            Set a new password and get straight back to the job search. Your saved startups and
            applications are all waiting for you.
          </p>
          <div className="mb-3.5 flex items-center gap-4 rounded-[22px] border border-[#232B36] bg-[#141A22] p-5">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="h-6 w-6 shrink-0 stroke-[#7FCBA0]" aria-hidden>
              <path d="M12 3v18M3 12h18" />
            </svg>
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-semibold text-white">New password, same everything</p>
              <p className="text-xs text-[#8B96A4]">Your workspace is untouched</p>
            </div>
          </div>
          <div className="mt-1.5 flex gap-[22px]">
            <div>
              <p className="font-mono text-xl font-semibold text-white">12</p>
              <p className="text-[11.5px] text-[#8B96A4]">Saved startups</p>
            </div>
            <div>
              <p className="font-mono text-xl font-semibold text-white">4</p>
              <p className="text-[11.5px] text-[#8B96A4]">Applications</p>
            </div>
            <div>
              <p className="font-mono text-xl font-semibold text-white">60·</p>
              <p className="text-[11.5px] text-[#8B96A4]">Link window</p>
            </div>
          </div>
        </AuthBrandPanel>
      }
    />
  )
}