import { Link } from '@tanstack/react-router'

import { EmptyState } from '../../../components/ui/EmptyState'
import { useNeedsFollowUp } from '../hooks'

function daysLabel(days: number): string {
  return days === 1 ? 'yesterday' : `${days} days ago`
}

export function NeedsFollowUpSection() {
  const { data, isLoading } = useNeedsFollowUp()
  const items = data ?? []

  return (
    <section className="rounded-xl border border-[#E5E3DC] bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold text-[#1F2937]">Needs follow-up</h2>
        <span className="text-xs text-[#6B7280]">
          {items.length} {items.length === 1 ? 'application' : 'applications'} waiting
        </span>
      </div>

      {!isLoading && items.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="All caught up"
            description="Applications past the follow-up threshold will show up here, ready for a nudge."
          />
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-[#F0EEE7]">
          {items.map((item) => (
            <li key={item.application_id} className="py-3">
              <Link
                to="/crm/applications/$applicationId"
                params={{ applicationId: item.application_id }}
                className="flex items-center justify-between gap-4 rounded-lg p-2 transition-colors hover:bg-[#FAFAF8]"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-[#1F2937]">
                    {item.startup_name ?? 'Unknown startup'}
                  </p>
                  <p className="truncate text-xs text-[#6B7280]">
                    {item.job_title ?? '—'}
                    {item.last_outreach_status ? ` · last outreach: ${item.last_outreach_status}` : ''}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-medium text-[#92600A]">
                  Applied {daysLabel(item.days_since)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
