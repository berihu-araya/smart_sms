import { request } from '@/services/apiClient';
import { listRoles } from '@/services/roleService';

/**
 * Fetch staff members, excluding pure student and parent roles.
 */
export async function getStaffList(params = {}) {
  const query = new URLSearchParams({
    limit: params.limit || '100',
    offset: params.offset || '0',
    search: params.search || '',
    ...(params.roleId ? { roleId: params.roleId } : {}),
  }).toString();

  const response = await request(`/api/v1/users?${query}`);
  const users = response?.data || [];

  // Exclude students and parents from staff directory
  return users.filter((u) => {
    const role = (u.role_name || '').toLowerCase();
    return role !== 'student' && role !== 'parent';
  });
}

/**
 * Get staff member by ID
 */
export async function getStaffById(id) {
  const response = await request(`/api/v1/users/${id}`);
  return response.data;
}

/**
 * Create a new staff member account
 */
export async function createStaff(payload) {
  const response = await request('/api/v1/users', {
    method: 'POST',
    body: JSON.stringify({
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      email: payload.email.trim().toLowerCase(),
      phone: payload.phone ? payload.phone.trim() : null,
      roleId: payload.roleId,
      password: payload.password,
      status: payload.status || 'ACTIVE',
    }),
  });
  return response.data;
}

/**
 * Update an existing staff member
 */
export async function updateStaff(id, payload) {
  const response = await request(`/api/v1/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      email: payload.email.trim().toLowerCase(),
      phone: payload.phone ? payload.phone.trim() : null,
      roleId: payload.roleId,
      status: payload.status,
    }),
  });
  return response.data;
}

/**
 * Toggle staff active/inactive status
 */
export async function toggleStaffStatus(id, targetStatus) {
  const response = await request(`/api/v1/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: targetStatus }),
  });
  return response.data;
}

/**
 * Reset staff login password
 */
export async function resetStaffPassword(id, password) {
  const response = await request(`/api/v1/users/${id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
  return response.data;
}

/**
 * Delete / deactivate a staff member
 */
export async function deleteStaff(id) {
  const response = await request(`/api/v1/users/${id}`, {
    method: 'DELETE',
  });
  return response.data;
}

/**
 * Load roles suitable for staff assignment
 */
export async function getStaffRoles() {
  try {
    const roles = await listRoles();
    const staffRoles = (roles || []).filter((r) => {
      const name = (r.name || '').toLowerCase();
      return (
        name !== 'student' &&
        name !== 'parent'
      );
    });
    return staffRoles.length > 0 ? staffRoles : roles || [];
  } catch (err) {
    console.error('Failed to load staff roles:', err);
    return [];
  }
}

const staffService = {
  getStaffList,
  getStaffById,
  createStaff,
  updateStaff,
  toggleStaffStatus,
  resetStaffPassword,
  deleteStaff,
  getStaffRoles,
};

export default staffService;
