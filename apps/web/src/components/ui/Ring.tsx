export function matchRingColor(score: number | null): string {
  if (score === null) return '#D6D3C9'
  if (score >= 70) return '#18A058'
  if (score >= 45) return '#B8791A'
  return '#A23B2A'
}

export function Ring({ score, size = 48 }: { score: number | null; size?: number }) {
  const stroke = Math.max(3, Math.round(size / 10))
  const r = (size - stroke * 2) / 2
  const circumference = 2 * Math.PI * r
  const pct = score === null ? 0 : Math.max(0, Math.min(100, score))
  const offset = circumference * (1 - pct / 100)
  const coreSize = size - stroke * 5
  const color = matchRingColor(score)

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
      </svg>
      <div
        className="absolute flex items-center justify-center rounded-full"
        style={{
          width: coreSize,
          height: coreSize,
          background: '#1F2937',
          color: '#fff',
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          fontWeight: 600,
          fontSize: Math.max(8, Math.round(size / 3.2)),
        }}
      >
        {score === null ? '—' : Math.round(score)}
      </div>
    </div>
  )
}