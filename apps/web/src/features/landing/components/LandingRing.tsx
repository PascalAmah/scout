/**
 * Score ring for the landing's product mockups. The fill is the score, the
 * core holds the number — the same "lens" mechanic as the app's match ring,
 * but with an explicit color so mockups can color by context (e.g. slate for
 * applied, emerald for interview/offer).
 */
export function LandingRing({
  score,
  size,
  color,
}: {
  score: number
  size: number
  color: string
}) {
  const stroke = Math.max(3, Math.round(size / 10))
  const r = (size - stroke * 2) / 2
  const circumference = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, score))
  const offset = circumference * (1 - pct / 100)
  const coreSize = size - stroke * 5

  return (
    <span className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} />
        <circle
          className="ring-progress"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ stroke: color }}
        />
      </svg>
      <span className="ring-core" style={{ width: coreSize, height: coreSize }}>
        <span className="ring-score" style={{ fontSize: Math.max(8, Math.round(size / 4.3)) }}>
          {score}
        </span>
      </span>
    </span>
  )
}
