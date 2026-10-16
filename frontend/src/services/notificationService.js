import { request } from './apiClient';

/**
 * Dispatches a client-side event so the header bell and notification center
 * instantly synchronize their unread badge counters and list views.
 */
export function emitNotificationChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('smart-sms-notification-change'));
  }
}

/**
 * Fetches notifications for the active user with support for tabs, search, and pagination.
 */
export async function listNotifications(params = {}) {
  const query = new URLSearchParams();

  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.type && params.type !== 'ALL') query.append('type', params.type);
  if (params.status && params.status !== 'ALL') query.append('status', params.status);
  if (params.priority && params.priority !== 'ALL') query.append('priority', params.priority);
  if (params.search) query.append('search', params.search);
  if (params.dateRange) query.append('dateRange', params.dateRange);

  const qs = query.toString();
  const endpoint = qs ? `/api/v1/notifications?${qs}` : '/api/v1/notifications';
  const response = await request(endpoint);
  return response?.data || { items: [], total: 0, unreadCount: 0, page: 1, totalPages: 1 };
}

/**
 * Lightweight unread count query designed for the top header notification bell.
 */
export async function getUnreadCount() {
  const response = await request('/api/v1/notifications/unread-count');
  return response?.data?.count || 0;
}

/**
 * Aggregated statistics for the Notification Center KPI cards.
 */
export async function getStats() {
  const response = await request('/api/v1/notifications/stats');
  return response?.data || {
    total: 0,
    unread: 0,
    urgentUnread: 0,
    academicTotal: 0,
    attendanceTotal: 0,
    financeTotal: 0,
    transportTotal: 0,
  };
}

/**
 * Marks a single notification as read.
 */
export async function markAsRead(id) {
  const response = await request(`/api/v1/notifications/${id}/read`, {
    method: 'PATCH',
  });
  emitNotificationChange();
  return response?.data;
}

/**
 * Marks all notifications as read for the user in a single batch operation.
 */
export async function markAllAsRead() {
  const response = await request('/api/v1/notifications/read-all', {
    method: 'POST',
  });
  emitNotificationChange();
  return response?.data;
}

/**
 * Archives / dismisses a notification from the user's feed.
 */
export async function archiveNotification(id) {
  const response = await request(`/api/v1/notifications/${id}`, {
    method: 'DELETE',
  });
  emitNotificationChange();
  return response?.data;
}

/**
 * Administrative creation and dispatch of notifications.
 */
export async function createNotification(payload) {
  const response = await request('/api/v1/notifications', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  });
  emitNotificationChange();
  return response?.data;
}

const notificationService = {
  listNotifications,
  getUnreadCount,
  getStats,
  markAsRead,
  markAllAsRead,
  archiveNotification,
  createNotification,
  emitNotificationChange,
};

export default notificationService;