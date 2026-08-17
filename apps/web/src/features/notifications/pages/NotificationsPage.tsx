import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { Button } from '../../../components/ui/Button'
import type { NotificationOut } from '../api'
import {
  GROUPS,
  TONE_CLASSES,
  actionFor,
  groupOf,
  metaFor,
  relTime,
} from '../components/notificationMeta'
import { useMarkAllRead, useMarkRead, useNotificationsInfinite } from '../hooks'

type Tab = 'all' | 'unread'

export function NotificationsPage() {
  const navigate = useNavigate()
  const query = useNotificationsInfinite()
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()
  const [tab, setTab] = useState<Tab>('all')

  const items = query.data?.pages.flatMap((page) => page.data) ?? []
  const unread = items.filter((n) => !n.read_at).length
  const shown = tab === 'unread' ? items.filter((n) => !n.read_at) : items

  const grouped = GROUPS.map((label) => ({
    label,
    items: shown.filter((n) => groupOf(n.created_at) === label),
  })).filter((group) => group.items.length > 0)

  const open = (n: NotificationOut) => {
    if (!n.read_at) markRead.mutate(n.id)
    const action = actionFor(n)
    if (action) void navigate({ to: action.to })
  }

  if (query.isLoading) {
    return <p className="py-12 text-center text-sm text-muted">Loading notifications…</p>
  }

  if (query.isError) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-brick">Failed to load notifications.</p>
        <Button variant="ghost" className="mt-3" onClick={() => void query.refetch()}>
          Try again
        </Button>
      </div>
    )
  }

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-charcoal">Notifications</h1>
      <p className="mb-6 mt-1 text-sm text-muted">
        Every update in one place — enrichment, matches, reminders, and account activity.
      </p>

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex gap-1">
          {(['all', 'unread'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-pill border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                tab === t
                  ? 'border-charcoal bg-charcoal text-white'
                  : 'border-line-strong bg-white text-muted hover:border-charcoal hover:text-charcoal'
              }`}
            >
              {t === 'all' ? 'All' : 'Unread'}
            </button>
          ))}
        </div>
        {unread > 0 ? (
          <button
            type="button"
            onClick={() => markAllRead.mutate()}
            className="text-xs font-semibold text-muted transition-colors hover:text-charcoal"
          >
            Mark all read
          </button>
        ) : null}
      </div>

      {shown.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-line-strong bg-white px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[15px] bg-emerald-tint">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" className="h-6 w-6 stroke-emerald-dark" aria-hidden>
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h3 className="font-serif text-lg font-semibold text-charcoal">You&apos;re all caught up</h3>
          <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted">
            {tab === 'unread'
              ? 'No unread notifications right now.'
              : 'Enrichment updates, matches, and follow-up reminders will show up here as they happen.'}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
            {grouped.map((group) => (
              <div key={group.label}>
                <p className="px-5 pb-1.5 pt-4 text-[10.5px] font-bold uppercase tracking-wide text-muted-2">
                  {group.label}
                </p>
                {group.items.map((n) => {
                  const { tone, icon } = metaFor(n.type)
                  const action = actionFor(n)
                  return (
                    <div
                      key={n.id}
                      role="button"
                      tabIndex={action ? 0 : undefined}
                      onClick={() => open(n)}
                      onKeyDown={(e) => {
                        if (action && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault()
                          open(n)
                        }
                      }}
                      className={`relative flex cursor-pointer gap-3 border-b border-line px-5 py-3.5 last:border-b-0 transition-colors hover:bg-paper ${
                        n.read_at
                          ? ''
                          : 'bg-gradient-to-r from-emerald-tint via-emerald-tint/40 to-transparent'
                      }`}
                    >
                      {!n.read_at ? (
                        <span className="absolute left-[7px] top-[19px] h-1.5 w-1.5 rounded-full bg-emerald" aria-hidden />
                      ) : null}
                      <div
                        className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] ${TONE_CLASSES[tone]}`}
                      >
                        {icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] leading-snug text-charcoal">
                          <b className="font-semibold">{n.title}</b>
                          {n.body ? <span className="text-muted"> — {n.body}</span> : null}
                        </p>
                        <span className="mt-0.5 block text-[11px] text-muted-2">{relTime(n.created_at)}</span>
                        {action ? (
                          <button
                            type="button"
                            onClick={() => open(n)}
                            className="mt-2 rounded-pill bg-charcoal px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-near-black"
                          >
                            {action.label}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {query.hasNextPage ? (
            <div className="mt-5 flex justify-center">
              <Button
                variant="secondary"
                loading={query.isFetchingNextPage}
                onClick={() => void query.fetchNextPage()}
              >
                Load earlier notifications
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
