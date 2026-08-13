import { createFileRoute, redirect } from '@tanstack/react-router'

import { tokens } from '../lib/auth'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: tokens.access ? '/dashboard' : '/login' })
  },
})