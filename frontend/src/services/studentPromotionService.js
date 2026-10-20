import { request } from "./apiClient";

/**
 * Preview eligible promotion candidates for a given grade and academic year
 * with progressive marks average, suggested actions, and next grade info.
 */
export async function previewPromotions({ sourceAcademicYearId, gradeId, sectionId = "" }) {
  const params = new URLSearchParams();
  if (sourceAcademicYearId) params.append("sourceAcademicYearId", sourceAcademicYearId);
  if (gradeId) params.append("gradeId", gradeId);
  if (sectionId) params.append("sectionId", sectionId);

  const response = await request(`/api/v1/students/promotions/preview?${params.toString()}`);
  return response.data;
}

/**
 * Execute batch promotion and academic progression transition atomically
 */
export async function executeBatchPromotion({ sourceAcademicYearId, targetAcademicYearId, promotions }) {
  const response = await request("/api/v1/students/promotions/execute", {
    method: "POST",
    body: JSON.stringify({
      sourceAcademicYearId,
      targetAcademicYearId,
      promotions,
    }),
  });
  return response.data;
}

/**
 * Fetch multi-year academic progression history and transcript outcomes for a student
 */
export async function getStudentAcademicHistory(studentId) {
  const response = await request(`/api/v1/students/${studentId}/academic-history`);
  return response.data;
}

/**
 * Fetch complete consolidated multi-year academic transcript (KG through Grade 10/12)
 */
export async function getStudentCumulativeTranscript(studentId) {
  const response = await request(`/api/v1/students/${studentId}/transcript`);
  return response.data;
}

const studentPromotionService = {
  previewPromotions,
  executeBatchPromotion,
  getStudentAcademicHistory,
  getStudentCumulativeTranscript,
};

export default studentPromotionService;

