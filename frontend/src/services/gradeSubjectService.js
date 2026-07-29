import { request } from "./apiClient";

const gradeSubjectService = {
  listGradeSubjects: async ({ grade_id, academic_year_id, search = "", limit = 20, offset = 0 } = {}) => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (limit) params.append("limit", limit);
    if (offset) params.append("offset", offset);
    if (grade_id) params.append("grade_id", grade_id);
    if (academic_year_id) params.append("academic_year_id", academic_year_id);

    const response = await request(`/api/v1/grades/subjects?${params.toString()}`);
    return response.data;
  },

  getGradeSubjectById: async (id) => {
    const response = await request(`/api/v1/grades/subjects/${id}`);
    return response.data;
  },

  createGradeSubject: async (payload) => {
    const response = await request("/api/v1/grades/subjects", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  updateGradeSubject: async (id, payload) => {
    const response = await request(`/api/v1/grades/subjects/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  deleteGradeSubject: async (id) => {
    const response = await request(`/api/v1/grades/subjects/${id}`, {
      method: "DELETE",
    });
    return response.data;
  },
};

export default gradeSubjectService;

