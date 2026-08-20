import { useEffect, useMemo, useState } from 'react'

import type { QuickSaveJob, QuickSaveStartup } from '@scout/types'
import type { DetectedPayload } from '../../background/state'
import { PrefilledCard } from '../components/PrefilledCard'
import { COLORS, RADII, btnAccent, btnAccentDisabled, btnGhost } from '../theme'

const FILTER_KEY = 'scout_role_filter_v1'

/** Remembered role filter per origin (only meaningful on listing pages). */
function loadFilter(): string {
  try {
    return sessionStorage.getItem(`${FILTER_KEY}:${location.origin}`) ?? ''
  } catch {
    return ''
  }
}

function saveFilter(value: string): void {
  try {
    sessionStorage.setItem(`${FILTER_KEY}:${location.origin}`, value)
  } catch {
    // storage unavailable — filtering still works for this open
  }
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase()
}

interface RoleRow {
  key: string
  startupName: string
  title: string
  location?: string | null
}

function groupRows(payload: DetectedPayload): { startup: QuickSaveStartup; jobs: QuickSaveJob[] }[] {
  if (payload.groups?.length) return payload.groups
  if (payload.jobs?.length) return [{ startup: payload.startup, jobs: payload.jobs }]
  return []
}

function matchesFilter(row: RoleRow, filter: string): boolean {
  const q = filter.trim().toLowerCase()
  if (!q) return true
  return (
    row.title.toLowerCase().includes(q) ||
    row.startupName.toLowerCase().includes(q) ||
    (row.location ?? '').toLowerCase().includes(q)
  )
}

