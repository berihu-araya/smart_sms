import { request } from "./apiClient";

const academicYearService = {
  listAcademicYears: async ({ search = "", limit = 20, offset = 0 } = {}) => {
    const response = await request(
      `/api/v1/academic-years?search=${encodeURIComponent(search)}&limit=${limit}&offset=${offset}`
    );
    return response.data;
  },

  getAcademicYearById: async (id) => {
    const response = await request(`/api/v1/academic-years/${id}`);
    return response.data;
  },

  getActiveAcademicYear: async () => {
    const response = await request("/api/v1/academic-years/active");
    return response.data;
  },

  createAcademicYear: async (payload) => {
    const response = await request("/api/v1/academic-years", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  updateAcademicYear: async (id, payload) => {
    const response = await request(`/api/v1/academic-years/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  setActiveAcademicYear: async (id) => {
    const response = await request(`/api/v1/academic-years/${id}/activate`, {
      method: "PATCH",
    });
    return response.data;
  },

  deleteAcademicYear: async (id) => {
    const response = await request(`/api/v1/academic-years/${id}`, {
      method: "DELETE",
    });
    return response.data;
  },
};

export default academicYearService;

