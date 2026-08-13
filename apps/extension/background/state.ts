export interface DetectedStartup {
  name: string | null
  website: string | null
}

export interface DetectedJob {
  title: string | null
  url: string | null
}

export interface DetectedPayload {
  source: string
  source_url: string
  startup: DetectedStartup
  job?: DetectedJob | null
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
