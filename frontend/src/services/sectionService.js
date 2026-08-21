import { request } from "./apiClient";

const sectionService = {
  listSections: async ({ search = "", gradeId = "", grade_id = "", limit = 20, offset = 0 } = {}) => {
    const targetGrade = gradeId || grade_id || "";
    let url = `/api/v1/sections?search=${encodeURIComponent(search)}&limit=${limit}&offset=${offset}`;
    if (targetGrade) {
      url += `&gradeId=${encodeURIComponent(targetGrade)}`;
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

