import { useSession } from '../../auth/hooks'

export function AccountPage() {
  const { user } = useSession()

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

        <p className="mt-6 rounded-lg border border-dashed border-[#D6D3C9] bg-[#FAFAF8] p-3 text-xs text-[#6B7280]">
          Deletion and data-export controls ship in a later phase. Removing your CV is done from
          Profile / CV.
        </p>
      </section>
    </div>
  )
}