import { createFileRoute } from '@tanstack/react-router'

import { AccountPage } from '../features/settings/pages/AccountPage'

export const Route = createFileRoute('/_app/settings/account')({
  component: AccountPage,
})