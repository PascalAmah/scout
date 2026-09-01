import { useEffect, useRef, useState } from 'react'
import { useParams, useSearch } from '@tanstack/react-router'

import { EmptyState } from '../../../components/ui/EmptyState'
import type { JobOut } from '../api'
import { useStartup } from '../hooks'

function isMatching(job: JobOut): boolean {
  return job.relevance === 'high' || job.relevance === 'medium'
}

function JobRow({
  job,
  isFocused,
  rowRef,
}: {
  job: JobOut
  isFocused: boolean
  rowRef?: (el: HTMLLIElement | null) => void
}) {
  const isMatched = job.match_score != null
  return (
    <li
      ref={rowRef}
      id={`job-row-${job.id}`}
      className={`flex items-center gap-4 px-6 py-[18px] ${isFocused ? 'bg-emerald-tint/50' : ''}`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-charcoal">{job.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
          <span>
            {[job.location, job.remote ? 'Remote' : null, job.employment_type, job.seniority]
              .filter(Boolean)
              .join(' · ') || 'No location info'}
          </span>
        </div>
      </div>
      {isMatched ? (
        <span className="shrink-0 rounded-pill bg-emerald px-2.5 py-0.5 text-[10.5px] font-bold uppercase text-white">
          Matched
        </span>
      ) : null}
      {job.salary_min != null || job.salary_max != null ? (
        <p className="shrink-0 font-mono text-[12.5px] font-semibold text-charcoal">
          {job.salary_min != null ? `$${job.salary_min.toLocaleString()}` : ''}
          {job.salary_min != null && job.salary_max != null ? '–' : ''}
          {job.salary_max != null ? `$${job.salary_max.toLocaleString()}` : ''}
        </p>
      ) : null}
      <span
        className={`shrink-0 rounded-pill px-[10px] py-[4px] text-[11px] font-semibold ${
          job.status === 'closed' ? 'bg-[#F0EFEA] text-[#5B5F66]' : 'bg-emerald-tint text-emerald-dark'
        }`}
      >
        {job.status === 'closed' ? 'Closed' : 'Open'}
      </span>
      {job.url ? (
        <a
          href={job.url}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-pill border border-line-strong bg-white px-3.5 py-1.5 text-xs font-semibold text-charcoal transition-colors hover:border-charcoal"
        >
          View
        </a>
      ) : null}
    </li>
  )
}

export function JobsTab() {
  const { startupId } = useParams({ from: '/_app/startups/$startupId/jobs' })
  const { focus } = useSearch({ from: '/_app/startups/$startupId/jobs' })
  const startupQuery = useStartup(startupId)
  const startup = startupQuery.data
  const focusedRowRef = useRef<HTMLLIElement>(null)

  const jobs = startup?.jobs ?? []
  // Relevance groups only exist once the user has onboarding target roles
  // (the API annotates jobs then). Without preferences everything stays flat.
  const hasPreferences = jobs.some((job) => job.relevance != null)
  const matching = hasPreferences ? jobs.filter(isMatching) : jobs
  const others = hasPreferences ? jobs.filter((job) => !isMatching(job)) : []
  // A deep-linked match may point at a non-matching role — start expanded so
  // the row is rendered and can be scrolled into view.
  const [showOthers, setShowOthers] = useState(
    () => focus != null && others.some((job) => job.id === focus),
  )

  // Deep-linked from a match ("View match"): bring the matched role into view
  // once its row is rendered.
  useEffect(() => {
    if (!startup || !focus) return
    focusedRowRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [startup, focus])

  if (!startup) return null

  if (jobs.length === 0) {
    return (
      <EmptyState
        title="No open roles"
        description="Roles will appear here after enrichment or when captured from a careers page."
      />
    )
  }

  const renderList = (rows: JobOut[]) => (
    <ul className="divide-y divide-[#F0EEE7] overflow-hidden rounded-[16px] border border-line bg-white">
      {rows.map((job) => (
        <JobRow
          key={job.id}
          job={job}
          isFocused={job.id === focus}
          rowRef={job.id === focus ? (el) => (focusedRowRef.current = el) : undefined}
        />
      ))}
    </ul>
  )

  return (
    <div>
      {hasPreferences && others.length > 0 ? (
        <div>
          {matching.length > 0 ? (
            <>
              <div className="mb-2.5 flex items-baseline justify-between gap-3">
                <h3 className="text-[13px] font-semibold text-charcoal">
                  Roles matching your interests
                </h3>
                <span className="font-mono text-[11px] text-muted-2">
                  {matching.length} of {jobs.length}
                </span>
              </div>
              {renderList(matching)}
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setShowOthers((open) => !open)}
                  aria-expanded={showOthers}
                  className="flex items-center gap-1.5 text-[13px] font-semibold text-muted transition-colors hover:text-charcoal"
                >
                  <span
                    aria-hidden
                    className={`inline-block transition-transform ${showOthers ? 'rotate-90' : ''}`}
                  >
                    ›
                  </span>
                  Other open roles ({others.length})
                </button>
                {showOthers ? <div className="mt-2.5">{renderList(others)}</div> : null}
              </div>
            </>
          ) : (
            <>
              <p className="mb-2.5 text-[13px] text-muted">
                None of this company's open roles match your saved interests right now.
              </p>
              {renderList(others)}
            </>
          )}
        </div>
      ) : (
        renderList(matching)
      )}
    </div>
  )
}
