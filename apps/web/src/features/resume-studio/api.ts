import { api } from '../../lib/api-client'
import type { Page } from '../startups/api'

export interface ResumeContent {
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

export interface ResumeOut {
  id: string
  user_id: string
  title: string
  is_base: boolean
  content: ResumeContent | null
  created_at: string
  updated_at: string
}

export interface ResumeVersionOut {
  id: string
  resume_id: string
  application_id: string | null
  content: ResumeContent | null
  generated_by_model: string | null
  reviewed_at: string | null
  created_at: string
}

export interface GenerateAccepted {
  job_id: string
  status: string
}

export interface JobStatus {
  job_id: string
  job_type: string
  status: string
  started_at: string | null
  finished_at: string | null
  error: string | null
}

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