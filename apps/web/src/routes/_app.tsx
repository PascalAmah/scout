import { Link, Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

import { Button } from '../components/ui/Button'
import { useAuth } from '../features/auth/hooks'
import { useUnreadCount } from '../features/notifications/hooks'
import { NotificationFeed } from '../features/notifications/components/NotificationFeed'
import { tokens } from '../lib/auth'

export const Route = createFileRoute('/_app')({
  beforeLoad: () => {
    if (!tokens.access) throw redirect({ to: '/login' })
  },
  component: AppLayout,
})

const NAV_ITEMS: Array<{ label: string; href?: string }> = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Workspace', href: '/startups' },
  { label: 'Matches' },
  { label: 'Resume Studio' },
  { label: 'Pipeline', href: '/crm' },
  { label: 'Analytics' },
  { label: 'Assistant' },
]

function AppLayout() {
  const { user, isLoading, logout } = useAuth()
  const unreadQuery = useUnreadCount()
  const [feedOpen, setFeedOpen] = useState(false)
  const feedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!feedOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (feedRef.current && !feedRef.current.contains(e.target as Node)) setFeedOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [feedOpen])

  if (isLoading) {
    return <div className="p-8 text-sm text-[#6B7280]">Loading…</div>
  }

  const unread = unreadQuery.data?.count ?? 0

  return (
    <div className="flex min-h-screen bg-[#FAFAF8]">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-[#E5E3DC] bg-white md:flex">
        <div className="px-6 py-5 font-serif text-lg font-semibold text-[#1F2937]">Scout</div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map((item) =>
            item.href ? (
              <Link
                key={item.label}
                to={item.href}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-[#6B7280] hover:bg-[#F6F5F0] hover:text-[#1F2937] [&.active]:bg-[#1F2937] [&.active]:text-white"
              >
                {item.label}
              </Link>
            ) : (
              <span key={item.label} className="block cursor-not-allowed px-3 py-2 text-sm text-[#9AA1AB]">
                {item.label}
              </span>
            ),
          )}
        </nav>
        <div className="border-t border-[#E5E3DC] p-4">
          <p className="truncate text-sm font-medium text-[#1F2937]">{user?.email}</p>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[#E5E3DC] px-8 py-4">
          <div className="font-serif text-lg font-semibold text-[#1F2937] md:hidden">Scout</div>
          <div className="hidden text-sm text-[#6B7280] md:block">Welcome, {user?.full_name || user?.email}</div>
          <div className="flex items-center gap-3">
            <div className="relative" ref={feedRef}>
              <button
                aria-label="Notifications"
                onClick={() => setFeedOpen((open) => !open)}
                className="relative rounded-full border border-[#D6D3C9] px-3 py-2 text-sm text-[#1F2937] hover:border-[#1F2937]"
              >
                <span aria-hidden>🔔</span>
                {unread > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#18A058] px-1 text-[10px] font-semibold text-white">
                    {unread > 9 ? '9+' : unread}
                  </span>
                ) : null}
              </button>
              {feedOpen ? (
                <div className="absolute right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-[#E5E3DC] bg-white shadow-lg">
                  <NotificationFeed onNavigate={() => setFeedOpen(false)} />
                </div>
              ) : null}
            </div>
            <Button
              variant="ghost"
              onClick={() => void logout().then(() => window.location.assign('/login'))}
            >
              Sign out
            </Button>
          </div>
        </header>
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
