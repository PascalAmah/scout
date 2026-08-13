import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  archiveApplicationRequest,
  createApplicationRequest,
  pipelineRequest,
  updateApplicationRequest,
  type ApplicationStatus,
} from './api'

export function usePipeline() {
  return useQuery({
    queryKey: ['crm', 'pipeline'],
    queryFn: pipelineRequest,
    select: (res) => res.data,
  })
}

export function useCreateApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createApplicationRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'pipeline'] })
    },
  })
}

export function useUpdateApplicationStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ applicationId, status }: { applicationId: string; status: ApplicationStatus }) =>
      updateApplicationRequest(applicationId, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'pipeline'] })
    },
  })
}

export function useArchiveApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: archiveApplicationRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'pipeline'] })
    },
  })
}
