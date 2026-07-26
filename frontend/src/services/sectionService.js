import { request } from "./apiClient";

const sectionService = {
  listSections: async ({ search = "", gradeId = "", limit = 20, offset = 0 } = {}) => {
    let url = `/api/v1/sections?search=${encodeURIComponent(search)}&limit=${limit}&offset=${offset}`;
    if (gradeId) {
      url += `&gradeId=${encodeURIComponent(gradeId)}`;
    }

    const response = await request(url);

    return response.data;
  },

  getSectionById: async (id) => {
    const response = await request(`/api/v1/sections/${id}`);
    return response.data;
  },

  createSection: async (payload) => {
    const response = await request("/api/v1/sections", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return response.data;
  },

  updateSection: async (id, payload) => {
    const response = await request(`/api/v1/sections/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    return response.data;
  },

  deleteSection: async (id) => {
    const response = await request(`/api/v1/sections/${id}`, {
      method: "DELETE",
    });

    return response.data;
  },
};

export default sectionService;

