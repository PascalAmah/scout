import { useState } from 'react'

import { matchRingColor } from '../../../components/ui/Ring'
import type { MatchOut } from '../api'

const BAND_LABELS: Record<string, string> = {
  strong: 'STRONG',
  moderate: 'MODERATE',
  weak: 'WEAK',
}

/**
 * Collapsible "Why this score?" (mockup `.why`): matched-skill count, gap
 * count, confidence band, and the summary as the explanatory note. Uses the
 * explanation fields the API actually returns — no invented totals.
 */
export function WhyThisScore({ match }: { match: MatchOut }) {
  const [open, setOpen] = useState(false)
  const explanation = match.explanation
  if (!explanation) return null

  const matched = explanation.matched_skills ?? []
  const gaps = explanation.gaps ?? []
  const band = match.confidence_band ?? null
  const bandLabel = band ? (BAND_LABELS[band] ?? band.toUpperCase()) : null
  const bandColor = matchRingColor(match.score)

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-dark hover:underline"
      >
        Why this score?
        <svg
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="2"
          className={`h-3 w-3 stroke-emerald-dark transition-transform duration-150 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div className="mt-3 rounded-md border border-line bg-paper px-4 py-3.5">
          <div className="flex justify-between py-1 text-[12.5px]">
            <span className="text-muted">Matched skills</span>
            <span className="font-mono font-semibold">{matched.length}</span>
          </div>
          <div className="flex justify-between py-1 text-[12.5px]">
            <span className="text-muted">Requirement gaps</span>
            <span className="font-mono font-semibold">{gaps.length}</span>
          </div>
          {bandLabel ? (
            <div className="flex justify-between py-1 text-[12.5px]">
              <span className="text-muted">Confidence</span>
              <span className="font-mono font-semibold" style={{ color: bandColor }}>
                {bandLabel}
              </span>
            </div>
          ) : null}
          {explanation.summary ? (
            <p className="mt-2.5 border-t border-dashed border-line-strong pt-2.5 text-[11.5px] leading-relaxed text-muted">
              {explanation.summary}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
