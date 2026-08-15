import { useMemo, useState } from 'react'

import { EmptyState } from '../../../components/ui/EmptyState'
import { type AnalyticsFilters } from '../api'
import {
  FilterBar,
  type AnalyticsRange,
  type AnalyticsSource,
} from '../components/FilterBar'
import { FunnelChart } from '../components/FunnelChart'
import { ResponseRateChart } from '../components/ResponseRateChart'
import { StatCard, type StatDelta } from '../components/StatCard'
import { useAnalyticsFunnel, useAnalyticsSummary } from '../hooks'

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
  const text = isRate
    ? `${Math.abs(Math.round(diff * 10) / 10)}pt${suffix}`
    : `${diff >= 0 ? '+' : '−'}${Math.abs(diff)}${suffix}`
  return { text, direction: diff >= 0 ? 'up' : 'down' }
}

export function AnalyticsPage() {
  const [range, setRange] = useState<AnalyticsRange>('8w')
  const [source, setSource] = useState<AnalyticsSource>('')

  const filters = useMemo(() => rangeToFilters(range, source), [range, source])
  const summaryQuery = useAnalyticsSummary(filters)
  const funnelQuery = useAnalyticsFunnel(filters)

  if (summaryQuery.isLoading || funnelQuery.isLoading) {
    return <p className="py-12 text-center text-sm text-[#6B7280]">Crunching the numbers…</p>
  }

  if (summaryQuery.isError || funnelQuery.isError) {
    return (
      <p className="py-12 text-center text-sm text-[#B3261E]">
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
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-semibold text-[#1F2937]">Analytics</h1>
        <FilterBar
          range={range}
          source={source}
          onRangeChange={setRange}
          onSourceChange={setSource}
        />
      </div>
      <p className="mb-6 text-sm text-[#6B7280]">
        Is this working? A read on the pipeline, not just a list of applications.
      </p>

      {!hasData ? (
        <EmptyState
          title="Nothing to measure yet"
          description="Once you save startups and move applications through the pipeline, conversion and response-rate stats will show up here."
        />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            <StatCard
              label="Applications sent"
              value={String(summary.applications_sent)}
              delta={delta(summary.applications_sent, summary.applications_sent_prev, '')}
            />
            <StatCard
              label="Response rate"
              value={summary.response_rate === null ? '—' : `${summary.response_rate}%`}
              delta={delta(
                summary.response_rate ?? 0,
                summary.response_rate_prev ?? 0,
                '',
                true,
              )}
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

          <div className="mb-5 rounded-xl border border-[#E5E3DC] bg-white shadow-sm">
            <div className="border-b border-[#E5E3DC] px-5 py-4">
              <h2 className="text-[15px] font-semibold text-[#1F2937]">Conversion funnel</h2>
              <p className="text-xs text-[#6B7280]">
                Saved → Applied → Interview → Offer, over the selected period
              </p>
            </div>
            <div className="px-5 py-5">
              <FunnelChart stages={funnel.stages} conversions={funnel.conversions} />
            </div>
          </div>

          <div className="rounded-xl border border-[#E5E3DC] bg-white shadow-sm">
            <div className="border-b border-[#E5E3DC] px-5 py-4">
              <h2 className="text-[15px] font-semibold text-[#1F2937]">Response rate over time</h2>
              <p className="text-xs text-[#6B7280]">
                Share of applications that got any reply, by week
              </p>
            </div>
            <div className="px-5 py-5">
              <ResponseRateChart points={summary.response_rate_series} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
