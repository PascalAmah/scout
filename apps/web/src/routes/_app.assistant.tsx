import { createFileRoute } from '@tanstack/react-router'

import { AssistantPage } from '../features/assistant/pages/AssistantPage'

export const Route = createFileRoute('/_app/assistant')({
  component: AssistantPage,
})
