import { useState } from 'react'

import { PrefilledCard } from '../components/PrefilledCard'
import { TagInput } from '../components/TagInput'
import type { DetectedPayload } from '../../background/state'

export function ManualFallback({
  onSave,
  onBack,
}: {
  onSave: (payload: DetectedPayload, tags: string[]) => Promise<void>
  onBack: () => void
}) {
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [tags, setTags] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!name.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      const url = website.trim() || undefined
      await onSave(
        {
          source: 'manual',
          source_url: url ?? 'manual-entry',
          startup: { name: name.trim(), website: url ?? null },
          job: jobTitle.trim() ? { title: jobTitle.trim(), url: url ?? null } : null,
        },
        tags.split(',').map((t) => t.trim()).filter(Boolean),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setSaving(false)
    }
  }

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box' as const,
    border: '1px solid #D6D3C9',
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 13,
    marginBottom: 10,
  }

  return (
    <div>
      <button
        onClick={onBack}
        style={{ background: 'none', border: 'none', padding: 0, marginBottom: 10, fontSize: 12, color: '#6B7280', cursor: 'pointer' }}
      >
        ← Back
      </button>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
        Startup name
      </label>
      <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder="Acme Inc." />
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Website</label>
      <input value={website} onChange={(e) => setWebsite(e.target.value)} style={inputStyle} placeholder="https://acme.com" />
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Job title (optional)</label>
      <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} style={inputStyle} placeholder="Backend Engineer" />
      <TagInput value={tags} onChange={setTags} />
      {error ? <p style={{ margin: '6px 0 0', fontSize: 12, color: '#A23B2A' }}>{error}</p> : null}
      <button
        onClick={() => void submit()}
        disabled={!name.trim() || saving}
        style={{
          width: '100%',
          marginTop: 12,
          border: 'none',
          borderRadius: 999,
          background: saving ? '#9AA1AB' : '#1F2937',
          color: '#fff',
          padding: '9px 0',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {saving ? 'Saving…' : 'Save startup'}
      </button>
      {name.trim() || website.trim() || jobTitle.trim() ? (
        <div style={{ marginTop: 12 }}>
          <PrefilledCard
            startup={{ name: name.trim() || 'Unknown startup', website: website.trim() || null }}
            jobTitle={jobTitle.trim() || null}
          />
        </div>
      ) : null}
    </div>
  )
}