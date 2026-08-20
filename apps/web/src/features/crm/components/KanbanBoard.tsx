import { useState, type DragEvent } from 'react'

import { useBulkApplications, usePipeline, useUpdateApplicationStatus } from '../hooks'
import type { ApplicationStatus } from '../api'
import { ApplicationCard } from './ApplicationCard'
import { Button } from '../../../components/ui/Button'

const COLUMNS: { status: ApplicationStatus; label: string; dot: string; empty: string }[] = [
  { status: 'saved', label: 'Saved', dot: '#9CA3AF', empty: 'No saved startups yet' },
  { status: 'interested', label: 'Interested', dot: '#B8791A', empty: 'Nothing marked interested' },
  { status: 'applied', label: 'Applied', dot: '#3E5C8A', empty: 'No applications sent yet' },
  { status: 'interview', label: 'Interview', dot: '#0F6E56', empty: 'No interviews scheduled' },
  { status: 'offer', label: 'Offer', dot: '#18A058', empty: 'No offers yet' },
  { status: 'rejected', label: 'Rejected', dot: '#A23B2A', empty: 'Nothing rejected' },
  {
    status: 'archived',
    label: 'Archived',
    dot: '#9CA3AF',
    empty: 'Nothing archived yet — reachable from any stage',
  },
]

export function KanbanBoard() {
  const pipelineQuery = usePipeline()
  const updateStatus = useUpdateApplicationStatus()
  const bulk = useBulkApplications()

  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [dragOver, setDragOver] = useState<ApplicationStatus | null>(null)
  const [tagText, setTagText] = useState('')

  if (pipelineQuery.isLoading) {
    return <p className="py-12 text-center text-sm text-muted">Loading…</p>
  }
  if (pipelineQuery.isError) {
    return <p className="py-12 text-center text-sm text-brick">Failed to load pipeline</p>
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
      {/* Bulk toolbar (select mode) */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button variant={selectMode ? 'primary' : 'ghost'} onClick={toggleSelectMode}>
          {selectMode ? 'Done selecting' : 'Select'}
        </Button>
        {selectMode ? (
          <span className="text-sm text-muted">
            {selected.size} {selected.size === 1 ? 'application' : 'applications'} selected
          </span>
        ) : null}
        {selectMode && selected.size > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={tagText}
              onChange={(e) => setTagText(e.target.value)}
              placeholder="Tag (e.g. follow-up)"
              className="w-44 rounded-lg border border-line-strong px-3 py-1.5 text-sm outline-none focus:border-charcoal"
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

      <div className="flex items-start gap-[14px] overflow-x-auto pb-4">
        {COLUMNS.map(({ status, label, dot, empty }) => {
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
              className={`flex w-[262px] min-h-[120px] shrink-0 flex-col rounded-[14px] p-3 transition-colors ${
                isOver ? 'bg-[#E9E6DD] ring-2 ring-emerald/40' : 'bg-[#F1EFE9]'
              }`}
            >
              <div className="flex items-center justify-between px-[6px] pb-3">
                <div className="flex items-center gap-[7px]">
                  <span
                    className="h-[7px] w-[7px] shrink-0 rounded-full"
                    style={{ background: dot }}
                  />
                  <span className="text-[12.5px] font-bold text-charcoal">{label}</span>
                </div>
                <span className="rounded-pill border border-line bg-white px-[7px] py-[1px] font-mono text-[11px] text-muted">
                  {apps.length}
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-[10px]">
                {apps.map((app) => (
                  <ApplicationCard
                    key={app.id}
                    application={app}
                    selectMode={selectMode}
                    selected={selected.has(app.id)}
                    onToggleSelect={() => toggleSelected(app.id)}
                    onDragStart={(e) => onCardDragStart(e, app.id)}
                    onUpdateStatus={(next) =>
                      updateStatus.mutate({ applicationId: app.id, status: next })
                    }
                  />
                ))}
                {apps.length === 0 ? (
                  <div className="rounded-[14px] border-[1.5px] border-dashed border-line-strong px-2 py-[22px] text-center text-[11.5px] text-muted-2">
                    {isOver ? 'Drop to move here' : empty}
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}