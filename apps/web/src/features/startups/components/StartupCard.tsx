import { Link } from '@tanstack/react-router'

import { type StartupListItem } from '../api'
import { HiringBadge, WorkspaceStatusBadge } from './StatusBadge'
import { chipColor, compactAgo, initialsOf, titleCase } from './startupMeta'

const STAGE_LABELS: Record<string, string> = {
  pre_seed: 'Pre-seed',
  seed: 'Seed',
  series_a: 'Series A',
  series_b: 'Series B',
  series_c: 'Series C',
  growth: 'Growth',
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

  const allTags = startup.tags?.length ? startup.tags : startup.tech_stack ?? []
  const maxVisible = 3
  const visibleTags = allTags.slice(0, maxVisible)
  const overflowCount = allTags.length - maxVisible

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

      <div className="mt-3 flex h-[22px] gap-1.5 overflow-hidden">
        {visibleTags.map((tag) => (
          <span
            key={tag}
            className="max-w-[120px] shrink-0 truncate rounded-[6px] border border-line bg-paper px-2 py-[3px] text-[11px] text-charcoal"
          >
            {tag}
          </span>
        ))}
        {overflowCount > 0 ? (
          <span className="shrink-0 rounded-[6px] border border-line bg-paper px-2 py-[3px] text-[11px] text-muted-2">
            +{overflowCount}
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
        <span className="font-mono text-[11px] text-muted-2">
          {startup.last_enriched_at
            ? `Enriched ${compactAgo(startup.last_enriched_at)}`
            : `Saved ${compactAgo(startup.created_at)}`}
        </span>
        <span className="shrink-0 text-[11px] text-muted">
          {startup.matching_roles_count > 0 && startup.open_roles_count > 0 ? (
            <>
              <span className="font-semibold text-emerald-dark">
                {startup.matching_roles_count}
              </span>
              {` of ${startup.open_roles_count} ${startup.open_roles_count === 1 ? 'role' : 'roles'} match you`}
            </>
          ) : startup.open_roles_count === 0 ? (
            '0 open roles'
          ) : (
            `${startup.open_roles_count} open ${startup.open_roles_count === 1 ? 'role' : 'roles'}`
          )}
        </span>
      </div>
    </Link>
  )
}
