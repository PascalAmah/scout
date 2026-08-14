import { queryOptions } from '@tanstack/react-query'

import { api } from '../../lib/api-client'

export interface NeedsFollowUpItem {
  application_id: string
  startup_name: string | null
  job_title: string | null
  applied_at: string | null
  days_since: number
  last_outreach_status: string | null
}

export const needsFollowUpQueryOptions = queryOptions({
  queryKey: ['applications', 'needs-follow-up'],
  queryFn: () => api<NeedsFollowUpItem[]>('/applications/needs-follow-up'),
})
