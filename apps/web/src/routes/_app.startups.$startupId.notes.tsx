import { createFileRoute } from '@tanstack/react-router'

import { NotesTab } from '../features/startups/pages/NotesTab'

export const Route = createFileRoute('/_app/startups/$startupId/notes')({
  component: NotesTab,
})