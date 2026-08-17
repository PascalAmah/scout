import { useSearch } from '@tanstack/react-router'
import { useState } from 'react'

import { Button } from '../../../components/ui/Button'
import type { StartupFilters } from '../api'
import { FilterBar } from '../components/FilterBar'
import { StartupCard } from '../components/StartupCard'
import { useCreateStartup, useStartups } from '../hooks'

const EMPTY_STEPS = [
  {
    title: 'Install the extension',
    text: 'Takes about a minute, works on YC and careers pages.',
  },
  { title: 'Save your first company', text: 'One click from any supported page.' },
  {
    title: 'Come back here',
    text: 'Enrichment finishes in the background, usually ~2 min.',
  },
]

export function WorkspacePage() {
  const search = useSearch({ from: '/_app/startups/' })
  // The topbar search deep-links with ?q=; seed the filter so the query runs.
  const [filters, setFilters] = useState<StartupFilters>(() =>
    search.q ? { q: search.q } : {},
  )
  const startupsQuery = useStartups(filters)
  const createStartup = useCreateStartup()

  const handleAdd = () => {
    const name = window.prompt('Startup name')
    if (!name?.trim()) return
    const website = window.prompt('Website (optional)')
    createStartup.mutate({ name: name.trim(), website: website?.trim() || null })
  }

  const startups = startupsQuery.data?.data ?? []

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-[28px] font-semibold tracking-[-0.4px] text-charcoal">
          Startup Workspace
        </h1>
        <Button variant="accent" onClick={handleAdd} loading={createStartup.isPending}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-3.5 w-3.5"
            aria-hidden
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Save a startup
        </Button>
      </div>
      <p className="mb-5 text-[13px] text-muted">
        Every company you've saved, enriched, and structured into one place.
      </p>

      <FilterBar filters={filters} onChange={setFilters} />

      {filters.q ? (
        <div className="mb-5 mt-2.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-2">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            strokeWidth="2"
            className="h-[13px] w-[13px] shrink-0 stroke-emerald-dark"
            aria-hidden
          >
            <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z" />
          </svg>
          Search understands intent — try{' '}
          <code className="rounded-[5px] bg-emerald-tint px-1.5 py-0.5 font-mono text-emerald-dark">
            series A fintech hiring backend
          </code>
        </div>
      ) : null}

      {startupsQuery.isLoading ? (
        <p className="py-12 text-center text-sm text-muted">Loading…</p>
      ) : startupsQuery.isError ? (
        <p className="py-12 text-center text-sm text-brick">
          Failed to load startups: {startupsQuery.error.message}
        </p>
      ) : startups.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-[18px] border-2 border-dashed border-line-strong bg-white px-6 py-14 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[18px] bg-emerald-tint">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="1.8"
              className="h-[30px] w-[30px] stroke-emerald-dark"
              aria-hidden
            >
              <path d="M3 21V9l9-6 9 6v12" />
            </svg>
          </div>
          <h3 className="font-serif text-[22px] font-semibold text-charcoal">
            Your workspace is empty
          </h3>
          <p className="mt-2.5 max-w-[380px] text-[13.5px] leading-relaxed text-muted">
            Every company you save becomes a structured record here — enriched, scored, and ready
            to act on. Nothing shows up until you save your first one.
          </p>
          <a
            href="#"
            className="mt-6 inline-flex items-center gap-2 rounded-pill bg-emerald px-[22px] py-[11px] text-sm font-semibold text-white transition-colors hover:bg-emerald-dark"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-3.5 w-3.5"
              aria-hidden
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Get the extension
          </a>
          <div className="mt-8 grid w-full max-w-[640px] gap-3.5 sm:grid-cols-3">
            {EMPTY_STEPS.map((step, i) => (
              <div
                key={step.title}
                className="rounded-[14px] border border-line bg-paper p-4 text-left"
              >
                <div className="mb-2.5 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-charcoal font-mono text-[11px] font-bold text-white">
                  {i + 1}
                </div>
                <b className="block text-[12.5px] text-charcoal">{step.title}</b>
                <span className="mt-1 block text-[11.5px] leading-relaxed text-muted">
                  {step.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="mb-3.5">
            <span className="text-[12.5px] text-muted">
              {startups.length} {startups.length === 1 ? 'startup' : 'startups'}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {startups.map((startup) => (
              <StartupCard key={startup.id} startup={startup} />
            ))}
          </div>
          {startupsQuery.data?.next_cursor ? (
            <div className="mt-6 text-center">
              <Button
                variant="secondary"
                onClick={() =>
                  setFilters({ ...filters, cursor: startupsQuery.data?.next_cursor ?? undefined })
                }
              >
                Load more
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
