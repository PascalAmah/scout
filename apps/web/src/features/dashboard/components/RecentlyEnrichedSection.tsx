import { Link } from '@tanstack/react-router'

import { useStartups } from '../../startups/hooks'

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('')
}

function timeAgo(iso: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export function RecentlyEnrichedSection() {
  const { data } = useStartups({ limit: 50 })
  const rows = (data?.data ?? [])
    .filter((s) => s.last_enriched_at)
    .sort(
      (a, b) =>
        new Date(b.last_enriched_at!).getTime() - new Date(a.last_enriched_at!).getTime(),
    )
    .slice(0, 4)

  if (rows.length === 0) return null

  return (
    <div className="overflow-hidden rounded-[18px] border border-line bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="text-[15px] font-semibold text-charcoal">Recently enriched</h2>
        <Link to="/startups" search={{ q: undefined }} className="text-xs font-semibold text-emerald-dark hover:underline">
          View workspace →
        </Link>
      </div>
      {rows.map((startup) => {
        const running =
          startup.enrichment_status === 'queued' || startup.enrichment_status === 'running'
        return (
          <Link
            key={startup.id}
            to="/startups/$startupId"
            params={{ startupId: startup.id }}
            className="flex items-center gap-3 border-b border-line px-5 py-3.5 last:border-b-0 hover:bg-paper"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-charcoal text-xs font-bold text-white">
              {initialsOf(startup.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-semibold text-charcoal">{startup.name}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-muted">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${running ? 'animate-pulse bg-amber' : 'bg-emerald'}`}
                />
                {running
                  ? 'Enriching… usually ~2 min'
                  : `Enrichment succeeded · ${timeAgo(startup.last_enriched_at!)}`}
              </p>
            </div>
            <span className="shrink-0 font-mono text-[11px] text-muted-2">
              {timeAgo(startup.last_enriched_at!)}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
