import { useState } from 'react'

import { FIELD_INPUT, FIELD_INPUT_READONLY, FIELD_LABEL, COLORS, btnAccent, btnAccentDisabled, btnGhost } from '../theme'
import type { DetectedPayload } from '../../background/state'

type SaveKind = 'startup' | 'job' | 'founder'

function initialKind(url: string | null | undefined): SaveKind {
  const path = (url ?? '').toLowerCase()
  if (path.includes('/jobs') || path.includes('/job') || path.includes('/careers')) return 'job'
  if (path.includes('/in/')) return 'founder'
  return 'startup'
}

function displayUrl(url: string | null | undefined): string {
  if (!url) return ''
  return url.replace(/^https?:\/\//, '')
}

export function ManualFallback({
  onSave,
  onBack,
  initialUrl,
  initialTitle,
}: {
  onSave: (payload: DetectedPayload, tags: string[]) => Promise<void>
  onBack: () => void
  initialUrl?: string | null
  initialTitle?: string | null
}) {
  const [kind, setKind] = useState<SaveKind>(() => initialKind(initialUrl))
  const [companyName, setCompanyName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [founderName, setFounderName] = useState('')
  const [founderTitle, setFounderTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ready =
    kind === 'startup'
      ? Boolean(companyName.trim())
      : kind === 'job'
        ? Boolean(companyName.trim() && jobTitle.trim())
        : Boolean(founderName.trim())

  const submit = async () => {
    if (!ready || saving) return
    setSaving(true)
    setError(null)
    const url = initialUrl || null
    const payload: DetectedPayload = {
      source: 'manual',
      source_url: url ?? 'manual-entry',
      startup: { name: companyName.trim(), website: url },
      job: kind === 'job' ? { title: jobTitle.trim(), url } : null,
      founders: kind === 'founder' ? [{ name: founderName.trim(), title: founderTitle.trim() || null }] : [],
    }
    try {
      await onSave(payload, [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setSaving(false)
    }
  }

  return (
    <div>
      <button
        onClick={onBack}
        style={{ ...btnGhost, padding: 0, marginBottom: 10, fontSize: 12, justifyContent: 'flex-start' }}
      >
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" width={12} height={12} style={{ stroke: COLORS.muted }} aria-hidden>
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back
      </button>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          background: COLORS.amberTint,
          border: `1px solid ${COLORS.amberBorder}`,
          borderRadius: 8,
          padding: '9px 11px',
          marginBottom: 14,
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" width={14} height={14} style={{ stroke: COLORS.amber, flexShrink: 0, marginTop: 1 }} aria-hidden>
          <path d="M12 9v4M12 17h.01M10.3 3.9L2.5 17a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
        </svg>
        <span style={{ fontSize: 11, color: COLORS.amber, lineHeight: 1.5 }}>
          Couldn&apos;t parse this page automatically. We kept what we could find — fill in the rest.
        </span>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={FIELD_LABEL}>Page URL</label>
        <input style={FIELD_INPUT_READONLY} value={displayUrl(initialUrl)} readOnly placeholder="https://…" />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={FIELD_LABEL}>Page title</label>
        <input style={FIELD_INPUT_READONLY} value={initialTitle ?? ''} readOnly placeholder="—" />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={FIELD_LABEL}>Save as</label>
        <select style={FIELD_INPUT} value={kind} onChange={(e) => setKind(e.target.value as SaveKind)}>
          <option value="startup">Startup</option>
          <option value="job">Job</option>
          <option value="founder">Founder</option>
        </select>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={FIELD_LABEL}>Company name</label>
        <input
          style={FIELD_INPUT}
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="e.g. Quiet Table"
        />
      </div>

      {kind === 'job' ? (
        <div style={{ marginBottom: 10 }}>
          <label style={FIELD_LABEL}>Job title</label>
          <input
            style={FIELD_INPUT}
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="e.g. Backend Engineer"
          />
        </div>
      ) : null}

      {kind === 'founder' ? (
        <>
          <div style={{ marginBottom: 10 }}>
            <label style={FIELD_LABEL}>Founder name</label>
            <input
              style={FIELD_INPUT}
              value={founderName}
              onChange={(e) => setFounderName(e.target.value)}
              placeholder="e.g. Ada Lovelace"
            />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={FIELD_LABEL}>Title (optional)</label>
            <input
              style={FIELD_INPUT}
              value={founderTitle}
              onChange={(e) => setFounderTitle(e.target.value)}
              placeholder="e.g. Co-founder & CEO"
            />
          </div>
        </>
      ) : null}

      {error ? (
        <p style={{ margin: '0 0 8px', fontSize: 11.5, color: COLORS.brick }}>{error}</p>
      ) : null}

      <button
        onClick={() => void submit()}
        disabled={!ready || saving}
        style={!ready || saving ? btnAccentDisabled : { ...btnAccent, marginTop: 4 }}
      >
        {saving ? 'Saving…' : 'Save manually'}
      </button>
    </div>
  )
}
