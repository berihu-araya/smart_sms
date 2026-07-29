import { request } from "./apiClient";

const subjectService = {
  listSubjects: async ({ search = "", limit = 20, offset = 0 } = {}) => {
    const response = await request(
      `/api/v1/subjects?search=${encodeURIComponent(search)}&limit=${limit}&offset=${offset}`
    );

    return response.data;
  },

  getSubjectById: async (id) => {
    const response = await request(`/api/v1/subjects/${id}`);
    return response.data;
  },

  createSubject: async (payload) => {
    const response = await request("/api/v1/subjects", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return response.data;
  },

  updateSubject: async (id, payload) => {
    const response = await request(`/api/v1/subjects/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    return response.data;
  },

  deleteSubject: async (id) => {
    const response = await request(`/api/v1/subjects/${id}`, {
      method: "DELETE",
    });

    return response.data;
  },
};

export default subjectService;

