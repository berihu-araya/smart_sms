import { request } from './apiClient';

export async function getAttendanceSheet({ sectionId, date }) {
  const query = new URLSearchParams({ sectionId, date }).toString();
  const response = await request(`/api/v1/attendance/sheet?${query}`);
  return response.data;
}

export async function saveBulkAttendance({ sectionId, date, academicYearId, records }) {
  const response = await request('/api/v1/attendance/bulk', {
    method: 'POST',
    body: JSON.stringify({ sectionId, date, academicYearId, records }),
  });
  return response.data;
}

export async function getAttendanceSummary({ date, sectionId }) {
  const params = { date };
  if (sectionId) params.sectionId = sectionId;
  const query = new URLSearchParams(params).toString();
  const response = await request(`/api/v1/attendance/summary?${query}`);
  return response.data;
}

export async function getStudentAttendance(studentId, { limit = 30, offset = 0 } = {}) {
  const query = new URLSearchParams({ limit, offset }).toString();
  const response = await request(`/api/v1/attendance/student/${studentId}?${query}`);
  return response.data;
}

export default {
  getAttendanceSheet,
  saveBulkAttendance,
  getAttendanceSummary,
  getStudentAttendance,
};
