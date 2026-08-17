import type {
  AssistantChatRequest,
  AssistantChatResponse,
  AssistantReference,
  AssistantToolCall as AssistantToolCallShared,
} from '@scout/types'

import { api } from '../../lib/api-client'

export type AssistantToolCall = AssistantToolCallShared
export type { AssistantReference }

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export function assistantChatRequest(
  body: { message: string; history: ChatMessage[] },
): Promise<AssistantChatResponse> {
  const payload: AssistantChatRequest = {
    message: body.message,
    history: body.history.map((m) => ({ role: m.role, content: m.content })),
  }
  return api('/assistant/chat', { method: 'POST', body: JSON.stringify(payload) })
}
