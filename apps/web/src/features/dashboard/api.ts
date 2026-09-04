import { queryOptions } from '@tanstack/react-query'
import type { FollowUpAccepted, FollowUpOut } from '@scout/types'

import { api } from '../../lib/api-client'

export type NeedsFollowUpItem = FollowUpOut

export const needsFollowUpQueryOptions = queryOptions({
  queryKey: ['applications', 'needs-follow-up'],
  queryFn: () => api<NeedsFollowUpItem[]>('/applications/needs-follow-up'),
})

/** Queue follow-up generation (202 — the worker drafts it asynchronously). */
export function draftFollowUpRequest(applicationId: string): Promise<FollowUpAccepted> {
  return api(`/applications/${applicationId}/follow-up`, { method: 'POST' })
}
