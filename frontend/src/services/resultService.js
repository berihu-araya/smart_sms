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

export async function getOwnReportCard({ academicYearId, term } = {}) {
  const params = {};
  if (academicYearId) params.academicYearId = academicYearId;
  if (term) params.term = term;
  const query = new URLSearchParams(params).toString();
  const response = await request(`/api/v1/results/report-card/me?${query}`);
  return response.data;
}

export async function getAcademicReport({ academicYearId, gradeId, sectionId, term, studentId } = {}) {
  const params = {};
  if (academicYearId) params.academicYearId = academicYearId;
  if (gradeId) params.gradeId = gradeId;
  if (sectionId) params.sectionId = sectionId;
  if (term) params.term = term;
  if (studentId) params.studentId = studentId;
  const query = new URLSearchParams(params).toString();
  const url = query ? `/api/v1/results/academic-report?${query}` : '/api/v1/results/academic-report';
  const response = await request(url);
  return response.data;
}

const resultService = {
  getSectionResults,
  getStudentReportCard,
  getOwnReportCard,
  getAcademicReport,
};

export default resultService;
