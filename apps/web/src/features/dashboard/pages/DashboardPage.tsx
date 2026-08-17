import { Link } from '@tanstack/react-router'

import { useSession } from '../../auth/hooks'
import { useNeedsFollowUp } from '../hooks'
import { NeedsFollowUpSection } from '../components/NeedsFollowUpSection'
import { QuickStatsStrip } from '../components/QuickStatsStrip'
import { RecentlyEnrichedSection } from '../components/RecentlyEnrichedSection'
import { TopMatchesSection } from '../components/TopMatchesSection'

export function DashboardPage() {
  const { user } = useSession()
  const followUpsQuery = useNeedsFollowUp()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.full_name?.split(' ')[0]?.trim() || user?.full_name?.trim() || ''
  const dateLine = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
  const attention = followUpsQuery.data?.length ?? 0

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3.5">
        <div>
          <h1 className="font-serif text-[30px] font-semibold tracking-[-0.4px] text-charcoal">
            {greeting}
            {firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="mt-1 text-[13.5px] text-muted">
            {dateLine} · {attention}{' '}
            {attention === 1 ? 'application needs' : 'applications need'} attention today
          </p>
        </div>
        <Link
          to="/startups"
          search={{ q: undefined }}
          className="inline-flex items-center gap-[7px] rounded-pill bg-emerald px-[18px] py-2.5 text-[13.5px] font-semibold text-white hover:bg-emerald-dark"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Save a startup
        </Link>
      </div>

      <QuickStatsStrip />
      <TopMatchesSection />

      <div className="mt-9 grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <RecentlyEnrichedSection />
        <NeedsFollowUpSection />
      </div>
    </div>
  )
}
