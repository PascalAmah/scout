import { createFileRoute, redirect } from '@tanstack/react-router'

import { OnboardingPage } from '../features/onboarding/pages/OnboardingPage'
import { tokens } from '../lib/auth'

export const Route = createFileRoute('/onboarding')({
  beforeLoad: () => {
    if (!tokens.access) throw redirect({ to: '/login' })
  },
  component: OnboardingPage,
})
