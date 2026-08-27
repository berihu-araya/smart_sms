import { request } from "./apiClient";

const studentService = {
  listStudents: async ({ name = "", gender = "", gradeId = "", sectionId = "", status = "", limit = 20, offset = 0 } = {}) => {
    const params = new URLSearchParams();
    if (name) params.append("name", name);
    if (gender) params.append("gender", gender);
    if (gradeId) params.append("gradeId", gradeId);
    if (sectionId) params.append("sectionId", sectionId);
    if (status) params.append("status", status);
    params.append("limit", limit);
    params.append("offset", offset);

    const response = await request(`/api/v1/students?${params.toString()}`);

    return response.data;
  },

  getStudentById: async (id) => {
    const response = await request(`/api/v1/students/${id}`);
    return response.data;
  },

  getStudentProfile: async (id) => {
    const response = await request(`/api/v1/students/${id}/profile`);
    return response.data;
  },

  createStudent: async (payload) => {
    const response = await request("/api/v1/students", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return response.data;
  },

  updateStudent: async (id, payload) => {
    const response = await request(`/api/v1/students/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    return response.data;
  },

  deleteStudent: async (id) => {
    const response = await request(`/api/v1/students/${id}`, {
      method: "DELETE",
    });

    return response.data;
  },
};

export default studentService;
