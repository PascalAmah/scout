import { useQuery } from '@tanstack/react-query'
import { useMemo, type ReactNode } from 'react'

import { summaryQueryOptions } from '../../analytics/api'

function startOfMonthIso(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

const ICON = { fill: 'none', stroke: 'currentColor', strokeWidth: 2 } as const

function Delta({ current, previous }: { current: number; previous: number | null }) {
  if (previous === null) return null
  const diff = current - previous
  const cls =
    diff > 0 ? 'text-emerald-dark' : diff < 0 ? 'text-brick' : 'text-muted-2'
  const label = diff > 0 ? `↗ +${diff}` : diff < 0 ? `↘ ${diff}` : '— 0'
  return <span className={`text-[11.5px] font-semibold ${cls}`}>{label}</span>
}

export function QuickStatsStrip() {
  const filters = useMemo(() => ({ from: startOfMonthIso() }), [])
  const { data } = useQuery(summaryQueryOptions(filters))
  const status = data?.by_status ?? {}

  const cards: Array<{
    label: string
    value: number
    icon: ReactNode
    delta: { current: number; previous: number | null } | null
  }> = [
    {
      label: 'Saved this month',
      value: status.saved ?? 0,
      icon: (
        <svg viewBox="0 0 24 24" {...ICON} className="h-[13px] w-[13px] stroke-muted-2">
          <path d="M6 3h12v18l-6-4-6 4z" />
        </svg>
      ),
      delta: null,
    },
    {
      label: 'Applied',
      value: data?.applications_sent ?? 0,
      icon: (
        <svg viewBox="0 0 24 24" {...ICON} className="h-[13px] w-[13px] stroke-muted-2">
          <path d="M22 2L11 13" />
          <path d="M22 2l-7 20-4-9-9-4z" />
        </svg>
      ),
      delta: {
        current: data?.applications_sent ?? 0,
        previous: data?.applications_sent_prev ?? null,
      },
    },
    {
      label: 'Interviews',
      value: status.interview ?? 0,
      icon: (
        <svg viewBox="0 0 24 24" {...ICON} className="h-[13px] w-[13px] stroke-muted-2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        </svg>
      ),
      delta: null,
    },
    {
      label: 'Offers',
      value: data?.offers ?? 0,
      icon: (
        <svg viewBox="0 0 24 24" {...ICON} className="h-[13px] w-[13px] stroke-muted-2">
          <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z" />
        </svg>
      ),
      delta: { current: data?.offers ?? 0, previous: data?.offers_prev ?? null },
    },
  ]

  return (
    <section className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-[18px] border border-line bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-1.5 text-[11.5px] text-muted">{card.icon}{card.label}</div>
          <div className="flex items-baseline gap-2 font-mono text-[27px] font-semibold text-charcoal">
            {card.value}
            {card.delta ? <Delta current={card.delta.current} previous={card.delta.previous} /> : null}
          </div>
        </div>
      ))}
    </section>
  )
}
