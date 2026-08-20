import { createFileRoute } from '@tanstack/react-router'

import { JobsTab } from '../features/startups/pages/JobsTab'

export const Route = createFileRoute('/_app/startups/$startupId/jobs')({
  validateSearch: (search: Record<string, unknown>) => ({
    focus:
      typeof search.focus === 'string' && search.focus.trim()
        ? search.focus.trim()
        : undefined,
  }),
  component: JobsTab,
})