import { queryOptions } from '@tanstack/react-query'

import { api } from '../../lib/api-client'

export interface Page<T> {
  data: T[]
  next_cursor: string | null
}

export type EnrichmentStatus = 'none' | 'queued' | 'running' | 'succeeded' | 'failed'
export type WorkplaceStatus = 'saved' | 'interested' | 'archived'

export interface StartupListItem {
  id: string
  name: string
  website: string | null
  stage: string | null
  hiring_status: string | null
  summary: string | null
  tags: string[] | null
  tech_stack: string[] | null
  source: string | null
  source_url: string | null
  last_enriched_at: string | null
  created_at: string
  updated_at: string
  status: WorkplaceStatus
  saved_via: string
  enrichment_status: EnrichmentStatus
  created_by: string | null
}

export interface FounderOut {
  id: string
  startup_id: string
  name: string
  title: string | null
  linkedin_url: string | null
  twitter_url: string | null
  bio: string | null
}

export interface JobOut {
  id: string
  startup_id: string
  title: string
  description: string | null
  location: string | null
  remote: boolean | null
  employment_type: string | null
  seniority: string | null
  salary_min: number | null
  salary_max: number | null
  url: string | null
  status: string
  created_at: string
}

export interface NoteOut {
  id: string
  startup_id: string | null
  founder_id: string | null
  body: string
  created_at: string
  updated_at: string
}

export interface StartupDetail extends StartupListItem {
  founders: FounderOut[]
  jobs: JobOut[]
  notes: NoteOut[]
}

export interface EnrichmentJobOut {
  job_id: string
  job_type: string
  status: string
  started_at: string | null
  finished_at: string | null
  error: string | null
}

export interface StartupFilters {
  stage?: string
  hiring_status?: string
  tags?: string[]
  q?: string
  cursor?: string
  limit?: number
}

export const startupsQueryOptions = (filters: StartupFilters = {}) =>
  queryOptions({
    queryKey: ['startups', filters],
    queryFn: () =>
      api<Page<StartupListItem>>(
        `/startups?${new URLSearchParams(
          ['stage', 'hiring_status', 'q', 'cursor', 'limit']
            .filter((key) => filters[key as keyof StartupFilters] != null)
            .map((key) => [key, String(filters[key as keyof StartupFilters])]),
        ).toString()}`,
      ),
  })

export function startupQueryOptions(startupId: string) {
  return queryOptions({
    queryKey: ['startups', startupId],
    queryFn: () => api<StartupDetail>(`/startups/${startupId}`),
  })
}

export function enrichmentQueryOptions(startupId: string) {
  return queryOptions({
    queryKey: ['startups', startupId, 'enrichment'],
    queryFn: () => api<EnrichmentJobOut>(`/startups/${startupId}/enrichment-status`),
    retry: false,
  })
}

export function createStartupRequest(body: {
  name: string
  website?: string | null
  source?: string | null
  source_url?: string | null
  tags?: string[]
}): Promise<StartupListItem> {
  return api('/startups', { method: 'POST', body: JSON.stringify(body) })
}

export function updateStartupRequest(
  startupId: string,
  body: { status?: WorkplaceStatus; hiring_status?: string | null },
): Promise<StartupListItem> {
  return api(`/startups/${startupId}`, { method: 'PATCH', body: JSON.stringify(body) })
}

export function deleteStartupRequest(startupId: string): Promise<void> {
  return api(`/startups/${startupId}`, { method: 'DELETE' })
}

export function triggerEnrichRequest(startupId: string): Promise<EnrichmentJobOut> {
  return api(`/startups/${startupId}/enrich`, { method: 'POST' })
}

export function addFounderRequest(
  startupId: string,
  body: { name: string; title?: string | null } & Partial<FounderOut>,
): Promise<FounderOut> {
  return api(`/startups/${startupId}/founders`, { method: 'POST', body: JSON.stringify(body) })
}

export function addNoteRequest(startupId: string, body: { body: string; founder_id?: string | null }): Promise<NoteOut> {
  return api(`/startups/${startupId}/notes`, { method: 'POST', body: JSON.stringify(body) })
}