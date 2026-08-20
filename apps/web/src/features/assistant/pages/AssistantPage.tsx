import { useState, type FormEvent } from 'react'

import { ApiRequestError } from '../../../lib/api-client'
import { useAssistantStore } from '../../../stores/assistant-store'
import { useSession } from '../../auth/hooks'
import { useAssistantChat } from '../hooks'
import { ChatThread } from '../components/ChatThread'
import type { ChatMessage } from '../api'

const SUGGESTIONS = [
  "What's overdue for follow-up?",
  'Startups similar to Lumina Health',
  'Summarize my week',
]

function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? '?').trim().split(/\s+/).filter(Boolean)
  return parts
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('')
}

export function AssistantPage() {
  const chat = useAssistantChat()
  const { user } = useSession()
  const thread = useAssistantStore((state) => state.thread)
  const appendUser = useAssistantStore((state) => state.appendUser)
  const appendAssistant = useAssistantStore((state) => state.appendAssistant)
  const reset = useAssistantStore((state) => state.reset)
  const [input, setInput] = useState('')

  const userInitials = initialsOf(user?.full_name || user?.email)

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
    <div className="flex h-[calc(100vh-8.5rem)] flex-col">
      <div className="mx-auto mb-2 flex w-full max-w-[760px] items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h1 className="font-serif text-[22px] font-semibold tracking-[-0.3px] text-charcoal">
            Assistant
          </h1>
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-emerald-tint px-2.5 py-1 text-[11px] font-semibold text-emerald-dark">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="h-[11px] w-[11px]">
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Scoped to your data
          </span>
        </div>
        {thread.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Clear this conversation?')) reset()
            }}
            className="rounded-pill border border-line-strong bg-white px-3 py-1.5 text-xs text-muted transition-colors hover:border-brick hover:text-brick"
          >
            Clear conversation
          </button>
        ) : null}
      </div>

      <ChatThread messages={thread} pending={chat.isPending} userInitials={userInitials} />

      <div className="border-t border-line bg-paper/95 px-1 py-4 backdrop-blur">
        <div className="mx-auto max-w-[760px]">
          <div className="mb-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void submit(s)}
                disabled={chat.isPending}
                className="rounded-pill border border-line-strong bg-white px-3.5 py-1.5 text-xs font-medium text-charcoal transition-colors hover:border-emerald disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
          <form
            onSubmit={onSubmit}
            className="flex items-center gap-2.5 rounded-pill border border-line-strong bg-white py-1.5 pl-4 pr-1.5 shadow-sm focus-within:border-emerald"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your saved startups, applications, or CV…"
              disabled={chat.isPending}
              aria-label="Ask the assistant"
              className="flex-1 bg-transparent text-[13.5px] text-charcoal outline-none placeholder:text-muted-2 disabled:opacity-50"
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={chat.isPending || !input.trim()}
              className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-emerald text-white transition-colors hover:bg-emerald-dark disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="h-4 w-4">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          </form>
          <p className="mt-2.5 text-center text-[10.5px] text-muted-2">
            Answers are grounded in your saved data only — no general web knowledge.
          </p>
        </div>
      </div>
    </div>
  )
}