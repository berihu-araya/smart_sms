import { request } from './apiClient';

export async function listRoles() {
  const response = await request('/api/v1/roles');
  return response.data;
}

export async function getRoleById(id) {
  const response = await request(`/api/v1/roles/${id}`);
  return response.data;
}

export default {
  listRoles,
  getRoleById,
};
