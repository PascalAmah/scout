import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createResumeRequest,
  generateResumeRequest,
  jobStatusRequest,
  listApplicationsOptionsRequest,
  listResumesRequest,
  reviewVersionRequest,
  updateResumeRequest,
  versionRequest,
  versionsRequest,
} from './api'

export function useResumes() {
  return useQuery({ queryKey: ['resume-studio', 'resumes'], queryFn: listResumesRequest })
}

export function useCreateResume() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createResumeRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['resume-studio', 'resumes'] })
    },
  })
}

export function useUpdateResume(resumeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { title?: string; content?: object }) =>
      updateResumeRequest(resumeId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['resume-studio', 'resumes'] })
    },
  })
}

export function useVersions(resumeId: string) {
  return useQuery({
    queryKey: ['resume-studio', 'versions', resumeId],
    queryFn: () => versionsRequest(resumeId),
    enabled: Boolean(resumeId),
  })
}

export function useGenerateResume(resumeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      application_id?: string | null
      job_id?: string | null
      tone?: string
      emphasize?: string[]
    }) => generateResumeRequest(resumeId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['resume-studio', 'versions', resumeId] })
    },
  })
}

export function useJobStatus(jobId: string | null, enabled = false) {
  return useQuery({
    queryKey: ['resume-studio', 'job', jobId],
    queryFn: () => jobStatusRequest(jobId!),
    enabled: enabled && Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'succeeded' || status === 'failed') return false
      return 1500
    },
  })
}

export function useVersion(versionId: string) {
  return useQuery({
    queryKey: ['resume-studio', 'version', versionId],
    queryFn: () => versionRequest(versionId),
  })
}

export function useReviewVersion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: reviewVersionRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['resume-studio'] })
    },
  })
}

export function useApplicationOptions() {
  return useQuery({
    queryKey: ['resume-studio', 'applications'],
    queryFn: listApplicationsOptionsRequest,
  })
}