import { KanbanBoard } from '../components/KanbanBoard'

export function PipelinePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-[#1F2937]">Pipeline</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Track your applications from saved to offer. Drag cards between columns, or select
          multiple to tag and archive them in bulk.
        </p>
      </div>
      <KanbanBoard />
    </div>
  )
}