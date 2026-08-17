/**
 * The Scout lens mark — emerald ring, charcoal lens, small glare.
 * The brand mark itself: an emerald ring around a dark lens. Used by the
 * app shell, landing page, and auth screens.
 */
export function LensMark({ size = 26, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" className={className} aria-hidden="true">
      <circle
        cx="22"
        cy="22"
        r="16"
        fill="none"
        strokeWidth="6"
        style={{ stroke: 'var(--color-emerald)' }}
      />
      <circle cx="22" cy="22" r="10" style={{ fill: 'var(--color-charcoal)' }} />
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
