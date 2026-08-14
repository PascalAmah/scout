import { useQuery } from '@tanstack/react-query'

import { needsFollowUpQueryOptions } from './api'

export function useNeedsFollowUp() {
  return useQuery(needsFollowUpQueryOptions)
}
