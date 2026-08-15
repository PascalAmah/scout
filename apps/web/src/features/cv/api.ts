import type { CVProfileOut } from '@scout/types'

import { api } from '../../lib/api-client'

export interface StructuredData {
  skills: string[]
  roles: string[]
  years_of_experience: number | null
  education: string[]
  summary: string | null
}

export type CVProfile = Omit<CVProfileOut, 'structured_data'> & {
  structured_data: StructuredData | null
}

export interface CVProfilePatch {
  name?: string
  is_default?: boolean
}

export function cvRequest(): Promise<CVProfile> {
  return api('/cv')
}

export function uploadCVRequest(file?: File, text?: string): Promise<CVProfile> {
  const form = new FormData()
  if (file) form.append('file', file)
  if (text) form.append('text', text)
  return api('/cv', { method: 'POST', body: form })
}

export function cvProfilesRequest(): Promise<CVProfile[]> {
  return api('/cv/profiles')
}

export function createCVProfileRequest(
  name: string,
  file?: File,
  text?: string,
): Promise<CVProfile> {
  const form = new FormData()
  form.append('name', name)
  if (file) form.append('file', file)
  if (text) form.append('text', text)
  return api('/cv/profiles', { method: 'POST', body: form })
}

export function updateCVProfileRequest(id: string, patch: CVProfilePatch): Promise<CVProfile> {
  return api(`/cv/profiles/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
}

export function deleteCVProfileRequest(id: string): Promise<void> {
  return api(`/cv/profiles/${id}`, { method: 'DELETE' })
}
