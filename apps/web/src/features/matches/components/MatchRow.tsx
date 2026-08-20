import { useState } from 'react'
import { Link } from '@tanstack/react-router'

import { Ring } from '../../../components/ui/Ring'
import type { MatchOut } from '../api'
import { GenerateResumeFlow } from './GenerateResumeFlow'
import { WhyThisScore } from './WhyThisScore'

function metaParts(match: MatchOut): string[] {
  return [
    match.location,
    match.seniority,
    match.employment_type?.replace('_', ' '),
    match.remote ? 'Remote' : null,
  ].filter(Boolean) as string[]
}

/**
 * One ranked match in the queue (mockup `.match-row`): score ring, role +
 * company, real metadata, summary, matched/gap chips, "Why this score?",
 * and thumbs feedback. Rated matches retire from the queue via the backend.
 */
export function MatchRow({
  match,
  selected,
  onToggleSelected,
  onFeedback,
}: {
  match: MatchOut
  selected: boolean
  onToggleSelected: (checked: boolean) => void
  onFeedback: (jobId: string, feedback: 'good' | 'poor') => void
}) {
  const [voted, setVoted] = useState<'good' | 'poor' | null>(null)
  const explanation = match.explanation
  const matched = explanation?.matched_skills ?? []
  const gaps = explanation?.gaps ?? []
  const meta = metaParts(match).join(' · ')

  function vote(feedback: 'good' | 'poor') {
    setVoted(feedback)
    onFeedback(match.job_id, feedback)
  }

  return (
    <div className="rounded-lg border border-line bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onToggleSelected(e.target.checked)}
          aria-label={`Select ${match.title} at ${match.startup_name}`}
          className="mt-1 h-4 w-4 shrink-0 accent-emerald"
        />
        <Ring score={match.score} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[15px] font-semibold leading-snug text-charcoal">{match.title}</p>
              <p className="text-[12.5px] text-muted">{match.startup_name}</p>
              {meta ? (
                <p className="mt-0.5 text-[11.5px] text-muted-2">{meta}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 gap-2">
              <Link
                to="/startups/$startupId/jobs"
                params={{ startupId: match.startup_id }}
                search={{ focus: match.job_id }}
                className="inline-flex items-center justify-center gap-1.5 rounded-pill border border-line-strong bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-charcoal hover:border-charcoal"
              >
                View match
              </Link>
              <GenerateResumeFlow jobId={match.job_id} />
            </div>
          </div>

          {explanation && explanation.summary ? (
            <p className="mt-2.5 text-[13px] leading-relaxed text-charcoal">
              {explanation.summary}
            </p>
          ) : null}

          {matched.length > 0 || gaps.length > 0 ? (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {matched.map((skill) => (
                <span
                  key={skill}
                  className="rounded-md bg-emerald-tint px-2 py-0.5 text-[10.5px] font-bold uppercase text-emerald-dark"
                >
                  {skill}
                </span>
              ))}
              {gaps.map((gap) => (
                <span
                  key={gap}
                  className="rounded-md border border-line-strong bg-white px-2 py-0.5 text-[10.5px] font-bold uppercase text-muted"
                >
                  {gap} — gap
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-3 flex items-center justify-between gap-4 border-t border-line pt-3">
            <WhyThisScore match={match} />
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                aria-label="Good fit"
                onClick={() => vote('good')}
                className={`flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${
                  voted === 'good'
                    ? 'border-emerald-tint-strong bg-emerald-tint'
                    : 'border-line-strong bg-white hover:border-emerald'
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  strokeWidth="2"
                  className={`h-[13px] w-[13px] ${
                    voted === 'good' ? 'stroke-emerald' : 'stroke-muted'
                  }`}
                  aria-hidden
                >
                  <path d="M7 10v11M15 5.88 14 10h6.29a2 2 0 0 1 1.93 2.5l-2.36 9a2 2 0 0 1-1.93 1.5H9a2 2 0 0 1-2-2v-9a2 2 0 0 1 .5-1.32L13 3l1.5 1.5A2 2 0 0 1 15 5.88z" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Poor fit"
                onClick={() => vote('poor')}
                className={`flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${
                  voted === 'poor'
                    ? 'border-[#EBC7BC] bg-brick-tint'
                    : 'border-line-strong bg-white hover:border-brick'
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  strokeWidth="2"
                  className={`h-[13px] w-[13px] ${
                    voted === 'poor' ? 'stroke-brick' : 'stroke-muted'
                  }`}
                  aria-hidden
                >
                  <path d="M17 14V3M9 18.12 10 14H3.71a2 2 0 0 1-1.93-2.5l2.36-9A2 2 0 0 1 6.07 1H15a2 2 0 0 1 2 2v9a2 2 0 0 1-.5 1.32L11 21l-1.5-1.5A2 2 0 0 1 9 18.12z" />
                </svg>
              </button>
              {voted ? (
                <span className="text-[11px] text-muted-2">Feedback recorded</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
