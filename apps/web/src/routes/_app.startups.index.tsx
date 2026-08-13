import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { FilterBar } from '../features/startups/components/FilterBar'
import { StartupCard } from '../features/startups/components/StartupCard'
import { useCreateStartup, useStartups } from '../features/startups/hooks'
import type { StartupFilters } from '../features/startups/api'

export const Route = createFileRoute('/_app/startups/')({
  component: WorkspacePage,
})

function WorkspacePage() {
  const [filters, setFilters] = useState<StartupFilters>({})
  const startupsQuery = useStartups(filters)
  const createStartup = useCreateStartup()

  const handleAdd = () => {
    const name = window.prompt('Startup name')
    if (!name?.trim()) return
    const website = window.prompt('Website (optional)')
    createStartup.mutate({ name: name.trim(), website: website?.trim() || null })
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-[#1F2937]">Workspace</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Startups you're tracking — add them here or capture them with the extension.
          </p>
        </div>
        <Button onClick={handleAdd} loading={createStartup.isPending}>
          Add startup
        </Button>
      </div>

      <div className="mb-6">
        <FilterBar filters={filters} onChange={setFilters} />
      </div>

      {startupsQuery.isLoading ? (
        <p className="py-12 text-center text-sm text-[#6B7280]">Loading…</p>
      ) : startupsQuery.isError ? (
        <p className="py-12 text-center text-sm text-[#B3261E]">
          Failed to load startups: {startupsQuery.error.message}
        </p>
      ) : (startupsQuery.data?.data.length ?? 0) === 0 ? (
        <EmptyState
          title="No startups yet"
          description="Save your first startup from the extension while browsing Y Combinator or any company careers page, or add one manually."
          action={<Button onClick={handleAdd}>Add startup</Button>}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(startupsQuery.data?.data ?? []).map((startup) => (
              <StartupCard key={startup.id} startup={startup} />
            ))}
          </div>
          {startupsQuery.data?.next_cursor ? (
            <div className="mt-6 text-center">
              <Button variant="ghost" onClick={() => setFilters({ ...filters, cursor: startupsQuery.data?.next_cursor ?? undefined })}>
                Load more
              </Button>
            </div>
          ) : null}
        </>
      )}

      <div className="mt-10 text-sm text-[#9AA1AB]">
        Tip: the extension lets you save startups instantly while browsing their site or careers page.
      </div>
    </div>
  )
}
