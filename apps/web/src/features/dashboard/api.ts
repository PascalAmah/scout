import { queryOptions } from '@tanstack/react-query'
import type { FollowUpOut } from '@scout/types'

import { api } from '../../lib/api-client'

export type NeedsFollowUpItem = FollowUpOut

export const needsFollowUpQueryOptions = queryOptions({
  queryKey: ['applications', 'needs-follow-up'],
  queryFn: () => api<NeedsFollowUpItem[]>('/applications/needs-follow-up'),
})
