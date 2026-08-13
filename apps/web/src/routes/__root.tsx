import { Outlet, createRootRoute } from '@tanstack/react-router'

import { AuthProvider } from '../features/auth/hooks'

export const Route = createRootRoute({
  component: Root,
})

function Root() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  )
}