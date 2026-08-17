import type {
  EnrichmentJobOut,
  ResumeGenerateAccepted,
  ResumeOut as ResumeOutShared,
  ResumeVersionOut as ResumeVersionOutShared,
} from '@scout/types'

import { ApiRequestError, api } from '../../lib/api-client'
import { tokens } from '../../lib/auth'
import type { Page } from '../startups/api'

export interface ResumeContent {
  name?: string
  role_label?: string
  summary?: string
  skills?: string[]
  experience?: Array<{
    company?: string
    title?: string
    dates?: string
    bullets?: string[]
  }>
  education?: Array<{ school?: string; degree?: string; dates?: string }>
  projects?: Array<{ name?: string; description?: string }>
}

export type ResumeOut = Omit<ResumeOutShared, 'content'> & {
  content: ResumeContent | null
}

/**
 * Pick the base resume consistently everywhere (matches "Generate resume",
 * Resume Studio, etc.). Prefer the marked base; fall back to the newest row
 * (legacy data may predate is_base). Never silently pick a random duplicate.
 */
export function selectBaseResume(resumes: ResumeOut[]): ResumeOut | null {
  return resumes.find((r) => r.is_base) ?? resumes[0] ?? null
}

export type ResumeVersionOut = Omit<ResumeVersionOutShared, 'content'> & {
  content: ResumeContent | null
}

export type GenerateAccepted = ResumeGenerateAccepted

export type JobStatus = EnrichmentJobOut

export function listResumesRequest(): Promise<ResumeOut[]> {
  return api('/resumes')
}

export function createResumeRequest(body: { title?: string; content?: ResumeContent }): Promise<ResumeOut> {
  return api('/resumes', { method: 'POST', body: JSON.stringify(body) })
}

export function updateResumeRequest(
  resumeId: string,
  body: { title?: string; content?: ResumeContent },
): Promise<ResumeOut> {
  return api(`/resumes/${resumeId}`, { method: 'PATCH', body: JSON.stringify(body) })
}

export function versionsRequest(resumeId: string): Promise<ResumeVersionOut[]> {
  return api(`/resumes/${resumeId}/versions`)
}

export function generateResumeRequest(
  resumeId: string,
  body: { application_id?: string | null; job_id?: string | null; tone?: string; emphasize?: string[] },
): Promise<GenerateAccepted> {
  return api(`/resumes/${resumeId}/generate`, { method: 'POST', body: JSON.stringify(body) })
}

export function versionRequest(versionId: string): Promise<ResumeVersionOut> {
  return api(`/resume-versions/${versionId}`)
}

export function reviewVersionRequest(versionId: string): Promise<ResumeVersionOut> {
  return api(`/resume-versions/${versionId}/review`, { method: 'POST' })
}

export function jobStatusRequest(jobId: string): Promise<JobStatus> {
  return api(`/jobs-status/${jobId}`)
}

export async function downloadVersionPdf(versionId: string): Promise<void> {
  const { url } = await api<{ url: string }>(`/resume-versions/${versionId}/download`)
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${tokens.access}` },
  })
  if (!res.ok) {
    throw new ApiRequestError(res.status, 'DOWNLOAD_FAILED', 'Download failed.')
  }
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = `resume-${versionId}.pdf`
  anchor.click()
  URL.revokeObjectURL(objectUrl)
}

export interface ApplicationOption {
  id: string
  job_id: string | null
  label: string
}

export async function listApplicationsOptionsRequest(): Promise<ApplicationOption[]> {
  const page: Page<{
    id: string
    job_id: string | null
    startup: { name: string } | null
    job: { title: string } | null
  }> = await api('/applications')
  return page.data.map((app) => ({
    id: app.id,
    job_id: app.job_id,
    label: `${app.job?.title ?? 'Role'} @ ${app.startup?.name ?? 'Unknown'}`,
  }))
}