import { useState } from 'react'

import { PrefilledCard } from '../components/PrefilledCard'
import { TagInput } from '../components/TagInput'
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
  const [tags, setTags] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      await onSave(payload, tags.split(',').map((t) => t.trim()).filter(Boolean))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setSaving(false)
    }
  }

  return (
    <div>
      <PrefilledCard startup={payload.startup} jobTitle={payload.job?.title} />
      <div style={{ marginTop: 12 }}>
        <TagInput value={tags} onChange={setTags} />
      </div>
      {error ? <p style={{ margin: '6px 0 0', fontSize: 12, color: '#A23B2A' }}>{error}</p> : null}
      <button
        onClick={() => void submit()}
        disabled={saving}
        style={{
          width: '100%',
          marginTop: 12,
          border: 'none',
          borderRadius: 999,
          background: saving ? '#9AA1AB' : '#18A058',
          color: '#fff',
          padding: '9px 0',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {saving ? 'Saving…' : 'Save to workspace'}
      </button>
      <button
        onClick={onManual}
        style={{ width: '100%', marginTop: 6, background: 'none', border: 'none', padding: '6px', fontSize: 12, color: '#6B7280', cursor: 'pointer' }}
      >
        Edit details
      </button>
    </div>
  )
}