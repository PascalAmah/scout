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

const SOURCE_OPTIONS = [
  { value: 'yc', label: 'YC' },
  { value: 'wellfound', label: 'Wellfound' },
  { value: 'workatastartup', label: 'Work at a Startup' },
  { value: 'generic_careers', label: 'Careers page' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'manual', label: 'Manual' },
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

function TagFilterDropdown({
  selected,
  onChange,
}: {
  selected: string[]
  onChange: (tags: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
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

  const active = selected.length > 0
  const commit = () => {
    const tag = input.trim()
    if (!tag) return
    if (!selected.includes(tag)) onChange([...selected, tag])
    setInput('')
  }

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
          {active ? `Tags: ${selected.join(', ')}` : 'Tags'}
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
            aria-label="Clear tags filter"
            onClick={() => onChange([])}
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
          aria-multiselectable="true"
          className="absolute left-0 top-full z-20 mt-1.5 w-60 overflow-hidden rounded-[10px] border border-line bg-white py-2 shadow-lg"
        >
          <label className="flex items-center gap-2 border-b border-line px-3 pb-2">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-3.5 w-3.5 shrink-0 stroke-muted-2"
              aria-hidden
            >
              <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  commit()
                } else if (e.key === 'Backspace' && !input && selected.length) {
                  onChange(selected.slice(0, -1))
                }
              }}
              placeholder="Type a tag, press Enter"
              className="w-full bg-transparent text-[13px] text-charcoal outline-none placeholder:text-muted-2"
            />
          </label>
          {selected.length > 0 ? (
            <div className="flex flex-wrap gap-1 px-3 pt-2">
              {selected.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-pill bg-paper px-2 py-0.5 text-[11px] font-medium text-charcoal"
                >
                  {tag}
                  <button
                    type="button"
                    aria-label={`Remove ${tag} tag`}
                    onClick={() => onChange(selected.filter((t) => t !== tag))}
                    className="text-muted-2 transition-colors hover:text-brick"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className="h-2.5 w-2.5"
                      aria-hidden
                    >
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="px-3 pt-2 text-[11.5px] text-muted-2">
              Filter by tags from the saved company records.
            </p>
          )}
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
  const hasFilters = Boolean(
    filters.stage ||
      filters.hiring_status ||
      filters.source ||
      (filters.tags?.length ?? 0) > 0,
  )

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
      <TagFilterDropdown
        selected={filters.tags ?? []}
        onChange={(tags) => onChange({ ...filters, tags })}
      />
      <FilterDropdown
        label="Source"
        allLabel="All sources"
        options={SOURCE_OPTIONS}
        value={filters.source}
        onChange={(source) => onChange({ ...filters, source })}
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