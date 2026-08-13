import { usePipeline, useUpdateApplicationStatus } from '../hooks'
import { APPLICATION_STATUSES, type ApplicationStatus } from '../api'
import { ApplicationCard } from './ApplicationCard'

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

  if (pipelineQuery.isLoading) {
    return <p className="py-12 text-center text-sm text-[#6B7280]">Loading…</p>
  }
  if (pipelineQuery.isError) {
    return <p className="py-12 text-center text-sm text-[#B3261E]">Failed to load pipeline</p>
  }

  const data = pipelineQuery.data ?? {}

  const move = (applicationId: string, status: ApplicationStatus) => {
    updateStatus.mutate({ applicationId, status })
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {APPLICATION_STATUSES.filter((s) => s !== 'archived').map((status) => {
        const apps = data[status] ?? []
        return (
          <div key={status} className="flex w-72 shrink-0 flex-col rounded-xl border border-[#E5E3DC] bg-[#F6F5F0]">
            <div className="flex items-center justify-between border-b border-[#E5E3DC] px-4 py-3">
              <span className="text-sm font-medium text-[#1F2937]">{COLUMN_LABELS[status]}</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs text-[#6B7280]">{apps.length}</span>
            </div>
            <div className="flex-1 space-y-3 p-3">
              {apps.map((app) => (
                <div key={app.id}>
                  <ApplicationCard application={app} />
                  <div className="mt-1.5 flex gap-1">
                    {nextStatuses(status).map((next) => (
                      <button
                        key={next}
                        onClick={() => move(app.id, next)}
                        className="rounded-full border border-[#D6D3C9] px-2 py-0.5 text-[10px] text-[#6B7280] hover:border-[#1F2937] hover:text-[#1F2937]"
                      >
                        {next}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {apps.length === 0 ? (
                <p className="py-6 text-center text-xs text-[#9AA1AB]">Empty</p>
              ) : null}
            </div>
          </div>
        )
      })}
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
