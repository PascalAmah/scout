import { Link } from '@tanstack/react-router'

import { Button } from '../../../components/ui/Button'
import { EmptyState } from '../../../components/ui/EmptyState'
import { useCV } from '../../cv/hooks'
import { MatchCard } from '../components/MatchCard'
import { useComputeMatches, useMatches } from '../hooks'

export function MatchesPage() {
  const cvQuery = useCV()
  const matchesQuery = useMatches()
  const compute = useComputeMatches()

  const hasCv = cvQuery.isSuccess && cvQuery.data != null
  const rows = matchesQuery.data?.data ?? []

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-[#1F2937]">Matches</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
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
        <p className="py-12 text-center text-sm text-[#6B7280]">Scoring your matches…</p>
      ) : matchesQuery.isError ? (
        <p className="py-12 text-center text-sm text-[#B3261E]">
          Failed to load matches: {matchesQuery.error.message}
        </p>
      ) : rows.length === 0 ? (
        <EmptyState
          title="Nothing scored yet"
          description="Save startups with open roles, then hit “Recompute scores” to rank them. Scores update automatically whenever your CV changes."
          action={<Button onClick={() => compute.mutate()} loading={compute.isPending}>Recompute scores</Button>}
        />
      ) : (
        <>
          <p className="mb-4 text-sm text-[#6B7280]">
            {rows.length} {rows.length === 1 ? 'role' : 'roles'} scored
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((match) => (
              <MatchCard key={match.job_id} match={match} />
            ))}
          </div>
          {matchesQuery.data?.next_cursor ? (
            <div className="mt-6 text-center">
              <Button variant="ghost">Load more</Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}