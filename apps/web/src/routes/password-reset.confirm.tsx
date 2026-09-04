import { createFileRoute, redirect } from '@tanstack/react-router'

import { ConfirmResetPage } from '../features/auth/pages/ConfirmResetPage'

export const Route = createFileRoute('/password-reset/confirm')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
  beforeLoad: ({ search }) => {
    if (!search.token) throw redirect({ to: '/password-reset' })
  },
  component: ConfirmResetPage,
})