import { request } from "./apiClient";

export async function listClassTeachers({
  teacher_id,
  section_id,
  academic_year_id,
  status = "ACTIVE",
  search = "",
  limit = 50,
  offset = 0,
} = {}) {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (limit) params.append("limit", limit);
  if (offset) params.append("offset", offset);
  if (teacher_id) params.append("teacher_id", teacher_id);
  if (section_id) params.append("section_id", section_id);
  if (academic_year_id) params.append("academic_year_id", academic_year_id);
  if (status) params.append("status", status);

  const response = await request(
    `/api/v1/teachers/class-teachers?${params.toString()}`
  );

  return response.data;
}

export async function getClassTeacherById(id) {
  const response = await request(`/api/v1/teachers/class-teachers/${id}`);
  return response.data;
}

export async function getClassTeacherForCurrentYear(sectionId) {
  const response = await request(
    `/api/v1/teachers/class-teachers/current-year/${sectionId}`
  );
  return response.data;
}

export async function createClassTeacher(payload) {
  const response = await request("/api/v1/teachers/class-teachers", {
    method: "POST",
    body: JSON.stringify({
      teacher_id: payload.teacher_id,
      section_id: payload.section_id,
      academic_year_id: payload.academic_year_id,
      start_date: payload.start_date || null,
      end_date: payload.end_date || null,
      status: payload.status || "ACTIVE",
      notes: payload.notes || null,
      addToTeacherSubjects: payload.addToTeacherSubjects || false,
    }),
  });

  return response.data;
}

export async function updateClassTeacher(id, payload) {
  const response = await request(
    `/api/v1/teachers/class-teachers/${id}`,
    {
      method: "PUT",
      body: JSON.stringify({
        teacher_id: payload.teacher_id,
        section_id: payload.section_id,
        academic_year_id: payload.academic_year_id,
        start_date: payload.start_date,
        end_date: payload.end_date,
        status: payload.status,
        notes: payload.notes,
      }),
    }
  );

  return response.data;
}

export async function deleteClassTeacher(id) {
  const response = await request(
    `/api/v1/teachers/class-teachers/${id}`,
    {
      method: "DELETE",
    }
  );

  return response.data;
}

const classTeacherService = {
  listClassTeachers,
  getClassTeacherById,
  getClassTeacherForCurrentYear,
  createClassTeacher,
  updateClassTeacher,
  deleteClassTeacher,
};

export default classTeacherService;
