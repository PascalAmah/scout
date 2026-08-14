import { api } from '../../lib/api-client'
import type { Page } from '../startups/api'

export interface MatchExplanation {
  matched_skills: string[]
  gaps: string[]
  summary: string
}

export interface MatchOut {
  job_id: string
  startup_id: string
  startup_name: string
  title: string
  description: string | null
  location: string | null
  remote: boolean | null
  employment_type: string | null
  seniority: string | null
  url: string | null
  status: string | null
  score: number
  confidence_band: string | null
  explanation: MatchExplanation | null
}

export interface ComputeMatchesOut {
  status: string
  computed_scores: number
}

export function recommendedRequest(cursor?: string): Promise<Page<MatchOut>> {
  return api(`/jobs/recommended${cursor ? `?cursor=${cursor}` : ''}`)
}

export function computeMatchesRequest(): Promise<ComputeMatchesOut> {
  return api('/match/compute', { method: 'POST' })
}