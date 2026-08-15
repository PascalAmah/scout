import { useQuery } from '@tanstack/react-query'

import { funnelQueryOptions, summaryQueryOptions, type AnalyticsFilters } from './api'

export function useAnalyticsSummary(filters: AnalyticsFilters) {
  return useQuery(summaryQueryOptions(filters))
}

export function useAnalyticsFunnel(filters: AnalyticsFilters) {
  return useQuery(funnelQueryOptions(filters))
}
