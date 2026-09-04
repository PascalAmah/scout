import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { computeMatchesRequest, matchFeedbackRequest, recommendedRequest } from './api'

export function useMatches() {
  return useQuery({
    queryKey: ['matches'],
    queryFn: () => recommendedRequest(),
  })
}

export function useComputeMatches() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: computeMatchesRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['matches'] })
    },
  })
}

export function useMatchFeedback() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ jobId, feedback }: { jobId: string; feedback: 'good' | 'poor' }) =>
      matchFeedbackRequest(jobId, feedback),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['matches'] })
    },
  })
}