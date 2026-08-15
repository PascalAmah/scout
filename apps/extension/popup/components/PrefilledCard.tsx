import type { DetectedStartup } from '@scout/types'

export function PrefilledCard({
  startup,
  jobTitle,
}: {
  startup: DetectedStartup
  jobTitle?: string | null
}) {
  const domain = startup.website ? new URL(startup.website).hostname.replace('www.', '') : null
  return (
    <div style={{ border: '1px solid #E5E3DC', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: '#1F2937' }}>
          {startup.name ?? 'Unknown startup'}
        </span>
        <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: '#9AA1AB' }}>
          Detected
        </span>
      </div>
      {domain ? (
        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6B7280' }}>{domain}</p>
      ) : null}
      {jobTitle ? (
        <p style={{ margin: '8px 0 0', fontSize: 12, color: '#1F2937' }}>
          <span style={{ color: '#9AA1AB' }}>Role: </span>
          {jobTitle}
        </p>
      ) : null}
    </div>
  )
}