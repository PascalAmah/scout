import { createFileRoute } from '@tanstack/react-router'

import { FoundersTab } from '../features/startups/pages/FoundersTab'

export const Route = createFileRoute('/_app/startups/$startupId/founders')({
  component: FoundersTab,
})