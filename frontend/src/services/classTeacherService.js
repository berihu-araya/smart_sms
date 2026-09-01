import { request } from "./apiClient";

export async function listClassTeachers({ 
  search = "", 
  limit = 20, 
  offset = 0, 
  sectionId = "",
  teacher_id = "",
  academic_year_id = ""
} = {}) {
  const params = new URLSearchParams({
    search,
    limit,
    offset,
    ...(sectionId && { section_id: sectionId }),
    ...(teacher_id && { teacher_id }),
    ...(academic_year_id && { academic_year_id }),
  }).toString();

  const response = await request(`/api/v1/class-teachers?${params}`);
  return response.data;
}

export async function getClassTeacherBySection(sectionId) {
  const response = await request(`/api/v1/class-teachers/sections/${sectionId}`);
  return response.data;
}

export async function assignClassTeacher(payload) {
  const response = await request("/api/v1/class-teachers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function deactivateClassTeacher(id) {
  const response = await request(`/api/v1/class-teachers/${id}/deactivate`, {
    method: "PATCH",
  });
  return response.data;
}

export default {
  listClassTeachers,
  getClassTeacherBySection,
  assignClassTeacher,
  deactivateClassTeacher,
};
