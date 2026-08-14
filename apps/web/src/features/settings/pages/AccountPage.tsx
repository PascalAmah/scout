import { useState } from 'react'

import { useSession, useUpdateUser } from '../../auth/hooks'

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
        checked ? 'bg-[#1F2937]' : 'bg-[#D6D3C9]'
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
  const { user } = useSession()
  const updateUser = useUpdateUser()
  const [emailReminders, setEmailReminders] = useState(
    user?.email_reminders_enabled ?? false,
  )

  return (
    <div className="max-w-2xl">
      <section className="rounded-xl border border-[#E5E3DC] bg-white p-6">
        <h2 className="font-serif text-lg font-semibold text-[#1F2937]">Account</h2>
        <p className="mt-1 text-sm text-[#6B7280]">{user?.email}</p>

        <dl className="mt-5 space-y-4">
          <div className="flex justify-between">
            <dt className="text-sm text-[#6B7280]">Email</dt>
            <dd className="text-sm font-medium text-[#1F2937]">{user?.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-[#6B7280]">Member since</dt>
            <dd className="text-sm font-medium text-[#1F2937]">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-[#6B7280]">Password</dt>
            <dd className="text-sm text-[#9AA1AB]">Reset flow arrives with the retention phase</dd>
          </div>
        </dl>

        <div className="mt-6 flex items-start justify-between gap-6 rounded-lg border border-[#E5E3DC] bg-[#FAFAF8] p-4">
          <div>
            <p className="text-sm font-medium text-[#1F2937]">Email me a daily digest</p>
            <p className="mt-1 text-xs leading-relaxed text-[#6B7280]">
              A short summary of your unread notifications — follow-up reminders,
              saved companies, and enrichment updates — sent once a day. Opt-in.
            </p>
          </div>
          <Toggle
            checked={emailReminders}
            disabled={updateUser.isPending}
            onChange={(next) => {
              setEmailReminders(next)
              updateUser.mutate(
                { email_reminders_enabled: next },
                {
                  onError: () => setEmailReminders(!next),
                },
              )
            }}
          />
        </div>

        <p className="mt-6 rounded-lg border border-dashed border-[#D6D3C9] bg-[#FAFAF8] p-3 text-xs text-[#6B7280]">
          Deletion and data-export controls ship in a later phase. Removing your CV is done from
          Profile / CV.
        </p>
      </section>
    </div>
  )
}
