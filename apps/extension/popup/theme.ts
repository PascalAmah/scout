/** Scout design tokens — mirrors docs/mockups/scout_extension.html `:root`. */
export const COLORS = {
  emerald: '#18A058',
  emeraldDark: '#0F6E56',
  charcoal: '#1F2937',
  nearBlack: '#0B0F14',
  paper: '#FAFAF8',
  white: '#FFFFFF',
  line: '#E5E3DC',
  lineStrong: '#D6D3C9',
  muted: '#6B7280',
  muted2: '#9CA3AF',
  emeraldTint: '#E4F3EA',
  emeraldTintStrong: '#CFEBDA',
  amber: '#B8791A',
  amberTint: '#FBF1DF',
  amberBorder: '#F0DDB8',
  slate: '#3E5C8A',
  slateTint: '#E8EEF6',
  brick: '#A23B2A',
  brickTint: '#F6E4DF',
} as const

export const FONTS = {
  serif: "'Fraunces', Georgia, serif",
  sans: "'Inter', system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
} as const

export const RADII = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const

export const SHADOWS = {
  sm: '0 1px 2px rgba(11,15,20,.05)',
  md: '0 6px 20px rgba(11,15,20,.07)',
  lg: '0 16px 40px rgba(11,15,20,.16)',
} as const

/** Shared button treatments (mockup `.btn-*`). */
export const BTN_BASE: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 12.5,
  borderRadius: RADII.pill,
  padding: '9px 16px',
  border: '1px solid transparent',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  width: '100%',
  cursor: 'pointer',
}

export const btnAccent: React.CSSProperties = {
  ...BTN_BASE,
  background: COLORS.emerald,
  color: COLORS.white,
}

export const btnAccentDisabled: React.CSSProperties = {
  ...btnAccent,
  background: '#9AA1AB',
  cursor: 'default',
}

export const btnSecondary: React.CSSProperties = {
  ...BTN_BASE,
  background: COLORS.white,
  color: COLORS.charcoal,
  borderColor: COLORS.lineStrong,
}

export const btnGhost: React.CSSProperties = {
  ...BTN_BASE,
  background: 'transparent',
  color: COLORS.muted,
}

/** Shared form field treatment (mockup `.manual-field`). */
export const FIELD_LABEL: React.CSSProperties = {
  display: 'block',
  fontSize: 10.5,
  fontWeight: 600,
  color: COLORS.muted,
  marginBottom: 4,
}

export const FIELD_INPUT: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  fontSize: 11.5,
  padding: '7px 10px',
  border: `1px solid ${COLORS.lineStrong}`,
  borderRadius: 7,
  color: COLORS.charcoal,
  fontFamily: FONTS.sans,
  background: COLORS.white,
}

export const FIELD_INPUT_READONLY: React.CSSProperties = {
  ...FIELD_INPUT,
  background: COLORS.paper,
  color: COLORS.muted,
}

/** Centered message block used by several states (mockup `.centered-msg`). */
export const CENTERED: React.CSSProperties = {
  textAlign: 'center',
  padding: '14px 6px 4px',
}

export const CENTERED_TITLE: React.CSSProperties = {
  fontSize: 13.5,
  display: 'block',
  marginBottom: 6,
  color: COLORS.charcoal,
}

export const CENTERED_BODY: React.CSSProperties = {
  fontSize: 11.5,
  color: COLORS.muted,
  lineHeight: 1.55,
  margin: '0 0 16px',
}
