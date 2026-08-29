import { request } from './apiClient';

export async function getSectionResults({ sectionId, academicYearId, term }) {
  const params = { sectionId };
  if (academicYearId) params.academicYearId = academicYearId;
  if (term) params.term = term;
  const query = new URLSearchParams(params).toString();
  const response = await request(`/api/v1/results/section?${query}`);
  return response.data;
}

export async function getStudentReportCard(studentId, { academicYearId, term } = {}) {
  const params = {};
  if (academicYearId) params.academicYearId = academicYearId;
  if (term) params.term = term;
  const query = new URLSearchParams(params).toString();
  const response = await request(`/api/v1/results/report-card/${studentId}?${query}`);
  return response.data;
}

export default {
  getSectionResults,
  getStudentReportCard,
};
