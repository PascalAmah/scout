import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  applicationRequest,
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

export function useApplication(applicationId: string) {
  return useQuery({
    queryKey: ['crm', 'applications', applicationId],
    queryFn: () => applicationRequest(applicationId),
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
    onSuccess: (_data, applicationId) => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'pipeline'] })
      queryClient.removeQueries({ queryKey: ['crm', 'applications', applicationId] })
    },
  })
}
