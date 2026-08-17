import { createFileRoute, redirect } from '@tanstack/react-router'

import { LandingPage } from '../features/landing/pages/LandingPage'
import { tokens } from '../lib/auth'

export const Route = createFileRoute('/')({
  // The landing is public. Authenticated users skip the marketing page and
  // land straight in the workspace.
  beforeLoad: () => {
    if (tokens.access) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: LandingPage,
})
