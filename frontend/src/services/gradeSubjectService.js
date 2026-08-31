import { request } from "./apiClient";

export async function listGradeSubjects({
  grade_id,
  academic_year_id,
  status,
  is_compulsory,
  search = "",
  limit = 50,
  offset = 0,
} = {}) {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (limit) params.append("limit", limit);
  if (offset) params.append("offset", offset);
  if (grade_id) params.append("grade_id", grade_id);
  if (academic_year_id) params.append("academic_year_id", academic_year_id);
  if (status) params.append("status", status);
  if (is_compulsory !== undefined && is_compulsory !== null && is_compulsory !== "") {
    params.append("is_compulsory", is_compulsory);
  }

  const response = await request(`/api/v1/grades/subjects?${params.toString()}`);
  return response.data;
}

export async function getGradeSubjectById(id) {
  const response = await request(`/api/v1/grades/subjects/${id}`);
  return response.data;
}

export async function createGradeSubject(payload) {
  const response = await request("/api/v1/grades/subjects", {
    method: "POST",
    body: JSON.stringify({
      grade_id: payload.gradeId || payload.grade_id,
      subject_id: payload.subjectId || payload.subject_id,
      academic_year_id: payload.academicYearId || payload.academic_year_id,
      is_compulsory: payload.isCompulsory !== undefined ? payload.isCompulsory : payload.is_compulsory,
      weekly_periods: payload.weeklyPeriods !== undefined ? payload.weeklyPeriods : payload.weekly_periods,
      total_marks: payload.totalMarks !== undefined ? payload.totalMarks : payload.total_marks,
      pass_marks: payload.passMarks !== undefined ? payload.passMarks : payload.pass_marks,
      display_order: payload.displayOrder !== undefined ? payload.displayOrder : payload.display_order,
      status: payload.status || "ACTIVE",
    }),
  });
  return response.data;
}

export async function bulkAssignGradeSubjects({ gradeId, academicYearId, subjects }) {
  const response = await request("/api/v1/grades/subjects/bulk", {
    method: "POST",
    body: JSON.stringify({
      grade_id: gradeId,
      academic_year_id: academicYearId,
      subjects: subjects.map((s) => ({
        subject_id: s.subjectId || s.subject_id || s.id,
        is_compulsory: s.isCompulsory !== undefined ? s.isCompulsory : s.is_compulsory ?? true,
        weekly_periods: s.weeklyPeriods !== undefined ? s.weeklyPeriods : s.weekly_periods ?? null,
        total_marks: s.totalMarks !== undefined ? s.totalMarks : s.total_marks ?? null,
        pass_marks: s.passMarks !== undefined ? s.passMarks : s.pass_marks ?? null,
        display_order: s.displayOrder !== undefined ? s.displayOrder : s.display_order ?? null,
        status: s.status || "ACTIVE",
      })),
    }),
  });
  return response.data;
}

export async function cloneGradeSubjects({
  sourceGradeId,
  sourceAcademicYearId,
  targetGradeId,
  targetAcademicYearId,
}) {
  const response = await request("/api/v1/grades/subjects/clone", {
    method: "POST",
    body: JSON.stringify({
      source_grade_id: sourceGradeId,
      source_academic_year_id: sourceAcademicYearId,
      target_grade_id: targetGradeId,
      target_academic_year_id: targetAcademicYearId,
    }),
  });
  return response.data;
}

export async function getCurriculumStats({ gradeId, academicYearId } = {}) {
  const params = new URLSearchParams();
  if (gradeId) params.append("grade_id", gradeId);
  if (academicYearId) params.append("academic_year_id", academicYearId);

  const response = await request(`/api/v1/grades/subjects/stats?${params.toString()}`);
  return response.data;
}

export async function getSubjectMappedGrades(subjectId, academicYearId = null) {
  const params = new URLSearchParams();
  if (academicYearId) params.append("academic_year_id", academicYearId);

  const response = await request(`/api/v1/grades/subjects/by-subject/${subjectId}?${params.toString()}`);
  return response.data;
}

export async function updateGradeSubject(id, payload) {
  const response = await request(`/api/v1/grades/subjects/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      is_compulsory: payload.isCompulsory !== undefined ? payload.isCompulsory : payload.is_compulsory,
      weekly_periods: payload.weeklyPeriods !== undefined ? payload.weeklyPeriods : payload.weekly_periods,
      total_marks: payload.totalMarks !== undefined ? payload.totalMarks : payload.total_marks,
      pass_marks: payload.passMarks !== undefined ? payload.passMarks : payload.pass_marks,
      display_order: payload.displayOrder !== undefined ? payload.displayOrder : payload.display_order,
      status: payload.status,
    }),
  });
  return response.data;
}

export async function deleteGradeSubject(id) {
  const response = await request(`/api/v1/grades/subjects/${id}`, {
    method: "DELETE",
  });
  return response.data;
}

const gradeSubjectService = {
  listGradeSubjects,
  getGradeSubjectById,
  createGradeSubject,
  bulkAssignGradeSubjects,
  cloneGradeSubjects,
  getCurriculumStats,
  getSubjectMappedGrades,
  updateGradeSubject,
  deleteGradeSubject,
};

export default gradeSubjectService;
