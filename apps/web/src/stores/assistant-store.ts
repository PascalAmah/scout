import { create } from 'zustand'

import type {
  AssistantReference,
  AssistantToolCall,
  ChatMessage,
} from '../features/assistant/api'

export interface ThreadMessage extends ChatMessage {
  references?: AssistantReference[]
  tools?: AssistantToolCall[]
}

interface AssistantState {
  thread: ThreadMessage[]
  appendUser: (content: string) => void
  appendAssistant: (content: string, references?: AssistantReference[], tools?: AssistantToolCall[]) => void
  reset: () => void
  /** Replace the whole thread (used when switching active account). */
  setThread: (thread: ThreadMessage[]) => void
}

const THREAD_PREFIX = 'scout-assistant-thread'
const MAX_THREAD = 200

/**
 * The conversation is kept per user so that each account sees its own thread
 * and gets it back on a later login. We store it under a per-user localStorage
 * key (`scout-assistant-thread-<userId>`) instead of a single shared key, which
 * also stops one account's conversation leaking into another on the same browser.
 *
 * The auth layer sets the *active* user (below) before the store is used so that
 * appends and the "Clear conversation" action write to the right key.
 */
let activeAssistantUserId: string | null = null

export function setActiveAssistantUser(userId: string | null): void {
  activeAssistantUserId = userId
}

function threadKey(userId: string): string {
  return `${THREAD_PREFIX}-${userId}`
}

export function loadThread(userId: string): ThreadMessage[] {
  if (!userId) return []
  try {
    const raw = localStorage.getItem(threadKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as { thread?: unknown }
    return Array.isArray(parsed.thread) ? (parsed.thread as ThreadMessage[]) : []
  } catch {
    return []
  }
}

export function saveThread(userId: string, thread: ThreadMessage[]): void {
  if (!userId) return
  try {
    localStorage.setItem(threadKey(userId), JSON.stringify({ thread }))
  } catch {
    // storage quota / unavailable — conversation just won't persist
  }
}

export const useAssistantStore = create<AssistantState>()((set) => ({
  thread: [],
  appendUser: (content) => {
    let next: ThreadMessage[] = []
    set((state) => {
      next = [...state.thread, { role: 'user' as const, content }].slice(-MAX_THREAD)
      return { thread: next }
    })
    if (activeAssistantUserId) saveThread(activeAssistantUserId, next)
  },
  appendAssistant: (content, references, tools) => {
    let next: ThreadMessage[] = []
    set((state) => {
      next = [
        ...state.thread,
        { role: 'assistant' as const, content, references, tools },
      ].slice(-MAX_THREAD)
      return { thread: next }
    })
    if (activeAssistantUserId) saveThread(activeAssistantUserId, next)
  },
  reset: () => {
    set({ thread: [] })
    if (activeAssistantUserId) saveThread(activeAssistantUserId, [])
  },
  setThread: (thread) => set({ thread }),
}))
