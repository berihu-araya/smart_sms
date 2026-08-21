import { request } from "./apiClient";

const parentService = {
  listParents: async ({ search = "", limit = 20, offset = 0 } = {}) => {
    const response = await request(
      `/api/v1/parents?search=${encodeURIComponent(search)}&limit=${limit}&offset=${offset}`
    );

    return {
      items: response.data || [],
      total: response.meta?.total || 0,
      page: response.meta?.page || 1,
      limit: response.meta?.limit || limit,
      totalPages: response.meta?.totalPages || 1,
    };
  },

  getParentById: async (id) => {
    const response = await request(`/api/v1/parents/${id}`);
    return response.data;
  },

  getParentStudents: async (id) => {
    const response = await request(`/api/v1/parents/${id}/students`);
    return response.data;
  },

  createParent: async (payload) => {
    const response = await request("/api/v1/parents", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return response.data;
  },

  updateParent: async (id, payload) => {
    const response = await request(`/api/v1/parents/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    return response.data;
  },

  deleteParent: async (id) => {
    const response = await request(`/api/v1/parents/${id}`, {
      method: "DELETE",
    });

    return response.data;
  },
};

export default parentService;
