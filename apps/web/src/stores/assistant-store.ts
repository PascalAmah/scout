import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

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
}

/**
 * Local UI state for the Assistant chat thread. Lives in a store (rather than
 * component state) so the conversation survives navigating away from /assistant
 * and back. Server data (the API call itself) stays in TanStack Query.
 */
/**
 * Local UI state for the Assistant chat thread. Persisted to localStorage so
 * the conversation survives full page reloads (not just SPA navigation).
 * Server data (the API call itself) stays in TanStack Query.
 */
export const useAssistantStore = create<AssistantState>()(
  persist(
    (set) => ({
      thread: [],
      appendUser: (content) =>
        set((state) => ({
          thread: [...state.thread, { role: 'user' as const, content }].slice(-200),
        })),
      appendAssistant: (content, references, tools) =>
        set((state) => ({
          thread: [...state.thread, { role: 'assistant' as const, content, references, tools }].slice(-200),
        })),
      reset: () => set({ thread: [] }),
    }),
    {
      name: 'scout-assistant-thread',
      storage: createJSONStorage(() => localStorage),
      // Only the thread is persisted; actions come from the initial state.
      partialize: (state) => ({ thread: state.thread }),
    },
  ),
)
