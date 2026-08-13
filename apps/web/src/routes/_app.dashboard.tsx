import { createFileRoute } from '@tanstack/react-router'

import { useSession } from '../features/auth/hooks'

export const Route = createFileRoute('/_app/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  const { user } = useSession()

  return (
    <>
      <h1 className="font-serif text-2xl font-semibold text-[#1F2937]">
        Welcome{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}
      </h1>
      <p className="mt-1 text-sm text-[#6B7280]">
        Browse your Workspace or Pipeline, or use the extension to save startups while you browse
        Y Combinator or company careers pages.
      </p>
    </>
  )
}