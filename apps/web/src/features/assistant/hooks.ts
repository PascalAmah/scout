import { useMutation } from '@tanstack/react-query'

import { assistantChatRequest, type ChatMessage } from './api'

export function useAssistantChat() {
  return useMutation({
    mutationFn: ({ message, history }: { message: string; history: ChatMessage[] }) =>
      assistantChatRequest({ message, history }),
  })
}
