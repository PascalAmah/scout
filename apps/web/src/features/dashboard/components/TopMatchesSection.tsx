import { Link } from '@tanstack/react-router'

import { Ring } from '../../../components/ui/Ring'
import { useMatches } from '../../matches/hooks'

export function TopMatchesSection() {
  const { data } = useMatches()
  const matches = data?.data.slice(0, 3) ?? []

  if (matches.length === 0) return null

  return (
    <section className="mt-9">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[16.5px] font-semibold text-charcoal">Top matches this week</h2>
        <Link to="/matches" className="text-[12.5px] font-semibold text-emerald-dark hover:underline">
          See all matches →
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {matches.map((match) => {
          const matched = match.explanation?.matched_skills ?? []
          const gaps = match.explanation?.gaps ?? []
          return (
            <Link
              key={match.job_id}
              to="/matches"
              className="rounded-[18px] border border-line bg-white p-5 shadow-sm transition-shadow hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[14.5px] font-semibold text-charcoal">{match.title}</p>
                  <p className="truncate text-xs text-muted">{match.startup_name}</p>
                </div>
                <Ring score={match.score} size={44} />
              </div>
              {match.explanation?.summary ? (
                <p className="mb-3 text-[12.5px] leading-relaxed text-muted">{match.explanation.summary}</p>
              ) : null}
              <div className="flex flex-wrap gap-1.5">
                {matched.slice(0, 3).map((skill) => (
                  <span
                    key={skill}
                    className="rounded-md bg-emerald-tint px-2 py-0.5 text-[10.5px] font-bold text-emerald-dark"
                  >
                    {skill}
                  </span>
                ))}
                {gaps.slice(0, 2).map((gap) => (
                  <span
                    key={gap}
                    className="rounded-md border border-line-strong bg-white px-2 py-0.5 text-[10.5px] font-bold text-muted"
                  >
                    {gap}
                  </span>
                ))}
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
