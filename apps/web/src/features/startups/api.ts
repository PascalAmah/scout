import { queryOptions } from '@tanstack/react-query'
import type {
  EnrichmentJobOut as EnrichmentJobOutShared,
  FounderOut as FounderOutShared,
  JobOut as JobOutShared,
  NoteOut as NoteOutShared,
  Page,
  StartupDetail as StartupDetailShared,
  StartupListItem as StartupListItemShared,
} from '@scout/types'

export type { Page }

import { api } from '../../lib/api-client'

export type EnrichmentStatus = 'none' | 'queued' | 'running' | 'succeeded' | 'failed'
export type WorkplaceStatus = 'saved' | 'interested' | 'archived'

export type StartupListItem = Omit<
  StartupListItemShared,
  'status' | 'enrichment_status'
> & {
  status: WorkplaceStatus
  enrichment_status: EnrichmentStatus
}

export type FounderOut = FounderOutShared
export type JobOut = JobOutShared
export type NoteOut = NoteOutShared

export type StartupDetail = Omit<
  StartupDetailShared,
  'status' | 'enrichment_status'
> & {
  status: WorkplaceStatus
  enrichment_status: EnrichmentStatus
}

export type EnrichmentJobOut = EnrichmentJobOutShared

export interface StartupFilters {
  stage?: string
  hiring_status?: string
  tags?: string[]
  source?: string
  q?: string
  page?: number
  limit?: number
}

export const startupsQueryOptions = (filters: StartupFilters = {}) =>
  queryOptions({
    queryKey: ['startups', filters],
    queryFn: () => {
      const params = new URLSearchParams()
      if (filters.stage) params.set('stage', filters.stage)
      if (filters.hiring_status) params.set('hiring_status', filters.hiring_status)
      if (filters.source) params.set('source', filters.source)
      if (filters.q) params.set('q', filters.q)
      if (filters.page != null) params.set('page', String(filters.page))
      if (filters.limit != null) params.set('limit', String(filters.limit))
      for (const tag of filters.tags ?? []) params.append('tags', tag)
      const qs = params.toString()
      return api<Page<StartupListItem>>(`/startups${qs ? `?${qs}` : ''}`)
    },
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