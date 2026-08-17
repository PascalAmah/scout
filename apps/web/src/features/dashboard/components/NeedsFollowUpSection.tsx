import { Link } from '@tanstack/react-router'
import { useState } from 'react'

import { EmptyState } from '../../../components/ui/EmptyState'
import { useDraftFollowUp, useNeedsFollowUp } from '../hooks'

function daysLabel(days: number): string {
  return days === 1 ? 'yesterday' : `${days} days ago`
}

export function NeedsFollowUpSection() {
  const { data, isLoading } = useNeedsFollowUp()
  const draft = useDraftFollowUp()
  const [queued, setQueued] = useState<Set<string>>(new Set())
  const items = data ?? []

  const onDraft = (applicationId: string) => {
    setQueued((prev) => new Set(prev).add(applicationId))
    draft.mutate(applicationId, {
      onSettled: () =>
        setQueued((prev) => {
          const next = new Set(prev)
          next.delete(applicationId)
          return next
        }),
    })
  }

  return (
    <div className="overflow-hidden rounded-[18px] border border-line bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="text-[15px] font-semibold text-charcoal">Needs follow-up</h2>
        <Link to="/crm" className="text-xs font-semibold text-emerald-dark hover:underline">
          View pipeline →
        </Link>
      </div>

      {!isLoading && items.length === 0 ? (
        <div className="p-5">
          <EmptyState
            title="All caught up"
            description="Applications past the follow-up threshold will show up here, ready for a nudge."
          />
        </div>
      ) : (
        items.map((item) => {
          const isQueued = queued.has(item.application_id)
          const urgent = item.days_since >= 7
          return (
            <div
              key={item.application_id}
              className="border-b border-line px-5 py-3.5 last:border-b-0"
            >
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <Link
                  to="/crm/applications/$applicationId"
                  params={{ applicationId: item.application_id }}
                  className="truncate text-[13.5px] font-semibold text-charcoal hover:underline"
                >
                  {item.startup_name ?? 'Unknown startup'}
                </Link>
                <span
                  className={`shrink-0 rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold ${
                    urgent ? 'bg-brick-tint text-brick' : 'bg-amber-tint text-amber'
                  }`}
                >
                  {item.days_since}d
                </span>
              </div>
              <p className="mb-2.5 truncate text-xs text-muted">
                {item.job_title ? `${item.job_title} · ` : ''}Applied {daysLabel(item.days_since)}
                {item.last_outreach_status ? ` · last outreach: ${item.last_outreach_status}` : ''}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onDraft(item.application_id)}
                  disabled={isQueued}
                  className="rounded-lg bg-charcoal px-3 py-1.5 text-[11.5px] font-semibold text-white hover:bg-near-black disabled:opacity-40"
                >
                  {isQueued ? 'Queued…' : 'Draft follow-up'}
                </button>
                <Link
                  to="/crm/applications/$applicationId"
                  params={{ applicationId: item.application_id }}
                  className="rounded-lg border border-line-strong bg-white px-3 py-1.5 text-[11.5px] font-semibold text-charcoal hover:border-charcoal"
                >
                  View details
                </Link>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
