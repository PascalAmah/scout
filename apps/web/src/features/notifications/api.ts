import { api } from '../../lib/api-client'
import type { Page } from '../startups/api'

export interface NotificationOut {
  id: string
  type: string
  entity_type: string | null
  entity_id: string | null
  title: string
  body: string | null
  read_at: string | null
  created_at: string
}

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
