import { useParams } from '@tanstack/react-router'
import { useState } from 'react'

import { Button } from '../../../components/ui/Button'
import { EmptyState } from '../../../components/ui/EmptyState'
import { useAddFounder, useStartup } from '../hooks'

export function FoundersTab() {
  const { startupId } = useParams({ from: '/_app/startups/$startupId/founders' })
  const startupQuery = useStartup(startupId)
  const addFounder = useAddFounder()
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')

  const startup = startupQuery.data
  if (!startup) return null

  const add = async () => {
    if (!name.trim() || addFounder.isPending) return
    await addFounder.mutateAsync({ startupId, body: { name: name.trim(), title: title.trim() || null } })
    setName('')
    setTitle('')
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-[#6B7280]">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void add()}
            className="w-56 rounded-lg border border-[#D6D3C9] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#18A058]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#6B7280]">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void add()}
            className="w-56 rounded-lg border border-[#D6D3C9] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#18A058]"
          />
        </div>
        <Button onClick={() => void add()} loading={addFounder.isPending} disabled={!name.trim()}>
          Add founder
        </Button>
      </div>

      {startup.founders.length === 0 ? (
        <EmptyState title="No founders" description="Add the people building this startup." />
      ) : (
        <ul className="divide-y divide-[#F0EEE7] overflow-hidden rounded-[16px] border border-line bg-white">
          {startup.founders.map((founder) => (
            <li key={founder.id} className="flex gap-4 px-6 py-[22px]">
              <div
                aria-hidden
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-slate text-[15px] font-bold text-white"
              >
                {initialsOf(founder.name)}
              </div>
              <div className="min-w-0">
                <p className="text-[14.5px] font-semibold text-charcoal">{founder.name}</p>
                {founder.title ? <p className="mb-2.5 block text-xs text-muted">{founder.title}</p> : null}
                {founder.bio ? (
                  <p className="mb-3 text-[13px] leading-[1.6] text-charcoal">{founder.bio}</p>
                ) : null}
                <div className="flex gap-4">
                  {founder.linkedin_url ? (
                    <a
                      href={founder.linkedin_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-dark hover:underline"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[13px] w-[13px]" aria-hidden>
                        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
                        <rect x="2" y="9" width="4" height="12" />
                        <circle cx="4" cy="4" r="2" />
                      </svg>
                      LinkedIn
                    </a>
                  ) : null}
                  {founder.twitter_url ? (
                    <a
                      href={founder.twitter_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-dark hover:underline"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[13px] w-[13px]" aria-hidden>
                        <path d="M22 4s-.7 2-2 3c1.6 10-9 15.5-17 10.5 3.5.2 6-.9 8-3-4-.7-6-3.5-6.5-6 1 .3 2 .2 2.5 0-4-1.2-5-5-4.5-7.5 1.3 1.5 3 2.4 5.5 2.5-1-3 2-6 5-4 1.3 0 2.3-.6 3-1.3-.2 1-1 2-1.8 2.7 1 0 2-.3 2.8-.9z" />
                      </svg>
                      X / Twitter
                    </a>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase()
}