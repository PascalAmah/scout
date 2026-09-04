import { Link } from '@tanstack/react-router'

import { Button } from '../../../components/ui/Button'
import { KanbanBoard } from '../components/KanbanBoard'
import { usePipeline } from '../hooks'

export function PipelinePage() {
  const pipelineQuery = usePipeline()
  const data = pipelineQuery.data ?? {}
  const total = Object.values(data).reduce((sum, apps) => sum + apps.length, 0)

  return (
    <div>
      <div className="mb-[6px] flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-[28px] font-semibold tracking-[-0.4px] text-charcoal">
          Pipeline
        </h1>
        <Link to="/startups" search={{ q: undefined }}>
          <Button variant="accent" className="px-[18px] py-[10px] text-[13.5px]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-[14px] w-[14px]"
              aria-hidden
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            New application
          </Button>
        </Link>
      </div>
      <p className="mb-[22px] text-[13px] text-muted">
        {pipelineQuery.isLoading
          ? 'Loading your pipeline…'
          : `${total} ${total === 1 ? 'application' : 'applications'} across 7 stages.`}
      </p>

      <div className="mb-5 flex items-center gap-[7px] text-[11.5px] text-muted-2">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="2"
          className="h-[13px] w-[13px] shrink-0 stroke-muted-2"
          aria-hidden
        >
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M9 9h6v6H9z" />
        </svg>
        Status changes through the dropdown on each card — drag-and-drop isn't required to move
        anything here.
      </div>

      <KanbanBoard />
    </div>
  )
}