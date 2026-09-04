import type { QuickSaveResponse } from '@scout/types'

import { api, clearTokens, getTokens, setTokens } from './auth-sync'
import type { DetectedPayload } from './state'
import { getDetectionState, setDetectionState, updateDetectionState } from './state'

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

/** Persist a freshly-detected payload, checking auth first. */
async function applyDetection(payload: DetectedPayload): Promise<void> {
  const tokens = await getTokens()
  if (!tokens) {
    await setDetectionState({ status: 'auth_required', payload, detected_at: Date.now() })
    return
  }
  await setDetectionState({ status: 'detected', payload, detected_at: Date.now() })
}

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (typeof message !== 'object' || message === null) return
  const msg = message as { type?: string; payload?: DetectedPayload }
  if (msg.type !== 'scout:detected' || !msg.payload) return

  void applyDetection(msg.payload)
  return false
})

// The popup asks for the active tab's current detection state. This
// round-trips through the tab's content script (which returns a fresh payload)
// so the popup can never render stale state from another tab or an earlier
// navigation — the response is only sent after the new state is written.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (typeof message !== 'object' || message === null) return
  const msg = message as { type?: string }
  if (msg.type !== 'scout:re-detect-tab') return

  void (async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab?.id) {
        const resp = (await chrome.tabs.sendMessage(tab.id, { type: 'scout:re-detect' })) as
          | { payload?: DetectedPayload }
          | undefined
        if (resp?.payload) await applyDetection(resp.payload)
      }
    } catch {
      // No Scout content script on this tab — fall through to stored state.
    }
    sendResponse(await getDetectionState())
  })()

  return true
})

// The popup delegates the actual save to the service worker so the fetch
// survives a popup close — "safe to close" is a real guarantee, not a nicety.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (typeof message !== 'object' || message === null) return
  const msg = message as { type?: string; payload?: DetectedPayload; tags?: string[] }
  if (msg.type !== 'scout:save' || !msg.payload) return
  const { payload, tags } = msg

  void (async () => {
    try {
      // A listing page may span multiple companies (payload.groups). Save one
      // quick-save per group; a single-company payload saves as-is.
      const requests: DetectedPayload[] = payload.groups?.length
        ? payload.groups.map((group) => ({
            source: payload.source,
            source_url: payload.source_url,
            startup: { ...group.startup, tags: tags ?? [] },
            jobs: group.jobs,
          }))
        : [{ ...payload, startup: { ...payload.startup, tags: tags ?? [] } }]

      const savedItems: { startup_id: string; startup_name: string }[] = []
      for (const req of requests) {
        const saved = await api<QuickSaveResponse>('/extension/quick-save', {
          method: 'POST',
          body: JSON.stringify(req),
        })
        savedItems.push({ startup_id: saved.startup_id, startup_name: req.startup?.name ?? 'Startup' })
      }

      const state = await updateDetectionState({
        status: 'saved',
        saved: savedItems[0],
        saved_count: savedItems.length,
      })
      sendResponse({ ok: true, state })
    } catch (err) {
      const status = (err as { status?: number }).status
      if (status === 401) {
        const state = await updateDetectionState({ status: 'auth_required' })
        sendResponse({ ok: false, status: 401, state })
        return
      }
      const state = await updateDetectionState({
        status: 'error',
        error: err instanceof Error ? err.message : 'Something went wrong.',
      })
      sendResponse({ ok: false, state })
    }
  })()

  return true
})