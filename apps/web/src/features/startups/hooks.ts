import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createStartupRequest,
  deleteStartupRequest,
  enrichmentQueryOptions,
  startupQueryOptions,
  startupsQueryOptions,
  triggerEnrichRequest,
  updateStartupRequest,
  type StartupFilters,
} from './api'

export function useStartups(filters: StartupFilters = {}) {
  return useQuery(startupsQueryOptions(filters))
}

export function useStartup(startupId: string) {
  return useQuery(startupQueryOptions(startupId))
}

export function useEnrichmentStatus(startupId: string, enabled: boolean) {
  return useQuery({ ...enrichmentQueryOptions(startupId), enabled, refetchInterval: 5000 })
}

export function useCreateStartup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createStartupRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['startups'] })
    },
  })
}

export function useUpdateStartup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ startupId, body }: { startupId: string; body: Parameters<typeof updateStartupRequest>[1] }) =>
      updateStartupRequest(startupId, body),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['startups'] })
      void queryClient.invalidateQueries({ queryKey: ['startups', vars.startupId] })
    },
  })
}

export function useDeleteStartup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteStartupRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['startups'] })
    },
  })
}

export function useTriggerEnrich() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: triggerEnrichRequest,
    onSuccess: (_data, startupId) => {
      void queryClient.invalidateQueries({ queryKey: ['startups', startupId] })
      void queryClient.invalidateQueries({ queryKey: ['startups', startupId, 'enrichment'] })
    },
  })
}

export type { StartupFilters }