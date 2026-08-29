import { request } from './apiClient';

export async function listExams(params = {}) {
  const query = new URLSearchParams(params).toString();
  const response = await request(`/api/v1/exams?${query}`);
  return response.data;
}

export async function getExamById(id) {
  const response = await request(`/api/v1/exams/${id}`);
  return response.data;
}

export async function createExam(payload) {
  const response = await request('/api/v1/exams', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function updateExam(id, payload) {
  const response = await request(`/api/v1/exams/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function togglePublishExam(id, isPublished) {
  const response = await request(`/api/v1/exams/${id}/publish`, {
    method: 'PATCH',
    body: JSON.stringify({ isPublished }),
  });
  return response.data;
}

export async function deleteExam(id) {
  const response = await request(`/api/v1/exams/${id}`, {
    method: 'DELETE',
  });
  return response.data;
}

export default {
  listExams,
  getExamById,
  createExam,
  updateExam,
  togglePublishExam,
  deleteExam,
};
