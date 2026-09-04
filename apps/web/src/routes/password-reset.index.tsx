import { createFileRoute } from '@tanstack/react-router'

import { ResetPasswordPage } from '../features/auth/pages/ResetPasswordPage'

export const Route = createFileRoute('/password-reset/')({
  component: ResetPasswordPage,
})