import { request } from './apiClient';

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

export async function listAssignments(params = {}) {
  const query = buildQueryString(params);
  const response = await request(`/api/v1/assignments${query}`);
  return response.data || { items: [], total: 0 };
}

export async function getAssignmentStats(params = {}) {
  const query = buildQueryString(params);
  const response = await request(`/api/v1/assignments/stats${query}`);
  return response.data || {};
}

export async function getAssignmentById(id) {
  const response = await request(`/api/v1/assignments/${id}`);
  return response.data || null;
}

export async function createAssignment(payload) {
  const response = await request('/api/v1/assignments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function updateAssignment(id, payload) {
  const response = await request(`/api/v1/assignments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function toggleAssignmentStatus(id, status) {
  const response = await request(`/api/v1/assignments/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return response.data;
}

export async function deleteAssignment(id) {
  const response = await request(`/api/v1/assignments/${id}`, {
    method: 'DELETE',
  });
  return response.data;
}

export async function listSubmissions(assignmentId, params = {}) {
  const query = buildQueryString(params);
  const response = await request(`/api/v1/assignments/${assignmentId}/submissions${query}`);
  return response.data || { submissions: [], totalCount: 0 };
}

export async function getMySubmission(assignmentId) {
  const response = await request(`/api/v1/assignments/${assignmentId}/my-submission`);
  return response.data || {};
}

export async function submitAssignment(assignmentId, payload) {
  const response = await request(`/api/v1/assignments/${assignmentId}/submit`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function gradeSubmission(submissionId, payload) {
  const response = await request(`/api/v1/assignments/submissions/${submissionId}/grade`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data;
}

const assignmentService = {
  listAssignments,
  getAssignmentStats,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  toggleAssignmentStatus,
  deleteAssignment,
  listSubmissions,
  getMySubmission,
  submitAssignment,
  gradeSubmission,
};

export default assignmentService;
