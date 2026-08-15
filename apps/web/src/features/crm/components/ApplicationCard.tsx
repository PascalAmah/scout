import { Link } from '@tanstack/react-router'
import type { DragEvent } from 'react'

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

export function ApplicationCard({
  application,
  selectMode = false,
  selected = false,
  onToggleSelect,
  onDragStart,
}: {
  application: ApplicationOut
  selectMode?: boolean
  selected?: boolean
  onToggleSelect?: () => void
  onDragStart?: (e: DragEvent) => void
}) {
  const body = (
    <>
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 truncate font-medium text-[#1F2937]">
          {application.startup?.name ?? 'Unknown startup'}
        </p>
        {selectMode ? (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect?.()}
            onClick={(e) => e.stopPropagation()}
            aria-label="Select application"
            className="mt-0.5 h-4 w-4 shrink-0 accent-[#18A058]"
          />
        ) : null}
      </div>
      {application.job?.title ? (
        <p className="mt-0.5 truncate text-xs text-[#6B7280]">{application.job.title}</p>
      ) : null}
      {(application.tags?.length ?? 0) > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {application.tags!.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[#E7F5EE] px-2 py-0.5 text-[10px] font-medium text-[#0F6E56]"
            >
              {tag}
            </span>
          ))}
          {(application.tags?.length ?? 0) > 3 ? (
            <span className="text-[10px] text-[#9AA1AB]">
              +{(application.tags?.length ?? 0) - 3}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="mt-3 flex items-center justify-between">
        <ApplicationStatusBadge status={application.status} />
        <span className="text-[10px] text-[#9AA1AB]">
          {new Date(application.created_at).toLocaleDateString()}
        </span>
      </div>
    </>
  )

  if (selectMode) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => onToggleSelect?.()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onToggleSelect?.()
        }}
        className={`block rounded-lg border p-4 shadow-sm transition-shadow ${
          selected
            ? 'border-[#18A058] bg-[#F0FAF4] ring-1 ring-[#18A058]'
            : 'border-[#E5E3DC] bg-white hover:shadow-md'
        }`}
      >
        {body}
      </div>
    )
  }

  return (
    <Link
      to="/crm/applications/$applicationId"
      params={{ applicationId: application.id }}
      draggable
      onDragStart={onDragStart}
      className="block rounded-lg border border-[#E5E3DC] bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      {body}
    </Link>
  )
}
