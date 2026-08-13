import { Input } from '../../../components/ui/Input'
import type { StartupFilters } from '../api'

const STAGE_OPTIONS = [
  { value: '', label: 'All stages' },
  { value: 'pre_seed', label: 'Pre-seed' },
  { value: 'seed', label: 'Seed' },
  { value: 'series_a', label: 'Series A' },
  { value: 'series_b', label: 'Series B' },
  { value: 'series_c', label: 'Series C' },
  { value: 'growth', label: 'Growth' },
]

const HIRING_OPTIONS = [
  { value: '', label: 'All hiring' },
  { value: 'hiring', label: 'Hiring' },
  { value: 'maybe', label: 'Maybe' },
  { value: 'not_hiring', label: 'Not hiring' },
]

export function FilterBar({
  filters,
  onChange,
}: {
  filters: StartupFilters
  onChange: (next: StartupFilters) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        placeholder="Search startups…"
        className="w-64"
        value={filters.q ?? ''}
        onChange={(e) => onChange({ ...filters, q: e.target.value || undefined })}
      />
      <select
        value={filters.stage ?? ''}
        onChange={(e) => onChange({ ...filters, stage: e.target.value || undefined })}
        className="rounded-lg border border-[#D6D3C9] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#18A058]"
      >
        {STAGE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <select
        value={filters.hiring_status ?? ''}
        onChange={(e) => onChange({ ...filters, hiring_status: e.target.value || undefined })}
        className="rounded-lg border border-[#D6D3C9] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#18A058]"
      >
        {HIRING_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
