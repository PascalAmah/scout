import { Link } from '@tanstack/react-router'

import type { ApplicationOut, ApplicationStatus } from '../api'
import { Badge } from '../../../components/ui/Badge'

const STATUS_TONES: Record<string, 'gray' | 'blue' | 'amber' | 'green' | 'red'> = {
  saved: 'gray',
  interested: 'blue',
  applied: 'blue',
  interview: 'amber',
  offer: 'green',
  rejected: 'red',
  archived: 'gray',
}

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return <Badge tone={STATUS_TONES[status] ?? 'gray'}>{status}</Badge>
}

export function ApplicationCard({ application }: { application: ApplicationOut }) {
  return (
    <Link
      to="/crm/applications/$applicationId"
      params={{ applicationId: application.id }}
      className="block rounded-lg border border-[#E5E3DC] bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <p className="truncate font-medium text-[#1F2937]">{application.startup?.name ?? 'Unknown startup'}</p>
      {application.job?.title ? (
        <p className="mt-0.5 truncate text-xs text-[#6B7280]">{application.job.title}</p>
      ) : null}
      <div className="mt-3 flex items-center justify-between">
        <ApplicationStatusBadge status={application.status} />
        <span className="text-[10px] text-[#9AA1AB]">
          {new Date(application.created_at).toLocaleDateString()}
        </span>
      </div>
    </Link>
  )
}
