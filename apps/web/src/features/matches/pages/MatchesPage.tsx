import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'

import { Button } from '../../../components/ui/Button'
import { EmptyState } from '../../../components/ui/EmptyState'
import { useCV } from '../../cv/hooks'
import type { MatchOut } from '../api'
import { BulkBar } from '../components/BulkBar'
import { MatchRow } from '../components/MatchRow'
import { useComputeMatches, useMatchFeedback, useMatches } from '../hooks'

export function MatchesPage() {
  const cvQuery = useCV()
  const matchesQuery = useMatches()
  const compute = useComputeMatches()
  const feedback = useMatchFeedback()
  const [extra, setExtra] = useState<MatchOut[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [remoteOnly, setRemoteOnly] = useState(false)

  const hasCv = cvQuery.isSuccess && cvQuery.data != null
  const rows = useMemo(
    () => [...(matchesQuery.data?.data ?? []), ...extra],
    [matchesQuery.data, extra],
  )
  const cursor = nextCursor ?? matchesQuery.data?.next_cursor ?? null

  const visible = useMemo(
    () => (remoteOnly ? rows.filter((m) => m.remote) : rows),
    [rows, remoteOnly],
  )
  const selectedMatches = rows.filter((m) => selected.has(m.job_id))

  async function loadMore() {
    if (!cursor || loadingMore) return
    setLoadingMore(true)
    try {
      const page = await import('../api').then((m) => m.recommendedRequest(cursor))
      setExtra((prev) => [...prev, ...page.data])
      setNextCursor(page.next_cursor)
    } finally {
      setLoadingMore(false)
    }
  }

  function toggleSelected(jobId: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(jobId)
      else next.delete(jobId)
      return next
    })
  }

  function handleFeedback(jobId: string, fb: 'good' | 'poor') {
    // Rated matches retire from the queue: drop from any loaded extra pages
    // right away; the backend filter handles the next fetch.
    setExtra((prev) => prev.filter((m) => m.job_id !== jobId))
    setSelected((prev) => {
      const next = new Set(prev)
      next.delete(jobId)
      return next
    })
    feedback.mutate({ jobId, feedback: fb })
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-[28px] font-semibold tracking-tight text-charcoal">
            Matches
          </h1>
          <p className="mt-1.5 text-[13px] text-muted">
            Every open role scored against your CV — sorted by fit, not by how recently it was
            posted.
          </p>
        </div>
        {hasCv ? (
          <Button variant="ghost" onClick={() => compute.mutate()} loading={compute.isPending}>
            Recompute scores
          </Button>
        ) : null}
      </div>

      {!hasCv ? (
        <EmptyState
          title="Upload your CV first"
          description="Matches are scored against your real CV. Upload it in Settings → Profile/CV and the roles in your workspace get ranked by fit."
          action={
            <Link to="/settings/profile">
              <Button>Go to Profile / CV</Button>
            </Link>
          }
        />
      ) : matchesQuery.isLoading ? (
        <p className="py-12 text-center text-sm text-muted">Scoring your matches…</p>
      ) : matchesQuery.isError ? (
        <p className="py-12 text-center text-sm text-brick">
          Failed to load matches: {matchesQuery.error.message}
        </p>
      ) : rows.length === 0 ? (
        <EmptyState
          title="Nothing scored yet"
          description="Save startups with open roles, then hit “Recompute scores” to rank them. Scores update automatically whenever your CV changes."
          action={
            <Button onClick={() => compute.mutate()} loading={compute.isPending}>
              Recompute scores
            </Button>
          }
        />
      ) : (
        <>
          {/* Filter / sort bar (mockup `.filter-bar`) */}
          <div className="mb-4 flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-pill border border-charcoal bg-charcoal px-3.5 py-2 text-[13px] font-medium text-white">
              Sorted by score
            </span>
            <button
              type="button"
              aria-pressed={remoteOnly}
              onClick={() => setRemoteOnly((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-pill border px-3.5 py-2 text-[13px] font-medium transition-colors ${
                remoteOnly
                  ? 'border-charcoal bg-charcoal text-white'
                  : 'border-line-strong bg-white text-charcoal hover:border-charcoal'
              }`}
            >
              Remote only
            </button>
            {remoteOnly ? (
              <button
                type="button"
                onClick={() => setRemoteOnly(false)}
                className="text-[12.5px] text-muted hover:text-charcoal"
              >
                Clear filters
              </button>
            ) : null}
            <span className="ml-auto text-[12.5px] text-muted">
              {visible.length} {visible.length === 1 ? 'role' : 'roles'} scored
            </span>
          </div>

          <BulkBar
            selected={selectedMatches}
            onClear={() => setSelected(new Set())}
          />

          <div className="flex flex-col gap-3">
            {visible.map((match) => (
              <MatchRow
                key={match.job_id}
                match={match}
                selected={selected.has(match.job_id)}
                onToggleSelected={(checked) => toggleSelected(match.job_id, checked)}
                onFeedback={handleFeedback}
              />
            ))}
          </div>

          {cursor ? (
            <div className="mt-6 text-center">
              <Button variant="ghost" onClick={() => void loadMore()} loading={loadingMore}>
                Load more
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
