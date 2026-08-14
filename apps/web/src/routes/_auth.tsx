import { createFileRoute, redirect } from '@tanstack/react-router'

import { AuthLayout } from '../features/auth/pages/AuthLayout'
import { tokens } from '../lib/auth'

export const Route = createFileRoute('/_auth')({
  beforeLoad: () => {
    if (tokens.access) throw redirect({ to: '/dashboard' })
  },
  component: AuthLayout,
})