import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'

import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { PasswordInput } from '../../../components/ui/PasswordInput'
import { ApiRequestError } from '../../../lib/api-client'
import { useRegister } from '../hooks'
import { AuthBrandPanel } from '../components/AuthBrandPanel'
import { AuthField } from '../components/AuthField'
import { AuthFormShell } from '../components/AuthFormShell'
import { AuthSplit } from '../components/AuthSplit'

const PERSONAS = [
  'Software Engineers',
  'Designers',
  'Product Managers',
  'AI Researchers',
  'Students',
]

export function RegisterPage() {
  const register = useRegister()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [termsError, setTermsError] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => register(email, password, fullName || undefined),
    onSuccess: () => navigate({ to: '/onboarding' }),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setPasswordError(null)
    setTermsError(false)
    if (password.length < 8) {
      setPasswordError('Use at least 8 characters')
      return
    }
    if (!accepted) {
      setTermsError(true)
      return
    }
    mutation.mutate(undefined, {
      onError: (err) =>
        setError(
          err instanceof ApiRequestError ? err.message : 'Something went wrong. Try again.',
        ),
    })
  }

  return (
    <AuthSplit
      form={
        <AuthFormShell
          title="Create your workspace"
          lede="Free to start. No credit card required."
          footer={
            <>
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-emerald-dark hover:underline">
                Sign in
              </Link>
            </>
          }
        >
          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <AuthField label="Full name">
              <Input
                id="fullName"
                type="text"
                autoComplete="name"
                placeholder="Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </AuthField>
            <AuthField label="Email">
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="jane@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </AuthField>
            <AuthField label="Password" hint="min. 8 characters" error={passwordError}>
              <PasswordInput
                id="password"
                required
                invalid={Boolean(passwordError)}
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </AuthField>

            <div className="mb-6 mt-1">
              <label className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="mt-1 h-[15px] w-[15px] shrink-0 accent-emerald"
                />
                <span className="text-[12.5px] leading-relaxed text-muted">
                  I agree to Scout's{' '}
                  <a href="#" className="font-semibold text-charcoal underline">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#" className="font-semibold text-charcoal underline">
                    Privacy Policy
                  </a>
                  . My CV data is encrypted at rest and never used to train external models.
                </span>
              </label>
              {termsError ? (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-brick" role="alert">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="h-[13px] w-[13px] shrink-0 stroke-brick" aria-hidden>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8v5M12 16h.01" />
                  </svg>
                  Please accept the Terms of Service to continue.
                </p>
              ) : null}
            </div>

            {error ? (
              <p className="flex items-center gap-1.5 text-xs text-brick" role="alert">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="h-[13px] w-[13px] shrink-0 stroke-brick" aria-hidden>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5M12 16h.01" />
                </svg>
                {error}
              </p>
            ) : null}
            <Button type="submit" variant="accent" loading={mutation.isPending} className="w-full">
              {mutation.isPending ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
        </AuthFormShell>
      }
      brand={
        <AuthBrandPanel foot="© 2026 Scout · Free to start">
          <h2 className="font-serif text-[32px] font-semibold leading-[1.2] tracking-[-0.5px]">
            Built for the startup job search.
          </h2>
          <p className="mb-7 mt-3.5 text-[14.5px] leading-relaxed text-[#9AA6B2]">
            Software engineers, designers, PMs, AI researchers, and students all use the same
            workspace — differently.
          </p>
          <div className="mb-6">
            {PERSONAS.map((persona) => (
              <span
                key={persona}
                className="mr-1.5 mb-2 inline-flex rounded-pill border border-[#232B36] px-[15px] py-2 text-[12.5px] font-medium text-[#C7D0DA]"
              >
                {persona}
              </span>
            ))}
          </div>
          <div className="flex gap-3">
            <div className="flex-1 rounded-[14px] border border-[#232B36] bg-[#141A22] p-[15px]">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="mb-2 h-[15px] w-[15px] stroke-[#7FCBA0]" aria-hidden>
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <b className="mb-1 block text-[12.5px] text-white">You always click send</b>
              <p className="text-[11px] leading-relaxed text-[#8B96A4]">No auto-submit, ever.</p>
            </div>
            <div className="flex-1 rounded-[14px] border border-[#232B36] bg-[#141A22] p-[15px]">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="mb-2 h-[15px] w-[15px] stroke-[#7FCBA0]" aria-hidden>
                <path d="M12 3v18M3 12h18" />
              </svg>
              <b className="mb-1 block text-[12.5px] text-white">Grounded in your CV</b>
              <p className="text-[11px] leading-relaxed text-[#8B96A4]">No invented experience.</p>
            </div>
          </div>
        </AuthBrandPanel>
      }
    />
  )
}
