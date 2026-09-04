import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createApplicationRequest } from '../crm/api'
import {
  addFounderRequest,
  addNoteRequest,
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
    onSuccess: (_data, startupId) => {
      void queryClient.invalidateQueries({ queryKey: ['startups'] })
      void queryClient.invalidateQueries({ queryKey: ['startups', startupId] })
      void queryClient.invalidateQueries({ queryKey: ['startups', startupId, 'enrichment'] })
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

export function useMoveToPipeline() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ startupId, jobId }: { startupId: string; jobId?: string | null }) =>
      createApplicationRequest({ startup_id: startupId, job_id: jobId ?? null, status: 'saved' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'pipeline'] })
      void queryClient.invalidateQueries({ queryKey: ['analytics'] })
    },
  })
}

export function useAddFounder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ startupId, body }: { startupId: string; body: { name: string; title?: string | null } }) =>
      addFounderRequest(startupId, body),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['startups', vars.startupId] })
    },
  })
}

export function useAddNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ startupId, body }: { startupId: string; body: { body: string } }) =>
      addNoteRequest(startupId, body),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['startups', vars.startupId] })
    },
  })
}

export type { StartupFilters }