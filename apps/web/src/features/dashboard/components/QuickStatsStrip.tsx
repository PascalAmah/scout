import { useMemo } from 'react'

import { summaryQueryOptions } from '../../analytics/api'
import { useQuery } from '@tanstack/react-query'

function startOfMonthIso(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

export function QuickStatsStrip() {
  const filters = useMemo(() => ({ from: startOfMonthIso() }), [])
  const { data } = useQuery(summaryQueryOptions(filters))
  const status = data?.by_status ?? {}
  const cards = [
    { label: 'Saved', value: status.saved ?? 0 },
    { label: 'Applied', value: status.applied ?? 0 },
    { label: 'Interviews', value: status.interview ?? 0 },
    { label: 'Offers', value: status.offer ?? 0 },
  ]

  return (
    <section className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border border-[#E5E3DC] bg-white p-4 shadow-sm">
          <p className="mb-1 text-[11px] text-[#6B7280]">{card.label} this month</p>
          <p className="font-mono text-2xl font-semibold text-[#1F2937]">{card.value}</p>
        </div>
      ))}
    </section>
  )
}
