import { createFileRoute } from '@tanstack/react-router'

import { MatchesPage } from '../features/matches/pages/MatchesPage'

export const Route = createFileRoute('/_app/matches')({
  component: MatchesPage,
})