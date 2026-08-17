import { useEffect, useRef, useState } from 'react'

import type { StartupFilters } from '../api'

const STAGE_OPTIONS = [
  { value: 'pre_seed', label: 'Pre-seed' },
  { value: 'seed', label: 'Seed' },
  { value: 'series_a', label: 'Series A' },
  { value: 'series_b', label: 'Series B' },
  { value: 'series_c', label: 'Series C' },
  { value: 'growth', label: 'Growth' },
]

const HIRING_OPTIONS = [
  { value: 'hiring', label: 'Hiring' },
  { value: 'maybe', label: 'Maybe' },
  { value: 'not_hiring', label: 'Not hiring' },
]

function FilterDropdown({
  label,
  allLabel,
  options,
  value,
  onChange,
}: {
  label: string
  allLabel: string
  options: { value: string; label: string }[]
  value?: string
  onChange: (value?: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const current = options.find((o) => o.value === value)
  const active = Boolean(value)

  return (
    <div className="relative" ref={ref}>
      <div
        className={`inline-flex items-center overflow-hidden rounded-pill border transition-colors ${
          active
            ? 'border-charcoal bg-charcoal text-white'
            : 'border-line-strong bg-white text-charcoal hover:border-charcoal'
        }`}
      >
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium"
        >
          {active ? `${label}: ${current?.label}` : label}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`h-3 w-3 ${active ? '' : 'opacity-60'}`}
            aria-hidden
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {active ? (
          <button
            type="button"
            aria-label={`Clear ${label.toLowerCase()} filter`}
            onClick={() => onChange(undefined)}
            className="pr-3 pl-1 text-white/70 transition-colors hover:text-white"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="h-3 w-3"
              aria-hidden
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        ) : null}
      </div>

      {open ? (
        <div
          role="listbox"
          className="absolute left-0 top-full z-20 mt-1.5 w-44 overflow-hidden rounded-[10px] border border-line bg-white py-1 shadow-lg"
        >
          <button
            type="button"
            role="option"
            aria-selected={!active}
            onClick={() => {
              onChange(undefined)
              setOpen(false)
            }}
            className={`block w-full px-3.5 py-2 text-left text-[13px] ${
              !active ? 'bg-paper font-semibold text-charcoal' : 'text-muted hover:bg-paper'
            }`}
          >
            {allLabel}
          </button>
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={value === o.value}
              onClick={() => {
                onChange(o.value)
                setOpen(false)
              }}
              className={`block w-full px-3.5 py-2 text-left text-[13px] ${
                value === o.value ? 'bg-paper font-semibold text-charcoal' : 'text-muted hover:bg-paper'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function FilterBar({
  filters,
  onChange,
}: {
  filters: StartupFilters
  onChange: (next: StartupFilters) => void
}) {
  const hasFilters = Boolean(filters.stage || filters.hiring_status)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterDropdown
        label="Stage"
        allLabel="All stages"
        options={STAGE_OPTIONS}
        value={filters.stage}
        onChange={(stage) => onChange({ ...filters, stage })}
      />
      <FilterDropdown
        label="Hiring status"
        allLabel="All hiring statuses"
        options={HIRING_OPTIONS}
        value={filters.hiring_status}
        onChange={(hiring_status) => onChange({ ...filters, hiring_status })}
      />
      {hasFilters ? (
        <button
          type="button"
          onClick={() => onChange({})}
          className="ml-1 text-[12.5px] font-medium text-muted transition-colors hover:text-charcoal"
        >
          Clear filters
        </button>
      ) : null}
    </div>
  )
}
