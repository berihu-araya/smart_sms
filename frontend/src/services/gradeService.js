import { request } from "./apiClient";

const gradeService = {
  listGrades: async ({ search = "", limit = 20, offset = 0 } = {}) => {
    const response = await request(
      `/api/v1/grades?search=${encodeURIComponent(search)}&limit=${limit}&offset=${offset}`
    );

    return response.data;
  },

  getGradeById: async (id) => {
    const response = await request(`/api/v1/grades/${id}`);
    return response.data;
  },

  createGrade: async (payload) => {
    const response = await request("/api/v1/grades", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return response.data;
  },

  updateGrade: async (id, payload) => {
    const response = await request(`/api/v1/grades/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    return response.data;
  },

  deleteGrade: async (id) => {
    const response = await request(`/api/v1/grades/${id}`, {
      method: "DELETE",
    });

    return response.data;
  },
};

export default gradeService;

