import { useState, type DragEvent } from 'react'

import { useBulkApplications, usePipeline, useUpdateApplicationStatus } from '../hooks'
import { APPLICATION_STATUSES, type ApplicationStatus } from '../api'
import { ApplicationCard } from './ApplicationCard'
import { Button } from '../../../components/ui/Button'

const COLUMN_LABELS: Record<ApplicationStatus, string> = {
  saved: 'Saved',
  interested: 'Interested',
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
  archived: 'Archived',
}

export function KanbanBoard() {
  const pipelineQuery = usePipeline()
  const updateStatus = useUpdateApplicationStatus()
  const bulk = useBulkApplications()

  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [dragOver, setDragOver] = useState<ApplicationStatus | null>(null)
  const [tagText, setTagText] = useState('')

  if (pipelineQuery.isLoading) {
    return <p className="py-12 text-center text-sm text-[#6B7280]">Loading…</p>
  }
  if (pipelineQuery.isError) {
    return <p className="py-12 text-center text-sm text-[#B3261E]">Failed to load pipeline</p>
  }

  const data = pipelineQuery.data ?? {}

  const toggleSelectMode = () => {
    setSelectMode((on) => !on)
    setSelected(new Set())
    setTagText('')
  }

  const toggleSelected = (applicationId: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(applicationId)) next.delete(applicationId)
      else next.add(applicationId)
      return next
    })
  }

  const onCardDragStart = (e: DragEvent, applicationId: string) => {
    e.dataTransfer.setData('text/application-id', applicationId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDrop = (e: DragEvent, status: ApplicationStatus) => {
    e.preventDefault()
    setDragOver(null)
    const applicationId = e.dataTransfer.getData('text/application-id')
    if (!applicationId) return
    updateStatus.mutate({ applicationId, status })
  }

  const bulkArchive = () => {
    if (selected.size === 0) return
    bulk.mutate({ application_ids: [...selected], status: 'archived' })
    setSelected(new Set())
    setTagText('')
  }

  const bulkTag = () => {
    const tag = tagText.trim()
    if (selected.size === 0 || !tag) return
    bulk.mutate({ application_ids: [...selected], tags: [tag] })
    setTagText('')
  }

  return (
    <div>
      {/* Toolbar: select mode + bulk actions */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button
          variant={selectMode ? 'primary' : 'ghost'}
          onClick={toggleSelectMode}
        >
          {selectMode ? 'Done selecting' : 'Select'}
        </Button>
        {selectMode ? (
          <span className="text-sm text-[#6B7280]">
            {selected.size} {selected.size === 1 ? 'application' : 'applications'} selected
          </span>
        ) : null}
        {selectMode && selected.size > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={tagText}
              onChange={(e) => setTagText(e.target.value)}
              placeholder="Tag (e.g. follow-up)"
              className="w-44 rounded-lg border border-[#D6D3C9] px-3 py-1.5 text-sm outline-none focus:border-[#1F2937]"
            />
            <Button variant="ghost" onClick={bulkTag} disabled={!tagText.trim()}>
              Tag
            </Button>
            <Button variant="ghost" onClick={bulkArchive} loading={bulk.isPending}>
              Archive
            </Button>
            <Button variant="ghost" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {APPLICATION_STATUSES.filter((s) => s !== 'archived').map((status) => {
          const apps = data[status] ?? []
          const isOver = dragOver === status
          return (
            <div
              key={status}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(status)
              }}
              onDragLeave={() => setDragOver((cur) => (cur === status ? null : cur))}
              onDrop={(e) => onDrop(e, status)}
              className={`flex w-72 shrink-0 flex-col rounded-xl border bg-[#F6F5F0] transition-colors ${
                isOver ? 'border-[#18A058] ring-2 ring-[#18A058]/30' : 'border-[#E5E3DC]'
              }`}
            >
              <div className="flex items-center justify-between border-b border-[#E5E3DC] px-4 py-3">
                <span className="text-sm font-medium text-[#1F2937]">{COLUMN_LABELS[status]}</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs text-[#6B7280]">
                  {apps.length}
                </span>
              </div>
              <div className="flex-1 space-y-3 p-3">
                {apps.map((app) => (
                  <div key={app.id}>
                    <ApplicationCard
                      application={app}
                      selectMode={selectMode}
                      selected={selected.has(app.id)}
                      onToggleSelect={() => toggleSelected(app.id)}
                      onDragStart={(e) => onCardDragStart(e, app.id)}
                    />
                    {!selectMode ? (
                      <div className="mt-1.5 flex gap-1">
                        {nextStatuses(status).map((next) => (
                          <button
                            key={next}
                            onClick={() => updateStatus.mutate({ applicationId: app.id, status: next })}
                            className="rounded-full border border-[#D6D3C9] px-2 py-0.5 text-[10px] text-[#6B7280] hover:border-[#1F2937] hover:text-[#1F2937]"
                          >
                            {next}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
                {apps.length === 0 ? (
                  <p className="py-6 text-center text-xs text-[#9AA1AB]">
                    {isOver ? 'Drop to move here' : 'Empty'}
                  </p>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function nextStatuses(current: ApplicationStatus): ApplicationStatus[] {
  const order: ApplicationStatus[] = ['interested', 'applied', 'interview', 'offer', 'rejected']
  if (current === 'saved') return order
  const idx = order.indexOf(current)
  if (idx === -1 || idx === order.length - 1) return ['saved']
  return order.slice(idx + 1)
}
