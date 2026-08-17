import type { DetectedStartup, QuickSaveFounder, QuickSaveJob } from '@scout/types'

import { COLORS, FONTS } from '../theme'

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase()
}

function sourceLabel(source: string | undefined): string {
  switch (source) {
    case 'yc':
      return 'Y Combinator'
    case 'wellfound':
      return 'Wellfound'
    case 'linkedin':
      return 'LinkedIn'
    case 'generic_careers':
      return 'Careers page'
    case 'manual':
      return 'Manual'
    default:
      return 'Web'
  }
}

export function PrefilledCard({
  startup,
  job,
  founders,
  source,
}: {
  startup: DetectedStartup
  job?: QuickSaveJob | null
  founders?: QuickSaveFounder[] | null
  source?: string | null
}) {
  const name = startup.name ?? 'Unknown startup'
  const domain = startup.website ? new URL(startup.website).hostname.replace('www.', '') : null

  const rows: { k: string; v: string }[] = []
  if (job) {
    rows.push({ k: 'Location', v: job.location ?? '—' })
    if (job.remote != null) rows.push({ k: 'Work mode', v: job.remote ? 'Remote' : 'On-site' })
  }
  rows.push({ k: 'Source', v: sourceLabel(source ?? undefined) })
  if (founders?.length) {
    rows.push({ k: 'Founders', v: founders.map((f) => f.name).filter(Boolean).join(', ') })
  }

  return (
    <div
      style={{
        background: COLORS.paper,
        border: `1px solid ${COLORS.line}`,
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
      }}
    >
      <div style={{ display: 'flex', gap: 9, marginBottom: 9 }}>
        <div
          aria-hidden
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            background: COLORS.charcoal,
            color: '#fff',
            fontSize: 10.5,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {initialsOf(name)}
        </div>
        <div style={{ minWidth: 0 }}>
          <b style={{ fontSize: 13, display: 'block', color: COLORS.charcoal, lineHeight: 1.3 }}>
            {job?.title ?? name}
          </b>
          <span style={{ fontSize: 11, color: COLORS.muted, fontFamily: FONTS.sans }}>
            {job?.title ? name : domain ?? 'Company'}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {rows.map((row) => (
          <div
            key={row.k}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              fontSize: 11,
              padding: '5px 0',
              borderTop: `1px solid ${COLORS.line}`,
            }}
          >
            <span style={{ color: COLORS.muted }}>{row.k}</span>
            <span style={{ fontWeight: 600, color: COLORS.charcoal, textAlign: 'right' }}>
              {row.v}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
