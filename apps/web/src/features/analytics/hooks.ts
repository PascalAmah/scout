import { useQuery } from '@tanstack/react-query'

import {
  funnelQueryOptions,
  responseTimesQueryOptions,
  summaryQueryOptions,
  type AnalyticsFilters,
} from './api'

export function useAnalyticsSummary(filters: AnalyticsFilters) {
  return useQuery(summaryQueryOptions(filters))
}

export function useAnalyticsFunnel(filters: AnalyticsFilters) {
  return useQuery(funnelQueryOptions(filters))
}

export function useAnalyticsResponseTimes(filters: AnalyticsFilters) {
  return useQuery(responseTimesQueryOptions(filters))
}
