import { Ring } from '../../../components/ui/Ring'
import type { MatchOut } from '../api'

export function MatchCard({ match }: { match: MatchOut }) {
  const meta = [
    match.location,
    match.employment_type?.replace('_', ' '),
    match.remote ? 'Remote' : null,
    match.seniority,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="rounded-xl border border-[#E5E3DC] bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
            {match.startup_name}
          </p>
          <h3 className="mt-0.5 truncate text-[15.5px] font-semibold text-[#1F2937]">
            {match.title}
          </h3>
        </div>
        <Ring score={match.score} size={44} />
      </div>
      {meta ? <p className="mt-3 text-xs text-[#6B7280]">{meta}</p> : null}
      {match.description ? (
        <p className="mt-3 line-clamp-2 text-sm text-[#6B7280]">{match.description}</p>
      ) : null}
    </div>
  )
}