import { request } from "./apiClient";

export async function getTeachersBySubject(subjectId, { limit = 100, offset = 0 } = {}) {
  const params = new URLSearchParams({
    limit,
    offset,
  }).toString();

  const response = await request(
    `/api/v1/teachers/subjects/by-subject/${subjectId}?${params}`
  );
  return response.data;
}

export default {
  getTeachersBySubject,
};
