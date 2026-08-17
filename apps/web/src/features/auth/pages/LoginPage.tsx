import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'

import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { ApiRequestError } from '../../../lib/api-client'
import { useLogin } from '../hooks'
import { AuthBrandPanel } from '../components/AuthBrandPanel'
import { AuthField } from '../components/AuthField'
import { AuthFormShell } from '../components/AuthFormShell'
import { AuthSplit } from '../components/AuthSplit'

export function LoginPage() {
  const login = useLogin()
  const navigate = useNavigate()
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
    <AuthSplit
      form={
        <AuthFormShell
          title="Welcome back"
          lede="Sign in to pick up your saved startups where you left off."
          footer={
            <>
              New to Scout?{' '}
              <Link to="/register" className="font-semibold text-emerald-dark hover:underline">
                Create an account
              </Link>
            </>
          }
        >
          <form onSubmit={onSubmit} className="space-y-4">
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
            <AuthField label="Password">
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </AuthField>
            <div className="text-right">
              <Link
                to="/password-reset"
                className="text-[12.5px] font-semibold text-muted underline hover:text-charcoal"
              >
                Forgot password?
              </Link>
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
              {mutation.isPending ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </AuthFormShell>
      }
      brand={
        <AuthBrandPanel foot="© 2026 Scout · You always click send">
          <h2 className="font-serif text-[32px] font-semibold leading-[1.2] tracking-[-0.5px]">
            Pick up where you left off.
          </h2>
          <p className="mb-7 mt-3.5 text-[14.5px] leading-relaxed text-[#9AA6B2]">
            Your last session left 12 saved startups, one in active interview stage, and a match
            waiting on review.
          </p>
          <div className="mb-3.5 flex items-center gap-4 rounded-[22px] border border-[#232B36] bg-[#141A22] p-5">
            <svg viewBox="0 0 52 52" className="h-[52px] w-[52px] shrink-0" style={{ transform: 'rotate(-90deg)' }} aria-hidden>
              <circle cx="26" cy="26" r="21" fill="none" strokeWidth="5" stroke="#2A3441" />
              <circle
                cx="26"
                cy="26"
                r="21"
                fill="none"
                strokeWidth="5"
                strokeLinecap="round"
                stroke="#18A058"
                strokeDasharray="132"
                strokeDashoffset="17"
              />
            </svg>
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-semibold text-white">
                Lumina Health — Backend Engineer
              </p>
              <p className="text-xs text-[#8B96A4]">New match since your last visit</p>
            </div>
          </div>
          <div className="mt-1.5 flex gap-[22px]">
            <div>
              <p className="font-mono text-xl font-semibold text-white">12</p>
              <p className="text-[11.5px] text-[#8B96A4]">Saved</p>
            </div>
            <div>
              <p className="font-mono text-xl font-semibold text-white">4</p>
              <p className="text-[11.5px] text-[#8B96A4]">Applied</p>
            </div>
            <div>
              <p className="font-mono text-xl font-semibold text-white">1</p>
              <p className="text-[11.5px] text-[#8B96A4]">Interview</p>
            </div>
          </div>
        </AuthBrandPanel>
      }
    />
  )
}
