import type { DetectedPayload } from './state'
import { clearTokens, getTokens, setTokens } from './auth-sync'
import { setDetectionState } from './state'

/** Origins the web app is served from — must match manifest externally_connectable. */
const ALLOWED_WEB_ORIGINS = ['http://localhost:5173', 'https://scout.app']

chrome.runtime.onInstalled.addListener(() => {
  console.log('[scout] extension installed')
})

// Single sign-on bridge: the web app pushes its session here so the popup
// doesn't need a separate login. Only accepts messages from the web origins
// declared in externally_connectable (re-validated against sender.url).
chrome.runtime.onMessageExternal.addListener(
  (message: unknown, sender: chrome.runtime.MessageSender, sendResponse: (response: unknown) => void) => {
    const origin = sender.url ? new URL(sender.url).origin : null
    if (!origin || !ALLOWED_WEB_ORIGINS.includes(origin)) {
      return false
    }
    const msg = message as { type?: string; access?: string; refresh?: string }
    if (msg.type === 'scout:auth:set' && msg.access && msg.refresh) {
      void setTokens(msg.access, msg.refresh).then(() => sendResponse({ ok: true }))
      return true
    }
    if (msg.type === 'scout:auth:clear') {
      void clearTokens().then(() => sendResponse({ ok: true }))
      return true
    }
    return false
  },
)

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