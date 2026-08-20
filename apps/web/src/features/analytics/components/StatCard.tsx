export interface StatDelta {
  text: string
  direction: 'up' | 'down'
}

export function StatCard({
  label,
  value,
  delta,
}: {
  label: string
  value: string
  delta?: StatDelta | null
}) {
  return (
    <div className="rounded-[18px] border border-line bg-white px-5 py-[18px] shadow-sm">
      <p className="mb-2 text-[11.5px] text-muted">{label}</p>
      <p className="flex items-baseline gap-2 font-mono text-[25px] font-semibold text-charcoal">
        {value}
        {delta ? (
          <span
            className={`text-[11px] font-semibold ${
              delta.direction === 'up' ? 'text-emerald-dark' : 'text-brick'
            }`}
          >
            {delta.direction === 'up' ? '↗' : '↘'} {delta.text}
          </span>
        ) : null}
      </p>
    </div>
  )
}