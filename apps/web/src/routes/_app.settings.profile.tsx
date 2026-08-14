import { createFileRoute } from '@tanstack/react-router'

import { ProfilePage } from '../features/settings/pages/ProfilePage'

export const Route = createFileRoute('/_app/settings/profile')({
  component: ProfilePage,
})