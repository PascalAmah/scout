import { Link } from '@tanstack/react-router'

import { type StartupListItem } from '../api'
import { HiringBadge, WorkspaceStatusBadge } from './StatusBadge'

const STAGE_LABELS: Record<string, string> = {
  pre_seed: 'Pre-seed',
  seed: 'Seed',
  series_a: 'Series A',
  series_b: 'Series B',
  series_c: 'Series C',
  growth: 'Growth',
}

const CHIP_COLORS = ['#1F2937', '#18A058', '#3E5C8A', '#B8791A', '#0F6E56', '#8A5A11']

function chipColor(name: string): string {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) % 997
  return CHIP_COLORS[hash % CHIP_COLORS.length]!
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase()
}

function titleCase(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (ch) => ch.toUpperCase())
}

function compactAgo(iso: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function StartupCard({ startup }: { startup: StartupListItem }) {
  const domain = startup.website
    ? new URL(startup.website).hostname.replace('www.', '')
    : null

  const stage = startup.stage
    ? (STAGE_LABELS[startup.stage] ?? titleCase(startup.stage))
    : null
  const source = startup.source
    ? startup.source === 'yc'
      ? 'YC'
      : titleCase(startup.source)
    : null
  const sub = [stage, source].filter(Boolean).join(' · ') || domain

  const tags = (startup.tags?.length ? startup.tags : startup.tech_stack ?? []).slice(0, 4)

  const enrichment = startup.enrichment_status
  const enrichNote =
    enrichment === 'queued' || enrichment === 'running'
      ? { text: 'Enriching…', className: 'text-amber' }
      : enrichment === 'failed'
        ? { text: 'Enrichment failed', className: 'text-brick' }
        : enrichment === 'none'
          ? { text: 'Not enriched', className: 'text-muted-2' }
          : null

  return (
    <Link
      to="/startups/$startupId"
      params={{ startupId: startup.id }}
      className="group block rounded-[18px] border border-line bg-white p-5 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            aria-hidden
            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] text-[12.5px] font-bold text-white"
            style={{ background: chipColor(startup.name) }}
          >
            {initialsOf(startup.name)}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-[14.5px] font-semibold text-charcoal group-hover:underline">
              {startup.name}
            </h3>
            {sub ? <p className="truncate text-xs text-muted">{sub}</p> : null}
          </div>
        </div>
        {enrichNote ? (
          <span
            className={`shrink-0 pt-0.5 text-right text-[10px] font-semibold leading-tight ${enrichNote.className}`}
          >
            {enrichNote.text}
          </span>
        ) : null}
      </div>

      <div className="mt-3.5 flex flex-wrap gap-1.5">
        <HiringBadge hiringStatus={startup.hiring_status} />
        <WorkspaceStatusBadge status={startup.status} />
      </div>

      {tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-[6px] border border-line bg-paper px-2 py-[3px] text-[11px] text-charcoal"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
        <span className="font-mono text-[11px] text-muted-2">
          {startup.last_enriched_at
            ? `Enriched ${compactAgo(startup.last_enriched_at)}`
            : `Saved ${compactAgo(startup.created_at)}`}
        </span>
        <span className="shrink-0 text-[11px] text-muted">
          {startup.open_roles_count === 0
            ? '0 open roles'
            : `${startup.open_roles_count} open ${startup.open_roles_count === 1 ? 'role' : 'roles'}`}
        </span>
      </div>
    </Link>
  )
}
