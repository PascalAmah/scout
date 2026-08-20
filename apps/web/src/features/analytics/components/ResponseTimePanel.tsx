import type { StageResponseTime } from '@scout/types'

const BAR_COLORS = ['#18A058', '#B8791A', '#3E5C8A', '#0F6E56', '#9CA3AF']

export function ResponseTimePanel({ rows }: { rows: StageResponseTime[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-[12.5px] leading-relaxed text-muted">
        No replies recorded yet. Once companies reply to your outreach, average response times
        by stage will show up here.
      </p>
    )
  }

  const maxDays = Math.max(...rows.map((row) => row.avg_days))

  return (
    <div>
      {rows.map((row, index) => {
        const width = maxDays === 0 ? 0 : Math.max(4, (row.avg_days / maxDays) * 100)
        return (
          <div key={row.stage} className="mb-[14px] flex items-center gap-3 last:mb-0">
            <span className="w-24 shrink-0 truncate text-[12.5px] font-semibold text-charcoal">
              {row.stage}
            </span>
            <div className="h-5 flex-1 overflow-hidden rounded-[6px] border border-line bg-paper">
              <div
                className="h-full rounded-l-[6px]"
                style={{ width: `${width}%`, background: BAR_COLORS[index % BAR_COLORS.length] }}
              />
            </div>
            <span className="w-[60px] shrink-0 text-right font-mono text-xs text-muted">
              {row.avg_days.toFixed(1)} days
            </span>
          </div>
        )
      })}
    </div>
  )
}