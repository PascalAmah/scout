import { Link, Outlet, useNavigate, useParams } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

import { Button } from '../../../components/ui/Button'
import { useDeleteStartup, useMoveToPipeline, useStartup } from '../hooks'
import { HiringBadge, StageBadge, WorkspaceStatusBadge } from '../components/StatusBadge'

const TABS = [
  { label: 'Overview', to: '/startups/$startupId', exact: true },
  { label: 'Founders', to: '/startups/$startupId/founders' },
  { label: 'Jobs', to: '/startups/$startupId/jobs' },
  { label: 'Notes', to: '/startups/$startupId/notes' },
]

const CHIP_COLORS = ['#1F2937', '#18A058', '#3E5C8A', '#B8791A', '#0F6E56', '#8A5A11']

function chipColor(name: string): string {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) % 997
  return CHIP_COLORS[hash % CHIP_COLORS.length]!
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase()
}

export function StartupDetailLayout() {
  const { startupId } = useParams({ from: '/_app/startups/$startupId' })
  const navigate = useNavigate()
  const startupQuery = useStartup(startupId)
  const deleteStartup = useDeleteStartup()
  const moveToPipeline = useMoveToPipeline()
  const startup = startupQuery.data

  const [pickerOpen, setPickerOpen] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState<string>('')
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!pickerOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPickerOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [pickerOpen])

  const remove = () => {
    if (!window.confirm(`Remove ${startup?.name ?? 'this startup'} from your workspace?`)) return
    deleteStartup.mutate(startupId, {
      onSuccess: () => void navigate({ to: '/startups', search: { q: undefined } }),
    })
  }

  const openPicker = () => {
    if (!startup) return
    // Single role → attach it directly. Multiple → let the user pick.
    if (startup.jobs.length <= 1) {
      moveToPipeline.mutate(
        { startupId, jobId: startup.jobs[0]?.id ?? null },
        { onSuccess: () => void navigate({ to: '/crm' }) },
      )
      return
    }
    setSelectedJobId(startup.jobs[0]!.id)
    setPickerOpen(true)
  }

  const confirmMove = () => {
    setPickerOpen(false)
    moveToPipeline.mutate(
      { startupId, jobId: selectedJobId || null },
      { onSuccess: () => void navigate({ to: '/crm' }) },
    )
  }

  const enriching =
    startup?.enrichment_status === 'queued' || startup?.enrichment_status === 'running'

  return (
    <div>
      {!startup ? (
        <p className="py-12 text-center text-sm text-[#6B7280]">
          {startupQuery.isLoading ? 'Loading…' : 'Not found'}
        </p>
      ) : (
        <>
          <Link
            to="/startups"
            search={{ q: undefined }}
            className="mb-[18px] inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted transition-colors hover:text-charcoal"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-[13px] w-[13px]"
              aria-hidden
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Workspace
          </Link>

          <div className="mb-3.5 flex flex-wrap items-start justify-between gap-5">
            <div className="flex gap-4">
              <div
                aria-hidden
                className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-[16px] text-[19px] font-bold text-white"
                style={{ background: chipColor(startup.name) }}
              >
                {initialsOf(startup.name)}
              </div>
              <div className="min-w-0">
                <h1 className="font-serif text-[27px] font-semibold leading-tight tracking-[-0.4px] text-charcoal">
                  {startup.name}
                </h1>
                {startup.website ? (
                  <a
                    href={startup.website}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1.5 text-[12.5px] text-muted transition-colors hover:text-charcoal"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="h-3 w-3"
                      aria-hidden
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z" />
                    </svg>
                    {new URL(startup.website).hostname.replace('www.', '')}
                  </a>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              <div className="relative" ref={pickerRef}>
                <Button
                  className="px-4 py-2 text-[13px]"
                  loading={moveToPipeline.isPending}
                  onClick={() => void openPicker()}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-3.5 w-3.5"
                    aria-hidden
                  >
                    <path d="M6 3h12v18l-6-4-6 4z" />
                  </svg>
                  Save as application
                </Button>
                {pickerOpen && startup ? (
                  <div
                    role="menu"
                    aria-label="Choose a role"
                    className="absolute right-0 top-full z-20 mt-1.5 w-72 overflow-hidden rounded-[10px] border border-line bg-white py-1 shadow-lg"
                  >
                    <p className="px-3.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-2">
                      Which role?
                    </p>
                    {startup.jobs.map((job) => (
                      <button
                        key={job.id}
                        type="button"
                        role="menuitemradio"
                        aria-checked={selectedJobId === job.id}
                        onClick={() => setSelectedJobId(job.id)}
                        className={`flex w-full items-center justify-between px-3.5 py-2 text-left text-[13px] ${
                          selectedJobId === job.id
                            ? 'bg-paper font-semibold text-charcoal'
                            : 'text-muted hover:bg-paper'
                        }`}
                      >
                        <span className="min-w-0">{job.title}</span>
                        {selectedJobId === job.id ? (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            className="h-3.5 w-3.5 shrink-0 stroke-emerald"
                            aria-hidden
                          >
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        ) : null}
                      </button>
                    ))}
                    <div className="mt-1 flex items-center justify-end gap-2 border-t border-line px-3.5 py-2.5">
                      <button
                        type="button"
                        onClick={() => setPickerOpen(false)}
                        className="text-[12.5px] font-semibold text-muted hover:text-charcoal"
                      >
                        Cancel
                      </button>
                      <Button
                        className="px-3 py-1 text-[12.5px]"
                        onClick={() => void confirmMove()}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
              <Button
                variant="ghost"
                className="px-3 py-2 text-[13px]"
                loading={deleteStartup.isPending}
                onClick={() => void remove()}
              >
                Remove
              </Button>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <StageBadge stage={startup.stage} />
            <WorkspaceStatusBadge status={startup.status} />
            <HiringBadge hiringStatus={startup.hiring_status} />
          </div>

          {enriching ? (
            <div className="mb-5.5 flex items-center gap-2.5 rounded-[14px] border border-[#F0DDB8] bg-amber-tint px-4 py-[11px] text-[12.5px] text-amber">
              <span className="h-[7px] w-[7px] shrink-0 animate-pulse rounded-full bg-amber" />
              <span>
                <b>Enriching…</b> refreshing tech stack and hiring signal — usually takes ~2
                min. <span className="text-[#9A7A45]">The rest of this page still works while it runs.</span>
              </span>
            </div>
          ) : null}

          <nav className="mb-[26px] flex gap-[26px] border-b border-line">
            {TABS.map((tab) => (
              <Link
                key={tab.label}
                to={tab.to}
                params={{ startupId }}
                activeOptions={{ exact: tab.exact ?? false }}
                className="border-b-2 border-transparent pb-[11px] text-[13.5px] font-semibold text-muted hover:text-charcoal [&.active]:border-emerald [&.active]:text-charcoal"
              >
                {tab.label}
              </Link>
            ))}
          </nav>
          <Outlet />
        </>
      )}
    </div>
  )
}
