import { createFileRoute } from '@tanstack/react-router'

import { JobsTab } from '../features/startups/pages/JobsTab'

export const Route = createFileRoute('/_app/startups/$startupId/jobs')({
  component: JobsTab,
})