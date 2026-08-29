import { request } from './apiClient';

export async function getMarksSheet({ examId, subjectId, sectionId }) {
  const query = new URLSearchParams({ examId, subjectId, sectionId }).toString();
  const response = await request(`/api/v1/marks/sheet?${query}`);
  return response.data;
}

export async function saveBatchMarks({ examId, subjectId, sectionId, marks }) {
  const response = await request('/api/v1/marks/batch', {
    method: 'POST',
    body: JSON.stringify({ examId, subjectId, sectionId, marks }),
  });
  return response.data;
}

export async function getStudentMarks(studentId, params = {}) {
  const query = new URLSearchParams(params).toString();
  const response = await request(`/api/v1/marks/student/${studentId}?${query}`);
  return response.data;
}

export default {
  getMarksSheet,
  saveBatchMarks,
  getStudentMarks,
};
