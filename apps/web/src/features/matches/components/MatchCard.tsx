import { useState } from 'react'

import { Ring } from '../../../components/ui/Ring'
import type { MatchOut } from '../api'

export function MatchCard({
  match,
  onFeedback,
}: {
  match: MatchOut
  onFeedback: (jobId: string, feedback: 'good' | 'poor') => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [feedback, setFeedback] = useState<'good' | 'poor' | null>(null)

  const meta = [
    match.location,
    match.employment_type?.replace('_', ' '),
    match.remote ? 'Remote' : null,
    match.seniority,
  ]
    .filter(Boolean)
    .join(' · ')

  const explanation = match.explanation
  const hasExplanation = explanation != null && explanation.summary.length > 0
  const matched = explanation?.matched_skills ?? []
  const gaps = explanation?.gaps ?? []

  return (
    <div className="flex flex-col rounded-xl border border-[#E5E3DC] bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
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
        <p className={`mt-3 text-sm text-[#6B7280] ${expanded ? '' : 'line-clamp-2'}`}>
          {match.description}
        </p>
      ) : null}

      {matched.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {matched.map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-[#E7F5EE] px-2.5 py-0.5 text-xs font-medium text-[#0F6E56]"
            >
              {skill}
            </span>
          ))}
        </div>
      ) : null}

      {gaps.length > 0 ? (
        <div className="mt-3 rounded-lg border border-[#F0E0C0] bg-[#FDF6E8] px-3 py-2 text-xs text-[#8A5A1A]">
          <span className="font-medium">Gaps:</span>{' '}
          {gaps.map((gap) => (
            <span key={gap} className="mr-1.5">
              {gap}
            </span>
          ))}
        </div>
      ) : null}

      {hasExplanation ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 self-start text-left text-xs font-medium text-[#18A058] hover:underline"
        >
          {expanded ? 'Hide why this score' : 'Why this score?'}
        </button>
      ) : null}
      {expanded && hasExplanation ? (
        <p className="mt-2 rounded-lg bg-[#F6F5F0] p-3 text-xs leading-relaxed text-[#4B5563]">
          {explanation.summary}
        </p>
      ) : null}

      <div className="mt-auto flex items-center gap-2 pt-4">
        <button
          type="button"
          onClick={() => {
            setFeedback('good')
            onFeedback(match.job_id, 'good')
          }}
          className={`rounded-lg border px-2.5 py-1 text-xs transition-colors ${
            feedback === 'good'
              ? 'border-[#18A058] bg-[#E7F5EE] text-[#0F6E56]'
              : 'border-[#E5E3DC] text-[#6B7280] hover:border-[#18A058] hover:text-[#0F6E56]'
          }`}
        >
          Good fit
        </button>
        <button
          type="button"
          onClick={() => {
            setFeedback('poor')
            onFeedback(match.job_id, 'poor')
          }}
          className={`rounded-lg border px-2.5 py-1 text-xs transition-colors ${
            feedback === 'poor'
              ? 'border-[#B3261E] bg-[#FCEFEC] text-[#A23B2A]'
              : 'border-[#E5E3DC] text-[#6B7280] hover:border-[#B3261E] hover:text-[#A23B2A]'
          }`}
        >
          Poor fit
        </button>
        {feedback ? <span className="text-xs text-[#9AA1AB]">Feedback recorded</span> : null}
      </div>
    </div>
  )
}