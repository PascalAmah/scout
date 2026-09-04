import { type ReactNode } from 'react'

import type { NotificationOut } from '../api'

export type Tone = 'emerald' | 'slate' | 'amber' | 'brick'

export const TONE_CLASSES: Record<Tone, string> = {
  emerald: 'bg-[#E4F3EA] text-[#0F6E56]',
  slate: 'bg-[#E8EEF6] text-[#3E5C8A]',
  amber: 'bg-[#FBF1DF] text-[#B8791A]',
  brick: 'bg-[#F6E4DF] text-[#A23B2A]',
}

// Icons are 16px inside the 34px tinted tile, per the mockup (`.n-icon svg{width:16px;height:16px}`).
const ICON_CLASS = 'h-4 w-4'

const ICONS: Record<Tone, ReactNode> = {
  emerald: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={ICON_CLASS}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  slate: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={ICON_CLASS}>
      <path d="M14 3v5h5M6 3h8l5 5v13H6z" />
    </svg>
  ),
  amber: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={ICON_CLASS}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  ),
  brick: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={ICON_CLASS}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  ),
}

const GRID_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={ICON_CLASS}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M4 10h16M10 4v16" />
  </svg>
)

const LOCK_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={ICON_CLASS}>
    <rect x="4" y="10" width="16" height="10" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </svg>
)

/** Map a notification type to its tone + leading icon (per scout_notifications.html). */
export function metaFor(type: string): { tone: Tone; icon: ReactNode } {
  switch (type) {
    case 'new_match':
      return { tone: 'emerald', icon: ICONS.emerald }
    case 'enrichment_complete':
      return { tone: 'emerald', icon: GRID_ICON }
    case 'resume_version_ready':
    case 'outreach_ready':
      return { tone: 'slate', icon: ICONS.slate }
    case 'follow_up_due':
      return { tone: 'amber', icon: ICONS.amber }
    case 'auth_expired':
      return { tone: 'amber', icon: LOCK_ICON }
    case 'application_status_change':
      return { tone: 'brick', icon: ICONS.brick }
    default:
      return { tone: 'emerald', icon: ICONS.emerald }
  }
}

export function relTime(iso: string): string {
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

export type GroupLabel = 'Today' | 'This week' | 'Earlier'

export function groupOf(iso: string): GroupLabel {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfWeek = startOfToday - (now.getDay() === 0 ? 6 : now.getDay() - 1) * 86400000
  const ms = new Date(iso).getTime()
  if (ms >= startOfToday) return 'Today'
  if (ms >= startOfWeek) return 'This week'
  return 'Earlier'
}

export const GROUPS: GroupLabel[] = ['Today', 'This week', 'Earlier']

/** The primary destination (if any) a notification routes to. */
export function actionFor(n: NotificationOut): { label: string; to: string } | null {
  if (n.entity_type === 'startup' && n.entity_id) {
    return { label: 'View startup', to: `/startups/${n.entity_id}` }
  }
  if (n.entity_type === 'application' && n.entity_id) {
    return { label: 'View application', to: `/crm/applications/${n.entity_id}` }
  }
  return null
}
