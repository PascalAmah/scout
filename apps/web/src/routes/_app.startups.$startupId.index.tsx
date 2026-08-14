import { createFileRoute } from '@tanstack/react-router'

import { StartupOverviewTab } from '../features/startups/pages/StartupOverviewTab'

export const Route = createFileRoute('/_app/startups/$startupId/')({
  component: StartupOverviewTab,
})