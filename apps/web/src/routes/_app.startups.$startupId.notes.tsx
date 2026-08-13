import { createFileRoute } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { api } from '../lib/api-client'
import { useStartup } from '../features/startups/hooks'
import type { NoteOut } from '../features/startups/api'

export const Route = createFileRoute('/_app/startups/$startupId/notes')({
  component: NotesTab,
})

function NotesTab() {
  const { startupId } = Route.useParams()
  const startupQuery = useStartup(startupId)
  const queryClient = useQueryClient()
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)

  const startup = startupQuery.data
  if (!startup) return null

  const add = async () => {
    if (!body.trim() || saving) return
    setSaving(true)
    try {
      await api<NoteOut>(`/startups/${startupId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ body: body.trim() }),
      })
      setBody('')
      void queryClient.invalidateQueries({ queryKey: ['startups', startupId] })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        {startup.notes.length === 0 ? (
          <EmptyState title="No notes" description="Capture reminders, follow-ups, and impressions about this startup." />
        ) : (
          <ul className="space-y-3">
            {startup.notes.map((note) => (
              <li key={note.id} className="rounded-xl border border-[#E5E3DC] bg-white p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#4B5563]">{note.body}</p>
                <p className="mt-2 text-xs text-[#9AA1AB]">{new Date(note.created_at).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="rounded-xl border border-[#E5E3DC] bg-white p-5 lg:self-start">
        <h2 className="font-serif text-lg font-semibold text-[#1F2937]">Add a note</h2>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          placeholder="Research notes, next steps…"
          className="mt-3 w-full rounded-lg border border-[#D6D3C9] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#18A058]"
        />
        <Button className="mt-3 w-full" loading={saving} disabled={!body.trim()} onClick={() => void add()}>
          Save note
        </Button>
      </div>
    </div>
  )
}