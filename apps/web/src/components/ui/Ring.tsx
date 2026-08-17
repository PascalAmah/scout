/**
 * Scout's signature component — the lens reused as a score indicator.
 * The ring's fill is the score, the core holds the number. Ring color
 * follows the confidence band (design system §08): emerald 70–100 strong,
 * amber 40–69 moderate, brick 0–39 weak. The glare renders at large/medium
 * sizes only and drops out below ~48px; the band label is opt-in for large
 * rings (match detail).
 */
export function matchRingColor(score: number | null): string {
  if (score === null) return '#D6D3C9'
  if (score >= 70) return '#18A058'
  if (score >= 40) return '#B8791A'
  return '#A23B2A'
}

export function confidenceBand(score: number | null): string | null {
  if (score === null) return null
  if (score >= 70) return 'STRONG'
  if (score >= 40) return 'MODERATE'
  return 'WEAK'
}

export function Ring({
  score,
  size = 48,
  band = false,
}: {
  score: number | null
  size?: number
  band?: boolean
}) {
  const stroke = Math.max(3, Math.round(size / 10))
  const r = (size - stroke * 2) / 2
  const circumference = 2 * Math.PI * r
  const pct = score === null ? 0 : Math.max(0, Math.min(100, score))
  const offset = circumference * (1 - pct / 100)
  const coreSize = size - stroke * 5
  const color = matchRingColor(score)
  const showGlare = size >= 48
  const bandLabel = band ? confidenceBand(score) : null
  const glareCx = size * 0.41
  const glareCy = size * 0.39

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#E5E3DC"
          strokeWidth={stroke}
        />
        {score !== null ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        ) : null}
        {showGlare ? (
          <ellipse
            cx={glareCx}
            cy={glareCy}
            rx={Math.max(2, size * 0.05)}
            ry={Math.max(1, size * 0.025)}
            fill="#fff"
            opacity="0.85"
            transform={`rotate(-30 ${glareCx} ${glareCy})`}
          />
        ) : null}
      </svg>
      <div
        className="absolute flex items-center justify-center rounded-full"
        style={{
          width: coreSize,
          height: coreSize,
          background: '#1F2937',
          color: '#fff',
          fontFamily: 'var(--font-mono)',
          fontWeight: 600,
          fontSize: Math.max(8, Math.round(size / 3.2)),
          flexDirection: 'column',
        }}
      >
        <span>{score === null ? '—' : Math.round(score)}</span>
        {bandLabel ? (
          <span
            style={{
              fontSize: Math.max(7, Math.round(size / 12)),
              color,
              letterSpacing: '0.5px',
              marginTop: 1,
            }}
          >
            {bandLabel}
          </span>
        ) : null}
      </div>
    </div>
  )
}
