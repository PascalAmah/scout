import { createFileRoute } from '@tanstack/react-router'

import { ApplicationDetailPage } from '../features/crm/pages/ApplicationDetailPage'

export const Route = createFileRoute('/_app/crm/applications/$applicationId')({
  component: ApplicationDetailPage,
})