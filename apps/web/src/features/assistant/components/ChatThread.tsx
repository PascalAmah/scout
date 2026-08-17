import { Link } from '@tanstack/react-router'
import { Fragment, useEffect, useRef, type ReactNode } from 'react'

import type { ThreadMessage } from '../../../stores/assistant-store'
import type { AssistantReference } from '../api'

export function ChatThread({
  messages,
  pending,
}: {
  messages: ThreadMessage[]
  pending: boolean
}) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, pending])

  return (
    <div className="flex-1 space-y-5 overflow-y-auto px-1 py-6">
      {messages.length === 0 ? (
        <div className="mx-auto max-w-xl rounded-xl border border-[#E5E3DC] bg-white p-5 text-sm text-[#6B7280]">
          Ask me about your saved startups, applications, or CV. I only answer from
          what's actually in your workspace — if I don't find anything relevant,
          I'll say so instead of guessing.
        </div>
      ) : null}

      {messages.map((message, index) =>
        message.role === 'user' ? (
          <div key={index} className="flex justify-end">
            <div className="max-w-[75%] rounded-2xl rounded-br-sm bg-[#1F2937] px-4 py-2.5 text-sm text-white">
              {message.content}
            </div>
          </div>
        ) : (
          <div key={index} className="flex flex-col">
            {message.tools?.length ? (
              <div className="mb-1.5 flex flex-wrap gap-1.5">
                {message.tools.map((tool, i) => (
                  <span
                    key={`${tool.name}-${i}`}
                    title={tool.result}
                    className="inline-flex items-center gap-1 rounded-full bg-[#F6F5F0] px-2.5 py-1 font-mono text-[11px] text-[#6B7280]"
                  >
                    <span className="text-[#18A058]">⚙</span>
                    {tool.name}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm border border-[#E5E3DC] bg-white px-4 py-3 text-sm leading-relaxed text-[#1F2937]">
              {renderMessageText(message.content)}
            </div>
            {message.references?.length ? (
              <div className="mt-2 flex max-w-[85%] flex-wrap gap-1.5">
                {message.references.map((ref, i) => (
                  <ReferenceChip key={`${ref.type}-${ref.id}-${i}`} reference={ref} />
                ))}
              </div>
            ) : null}
          </div>
        ),
      )}

      {pending ? (
        <div className="flex gap-2 text-sm text-[#9AA1AB]">
          <span className="animate-pulse">Scout is looking…</span>
        </div>
      ) : null}
      <div ref={bottomRef} />
    </div>
  )
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
        <code key={key++} className="rounded bg-[#F3F1EA] px-1 py-0.5 font-mono text-[0.85em] text-[#1F2937]">
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

function ReferenceChip({ reference }: { reference: AssistantReference }) {
  const label = reference.name || reference.id
  const className =
    'inline-flex items-center gap-1 rounded-full bg-[#F6F5F0] px-2.5 py-1 font-mono text-[11px] text-[#1F2937] hover:bg-[#E5E3DC]'

  if (reference.type === 'startup') {
    return (
      <Link to="/startups/$startupId" params={{ startupId: reference.id }} className={className}>
        {label}
      </Link>
    )
  }
  if (reference.type === 'application') {
    return (
      <Link
        to="/crm/applications/$applicationId"
        params={{ applicationId: reference.id }}
        className={className}
      >
        {label}
      </Link>
    )
  }
  // jobs have no standalone route — render as a plain chip
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#F6F5F0] px-2.5 py-1 font-mono text-[11px] text-[#6B7280]">
      {label}
    </span>
  )
}
