import { Outlet } from '@tanstack/react-router'

/**
 * Shared auth shell. Login/Register each render their own split layout
 * (form column + tailored dark brand panel per scout_auth.html); this stays
 * a minimal wrapper so the paper background is consistent.
 */
export function AuthLayout() {
  return (
    <div className="min-h-screen bg-paper">
      <Outlet />
    </div>
  )
}
