import { useParams } from '@tanstack/react-router'

import { EmptyState } from '../../../components/ui/EmptyState'
import { useStartup } from '../hooks'

export function JobsTab() {
  const { startupId } = useParams({ from: '/_app/startups/$startupId/jobs' })
  const startupQuery = useStartup(startupId)
  const startup = startupQuery.data
  if (!startup) return null

  return (
    <div>
      {startup.jobs.length === 0 ? (
        <EmptyState title="No open roles" description="Roles will appear here after enrichment or when captured from a careers page." />
      ) : (
        <ul className="divide-y divide-[#F0EEE7] overflow-hidden rounded-[16px] border border-line bg-white">
          {startup.jobs.map((job) => (
            <li key={job.id} className="flex items-center gap-4 px-6 py-[18px]">
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
              {job.salary_min != null || job.salary_max != null ? (
                <p className="shrink-0 font-mono text-[12.5px] font-semibold text-charcoal">
                  {job.salary_min != null ? `$${job.salary_min.toLocaleString()}` : ''}
                  {job.salary_min != null && job.salary_max != null ? '–' : ''}
                  {job.salary_max != null ? `$${job.salary_max.toLocaleString()}` : ''}
                </p>
              ) : null}
              <span
                className={`shrink-0 rounded-pill px-[10px] py-[4px] text-[11px] font-semibold ${
                  job.status === 'closed'
                    ? 'bg-[#F0EFEA] text-[#5B5F66]'
                    : 'bg-emerald-tint text-emerald-dark'
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
          ))}
        </ul>
      )}
    </div>
  )
}
