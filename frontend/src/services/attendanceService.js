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

export async function getMonthlyAttendanceMatrix({ sectionId, year, month }) {
  const params = { sectionId };
  if (year) params.year = year;
  if (month) params.month = month;
  const query = new URLSearchParams(params).toString();
  const response = await request(`/api/v1/attendance/matrix?${query}`);
  return response.data;
}

export async function getStudentAttendance(studentId, { limit = 30, offset = 0, academicYearId } = {}) {
  const params = { limit, offset };
  if (academicYearId) params.academicYearId = academicYearId;
  const query = new URLSearchParams(params).toString();
  const response = await request(`/api/v1/attendance/student/${studentId}?${query}`);
  return response.data;
}

export async function getOwnAttendance({ limit = 30, offset = 0, academicYearId } = {}) {
  const params = { limit, offset };
  if (academicYearId) params.academicYearId = academicYearId;
  const query = new URLSearchParams(params).toString();
  const response = await request(`/api/v1/attendance/student/me?${query}`);
  return response.data;
}

export async function getMyChildrenAttendance(params = {}) {
  const cleanParams = {};
  if (params.academicYearId) cleanParams.academicYearId = params.academicYearId;
  const query = new URLSearchParams(cleanParams).toString();
  const url = query ? `/api/v1/attendance/parent/my-children?${query}` : '/api/v1/attendance/parent/my-children';
  const response = await request(url);
  return response.data;
}

export async function getAttendanceReport(params = {}) {
  const cleanParams = {};
  Object.keys(params).forEach((key) => {
    if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
      cleanParams[key] = params[key];
    }
  });
  const query = new URLSearchParams(cleanParams).toString();
  const response = await request(`/api/v1/attendance/reports?${query}`);
  return response.data;
}

const attendanceService = {
  getAttendanceSheet,
  saveBulkAttendance,
  getAttendanceSummary,
  getMonthlyAttendanceMatrix,
  getStudentAttendance,
  getOwnAttendance,
  getMyChildrenAttendance,
  getAttendanceReport,
};

export default attendanceService;
