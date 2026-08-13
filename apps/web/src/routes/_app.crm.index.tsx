import { createFileRoute } from '@tanstack/react-router'

import { KanbanBoard } from '../features/crm/components/KanbanBoard'

export const Route = createFileRoute('/_app/crm/')({
  component: PipelinePage,
})

function PipelinePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-[#1F2937]">Pipeline</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Track your applications from saved to offer. Move cards using the buttons beneath them.
        </p>
      </div>
      <KanbanBoard />
    </div>
  )
}