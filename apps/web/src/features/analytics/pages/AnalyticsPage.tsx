import { useMemo, useState, type ReactNode } from 'react'

import { EmptyState } from '../../../components/ui/EmptyState'
import { type AnalyticsFilters } from '../api'
import {
  FilterBar,
  type AnalyticsRange,
  type AnalyticsSource,
} from '../components/FilterBar'
import { FunnelChart } from '../components/FunnelChart'
import { ResponseRateChart } from '../components/ResponseRateChart'
import { ResponseTimePanel } from '../components/ResponseTimePanel'
import { StatCard, type StatDelta } from '../components/StatCard'
import { useAnalyticsFunnel, useAnalyticsResponseTimes, useAnalyticsSummary } from '../hooks'

const DAY = 86_400_000

function rangeToFilters(range: AnalyticsRange, source: AnalyticsSource): AnalyticsFilters {
  const filters: AnalyticsFilters = {}
  if (range === '8w') filters.from = new Date(Date.now() - 56 * DAY).toISOString()
  if (range === '30d') filters.from = new Date(Date.now() - 30 * DAY).toISOString()
  if (range === 'all') filters.from = '2000-01-01T00:00:00Z'
  if (source) filters.source = source
  return filters
}

function delta(current: number, previous: number, suffix: string, isRate = false): StatDelta | null {
  if (previous === 0 && current === 0) return null
  const diff = current - previous
  const sign = diff >= 0 ? '+' : '−'
  const magnitude = isRate ? Math.abs(Math.round(diff * 10) / 10) : Math.abs(diff)
  return {
    text: `${sign}${magnitude}${isRate ? 'pt' : ''}${suffix}`,
    direction: diff >= 0 ? 'up' : 'down',
  }
}

function Panel({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <div className="mb-[22px] overflow-hidden rounded-[18px] border border-line bg-white shadow-sm">
      <div className="border-b border-line px-[22px] py-[18px]">
        <h2 className="mb-[3px] text-[15px] font-semibold text-charcoal">{title}</h2>
        <p className="text-xs text-muted">{sub}</p>
      </div>
      <div className="p-[22px]">{children}</div>
    </div>
  )
}

export function AnalyticsPage() {
  const [range, setRange] = useState<AnalyticsRange>('8w')
  const [source, setSource] = useState<AnalyticsSource>('')

  const filters = useMemo(() => rangeToFilters(range, source), [range, source])
  const summaryQuery = useAnalyticsSummary(filters)
  const funnelQuery = useAnalyticsFunnel(filters)
  const responseTimesQuery = useAnalyticsResponseTimes(filters)

  if (summaryQuery.isLoading || funnelQuery.isLoading || responseTimesQuery.isLoading) {
    return <p className="py-12 text-center text-sm text-muted">Crunching the numbers…</p>
  }

  if (summaryQuery.isError || funnelQuery.isError || responseTimesQuery.isError) {
    return (
      <p className="py-12 text-center text-sm text-brick">
        Failed to load analytics:{' '}
        {summaryQuery.error?.message ?? funnelQuery.error?.message ?? 'unknown error'}
      </p>
    )
  }

  const summary = summaryQuery.data
  const funnel = funnelQuery.data
  if (!summary || !funnel) return null

  const hasData =
    summary.applications_sent > 0 ||
    summary.offers > 0 ||
    funnel.stages.some((stage) => stage.count > 0)

  return (
    <div>
      <div className="mb-[6px] flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-[28px] font-semibold tracking-[-0.4px] text-charcoal">
          Analytics
        </h1>
        <FilterBar
          range={range}
          source={source}
          onRangeChange={setRange}
          onSourceChange={setSource}
        />
      </div>
      <p className="mb-[26px] text-[13px] text-muted">
        Is this working? A read on the pipeline, not just a list of applications.
      </p>

      {!hasData ? (
        <EmptyState
          title="Nothing to measure yet"
          description="Once you save startups and move applications through the pipeline, conversion and response-rate stats will show up here."
        />
      ) : (
        <>
          <div className="mb-[30px] grid grid-cols-2 gap-[14px] lg:grid-cols-4">
            <StatCard
              label="Applications sent"
              value={String(summary.applications_sent)}
              delta={delta(summary.applications_sent, summary.applications_sent_prev, '')}
            />
            <StatCard
              label="Response rate"
              value={summary.response_rate === null ? '—' : `${summary.response_rate}%`}
              delta={delta(summary.response_rate ?? 0, summary.response_rate_prev ?? 0, '', true)}
            />
            <StatCard
              label="Applied → Interview"
              value={summary.applied_to_interview === null ? '—' : `${summary.applied_to_interview}%`}
              delta={delta(
                summary.applied_to_interview ?? 0,
                summary.applied_to_interview_prev ?? 0,
                '',
                true,
              )}
            />
            <StatCard
              label="Offers"
              value={String(summary.offers)}
              delta={delta(summary.offers, summary.offers_prev, '')}
            />
          </div>

          <Panel
            title="Conversion funnel"
            sub="Saved → Applied → Interview → Offer, over the selected period"
          >
            <FunnelChart stages={funnel.stages} conversions={funnel.conversions} />
          </Panel>

          <div className="grid gap-[22px] lg:grid-cols-[1.4fr_1fr]">
            <Panel
              title="Response rate over time"
              sub="Share of applications that got any reply"
            >
              <ResponseRateChart
                points={summary.response_rate_series}
                delta={delta(summary.response_rate ?? 0, summary.response_rate_prev ?? 0, '', true)}
              />
            </Panel>
            <Panel
              title="Time to first response"
              sub="By company stage — does earlier-stage move faster?"
            >
              <ResponseTimePanel rows={responseTimesQuery.data ?? []} />
            </Panel>
          </div>
        </>
      )}
    </div>
  )
}