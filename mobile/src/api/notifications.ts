import {api} from './client';

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  type: string;
  dataJson: string | null;
  read: boolean;
  createdAt: string;
};

export async function fetchNotifications(page = 0, size = 20): Promise<NotificationItem[]> {
  const res = await api.get('/api/notifications', {params: {page, size}});
  return res.data.content ?? [];
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  try {
    const res = await api.get<{unreadCount: number}>('/api/notifications/unread-count');
    return res.data.unreadCount ?? 0;
  } catch {
    return 0;
  }
}

export async function markNotificationRead(id: string): Promise<NotificationItem> {
  const res = await api.patch<NotificationItem>(`/api/notifications/${id}/read`);
  return res.data;
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.patch('/api/notifications/read-all');
}
