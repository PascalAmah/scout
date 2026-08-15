import type { RatePoint } from '@scout/types'

const W = 560
const H = 160
const PAD_Y = 14

export function ResponseRateChart({ points }: { points: RatePoint[] }) {
  if (points.length === 0) return null

  const withRate = points.filter((p) => p.rate !== null) as Array<RatePoint & { rate: number }>
  const x = (i: number): number => (points.length === 1 ? 0 : (i / (points.length - 1)) * W)
  const y = (rate: number): number => H - PAD_Y - (rate / 100) * (H - PAD_Y * 2)

  const line = withRate.map((p) => `${x(points.indexOf(p))},${y(p.rate)}`).join(' ')
  const last = withRate[withRate.length - 1]

  return (
    <div>
      <div className="mb-3 flex items-end justify-between">
        <div>
          <span className="font-mono text-xl font-semibold text-[#0F6E56]">
            {last ? `${last.rate}%` : '—'}
          </span>{' '}
          <span className="text-[11px] text-[#6B7280]">this period</span>
        </div>
      </div>
      {line ? (
        <svg viewBox={`0 0 ${W} ${H}`} className="h-40 w-full" preserveAspectRatio="none">
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1="0" y1={H * f} x2={W} y2={H * f} stroke="#E5E3DC" strokeWidth="1" />
          ))}
          <defs>
            <linearGradient id="analyticsArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#18A058" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#18A058" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={`M${line.replace(/ /g, ' L')} L${x(points.length - 1)},${H} L0,${H} Z`}
            fill="url(#analyticsArea)"
          />
          <polyline
            points={line}
            fill="none"
            stroke="#18A058"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {last ? (
            <circle
              cx={x(points.indexOf(last))}
              cy={y(last.rate)}
              r="5"
              fill="#18A058"
              stroke="#fff"
              strokeWidth="2"
            />
          ) : null}
        </svg>
      ) : (
        <p className="py-10 text-center text-sm text-[#6B7280]">No applications with a response yet.</p>
      )}
      <div className="mt-1.5 flex justify-between text-[10.5px] text-[#9CA3AF]">
        {points.length > 0 ? <span>{points[0].bucket}</span> : null}
        {points.length > 1 ? <span>{points[points.length - 1].bucket}</span> : null}
      </div>
    </div>
  )
}
