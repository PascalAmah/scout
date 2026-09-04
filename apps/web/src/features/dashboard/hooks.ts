import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { draftFollowUpRequest, needsFollowUpQueryOptions } from './api'

export function useNeedsFollowUp() {
  return useQuery(needsFollowUpQueryOptions)
}

export function useDraftFollowUp() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (applicationId: string) => draftFollowUpRequest(applicationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['applications', 'needs-follow-up'] })
    },
  })
}
