import type {
  ApplicationOut as ApplicationOutShared,
  EnrichmentJobOut,
  OutreachOut as OutreachOutShared,
  ResumeVersionRef as ResumeVersionRefShared,
  TimelineEvent as TimelineEventShared,
} from '@scout/types'

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

export type ApplicationOut = Omit<ApplicationOutShared, 'status'> & {
  status: ApplicationStatus
}

export type ApplicationStartup = ApplicationOut['startup'] extends infer S
  ? NonNullable<S>
  : never
export type ApplicationJob = ApplicationOut['job'] extends infer J
  ? NonNullable<J>
  : never

export type TimelineEvent = TimelineEventShared
export type OutreachOut = OutreachOutShared

export type ResumeVersionRef = ResumeVersionRefShared

export type JobStatus = EnrichmentJobOut

export const OUTREACH_CHANNELS = ['cover_letter', 'email', 'linkedin_dm'] as const
export type OutreachChannel = (typeof OUTREACH_CHANNELS)[number]

export type ApplicationDetail = ApplicationOut & {
  timeline: TimelineEvent[]
  outreach: OutreachOut[]
  resume_version: ResumeVersionRef | null
  resume_version_content: Record<string, unknown> | null
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

export function applicationRequest(applicationId: string): Promise<ApplicationDetail> {
  return api<ApplicationDetail>(`/applications/${applicationId}`)
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

export interface BulkApplicationBody {
  application_ids: string[]
  status?: 'archived'
  tags?: string[]
}

export function bulkApplicationsRequest(body: BulkApplicationBody): Promise<{ updated: number }> {
  return api('/applications/bulk', { method: 'POST', body: JSON.stringify(body) })
}

export function archiveApplicationRequest(applicationId: string): Promise<void> {
  return api(`/applications/${applicationId}`, { method: 'DELETE' })
}

export function generateOutreachRequest(
  applicationId: string,
  channel: OutreachChannel,
): Promise<{ job_id: string; status: string }> {
  return api('/outreach/generate', {
    method: 'POST',
    body: JSON.stringify({ application_id: applicationId, channel }),
  })
}

export function reviewOutreachRequest(outreachId: string): Promise<OutreachOut> {
  return api(`/outreach/${outreachId}/review`, { method: 'POST' })
}

export function updateOutreachRequest(
  outreachId: string,
  body: { status: string },
): Promise<OutreachOut> {
  return api(`/outreach/${outreachId}`, { method: 'PATCH', body: JSON.stringify(body) })
}

export function jobStatusRequest(jobId: string): Promise<JobStatus> {
  return api(`/jobs-status/${jobId}`)
}
