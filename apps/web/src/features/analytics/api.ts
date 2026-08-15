import { queryOptions } from '@tanstack/react-query'
import type { AnalyticsSummary, Funnel } from '@scout/types'

import { api } from '../../lib/api-client'

export type { AnalyticsSummary, Funnel }

export interface AnalyticsFilters {
  from?: string
  to?: string
  source?: string
}

export function analyticsQueryString(filters: AnalyticsFilters): string {
  const params = new URLSearchParams()
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (filters.source) params.set('source', filters.source)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export const summaryQueryOptions = (filters: AnalyticsFilters = {}) =>
  queryOptions({
    queryKey: ['analytics', 'summary', filters],
    queryFn: () => api<AnalyticsSummary>(`/analytics/summary${analyticsQueryString(filters)}`),
  })

export const funnelQueryOptions = (filters: AnalyticsFilters = {}) =>
  queryOptions({
    queryKey: ['analytics', 'funnel', filters],
    queryFn: () => api<Funnel>(`/analytics/funnel${analyticsQueryString(filters)}`),
  })
