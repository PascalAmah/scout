import { COLORS } from '../theme'

/**
 * The Scout lens mark — emerald ring, charcoal lens, small glare.
 * Mirrors apps/web/src/components/ui/LensMark.tsx (inline styles so the
 * extension popup doesn't depend on CSS variables).
 */
export function LensMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" aria-hidden="true">
      <circle cx="22" cy="22" r="16" fill="none" stroke={COLORS.emerald} strokeWidth="6" />
      <circle cx="22" cy="22" r="10" fill={COLORS.charcoal} />
      <ellipse
        cx="18"
        cy="17"
        rx="2.6"
        ry="1.3"
        fill="#fff"
        opacity="0.85"
        transform="rotate(-30 18 17)"
      />
    </svg>
  )
}
