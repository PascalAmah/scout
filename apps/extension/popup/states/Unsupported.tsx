import { CENTERED, CENTERED_BODY, CENTERED_TITLE, COLORS, FONTS, RADII, btnSecondary } from '../theme'

const SUPPORTED = ['YC', 'Wellfound', 'Techstars', 'Product Hunt', 'Careers pages', 'LinkedIn']

export function Unsupported({ onManual }: { onManual: () => void }) {
  return (
    <div>
      <div style={CENTERED}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 13,
            background: COLORS.paper,
            border: `1px solid ${COLORS.line}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" width={20} height={20} style={{ stroke: COLORS.muted2 }} aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.7M12 17h.01" />
          </svg>
        </div>
        <b style={CENTERED_TITLE}>Nothing to save here</b>
        <p style={CENTERED_BODY}>
          Scout works on supported pages — nothing detected on this one.
        </p>
        <div
          style={{
            display: 'flex',
            gap: 5,
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          {SUPPORTED.map((site) => (
            <span
              key={site}
              style={{
                fontSize: 10,
                fontWeight: 600,
                background: COLORS.paper,
                border: `1px solid ${COLORS.line}`,
                padding: '3px 8px',
                borderRadius: 6,
                color: COLORS.charcoal,
                fontFamily: FONTS.sans,
              }}
            >
              {site}
            </span>
          ))}
        </div>
      </div>
      <button style={btnSecondary} onClick={onManual}>
        Save manually instead
      </button>
    </div>
  )
}
