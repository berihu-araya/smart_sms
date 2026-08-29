import { request } from './apiClient';

export async function listUsers(params = {}) {
  const query = new URLSearchParams(params).toString();
  const response = await request(`/api/v1/users?${query}`);
  return response.data;
}

export async function getUserById(id) {
  const response = await request(`/api/v1/users/${id}`);
  return response.data;
}

export async function createUser(payload) {
  const response = await request('/api/v1/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function updateUser(id, payload) {
  const response = await request(`/api/v1/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function toggleUserStatus(id, status) {
  const response = await request(`/api/v1/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return response.data;
}

export async function resetUserPassword(id, password) {
  const response = await request(`/api/v1/users/${id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
  return response.data;
}

export async function deleteUser(id) {
  const response = await request(`/api/v1/users/${id}`, {
    method: 'DELETE',
  });
  return response.data;
}

export default {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  resetUserPassword,
  deleteUser,
};
