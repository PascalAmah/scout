import { Link } from '@tanstack/react-router'
import type { DragEvent } from 'react'

import { chipColor, compactAgo, initialsOf } from '../../startups/components/startupMeta'
import type { ApplicationOut, ApplicationStatus } from '../api'
import { Badge } from '../../../components/ui/Badge'
import { Ring } from '../../../components/ui/Ring'

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

/** Dropdown options per stage — mirrors the mockup `.status-select` sets. */
export const STATUS_OPTIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  saved: ['saved', 'interested', 'applied', 'archived'],
  interested: ['interested', 'applied', 'rejected', 'archived'],
  applied: ['applied', 'interview', 'offer', 'rejected', 'archived'],
  interview: ['interview', 'offer', 'rejected', 'archived'],
  offer: ['offer', 'rejected', 'archived'],
  rejected: ['rejected', 'archived'],
  archived: ['archived'],
}

const CHANNEL_LABELS: Record<string, string> = {
  email: 'Email',
  cover_letter: 'Cover letter',
  linkedin_dm: 'LinkedIn DM',
}

function metaRow(app: ApplicationOut): { text: string; star: boolean } {
  switch (app.status) {
    case 'saved':
      return { text: `Saved ${compactAgo(app.created_at)}`, star: false }
    case 'interested':
      return { text: `Marked interested ${compactAgo(app.updated_at)}`, star: false }
    case 'applied':
      return { text: `Applied ${compactAgo(app.applied_at ?? app.created_at)}`, star: false }
    case 'interview':
      return { text: `Interview ${compactAgo(app.updated_at)}`, star: false }
    case 'offer':
      return { text: `Offer received ${compactAgo(app.updated_at)}`, star: true }
    case 'rejected':
      return { text: `Closed ${compactAgo(app.updated_at)}`, star: false }
    case 'archived':
      return { text: `Archived ${compactAgo(app.updated_at)}`, star: false }
  }
}

function outreachLine(app: ApplicationOut): string | null {
  const last = app.last_outreach
  if (!last) return null
  const label = CHANNEL_LABELS[last.channel] ?? last.channel
  switch (last.status) {
    case 'replied':
      return `${label} replied`
    case 'sent':
    case 'no_response':
      return `${label} sent, no reply`
    default:
      return `${label} drafted`
  }
}

function showResumePill(app: ApplicationOut): boolean {
  return Boolean(app.resume_version) && ['applied', 'interview', 'offer'].includes(app.status)
}

export function ApplicationCard({
  application,
  selectMode = false,
  selected = false,
  onToggleSelect,
  onDragStart,
  onDragEnd,
  isDragging = false,
  onUpdateStatus,
}: {
  application: ApplicationOut
  selectMode?: boolean
  selected?: boolean
  onToggleSelect?: () => void
  onDragStart?: (e: DragEvent) => void
  onDragEnd?: () => void
  isDragging?: boolean
  onUpdateStatus?: (status: ApplicationStatus) => void
}) {
  const startupName = application.startup?.name ?? 'Unknown startup'
  const jobTitle = application.job?.title
  const meta = metaRow(application)
  const outreach = outreachLine(application)
  const resvPill = showResumePill(application)
  const dimmed = application.status === 'rejected' ? 'opacity-[0.75]' : ''
  const offerTint =
    application.status === 'offer'
      ? 'border-emerald-tint-strong bg-[linear-gradient(180deg,#fff_0%,#E4F3EA_220%)]'
      : 'border-line bg-white'

  const body = (
    <>
      <div className="mb-[9px] flex items-start justify-between gap-2">
        <div className="flex min-w-0 gap-[9px]">
          <div
            aria-hidden
            className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[8px] text-[10.5px] font-bold text-white"
            style={{ background: chipColor(startupName) }}
          >
            {initialsOf(startupName)}
          </div>
          <div className="min-w-0">
            <p className="block truncate text-[12.5px] font-semibold leading-[1.3] text-charcoal">
              {startupName}
            </p>
            {jobTitle ? (
              <p className="truncate text-[11px] text-muted">{jobTitle}</p>
            ) : null}
          </div>
        </div>
        {selectMode ? (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect?.()}
            onClick={(e) => e.stopPropagation()}
            aria-label="Select application"
            className="mt-0.5 h-4 w-4 shrink-0 accent-emerald"
          />
        ) : application.match_score != null ? (
          <Ring score={application.match_score} size={30} />
        ) : null}
      </div>

      <div className="mb-[10px] flex flex-col gap-1">
        <div className="flex items-center gap-[5px] text-[11px] text-muted">
          {meta.star ? (
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="h-[11px] w-[11px] shrink-0 stroke-[#B8791A]" aria-hidden>
              <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="h-[11px] w-[11px] shrink-0 stroke-muted-2" aria-hidden>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 3" />
            </svg>
          )}
          <span className="truncate">{meta.text}</span>
          {resvPill && application.resume_version?.label ? (
            <span className="shrink-0 rounded-[5px] bg-emerald-tint px-[6px] py-[1px] font-mono text-[10.5px] font-semibold text-emerald-dark">
              {application.resume_version.label}
            </span>
          ) : null}
        </div>
        {outreach ? (
          <div className="flex items-center gap-[5px] text-[11px] text-muted">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="h-[11px] w-[11px] shrink-0 stroke-muted-2" aria-hidden>
              <path d="M4 4h16v16H4z" />
              <path d="M4 6l8 7 8-7" />
            </svg>
            <span className="truncate">{outreach}</span>
          </div>
        ) : null}
      </div>

      <select
        value={application.status}
        aria-label={`Move ${startupName} to a different stage`}
        onClick={(e) => e.preventDefault()}
        onPointerDown={(e) => e.stopPropagation()}
        onChange={(e) => onUpdateStatus?.(e.target.value as ApplicationStatus)}
        className="w-full cursor-pointer rounded-[8px] border border-line-strong bg-white px-[10px] py-[7px] text-[11.5px] font-semibold text-charcoal outline-none transition-colors hover:border-charcoal focus:border-emerald"
      >
        {STATUS_OPTIONS[application.status].map((option) => (
          <option key={option} value={option}>
            {option.charAt(0).toUpperCase() + option.slice(1)}
          </option>
        ))}
      </select>
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
        className={`rounded-[14px] border p-[14px] shadow-sm transition-shadow ${dimmed} ${
          selected
            ? 'border-emerald bg-emerald-tint/40 ring-1 ring-emerald'
            : `${offerTint} hover:shadow-md`
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
      onDragEnd={onDragEnd}
      className={`block rounded-[14px] border p-[14px] shadow-sm transition-all hover:-translate-y-px hover:shadow-md ${dimmed} ${offerTint} ${isDragging ? 'scale-[0.98] ring-2 ring-emerald/30 border-emerald/40 shadow-md' : ''}`}
    >
      {body}
    </Link>
  )
}