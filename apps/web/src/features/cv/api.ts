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

export function cvRequest(): Promise<CVProfile> {
  return api('/cv')
}

export function uploadCVRequest(file?: File, text?: string): Promise<CVProfile> {
  const form = new FormData()
  if (file) form.append('file', file)
  if (text) form.append('text', text)
  return api('/cv', { method: 'POST', body: form })
}