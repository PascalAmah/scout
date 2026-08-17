import { useParams } from '@tanstack/react-router'

import { Button } from '../../../components/ui/Button'
import { useStartup, useTriggerEnrich } from '../hooks'

function compactDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase()
}

export function StartupOverviewTab() {
  const { startupId } = useParams({ from: '/_app/startups/$startupId/' })
  const startupQuery = useStartup(startupId)
  const triggerEnrich = useTriggerEnrich()
  const startup = startupQuery.data

  if (!startup) return null

  const stageLabel = startup.stage
    ? startup.stage.replaceAll('_', ' ').replace(/\b\w/g, (ch) => ch.toUpperCase())
    : 'Unknown'

  const enrichNote = {
    none: 'Not enriched yet',
    queued: 'Queued',
    running: 'Running…',
    succeeded: `Enriched ${compactDate(startup.last_enriched_at)}`,
    failed: 'Enrichment failed',
  }[startup.enrichment_status]

  return (
    <div className="space-y-[22px]">
      <div className="grid grid-cols-1 gap-[22px] lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-[16px] border border-line bg-white p-[22px_24px] shadow-sm">
          <p className="mb-3 text-[14px] font-semibold text-charcoal">About</p>
          <p className="mb-5 text-[14px] leading-[1.7] text-charcoal">
            {startup.summary ?? 'No summary yet — trigger enrichment or add one.'}
          </p>
          <div className="mb-5 flex items-center gap-2 text-[11.5px] text-muted-2">
            <span className="rounded-[6px] bg-emerald-tint px-2 py-0.5 text-[10px] font-bold text-emerald-dark">
              HIGH CONFIDENCE
            </span>
            {startup.source
              ? `Extracted from ${startup.source === 'yc' ? 'Y Combinator' : startup.source} page`
              : 'Source unknown'}
          </div>

          {startup.tech_stack?.length ? (
            <>
              <p className="mb-3 text-[14px] font-semibold text-charcoal">Tech stack signals</p>
              <div className="flex flex-wrap gap-[7px]">
                {startup.tech_stack.map((tech) => (
                  <span
                    key={tech}
                    className="rounded-[8px] border border-line bg-paper px-[11px] py-[5px] text-[12px] font-semibold text-charcoal"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </>
          ) : null}
        </div>

        <div className="self-start overflow-hidden rounded-[16px] border border-line bg-white shadow-sm">
          <div className="px-6 pt-[22px]">
            <p className="mb-3 text-[14px] font-semibold text-charcoal">Key facts</p>
          </div>
          <ul className="px-6">
            {[
              { k: 'Stage', v: stageLabel },
              { k: 'Hiring status', v: (startup.hiring_status ?? 'unknown').replaceAll('_', ' '), mono: false },
              { k: 'Source', v: startup.source ? (startup.source === 'yc' ? 'Y Combinator' : startup.source) : '—' },
              { k: 'Saved', v: compactDate(startup.created_at), mono: true },
            ].map(({ k, v, mono }) => (
              <li
                key={k}
                className="flex items-center justify-between border-b border-line py-[11px] text-[13px]"
              >
                <span className="text-muted">{k}</span>
                <span className={`font-semibold ${mono ? 'font-mono font-medium' : ''} text-right text-charcoal`}>
                  {v}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between rounded-b-[16px] border-t border-line bg-paper px-6 py-3.5">
            <span className="font-mono text-[11.5px] text-muted-2">{enrichNote}</span>
            <Button
              variant="ghost"
              className="px-3 py-1.5 text-[12.5px]"
              loading={triggerEnrich.isPending}
              onClick={() => triggerEnrich.mutate(startupId)}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-3.5 w-3.5"
                aria-hidden
              >
                <path d="M21 11a8 8 0 1 1-3.5-6.6M21 4v6h-6" />
              </svg>
              Re-enrich
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-[22px] lg:grid-cols-2">
        <section className="rounded-[16px] border border-line bg-white shadow-sm">
          <div className="border-b border-line px-6 py-4">
            <p className="text-[14px] font-semibold text-charcoal">Founders</p>
          </div>
          {startup.founders.length === 0 ? (
            <p className="px-6 py-5 text-[13px] text-muted">No founders captured yet.</p>
          ) : (
            <ul className="divide-y divide-[#F0EEE7]">
              {startup.founders.map((founder) => (
                <li key={founder.id} className="flex items-center gap-3.5 px-6 py-3.5">
                  <div
                    aria-hidden
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-slate text-xs font-bold text-white"
                  >
                  {initialsOf(founder.name)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-semibold text-charcoal">{founder.name}</p>
                  {founder.title ? <p className="truncate text-xs text-muted">{founder.title}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        </section>

        <section className="rounded-[16px] border border-line bg-white shadow-sm">
          <div className="border-b border-line px-6 py-4">
            <p className="text-[14px] font-semibold text-charcoal">Open roles</p>
          </div>
          {startup.jobs.length === 0 ? (
            <p className="px-6 py-5 text-[13px] text-muted">No roles captured yet.</p>
          ) : (
            <ul className="divide-y divide-[#F0EEE7]">
              {startup.jobs.map((job) => (
                <li key={job.id} className="flex items-center gap-4 px-6 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold text-charcoal">{job.title}</p>
                  </div>
                  {job.url ? (
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 text-xs font-semibold text-emerald-dark hover:underline"
                    >
                      View →
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
