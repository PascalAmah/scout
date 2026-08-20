import type { QuickSaveRequest } from '@scout/types'

/**
 * One candidate save on a listing page: a startup plus the roles found for it.
 * A multi-company job board yields several of these (grouped by company); a
 * single-company careers page yields one (with jobs[]).
 */
export interface DetectedGroup {
  startup: QuickSaveRequest['startup']
  jobs: NonNullable<QuickSaveRequest['jobs']>
}

/**
 * What the content scripts detect on a page — structurally identical to the
 * /extension/quick-save request body, which is what it gets sent as. The
 * optional `groups` field is extension-only (never sent to the API): it holds
 * one entry per distinct company when a listing spans multiple startups.
 */
export type DetectedPayload = QuickSaveRequest & {
  groups?: DetectedGroup[]
}

export type DetectionStatus =
  | 'none'
  | 'detected'
  | 'saving'
  | 'saved'
  | 'auth_required'
  | 'error'

export interface DetectionState {
  status: DetectionStatus
  payload?: DetectedPayload
  saved?: { startup_id: string; startup_name: string }
  saved_count?: number
  error?: string
  detected_at?: number
}

const KEY = 'scout_detection_state'

export async function getDetectionState(): Promise<DetectionState | null> {
  const data = await chrome.storage.local.get(KEY)
  return (data[KEY] as DetectionState | undefined) ?? null
}

export async function setDetectionState(state: DetectionState): Promise<void> {
  await chrome.storage.local.set({ [KEY]: state })
}

export async function updateDetectionState(patch: Partial<DetectionState>): Promise<DetectionState> {
  const current = (await getDetectionState()) ?? { status: 'none' as const }
  const next = { ...current, ...patch }
  await setDetectionState(next)
  return next
}
