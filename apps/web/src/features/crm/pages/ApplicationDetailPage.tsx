import { Link, useNavigate, useParams } from '@tanstack/react-router'

import { Button } from '../../../components/ui/Button'
import { APPLICATION_STATUSES } from '../api'
import { ApplicationStatusBadge } from '../components/ApplicationCard'
import { useApplication, useArchiveApplication, useUpdateApplicationStatus } from '../hooks'

export function ApplicationDetailPage() {
  const { applicationId } = useParams({ from: '/_app/crm/applications/$applicationId' })
  const navigate = useNavigate()
  const updateStatus = useUpdateApplicationStatus()
  const archive = useArchiveApplication()

  const appQuery = useApplication(applicationId)
  const app = appQuery.data

  if (!app) {
    return <p className="py-12 text-center text-sm text-[#6B7280]">{appQuery.isLoading ? 'Loading…' : 'Not found'}</p>
  }

  return (
    <div className="max-w-2xl">
      <Link to="/crm" className="text-sm text-[#6B7280] hover:text-[#1F2937]">
        ← Pipeline
      </Link>
      <div className="mt-2 rounded-xl border border-[#E5E3DC] bg-white p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-[#1F2937]">
              {app.startup?.name ?? 'Unknown startup'}
            </h1>
            {app.job?.title ? <p className="mt-1 text-sm text-[#6B7280]">{app.job.title}</p> : null}
          </div>
          <ApplicationStatusBadge status={app.status} />
        </div>

        {app.startup?.website ? (
          <a href={app.startup.website} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-[#18A058] hover:underline">
            {new URL(app.startup.website).hostname.replace('www.', '')}
          </a>
        ) : null}

        <div className="mt-6 border-t border-[#F0EEE7] pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[#9AA1AB]">Status</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {APPLICATION_STATUSES.filter((s) => s !== 'rejected').map((status) => (
              <Button
                key={status}
                variant={status === app.status ? 'primary' : 'ghost'}
                className="px-3 py-1.5 text-xs"
                loading={updateStatus.isPending}
                disabled={updateStatus.isPending}
                onClick={() => updateStatus.mutate({ applicationId, status })}
              >
                {status}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end border-t border-[#F0EEE7] pt-4">
          <Button
            variant="ghost"
            className="text-xs text-[#B3261E]"
            loading={archive.isPending}
            onClick={() => {
              if (window.confirm('Archive this application?')) {
                archive.mutate(applicationId, {
                  onSuccess: () => navigate({ to: '/crm' }),
                })
              }
            }}
          >
            Archive
          </Button>
        </div>
      </div>
    </div>
  )
}