import { createFileRoute } from '@tanstack/react-router'

import { IntegrationsPage } from '../features/settings/pages/IntegrationsPage'

export const Route = createFileRoute('/_app/settings/integrations')({
  component: IntegrationsPage,
})