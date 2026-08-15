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
    <div className="rounded-xl border border-[#E5E3DC] bg-white p-5 shadow-sm">
      <p className="mb-2 text-[11px] text-[#6B7280]">{label}</p>
      <p className="font-mono text-2xl font-semibold text-[#1F2937]">
        {value}
        {delta ? (
          <span
            className={`ml-2 align-middle text-[11px] font-semibold ${
              delta.direction === 'up' ? 'text-[#0F6E56]' : 'text-[#A23B2A]'
            }`}
          >
            {delta.direction === 'up' ? '↗' : '↘'} {delta.text}
          </span>
        ) : null}
      </p>
    </div>
  )
}
