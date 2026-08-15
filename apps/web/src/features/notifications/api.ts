import type { NotificationOut } from '@scout/types'

import { api } from '../../lib/api-client'
import type { Page } from '../startups/api'

export type { NotificationOut }

export function notificationsRequest(cursor?: string): Promise<Page<NotificationOut>> {
  return api(`/notifications${cursor ? `?cursor=${cursor}` : ''}`)
}

export function unreadCountRequest(): Promise<{ count: number }> {
  return api('/notifications/unread-count')
}

export function markReadRequest(notificationId: string): Promise<void> {
  return api(`/notifications/${notificationId}/read`, { method: 'POST' })
}

export function markAllReadRequest(): Promise<void> {
  return api('/notifications/read-all', { method: 'POST' })
}
