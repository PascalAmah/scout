import { createFileRoute } from '@tanstack/react-router'

import { EmptyState } from '../components/ui/EmptyState'
import { useStartup } from '../features/startups/hooks'

export const Route = createFileRoute('/_app/startups/$startupId/jobs')({
  component: JobsTab,
})

function JobsTab() {
  const { startupId } = Route.useParams()
  const startupQuery = useStartup(startupId)
  const startup = startupQuery.data
  if (!startup) return null

  return (
    <div>
      {startup.jobs.length === 0 ? (
        <EmptyState title="No open roles" description="Roles will appear here after enrichment or when captured from a careers page." />
      ) : (
        <ul className="divide-y divide-[#F0EEE7] rounded-xl border border-[#E5E3DC] bg-white">
          {startup.jobs.map((job) => (
            <li key={job.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-[#1F2937]">{job.title}</p>
                  <p className="mt-1 text-xs text-[#6B7280]">
                    {[job.location, job.remote ? 'Remote' : null, job.employment_type, job.seniority]
                      .filter(Boolean)
                      .join(' · ') || 'No location info'}
                  </p>
                  {job.salary_min != null || job.salary_max != null ? (
                    <p className="mt-1 text-xs text-[#1F2937]">
                      {job.salary_min != null ? `$${job.salary_min.toLocaleString()}` : ''}
                      {job.salary_min != null && job.salary_max != null ? '–' : ''}
                      {job.salary_max != null ? `$${job.salary_max.toLocaleString()}` : ''}
                    </p>
                  ) : null}
                  {job.description ? (
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[#4B5563]">{job.description}</p>
                  ) : null}
                </div>
                {job.url ? (
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-sm font-medium text-[#18A058] hover:underline"
                  >
                    Apply →
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}