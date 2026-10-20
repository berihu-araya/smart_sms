import { request } from './apiClient';

export async function listRoles() {
  const response = await request('/api/v1/roles');
  return response.data;
}

export async function getRoleById(id) {
  const response = await request(`/api/v1/roles/${id}`);
  return response.data;
}

export async function createRole(payload) {
  const response = await request('/api/v1/roles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function deleteRole(id) {
  const response = await request(`/api/v1/roles/${id}`, {
    method: 'DELETE',
  });
  return response;
}

export async function getRolePermissions(roleId) {
  const response = await request(`/api/v1/roles/${roleId}/permissions`);
  return response.data;
}

export async function updateRolePermissions(roleId, permissions) {
  const response = await request(`/api/v1/roles/${roleId}/permissions`, {
    method: 'PUT',
    body: JSON.stringify({ permissions }),
  });
  return response.data;
}

export default {
  listRoles,
  getRoleById,
  createRole,
  deleteRole,
  getRolePermissions,
  updateRolePermissions,
};