export function Detected({
  payload,
  onSave,
  onManual,
}: {
  payload: DetectedPayload
  onSave: (payload: DetectedPayload, tags: string[]) => Promise<void>
  onManual: () => void
}) {
  const groups = groupRows(payload)
  const isListing = groups.length > 0 && groups[0].jobs.length > 1

  const [includeCompany, setIncludeCompany] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState(loadFilter)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())

  // Flatten the detected roles into rows for the checklist.
  const rows: RoleRow[] = useMemo(() => {
    const out: RoleRow[] = []
    for (const group of groups) {
      for (const job of group.jobs) {
        out.push({
          key: `${group.startup.name ?? 'startup'}\u0000${job.url ?? job.title}`,
          startupName: group.startup.name ?? 'Unknown company',
          title: job.title,
          location: job.location,
        })
      }
    }
    return out
  }, [groups])

  const filtered = useMemo(() => rows.filter((r) => matchesFilter(r, filter)), [rows, filter])

  // Default: select every visible row once the list first renders (so "Save
  // all matching" is one click), and keep selections when the filter changes.
  useEffect(() => {
    setSelected((prev) => {
      const next = new Set(prev)
      for (const row of filtered) next.add(row.key)
      return next
    })
  }, [filtered]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedRows = rows.filter((r) => selected.has(r.key))
  const selectedStartups = new Set(selectedRows.map((r) => r.startupName)).size

  const entityLabel = payload.job
    ? 'Job posting'
    : payload.founders?.length || payload.founder
      ? 'Founder profile'
      : isListing
        ? 'Job listing'
        : 'Company'

  const companyName = payload.startup?.name ?? 'this company'

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Preserve the original URL for each role (the API dedupes jobs by URL), so
  // re-saving a listing doesn't stack duplicates.
  const urlByTitle = useMemo(() => {
    const map = new Map<string, string | null>()
    for (const group of groups) {
      for (const job of group.jobs) map.set(job.title, job.url ?? null)
    }
    return map
  }, [groups])

  const submit = async () => {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      if (isListing) {
        // Build a payload from the selected rows. If they span one startup,
        // send jobs[]; if several, send groups — the background splits groups
        // into one quick-save per startup.
        const byStartup = new Map<string, { startup: QuickSaveStartup; jobs: QuickSaveJob[] }>()
        for (const row of selectedRows) {
          const original = groups.find((g) => (g.startup.name ?? 'Unknown company') === row.startupName)
          const entry = byStartup.get(row.startupName) ?? {
            startup: original?.startup ?? { name: row.startupName },
            jobs: [],
          }
          entry.jobs.push({
            title: row.title,
            url: urlByTitle.get(row.title) ?? null,
            location: row.location ?? null,
          })
          byStartup.set(row.startupName, entry)
        }
        const savePayload: DetectedPayload = {
          source: payload.source,
          source_url: payload.source_url,
          startup: payload.startup,
          groups: Array.from(byStartup.values()),
        }
        await onSave(savePayload, [])
      } else {
        // Single entity (company / one job / founder) — save as before.
        await onSave(payload, [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setSaving(false)
    }
  }

  if (!isListing) {
    return (
      <div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 10.5,
            fontWeight: 700,
            color: COLORS.emeraldDark,
            background: COLORS.emeraldTint,
            padding: '4px 10px',
            borderRadius: RADII.pill,
            marginBottom: 12,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: COLORS.emeraldDark,
            }}
          />
          Detected: {entityLabel}
        </span>

        <PrefilledCard startup={payload.startup} job={payload.job} founders={payload.founders} source={payload.source} />

        {payload.job ? (
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              marginBottom: 12,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={includeCompany}
              onChange={(e) => setIncludeCompany(e.target.checked)}
              style={{ width: 13, height: 13, accentColor: COLORS.emerald, margin: 0 }}
            />
            <span style={{ fontSize: 11.5, color: COLORS.muted }}>
              Also save {companyName} as a company
            </span>
          </label>
        ) : null}

        {error ? (
          <p style={{ margin: '0 0 8px', fontSize: 11.5, color: COLORS.brick }}>{error}</p>
        ) : null}

        <button
          onClick={() => void submit()}
          disabled={saving}
          style={saving ? btnAccentDisabled : btnAccent}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={13} height={13} aria-hidden>
            <path d="M6 3h12v18l-6-4-6 4z" />
          </svg>
          {saving ? 'Saving…' : payload.job ? 'Save job' : payload.founders?.length || payload.founder ? 'Save founder' : 'Save startup'}
        </button>

        <button
          onClick={onManual}
          style={{
            ...btnGhost,
            marginTop: 4,
            padding: '6px',
            fontSize: 12,
            width: '100%',
            background: 'none',
            border: 'none',
          }}
        >
          Edit details
        </button>
      </div>
    )
  }

  return (
    <div>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 10.5,
          fontWeight: 700,
          color: COLORS.emeraldDark,
          background: COLORS.emeraldTint,
          padding: '4px 10px',
          borderRadius: RADII.pill,
          marginBottom: 10,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: COLORS.emeraldDark,
          }}
        />
        Detected: {rows.length} roles on this listing
      </span>

      <input
        type="search"
        placeholder="Filter roles… (e.g. frontend)"
        value={filter}
        onChange={(e) => {
          setFilter(e.target.value)
          saveFilter(e.target.value)
        }}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          fontSize: 12,
          padding: '8px 12px',
          border: `1px solid ${COLORS.lineStrong}`,
          borderRadius: 8,
          color: COLORS.charcoal,
          fontFamily: 'inherit',
          background: COLORS.white,
          marginBottom: 10,
        }}
      />

      <div
        style={{
          maxHeight: 260,
          overflowY: 'auto',
          border: `1px solid ${COLORS.line}`,
          borderRadius: 12,
          background: COLORS.paper,
          marginBottom: 12,
        }}
      >
        {filtered.length === 0 ? (
          <p style={{ margin: 0, padding: '16px 14px', fontSize: 12, color: COLORS.muted, textAlign: 'center' }}>
            No roles match “{filter}”.
          </p>
        ) : (
          filtered.map((row) => {
            const checked = selected.has(row.key)
            return (
              <label
                key={row.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  padding: '9px 12px',
                  cursor: 'pointer',
                  borderBottom: `1px solid ${COLORS.line}`,
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(row.key)}
                  style={{ width: 13, height: 13, accentColor: COLORS.emerald, margin: 0, flexShrink: 0 }}
                />
                <span
                  aria-hidden
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 7,
                    background: COLORS.charcoal,
                    color: '#fff',
                    fontSize: 9,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {initialsOf(row.startupName)}
                </span>
                <span style={{ minWidth: 0 }}>
                  <b style={{ fontSize: 12, display: 'block', color: COLORS.charcoal, lineHeight: 1.3 }}>
                    {row.title}
                  </b>
                  <span style={{ fontSize: 10.5, color: COLORS.muted }}>
                    {row.startupName}
                    {row.location ? ` · ${row.location}` : ''}
                  </span>
                </span>
              </label>
            )
          })
        )}
      </div>

      {error ? (
        <p style={{ margin: '0 0 8px', fontSize: 11.5, color: COLORS.brick }}>{error}</p>
      ) : null}

      <button
        onClick={() => void submit()}
        disabled={saving || selectedRows.length === 0}
        style={saving || selectedRows.length === 0 ? btnAccentDisabled : btnAccent}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={13} height={13} aria-hidden>
          <path d="M6 3h12v18l-6-4-6 4z" />
        </svg>
        {saving
          ? 'Saving…'
          : selectedRows.length === 1
            ? `Save ${selectedRows[0].title}`
            : `Save ${selectedRows.length} roles${selectedStartups > 1 ? ` · ${selectedStartups} companies` : ''}`}
      </button>

      <button
        onClick={onManual}
        style={{
          ...btnGhost,
          marginTop: 4,
          padding: '6px',
          fontSize: 12,
          width: '100%',
          background: 'none',
          border: 'none',
        }}
      >
        Edit details
      </button>
    </div>
  )
}