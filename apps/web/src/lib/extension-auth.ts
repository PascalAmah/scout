// Single sign-on bridge: push the web session to the Scout extension so the
// popup stays logged in without a separate login. Set VITE_EXTENSION_ID to the
// extension's ID (store ID in production; the unpacked ID shown on
// chrome://extensions in dev). No-op when unset or when the extension isn't
// installed, so the web app works standalone.

interface ChromeRuntimeLike {
  sendMessage(extensionId: string, message: unknown): Promise<unknown>
}
declare const chrome: { runtime?: ChromeRuntimeLike } | undefined

const EXTENSION_ID = import.meta.env.VITE_EXTENSION_ID

type ExtensionAuthMessage =
  | { type: 'scout:auth:set'; access: string; refresh: string }
  | { type: 'scout:auth:clear' }

export function pushSessionToExtension(access: string, refresh: string): void {
  void sendToExtension({ type: 'scout:auth:set', access, refresh })
}

export function clearExtensionSession(): void {
  void sendToExtension({ type: 'scout:auth:clear' })
}

async function sendToExtension(message: ExtensionAuthMessage): Promise<void> {
  if (!EXTENSION_ID || typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
    return
  }
  try {
    await chrome.runtime.sendMessage(EXTENSION_ID, message)
  } catch {
    // Extension not installed or not loaded — nothing to sync.
  }
}
