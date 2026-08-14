import { createFileRoute, redirect } from '@tanstack/react-router'

import { AppLayout } from '../features/shell/pages/AppLayout'
import { tokens } from '../lib/auth'

export const Route = createFileRoute('/_app')({
  beforeLoad: () => {
    if (!tokens.access) throw redirect({ to: '/login' })
  },
  component: AppLayout,
})