import { createFileRoute } from '@tanstack/react-router'

import { PipelinePage } from '../features/crm/pages/PipelinePage'

export const Route = createFileRoute('/_app/crm/')({
  component: PipelinePage,
})