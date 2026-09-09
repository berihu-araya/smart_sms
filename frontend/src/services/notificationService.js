import { request } from './apiClient';

export async function listNotifications() {
  const response = await request('/api/v1/notifications');
  return response.data || [];
}

const notificationService = { listNotifications };

export default notificationService;