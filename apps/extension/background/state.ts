import type { QuickSaveRequest } from '@scout/types'

/**
 * What the content scripts detect on a page — structurally identical to the
 * /extension/quick-save request body, which is what it gets sent as.
 */
export type DetectedPayload = QuickSaveRequest

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
