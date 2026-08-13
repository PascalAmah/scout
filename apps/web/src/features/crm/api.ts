import { api } from '../../lib/api-client'
import type { Page } from '../startups/api'

export const APPLICATION_STATUSES = [
  'saved',
  'interested',
  'applied',
  'interview',
  'offer',
  'rejected',
  'archived',
] as const

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]

export interface ApplicationStartup {
  id: string
  name: string
  website: string | null
}

export interface ApplicationJob {
  id: string
  title: string
}

export interface ApplicationOut {
  id: string
  startup_id: string
  job_id: string | null
  status: ApplicationStatus
  applied_at: string | null
  created_at: string
  updated_at: string
  startup: ApplicationStartup | null
  job: ApplicationJob | null
}

export interface PipelineData {
  [status: string]: ApplicationOut[]
}

export function listApplicationsRequest(status?: string, cursor?: string): Promise<Page<ApplicationOut>> {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (cursor) params.set('cursor', cursor)
  const qs = params.toString()
  return api<Page<ApplicationOut>>(`/applications${qs ? `?${qs}` : ''}`)
}

export function pipelineRequest(): Promise<{ data: PipelineData }> {
  return api(`/applications/pipeline`)
}

export function createApplicationRequest(body: {
  startup_id: string
  job_id?: string | null
  status?: ApplicationStatus
}): Promise<ApplicationOut> {
  return api('/applications', { method: 'POST', body: JSON.stringify(body) })
}

export function updateApplicationRequest(
  applicationId: string,
  body: { status: ApplicationStatus },
): Promise<ApplicationOut> {
  return api(`/applications/${applicationId}`, { method: 'PATCH', body: JSON.stringify(body) })
}

export function archiveApplicationRequest(applicationId: string): Promise<void> {
  return api(`/applications/${applicationId}`, { method: 'DELETE' })
}
