import { useSession } from '../../auth/hooks'
import { NeedsFollowUpSection } from '../components/NeedsFollowUpSection'
import { QuickStatsStrip } from '../components/QuickStatsStrip'

export function DashboardPage() {
  const { user } = useSession()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-[#1F2937]">
          Welcome{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}
        </h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Browse your Workspace or Pipeline, or use the extension to save startups while you browse
          Y Combinator or company careers pages.
        </p>
      </div>
      <QuickStatsStrip />
      <NeedsFollowUpSection />
    </div>
  )
}