import { createFileRoute } from '@tanstack/react-router'

import { WorkspacePage } from '../features/startups/pages/WorkspacePage'

export const Route = createFileRoute('/_app/startups/')({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === 'string' && search.q.trim() ? search.q.trim() : undefined,
  }),
  component: WorkspacePage,
})
