import { Link, useNavigate } from '@tanstack/react-router'
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'

import { LensMark } from '../../../components/ui/LensMark'
import { useStartup } from '../../startups/hooks'
import type { ThreadMessage } from '../../../stores/assistant-store'
import type { AssistantReference, AssistantToolCall } from '../api'

const DRAFT_RE = /draft|follow.?up|compose|write a|email|send a/i

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('')
}

function formatTool(tool: AssistantToolCall): string {
  const args = tool.arguments
  if (!args || Object.keys(args).length === 0) return tool.name
  const parts = Object.entries(args).map(([key, value]) => {
    const text = typeof value === 'string' ? value : JSON.stringify(value)
    return `${key}: ${text}`
  })
  return `${tool.name}(${parts.join(', ')})`
}

function UserBubble({ children }: { children: ReactNode }) {
  return <div className="bubble user">{children}</div>
}

export function ChatThread({
  messages,
  pending,
  userInitials,
}: {
  messages: ThreadMessage[]
  pending: boolean
  userInitials: string
}) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, pending])

  return (
    <div className="flex-1 overflow-y-auto px-1 py-2">
      <div className="mx-auto max-w-[760px]">
        {messages.length === 0 ? (
          <AssistantRow>
            Ask me about your saved startups, applications, or CV. I only answer from what's
            actually in your workspace — if I don't find anything relevant, I'll say so instead of
            guessing.
          </AssistantRow>
        ) : null}

        {messages.map((message, index) => {
          if (message.role === 'user') {
            return (
              <div key={index} className="msg-row user">
                <div className="msg-avatar user">{userInitials}</div>
                <div className="msg-body">
                  <UserBubble>{message.content}</UserBubble>
                </div>
              </div>
            )
          }

          const prev = messages[index - 1]
          const isDraft =
            prev?.role === 'user' &&
            DRAFT_RE.test(prev.content) &&
            message.references?.some((ref) => ref.type === 'application')

          return (
            <Fragment key={index}>
              {message.tools?.length ? (
                <div className="mb-2 ml-[42px] flex items-center gap-2 text-[11px] text-muted-2">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeWidth="2"
                    className="h-3 w-3 shrink-0 stroke-muted-2"
                    aria-hidden
                  >
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                  </svg>
                  Used{' '}
                  <code className="rounded-[5px] border border-line bg-paper px-1.5 py-0.5 font-mono text-[11px] text-muted">
                    {message.tools.map(formatTool).join(', ')}
                  </code>
                </div>
              ) : null}

              <div className="msg-row">
                <div className="msg-avatar assistant">
                  <LensMark size={16} />
                </div>
                <div className="msg-body">
                  {isDraft ? (
                    <DraftCard
                      applicationId={
                        message.references!.find((ref) => ref.type === 'application')!.id
                      }
                      content={message.content}
                    />
                  ) : (
                    <div className="bubble assistant">
                      {renderMessageText(message.content)}
                      {message.references?.length ? (
                        <div className="mt-2 flex flex-col">
                          {message.references.map((ref, i) => (
                            <ReferenceCard key={`${ref.type}-${ref.id}-${i}`} reference={ref} />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </Fragment>
          )
        })}

        {pending ? (
          <div className="msg-row">
            <div className="msg-avatar assistant">
              <LensMark size={16} />
            </div>
            <div className="msg-body">
              <div className="bubble assistant">
                <span className="animate-pulse text-[13px] text-muted">Scout is looking…</span>
              </div>
            </div>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

function AssistantRow({ children }: { children: ReactNode }) {
  return (
    <div className="msg-row">
      <div className="msg-avatar assistant">
        <LensMark size={16} />
      </div>
      <div className="msg-body">
        <div className="bubble assistant">{children}</div>
      </div>
    </div>
  )
}

function DraftCard({ applicationId, content }: { applicationId: string; content: string }) {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard unavailable — leave the button inert
    }
  }

  return (
    <div className="bubble assistant">
      <div className="rounded-[14px] border border-line bg-paper px-4 py-3.5">
        <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.5px] text-muted-2">
          Draft — Email
        </p>
        <div className="mb-3 text-[12.5px] leading-relaxed text-charcoal">
          {renderMessageText(content)}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              void navigate({
                to: '/crm/applications/$applicationId',
                params: { applicationId },
              })
            }
            className="rounded-pill border border-charcoal bg-charcoal px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-near-black"
          >
            Open in Application
          </button>
          <button
            type="button"
            onClick={() => void copy()}
            className="rounded-pill border border-line-strong bg-white px-3.5 py-1.5 text-xs font-semibold text-charcoal transition-colors hover:border-charcoal"
          >
            {copied ? 'Copied' : 'Copy text'}
          </button>
        </div>
      </div>
      <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-muted-2">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="2"
          className="h-3 w-3 shrink-0 stroke-muted-2"
          aria-hidden
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5M12 16h.01" />
        </svg>
        I can draft this, but sending it happens from the Application page — I don't send messages
        on my own.
      </div>
    </div>
  )
}

function ReferenceCard({ reference }: { reference: AssistantReference }) {
  const inner = (
    <>
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-charcoal text-[10px] font-bold text-white">
        {initialsOf(reference.name)}
      </div>
      <div className="min-w-0">
        <b className="block truncate text-[12.5px] text-charcoal">{reference.name}</b>
        {reference.type === 'startup' ? <StartupRefSub startupId={reference.id} /> : null}
      </div>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth="2"
        className="ml-auto h-3 w-3 shrink-0 stroke-muted-2"
        aria-hidden
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </>
  )

  const className =
    'ref-card flex items-center gap-2.5 rounded-[14px] border border-line bg-paper px-3 py-2.5 transition-colors hover:border-emerald'

  if (reference.type === 'startup') {
    return (
      <Link
        to="/startups/$startupId"
        params={{ startupId: reference.id }}
        className={`${className} mt-2`}
      >
        {inner}
      </Link>
    )
  }
  if (reference.type === 'application') {
    return (
      <Link
        to="/crm/applications/$applicationId"
        params={{ applicationId: reference.id }}
        className={`${className} mt-2`}
      >
        {inner}
      </Link>
    )
  }
  return <div className={`${className} mt-2`}>{inner}</div>
}

/** Grounded sub-line for startup references: the enriched stage, when known. */
function StartupRefSub({ startupId }: { startupId: string }) {
  const startupQuery = useStartup(startupId)
  const stage = startupQuery.data?.stage
  if (!stage) return null
  return <span className="block text-[11px] text-muted">{stage}</span>
}

/**
 * Lightweight inline markdown: the model emphasizes names with `**bold**`,
 * `` `code` ``, or `*italic*`. Render those as styled spans instead of showing
 * raw markers. Everything else stays literal text — no HTML is ever injected.
 */
function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const token = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g
  let last = 0
  let key = 0
  let match: RegExpExecArray | null
  while ((match = token.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index))
    const tok = match[0]
    if (tok.startsWith('**')) {
      nodes.push(
        <strong key={key++} className="font-semibold">
          {tok.slice(2, -2)}
        </strong>,
      )
    } else if (tok.startsWith('`')) {
      nodes.push(
        <code key={key++} className="rounded bg-[#F3F1EA] px-1 py-0.5 font-mono text-[0.85em] text-charcoal">
          {tok.slice(1, -1)}
        </code>,
      )
    } else {
      nodes.push(<em key={key++}>{tok.slice(1, -1)}</em>)
    }
    last = match.index + tok.length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

/** Render an assistant message: line breaks + inline emphasis. */
function renderMessageText(text: string): ReactNode {
  const lines = text.split('\n')
  return lines.map((line, i) => (
    <Fragment key={i}>
      {i > 0 ? <br /> : null}
      {renderInline(line)}
    </Fragment>
  ))
}