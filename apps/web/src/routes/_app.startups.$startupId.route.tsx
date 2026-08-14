import { createFileRoute } from '@tanstack/react-router'

import { StartupDetailLayout } from '../features/startups/pages/StartupDetailLayout'

export const Route = createFileRoute('/_app/startups/$startupId')({
  component: StartupDetailLayout,
})