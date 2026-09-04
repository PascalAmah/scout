import { COLORS, FONTS } from '../theme'

export function Saving({ label }: { label?: string | null }) {
  return (
    <div>
      <div style={{ textAlign: 'center', padding: '14px 6px 4px' }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            border: `3px solid ${COLORS.emeraldTint}`,
            borderTopColor: COLORS.emerald,
            margin: '6px auto 14px',
            animation: 'scout-spin 0.9s linear infinite',
          }}
        />
        <b style={{ fontSize: 13.5, display: 'block', marginBottom: 6, color: COLORS.charcoal }}>
          Saving to Scout…
        </b>
        {label ? (
          <p
            style={{
              fontSize: 11.5,
              color: COLORS.muted,
              lineHeight: 1.55,
              margin: 0,
              fontFamily: FONTS.sans,
            }}
          >
            {label}
          </p>
        ) : null}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 10.5,
          color: COLORS.muted2,
          marginTop: 14,
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" width={12} height={12} style={{ stroke: COLORS.muted2, flexShrink: 0 }} aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5M12 16h.01" />
        </svg>
        Safe to close this popup — saving continues in the background.
      </div>
    </div>
  )
}
