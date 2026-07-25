import { request } from "./apiClient";

const studentService = {
  listStudents: async ({ search = "", limit = 20, offset = 0 } = {}) => {
    const response = await request(
      `/api/v1/students?search=${encodeURIComponent(search)}&limit=${limit}&offset=${offset}`
    );

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
