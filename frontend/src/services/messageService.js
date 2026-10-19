import { request } from './apiClient';

/**
 * Dispatches a client-side event so the header message badge and active
 * chat views stay in real-time sync across components.
 */
export function emitMessageChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('smart-sms-message-change'));
  }
}

/**
 * List inbox conversations for the current user.
 */
export async function listConversations(params = {}) {
  const query = new URLSearchParams();

  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.status && params.status !== 'ALL') query.append('status', params.status);
  if (params.unreadOnly) query.append('unreadOnly', 'true');
  if (params.search) query.append('search', params.search);
  if (params.type && params.type !== 'ALL') query.append('type', params.type);
  if (params.studentId) query.append('studentId', params.studentId);

  const qs = query.toString();
  const endpoint = qs ? `/api/v1/messages?${qs}` : '/api/v1/messages';
  const response = await request(endpoint);
  return response || { data: [], pagination: { total: 0, page: 1, limit: 30, totalPages: 1 } };
}

/**
 * Start a new conversation thread or open an existing direct one.
 */
export async function createOrGetConversation(payload) {
  const response = await request('/api/v1/messages', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  });
  emitMessageChange();
  return response?.data;
}

/**
 * Get single conversation metadata and participants.
 */
export async function getConversation(id) {
  const response = await request(`/api/v1/messages/${id}`);
  return response?.data;
}

/**
 * Get paginated message stream for a conversation.
 */
export async function listMessages(conversationId, params = {}) {
  const query = new URLSearchParams();

  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.before) query.append('before', params.before);
  if (params.markRead !== undefined) query.append('markRead', String(params.markRead));

  const qs = query.toString();
  const endpoint = qs
    ? `/api/v1/messages/${conversationId}/messages?${qs}`
    : `/api/v1/messages/${conversationId}/messages`;

  const response = await request(endpoint);
  return response || { data: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 1 } };
}

/**
 * Send a message (text and/or attachments) into an active thread.
 */
export async function sendMessage(conversationId, payload) {
  const response = await request(`/api/v1/messages/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  });
  emitMessageChange();
  return response?.data;
}

/**
 * Mark all messages in a conversation as read.
 */
export async function markAsRead(conversationId) {
  const response = await request(`/api/v1/messages/${conversationId}/read`, {
    method: 'PATCH',
  });
  emitMessageChange();
  return response?.data;
}

/**
 * Update participant thread settings (archive, mute, star).
 */
export async function updateParticipantSettings(conversationId, settings) {
  const response = await request(`/api/v1/messages/${conversationId}/settings`, {
    method: 'PATCH',
    body: JSON.stringify(settings),
    headers: { 'Content-Type': 'application/json' },
  });
  emitMessageChange();
  return response?.data;
}

/**
 * Soft delete a message.
 */
export async function deleteMessage(messageId) {
  const response = await request(`/api/v1/messages/messages/${messageId}`, {
    method: 'DELETE',
  });
  emitMessageChange();
  return response?.data;
}

/**
 * Get total unread count across all active conversations.
 */
export async function getUnreadCount() {
  const response = await request('/api/v1/messages/unread-count');
  return response?.data?.unread_count || 0;
}

/**
 * Get directory of eligible contacts to message.
 */
export async function getContacts(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);

  const qs = query.toString();
  const endpoint = qs ? `/api/v1/messages/contacts?${qs}` : '/api/v1/messages/contacts';
  const response = await request(endpoint);
  return response?.data || [];
}

const messageService = {
  listConversations,
  createOrGetConversation,
  getConversation,
  listMessages,
  sendMessage,
  markAsRead,
  updateParticipantSettings,
  deleteMessage,
  getUnreadCount,
  getContacts,
  emitMessageChange,
};

export default messageService;
