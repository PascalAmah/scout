import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import { tokens } from '../lib/auth'

export const Route = createFileRoute('/_auth')({
  beforeLoad: () => {
    if (tokens.access) throw redirect({ to: '/dashboard' })
  },
  component: AuthLayout,
})

function AuthLayout() {
  return (
    <div className="flex min-h-screen bg-[#EBE8E1]">
      <div className="hidden w-1/2 flex-col justify-between bg-[#1F2937] p-10 lg:flex">
        <div className="font-serif text-xl font-semibold text-white">Scout</div>
        <div>
          <p className="font-serif text-2xl text-white">AI-native startup job search.</p>
          <p className="mt-2 text-sm text-white/60">
            Save a startup, Scout researches it, you track it to offer.
          </p>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <Outlet />
        </div>
      </div>
    </div>
  )
}