import { Link } from '@tanstack/react-router'

import { type StartupListItem } from '../api'
import { EnrichmentBadge, HiringBadge, StageBadge } from './StatusBadge'

export function StartupCard({ startup }: { startup: StartupListItem }) {
  const domain = startup.website ? new URL(startup.website).hostname.replace('www.', '') : null
  return (
    <Link
      to="/startups/$startupId"
      params={{ startupId: startup.id }}
      className="group block rounded-xl border border-[#E5E3DC] bg-white p-5 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-serif text-lg font-semibold text-[#1F2937] group-hover:underline">
            {startup.name}
          </h3>
          {domain ? (
            <p className="truncate text-sm text-[#6B7280]">{domain}</p>
          ) : null}
        </div>
        <EnrichmentBadge status={startup.enrichment_status} />
      </div>

      {startup.summary ? (
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-[#4B5563]">{startup.summary}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <StageBadge stage={startup.stage} />
        <HiringBadge hiringStatus={startup.hiring_status} />
        {(startup.tags ?? []).slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-[#E5E3DC] bg-[#FAFAF8] px-2 py-0.5 text-xs text-[#6B7280]"
          >
            {tag}
          </span>
        ))}
      </div>
    </Link>
  )
}
