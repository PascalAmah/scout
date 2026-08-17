import { useState } from 'react'

import { PrefilledCard } from '../components/PrefilledCard'
import { COLORS, RADII, btnAccent, btnAccentDisabled, btnGhost } from '../theme'
import type { DetectedPayload } from '../../background/state'

export function Detected({
  payload,
  onSave,
  onManual,
}: {
  payload: DetectedPayload
  onSave: (payload: DetectedPayload, tags: string[]) => Promise<void>
  onManual: () => void
}) {
  const [includeCompany, setIncludeCompany] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const entityLabel = payload.job
    ? 'Job posting'
    : payload.founders?.length || payload.founder
      ? 'Founder profile'
      : 'Company'
  const companyName = payload.startup?.name ?? 'this company'
  const actionLabel = payload.job ? 'Save job' : payload.founders?.length || payload.founder ? 'Save founder' : 'Save startup'

  const submit = async () => {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      // quick-save always persists the company row (the job/founder attaches
      // to it), so the checkbox is checked by default and the full payload is
      // sent either way.
      await onSave(payload, [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setSaving(false)
    }
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
        {saving ? 'Saving…' : actionLabel}
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
