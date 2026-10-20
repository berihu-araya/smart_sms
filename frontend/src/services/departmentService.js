import { request } from './apiClient';

export async function listDepartments(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.type && params.type !== 'ALL') query.append('type', params.type);
  if (params.status && params.status !== 'ALL') query.append('status', params.status);

  const qs = query.toString() ? `?${query.toString()}` : '';
  const response = await request(`/api/v1/departments${qs}`);
  return response.data || [];
}

export async function getDepartment(id) {
  const response = await request(`/api/v1/departments/${id}`);
  return response.data;
}

export async function createDepartment(payload) {
  const response = await request('/api/v1/departments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function updateDepartment(id, payload) {
  const response = await request(`/api/v1/departments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function deleteDepartment(id) {
  const response = await request(`/api/v1/departments/${id}`, {
    method: 'DELETE',
  });
  return response;
}

export async function getHodCandidates() {
  const response = await request('/api/v1/departments/hod-candidates');
  return response.data || [];
}

export async function assignTeacherToDepartment(teacherId, departmentId) {
  const response = await request('/api/v1/departments/assign-teacher', {
    method: 'POST',
    body: JSON.stringify({ teacherId, departmentId }),
  });
  return response.data;
}

export default {
  listDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getHodCandidates,
  assignTeacherToDepartment,
};
