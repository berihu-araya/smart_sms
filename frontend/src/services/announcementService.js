import { request } from './apiClient';

/**
 * Builds a query string from a parameters object.
 * Filters out undefined, null, and empty string values.
 * @param {object} params
 * @returns {string}
 */
function buildQueryString(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value);
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Fetch paginated announcements with filtering, searching, and role-scoping.
 * @param {object} params
 * @returns {Promise<{ items: Array, total: number, page: number, limit: number, totalPages: number }>}
 */
export async function listAnnouncements(params = {}) {
  const query = buildQueryString(params);
  const response = await request(`/api/v1/announcements${query}`);
  return (
    response?.data || {
      items: [],
      total: 0,
      page: 1,
      limit: 12,
      totalPages: 1,
    }
  );
}

/**
 * Fetch announcement dashboard KPI statistics.
 * @returns {Promise<{ totalAnnouncements: number, activeAnnouncements: number, urgentAlerts: number, pinnedAnnouncements: number, pendingAcknowledgements: number, urgentUnacknowledgedNotice: object|null }>}
 */
export async function getAnnouncementStats() {
  const response = await request('/api/v1/announcements/stats');
  return (
    response?.data || {
      totalAnnouncements: 0,
      activeAnnouncements: 0,
      urgentAlerts: 0,
      pinnedAnnouncements: 0,
      pendingAcknowledgements: 0,
      urgentUnacknowledgedNotice: null,
    }
  );
}

/**
 * Fetch details of a single announcement.
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function getAnnouncementById(id) {
  const response = await request(`/api/v1/announcements/${id}`);
  return response?.data || null;
}

/**
 * Create a new announcement.
 * @param {object} payload
 * @returns {Promise<object>}
 */
export async function createAnnouncement(payload) {
  const response = await request('/api/v1/announcements', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response?.data;
}

/**
 * Update an existing announcement.
 * @param {string} id
 * @param {object} payload
 * @returns {Promise<object>}
 */
export async function updateAnnouncement(id, payload) {
  const response = await request(`/api/v1/announcements/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return response?.data;
}

/**
 * Toggle pin status of an announcement.
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function togglePin(id) {
  const response = await request(`/api/v1/announcements/${id}/pin`, {
    method: 'PATCH',
  });
  return response?.data;
}

/**
 * Toggle status of an announcement (e.g. DRAFT, PUBLISHED, ARCHIVED).
 * @param {string} id
 * @param {string} status
 * @returns {Promise<object>}
 */
export async function toggleStatus(id, status) {
  const response = await request(`/api/v1/announcements/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return response?.data;
}

/**
 * Acknowledge an announcement for the currently logged-in user.
 * Identity is determined server-side via verified JWT.
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function acknowledgeAnnouncement(id) {
  const response = await request(`/api/v1/announcements/${id}/acknowledge`, {
    method: 'POST',
  });
  return response?.data;
}

/**
 * Fetch audit list of users who acknowledged an announcement (Admin/Teachers).
 * @param {string} id
 * @returns {Promise<{ items: Array, total: number, targetCount: number, percentage: number }>}
 */
export async function getAcknowledgements(id) {
  const response = await request(`/api/v1/announcements/${id}/acknowledgements`);
  return (
    response?.data || {
      items: [],
      total: 0,
      targetCount: 0,
      percentage: 0,
    }
  );
}

/**
 * Soft delete an announcement.
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deleteAnnouncement(id) {
  const response = await request(`/api/v1/announcements/${id}`, {
    method: 'DELETE',
  });
  return response?.success ?? true;
}

const announcementService = {
  listAnnouncements,
  getAnnouncementStats,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  togglePin,
  toggleStatus,
  acknowledgeAnnouncement,
  getAcknowledgements,
  deleteAnnouncement,
};

export default announcementService;
