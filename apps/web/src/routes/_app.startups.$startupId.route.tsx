import { createFileRoute, Link, Outlet } from '@tanstack/react-router'

import { useStartup } from '../features/startups/hooks'
import { EnrichmentBadge, HiringBadge, StageBadge, WorkspaceStatusBadge } from '../features/startups/components/StatusBadge'

export const Route = createFileRoute('/_app/startups/$startupId')({
  component: StartupDetailLayout,
})

const TABS = [
  { label: 'Overview', to: '/startups/$startupId', exact: true },
  { label: 'Founders', to: '/startups/$startupId/founders' },
  { label: 'Jobs', to: '/startups/$startupId/jobs' },
  { label: 'Notes', to: '/startups/$startupId/notes' },
]

function StartupDetailLayout() {
  const { startupId } = Route.useParams()
  const startupQuery = useStartup(startupId)
  const startup = startupQuery.data

  return (
    <div>
      {!startup ? (
        <p className="py-12 text-center text-sm text-[#6B7280]">
          {startupQuery.isLoading ? 'Loading…' : 'Not found'}
        </p>
      ) : (
        <>
          <div className="mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <Link to="/startups" className="text-sm text-[#6B7280] hover:text-[#1F2937]">
                  ← Workspace
                </Link>
                <h1 className="mt-1 font-serif text-2xl font-semibold text-[#1F2937]">{startup.name}</h1>
              </div>
              <div className="flex items-center gap-2">
                <WorkspaceStatusBadge status={startup.status} />
                <EnrichmentBadge status={startup.enrichment_status} />
                <StageBadge stage={startup.stage} />
                <HiringBadge hiringStatus={startup.hiring_status} />
              </div>
            </div>
            <nav className="mt-4 flex gap-6 border-b border-[#E5E3DC]">
              {TABS.map((tab) => (
                <Link
                  key={tab.label}
                  to={tab.to}
                  params={{ startupId }}
                  activeOptions={{ exact: tab.exact ?? false }}
                  className="border-b-2 border-transparent pb-2 text-sm font-medium text-[#6B7280] hover:text-[#1F2937] [&.active]:border-[#18A058] [&.active]:text-[#1F2937]"
                >
                  {tab.label}
                </Link>
              ))}
            </nav>
          </div>
          <Outlet />
        </>
      )}
    </div>
  )
}