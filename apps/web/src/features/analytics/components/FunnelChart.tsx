import type { FunnelConversion, FunnelStage } from '@scout/types'

const STAGE_COLORS: Record<string, string> = {
  saved: '#9CA3AF',
  interested: '#B8791A',
  applied: '#3E5C8A',
  interview: '#0F6E56',
  offer: '#18A058',
}

const STAGE_LABELS: Record<string, string> = {
  saved: 'Saved',
  interested: 'Interested',
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
}

export function FunnelChart({
  stages,
  conversions,
}: {
  stages: FunnelStage[]
  conversions: FunnelConversion[]
}) {
  const base = stages.find((s) => s.stage === 'saved')?.count ?? 0
  if (base === 0) return null

  return (
    <div>
      {stages.map((stage) => {
        const width = base === 0 ? 0 : Math.max(1.5, (stage.count / base) * 100)
        const conversion = conversions.find((c) => c.to_stage === stage.stage)
        return (
          <div key={stage.stage}>
            {conversion ? (
              <div className="my-[6px] flex items-center justify-center gap-1.5 text-[11px] text-muted-2">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-[11px] w-[11px]"
                  aria-hidden
                >
                  <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
                <b className="font-mono text-charcoal">{conversion.rate ?? 0}%</b>
                <span>moved to {STAGE_LABELS[stage.stage] ?? stage.stage}</span>
              </div>
            ) : null}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="mb-1.5 flex justify-between text-[12.5px]">
                  <b className="font-semibold text-charcoal">
                    {STAGE_LABELS[stage.stage] ?? stage.stage}
                  </b>
                  <span className="font-mono text-muted">{stage.count}</span>
                </div>
                <div className="h-[34px] overflow-hidden rounded-[8px] border border-line bg-paper">
                  <div
                    className="h-full rounded-l-[8px]"
                    style={{ width: `${width}%`, background: STAGE_COLORS[stage.stage] ?? '#9CA3AF' }}
                  />
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}