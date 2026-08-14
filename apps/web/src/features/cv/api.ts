import { api } from '../../lib/api-client'

export interface StructuredData {
  skills: string[]
  roles: string[]
  years_of_experience: number | null
  education: string[]
  summary: string | null
}

export interface CVProfile {
  id: string
  user_id: string
  raw_text: string | null
  structured_data: StructuredData | null
  source_file_key: string | null
  last_embedded_at: string | null
  created_at: string
  updated_at: string
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