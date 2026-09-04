import { Link } from '@tanstack/react-router'

import { type StartupListItem } from '../api'
import { HiringBadge, WorkspaceStatusBadge } from './StatusBadge'
import { compactAgo, initialsOf, chipColor, titleCase } from './startupMeta'

const STAGE_LABELS: Record<string, string> = {
  pre_seed: 'Pre-seed',
  seed: 'Seed',
  series_a: 'Series A',
  series_b: 'Series B',
  series_c: 'Series C',
  growth: 'Growth',
}

export function StartupListRow({ startup }: { startup: StartupListItem }) {
  const domain = startup.website ? new URL(startup.website).hostname.replace('www.', '') : null
  const stage = startup.stage ? (STAGE_LABELS[startup.stage] ?? titleCase(startup.stage)) : null
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

  return (
    <Link
      to="/startups/$startupId"
      params={{ startupId: startup.id }}
      className="group flex items-center gap-4 rounded-[14px] border border-line bg-white px-4 py-3 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[12.5px] font-bold text-white"
        style={{ background: chipColor(startup.name) }}
      >
        {initialsOf(startup.name)}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[14px] font-semibold text-charcoal group-hover:underline">
          {startup.name}
        </h3>
        {sub ? <p className="truncate text-xs text-muted">{sub}</p> : null}
      </div>
      {visibleTags.length > 0 ? (
        <div className="hidden shrink-0 gap-1.5 overflow-hidden lg:flex">
          {visibleTags.map((tag) => (
            <span
              key={tag}
              className="max-w-[100px] shrink-0 truncate rounded-[6px] border border-line bg-paper px-2 py-[3px] text-[11px] text-charcoal"
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
      ) : null}
      <div className="flex shrink-0 items-center gap-1.5">
        <HiringBadge hiringStatus={startup.hiring_status} />
        <WorkspaceStatusBadge status={startup.status} />
      </div>
      <span className="hidden w-28 shrink-0 text-right font-mono text-[11px] text-muted-2 md:block">
        {startup.last_enriched_at
          ? `Enriched ${compactAgo(startup.last_enriched_at)}`
          : `Saved ${compactAgo(startup.created_at)}`}
      </span>
      <span className="hidden w-28 shrink-0 text-right text-[11px] text-muted sm:block">
        {startup.matching_roles_count > 0 && startup.open_roles_count > 0 ? (
          <>
            <span className="font-semibold text-emerald-dark">{startup.matching_roles_count}</span>
            {`/${startup.open_roles_count} match you`}
          </>
        ) : startup.open_roles_count === 0 ? (
          '0 open roles'
        ) : (
          `${startup.open_roles_count} open`
        )}
      </span>
    </Link>
  )
}