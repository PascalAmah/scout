import { createFileRoute } from '@tanstack/react-router'

import { WorkspacePage } from '../features/startups/pages/WorkspacePage'

export const Route = createFileRoute('/_app/startups/')({
  component: WorkspacePage,
})