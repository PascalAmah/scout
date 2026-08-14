import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  applicationRequest,
  archiveApplicationRequest,
  createApplicationRequest,
  generateOutreachRequest,
  jobStatusRequest,
  pipelineRequest,
  reviewOutreachRequest,
  updateApplicationRequest,
  updateOutreachRequest,
  type ApplicationStatus,
  type OutreachChannel,
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

export function useGenerateOutreach(applicationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (channel: OutreachChannel) => generateOutreachRequest(applicationId, channel),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'applications', applicationId] })
    },
  })
}

export function useOutreachJobStatus(jobId: string | null) {
  return useQuery({
    queryKey: ['crm', 'outreach-job', jobId],
    queryFn: () => jobStatusRequest(jobId!),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'succeeded' || status === 'failed') return false
      return 1500
    },
  })
}

export function useReviewOutreach(applicationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: reviewOutreachRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'applications', applicationId] })
    },
  })
}

export function useUpdateOutreach(applicationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ outreachId, status }: { outreachId: string; status: string }) =>
      updateOutreachRequest(outreachId, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'applications', applicationId] })
    },
  })
}
