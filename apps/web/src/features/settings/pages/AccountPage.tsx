import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { useSession, useUpdateUser } from '../../auth/hooks'
import { SettingsPanel } from '../components/SettingsPanel'

function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-emerald' : 'bg-line-strong'
      } disabled:opacity-50`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

export function AccountPage() {
  const navigate = useNavigate()
  const { user } = useSession()
  const updateUser = useUpdateUser()
  const [emailReminders, setEmailReminders] = useState(
    user?.email_reminders_enabled ?? false,
  )

  return (
    <div className="space-y-5">
      <SettingsPanel title="Login" description="Email and password">
        <div>
          <label
            htmlFor="account-email"
            className="mb-1.5 block text-xs font-semibold text-charcoal"
          >
            Email
          </label>
          <Input id="account-email" value={user?.email ?? ''} readOnly />
        </div>
        <div className="mt-4">
          <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
            <div>
              <label
                htmlFor="account-password"
                className="mb-1.5 block text-xs font-semibold text-charcoal"
              >
                New password
              </label>
              <Input
                id="account-password"
                type="password"
                placeholder="••••••••"
                readOnly
              />
            </div>
            <div>
              <label
                htmlFor="account-password-confirm"
                className="mb-1.5 block text-xs font-semibold text-charcoal"
              >
                Confirm new password
              </label>
              <Input
                id="account-password-confirm"
                type="password"
                placeholder="••••••••"
                readOnly
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              variant="accent"
              onClick={() => void navigate({ to: '/password-reset' })}
            >
              Reset password
            </Button>
            <span className="text-xs text-muted">
              Password changes use Scout's email reset flow — we'll send you a
              secure link.
            </span>
          </div>
        </div>
      </SettingsPanel>

      <SettingsPanel
        title="Email digest"
        description="A short daily summary of unread notifications"
      >
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[13.5px] font-medium text-charcoal">
              Email me a daily digest
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Follow-up reminders, saved companies, and enrichment updates —
              sent once a day. Opt-in.
            </p>
          </div>
          <Toggle
            checked={emailReminders}
            disabled={updateUser.isPending}
            onChange={(next) => {
              setEmailReminders(next)
              updateUser.mutate(
                { email_reminders_enabled: next },
                { onError: () => setEmailReminders(!next) },
              )
            }}
          />
        </div>
      </SettingsPanel>
<SettingsPanel
        title="Active sessions"
        description="Where you're currently signed in"
      >
        <div className="divide-y divide-line">
          <div className="flex items-center gap-3 py-[13px]">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border border-line bg-paper">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="2"
                className="h-[15px] w-[15px] stroke-charcoal"
                aria-hidden
              >
                <rect x="3" y="4" width="18" height="14" rx="2" />
                <path d="M8 21h8M12 18v3" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <b className="flex items-center gap-2 text-[12.5px] text-charcoal">
                This browser
                <span className="rounded-pill bg-emerald-tint px-2 py-0.5 text-[10px] font-bold text-emerald-dark">
                  This device
                </span>
              </b>
              <span className="text-[11px] text-muted">
                Active now · {user?.email}
              </span>
            </div>
          </div>
        </div>
        <p className="mt-3 rounded-md border border-dashed border-line-strong bg-paper px-3 py-2 text-[11.5px] text-muted">
          Managing individual sessions (e.g. the browser extension) ships with
          the retention phase. The account menu signs this device out and
          revokes its session.
        </p>
      </SettingsPanel>

      <SettingsPanel title="Danger zone" danger>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="max-w-[420px]">
            <b className="text-[13.5px] text-charcoal">Delete account</b>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
              Removes your CV, saved startups, applications, and resumes.
              Retained briefly per our data policy, then permanently deleted.
            </p>
          </div>
          <Button
            variant="destructive"
            disabled
            title="Account deletion arrives with the retention phase."
          >
            Delete account
          </Button>
        </div>
        <p className="mt-3 text-[11.5px] text-muted">
          Account deletion arrives with the retention phase. Removing your CV is
          done from Profile / CV.
        </p>
      </SettingsPanel>
    </div>
  )
}