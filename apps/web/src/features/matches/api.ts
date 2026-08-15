import type {
  ComputeMatchOut as ComputeMatchesOut,
  MatchExplanation,
  MatchOut,
} from '@scout/types'

import { api } from '../../lib/api-client'
import type { Page } from '../startups/api'

export type { ComputeMatchesOut, MatchExplanation, MatchOut }

export function recommendedRequest(cursor?: string): Promise<Page<MatchOut>> {
  return api(`/jobs/recommended${cursor ? `?cursor=${cursor}` : ''}`)
}

export function computeMatchesRequest(): Promise<ComputeMatchesOut> {
  return api('/match/compute', { method: 'POST' })
}

export function matchFeedbackRequest(jobId: string, feedback: 'good' | 'poor'): Promise<MatchOut> {
  return api(`/match/${jobId}/feedback`, {
    method: 'POST',
    body: JSON.stringify({ feedback }),
  })
}