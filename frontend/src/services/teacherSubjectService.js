import { request } from "./apiClient";

const teacherSubjectService = {
  listTeacherSubjects: async ({
    teacher_id,
    grade_id,
    section_id,
    academic_year_id,
    search = "",
    limit = 50,
    offset = 0,
  } = {}) => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (limit) params.append("limit", limit);
    if (offset) params.append("offset", offset);
    if (teacher_id) params.append("teacher_id", teacher_id);
    if (grade_id) params.append("grade_id", grade_id);
    if (section_id) params.append("section_id", section_id);
    if (academic_year_id) params.append("academic_year_id", academic_year_id);

    const response = await request(
      `/api/v1/teachers/subjects?${params.toString()}`
    );

    return response.data;
  },

  getTeacherSubjectById: async (id) => {
    const response = await request(`/api/v1/teachers/subjects/${id}`);
    return response.data;
  },

  createTeacherSubject: async (payload) => {
    const response = await request("/api/v1/teachers/subjects", {
      method: "POST",
      body: JSON.stringify({
        teacher_id: payload.teacher_id,
        subject_id: payload.subject_id,
        grade_id: payload.grade_id,
        section_id: payload.section_id,
        academic_year_id: payload.academic_year_id,
        start_date: payload.start_date || null,
        end_date: payload.end_date || null,
        status: payload.status || "ACTIVE",
      }),
    });

    return response.data;
  },

  updateTeacherSubject: async (id, payload) => {
    const response = await request(`/api/v1/teachers/subjects/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        teacher_id: payload.teacher_id,
        subject_id: payload.subject_id,
        grade_id: payload.grade_id,
        section_id: payload.section_id,
        academic_year_id: payload.academic_year_id,
        start_date: payload.start_date,
        end_date: payload.end_date,
        status: payload.status,
      }),
    });

    return response.data;
  },

  deleteTeacherSubject: async (id) => {
    const response = await request(`/api/v1/teachers/subjects/${id}`, {
      method: "DELETE",
    });

    return response.data;
  },
};

export default teacherSubjectService;
