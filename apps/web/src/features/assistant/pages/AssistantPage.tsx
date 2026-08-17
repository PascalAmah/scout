import { useState, type FormEvent } from 'react'

import { ApiRequestError } from '../../../lib/api-client'
import { useAssistantStore } from '../../../stores/assistant-store'
import { useAssistantChat } from '../hooks'
import { ChatThread } from '../components/ChatThread'
import type { ChatMessage } from '../api'

const SUGGESTIONS = [
  'What startups have I saved?',
  'Which saved startups are hiring?',
  "What's the status of my applications?",
  'Startups similar to ones I saved',
]

export function AssistantPage() {
  const chat = useAssistantChat()
  const thread = useAssistantStore((state) => state.thread)
  const appendUser = useAssistantStore((state) => state.appendUser)
  const appendAssistant = useAssistantStore((state) => state.appendAssistant)
  const reset = useAssistantStore((state) => state.reset)
  const [input, setInput] = useState('')

  const submit = async (text?: string) => {
    const message = (text ?? input).trim()
    if (!message || chat.isPending) return
    setInput('')
    const history: ChatMessage[] = thread.map(({ role, content }) => ({ role, content }))
    appendUser(message)
    try {
      const res = await chat.mutateAsync({ message, history })
      appendAssistant(res.answer, res.references, res.tools)
    } catch (err) {
      appendAssistant(
        err instanceof ApiRequestError
          ? err.message
          : 'Something went wrong. If this is your first time, make sure an AI key is configured in the repo-root .env and the API is running.',
      )
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void submit()
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-[#1F2937]">Assistant</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Answers are grounded in your saved data only — no general web knowledge.
          </p>
        </div>
        {thread.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Clear this conversation?')) reset()
            }}
            className="rounded-full border border-[#D6D3C9] bg-white px-3 py-1.5 text-xs text-[#6B7280] hover:border-[#B3261E] hover:text-[#B3261E]"
          >
            Clear conversation
          </button>
        ) : null}
      </div>

      <ChatThread messages={thread} pending={chat.isPending} />

      {thread.length === 0 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => void submit(s)}
              disabled={chat.isPending}
              className="rounded-full border border-[#D6D3C9] bg-white px-3 py-1.5 text-xs text-[#1F2937] hover:border-[#1F2937] disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your saved startups, applications, or CV…"
          disabled={chat.isPending}
          className="flex-1 rounded-full border border-[#D6D3C9] bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#18A058] disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={chat.isPending || !input.trim()}
          className="rounded-full bg-[#1F2937] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0B0F14] disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  )
}
