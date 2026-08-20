import { useState } from 'react'

import { WEB_BASE, api } from '../../background/auth-sync'
import type { DetectionState } from '../../background/state'
import { CENTERED, CENTERED_BODY, CENTERED_TITLE, COLORS, FONTS, btnSecondary } from '../theme'

export function Saved({ state }: { state: DetectionState }) {
  const [note, setNote] = useState('')
  const [savingTags, setSavingTags] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startupId = state.saved?.startup_id
  const startupName = state.saved?.startup_name ?? 'Startup'

  const done = async () => {
    const tags = note.split(',').map((t) => t.trim()).filter(Boolean)
    if (tags.length && startupId) {
      setSavingTags(true)
      setError(null)
      try {
        await api(`/startups/${startupId}`, {
          method: 'PATCH',
          body: JSON.stringify({ tags }),
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save tags.')
        setSavingTags(false)
        return
      }
    }
    window.close()
  }

  return (
    <div>
      <div style={CENTERED}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: COLORS.emerald,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '2px auto 12px',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="3" width={20} height={20} style={{ stroke: '#fff' }} aria-hidden>
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <b style={CENTERED_TITLE}>Saved to Scout</b>
        <p style={CENTERED_BODY}>
          {state.saved_count && state.saved_count > 1
            ? `${state.saved_count} companies are in your workspace.`
            : `${startupName} is in your workspace.`}
        </p>
      </div>

      <a
        href={`${WEB_BASE}/startups/${startupId ?? ''}`}
        target="_blank"
        rel="noreferrer"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          fontSize: 12.5,
          fontWeight: 600,
          color: COLORS.emeraldDark,
          marginBottom: 16,
        }}
      >
        Open in Scout
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" width={12} height={12} style={{ stroke: COLORS.emeraldDark }} aria-hidden>
          <path d="M9 6l6 6-6 6" />
        </svg>
      </a>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void done()}
          placeholder="Add a quick tag or note…"
          style={{
            flex: 1,
            fontSize: 11.5,
            padding: '7px 10px',
            border: `1px solid ${COLORS.lineStrong}`,
            borderRadius: 7,
            fontFamily: FONTS.sans,
            color: COLORS.charcoal,
            minWidth: 0,
          }}
        />
      </div>

      {error ? (
        <p style={{ margin: '0 0 8px', fontSize: 11.5, color: COLORS.brick }}>{error}</p>
      ) : null}

      <button onClick={() => void done()} disabled={savingTags} style={btnSecondary}>
        {savingTags ? 'Saving…' : 'Done'}
      </button>
    </div>
  )
}
