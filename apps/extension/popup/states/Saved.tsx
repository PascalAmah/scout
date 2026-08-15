import { WEB_BASE } from '../../background/auth-sync'
import type { DetectionState } from '../../background/state'

export function Saved({ state }: { state: DetectionState }) {
  return (
    <div style={{ padding: '8px 0 4px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: '#0E7A45',
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        <span aria-hidden>✓</span> Saved to Scout
      </div>
      <p style={{ margin: '6px 0 0', fontSize: 13, color: '#6B7280' }}>
        <strong style={{ color: '#1F2937' }}>{state.saved?.startup_name}</strong> is in your workspace.
      </p>
      <a
        href={`${WEB_BASE}/startups`}
        target="_blank"
        rel="noreferrer"
        style={{ display: 'inline-block', marginTop: 10, fontSize: 13, color: '#0F6E56', fontWeight: 600 }}
      >
        Open in Scout →
      </a>
    </div>
  )
}