import { useNavigate } from '@tanstack/react-router'
import { useState, type ReactNode } from 'react'

import { useMarkAllRead, useMarkRead, useNotifications } from '../hooks'
import type { NotificationOut } from '../api'

type Tone = 'emerald' | 'slate' | 'amber' | 'brick'

const TONE_CLASSES: Record<Tone, string> = {
  emerald: 'bg-[#E4F3EA] text-[#0F6E56]',
  slate: 'bg-[#E8EEF6] text-[#3E5C8A]',
  amber: 'bg-[#FBF1DF] text-[#B8791A]',
  brick: 'bg-[#F6E4DF] text-[#A23B2A]',
}

const ICONS: Record<Tone, ReactNode> = {
  emerald: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  slate: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 3v5h5M6 3h8l5 5v13H6z" />
    </svg>
  ),
  amber: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  ),
  brick: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  ),
}

function metaFor(type: string): { tone: Tone; icon: ReactNode } {
  switch (type) {
    case 'new_match':
      return { tone: 'emerald', icon: ICONS.emerald }
    case 'resume_version_ready':
    case 'outreach_ready':
      return { tone: 'slate', icon: ICONS.slate }
    case 'follow_up_due':
    case 'auth_expired':
      return { tone: 'amber', icon: ICONS.amber }
    case 'application_status_change':
      return { tone: 'brick', icon: ICONS.brick }
    default:
      return { tone: 'emerald', icon: ICONS.emerald }
  }
}

function relTime(iso: string): string {
  const then = new Date(iso).getTime()
  const minutes = Math.max(0, Math.floor((Date.now() - then) / 60000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return new Date(iso).toLocaleDateString()
}

type GroupLabel = 'Today' | 'This week' | 'Earlier'

function groupOf(iso: string): GroupLabel {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfWeek = startOfToday - (now.getDay() === 0 ? 6 : now.getDay() - 1) * 86400000
  const ms = new Date(iso).getTime()
  if (ms >= startOfToday) return 'Today'
  if (ms >= startOfWeek) return 'This week'
  return 'Earlier'
}

const GROUPS: GroupLabel[] = ['Today', 'This week', 'Earlier']

function actionLabel(n: NotificationOut): { label: string; to?: string } | null {
  if (n.entity_type === 'startup' && n.entity_id) return { label: 'View startup', to: `/startups/${n.entity_id}` }
  if (n.entity_type === 'application' && n.entity_id) {
    return { label: 'View application', to: `/crm/applications/${n.entity_id}` }
  }
  return null
}

export function NotificationFeed({ onNavigate }: { onNavigate?: () => void }) {
  const notificationsQuery = useNotifications()
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'all' | 'unread'>('all')

  const items = notificationsQuery.data?.data ?? []
  const unread = items.filter((n) => !n.read_at).length
  const shown = tab === 'unread' ? items.filter((n) => !n.read_at) : items

  const open = (n: NotificationOut) => {
    if (!n.read_at) markRead.mutate(n.id)
    onNavigate?.()
    const action = actionLabel(n)
    if (action?.to) void navigate({ to: action.to })
  }

  const grouped = GROUPS.map((label) => ({
    label,
    items: shown.filter((n) => groupOf(n.created_at) === label),
  })).filter((g) => g.items.length > 0)

  if (notificationsQuery.isLoading) {
    return <p className="px-4 py-6 text-center text-sm text-[#6B7280]">Loading…</p>
  }
  if (notificationsQuery.isError) {
    return <p className="px-4 py-6 text-center text-sm text-[#B3261E]">Failed to load</p>
  }

  return (
    <div className="flex w-[400px] max-w-[90vw] flex-col overflow-hidden rounded-2xl border border-[#E5E3DC] bg-white shadow-lg">
      <div className="flex items-center gap-2.5 border-b border-[#E5E3DC] px-4.5 py-4">
        <h2 className="m-0 text-[15px] font-semibold text-[#1F2937]">Notifications</h2>
        {unread > 0 ? (
          <span className="rounded-full bg-[#E4F3EA] px-2 py-0.5 font-mono text-[11px] font-medium text-[#0F6E56]">
            {unread} new
          </span>
        ) : null}
        {unread > 0 ? (
          <button onClick={() => markAllRead.mutate()} className="ml-auto text-[11.5px] font-semibold text-[#6B7280] hover:text-[#1F2937]">
            Mark all read
          </button>
        ) : null}
      </div>

      <div className="flex gap-1 px-4.5 pt-2.5">
        {(['all', 'unread'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              tab === t ? 'bg-[#1F2937] text-white' : 'text-[#6B7280] hover:text-[#1F2937]'
            }`}
          >
            {t === 'all' ? 'All' : 'Unread'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {grouped.length === 0 ? (
          <p className="px-4.5 py-8 text-center text-[11.5px] text-[#9CA3AF]">
            {tab === 'unread' ? "You're all caught up" : 'No notifications yet'}
          </p>
        ) : (
          grouped.map((group) => (
            <div key={group.label}>
              <p className="px-4.5 pb-1.5 pt-3.5 text-[10.5px] font-bold uppercase tracking-wide text-[#9CA3AF]">
                {group.label}
              </p>
              {group.items.map((n) => {
                const { tone, icon } = metaFor(n.type)
                const action = actionLabel(n)
                return (
                  <div
                    key={n.id}
                    onClick={() => open(n)}
                    className={`relative flex cursor-pointer gap-2.5 border-b border-[#E5E3DC] px-4.5 py-3 last:border-b-0 hover:bg-[#FAFAF8] ${
                      n.read_at ? '' : 'bg-gradient-to-r from-[#E4F3EA] via-[rgba(228,243,234,0.4)] to-transparent'
                    }`}
                  >
                    {!n.read_at ? (
                      <span className="absolute left-1.5 top-5 h-1.5 w-1.5 rounded-full bg-[#18A058]" />
                    ) : null}
                    <div className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] ${TONE_CLASSES[tone]}`}>
                      {icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="m-0 text-[12.5px] leading-snug text-[#1F2937]">{n.title}</p>
                      {n.body ? <p className="m-0 mt-0.5 text-[12.5px] leading-snug text-[#6B7280]">{n.body}</p> : null}
                      <span className="mt-0.5 block text-[11px] text-[#9CA3AF]">{relTime(n.created_at)}</span>
                      {action ? (
                        <div className="mt-2 flex gap-1.5">
                          <button className="rounded-full bg-[#1F2937] px-2.5 py-1 text-[11px] font-semibold text-white">
                            {action.label}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>

      <div className="border-t border-[#E5E3DC] py-3 text-center">
        <a
          href="/dashboard"
          onClick={(e) => {
            e.preventDefault()
            onNavigate?.()
          }}
          className="text-xs font-semibold text-[#0F6E56] hover:underline"
        >
          View all notifications
        </a>
      </div>
    </div>
  )
}
