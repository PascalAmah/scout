import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { api } from '../lib/api-client'
import { useQueryClient } from '@tanstack/react-query'
import { useStartup } from '../features/startups/hooks'
import type { FounderOut } from '../features/startups/api'

export const Route = createFileRoute('/_app/startups/$startupId/founders')({
  component: FoundersTab,
})

function FoundersTab() {
  const { startupId } = Route.useParams()
  const startupQuery = useStartup(startupId)
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)

  const startup = startupQuery.data
  if (!startup) return null

  const add = async () => {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      await api<FounderOut>(`/startups/${startupId}/founders`, {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), title: title.trim() || null }),
      })
      setName('')
      setTitle('')
      void queryClient.invalidateQueries({ queryKey: ['startups', startupId] })
    } finally {
      setSaving(false)
    }
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
        <Button onClick={() => void add()} loading={saving} disabled={!name.trim()}>
          Add founder
        </Button>
      </div>

      {startup.founders.length === 0 ? (
        <EmptyState title="No founders" description="Add the people building this startup." />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {startup.founders.map((founder) => (
            <li key={founder.id} className="rounded-xl border border-[#E5E3DC] bg-white p-4">
              <p className="text-sm font-medium text-[#1F2937]">{founder.name}</p>
              {founder.title ? <p className="text-xs text-[#6B7280]">{founder.title}</p> : null}
              {founder.bio ? <p className="mt-2 text-xs leading-relaxed text-[#4B5563]">{founder.bio}</p> : null}
              {(founder.linkedin_url ?? founder.twitter_url) ? (
                <p className="mt-2 text-xs text-[#18A058]">
                  {founder.linkedin_url ? (
                    <a href={founder.linkedin_url} target="_blank" rel="noreferrer" className="hover:underline">LinkedIn</a>
                  ) : null}
                  {founder.linkedin_url && founder.twitter_url ? ' · ' : null}
                  {founder.twitter_url ? (
                    <a href={founder.twitter_url} target="_blank" rel="noreferrer" className="hover:underline">Twitter</a>
                  ) : null}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}