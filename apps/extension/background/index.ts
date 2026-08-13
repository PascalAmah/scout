import type { DetectedPayload } from './state'
import { getTokens } from './auth-sync'
import { setDetectionState } from './state'

chrome.runtime.onInstalled.addListener(() => {
  console.log('[scout] extension installed')
})

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (typeof message !== 'object' || message === null) return
  const msg = message as { type?: string; payload?: DetectedPayload }
  if (msg.type !== 'scout:detected' || !msg.payload) return

  void (async () => {
    const tokens = await getTokens()
    if (!tokens) {
      await setDetectionState({ status: 'auth_required', payload: msg.payload, detected_at: Date.now() })
      return
    }
    await setDetectionState({ status: 'detected', payload: msg.payload, detected_at: Date.now() })
  })()

  return false
})