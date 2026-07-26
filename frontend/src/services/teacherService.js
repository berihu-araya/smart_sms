import { request } from "./apiClient";

const teacherService = {
  listTeachers: async ({ search = "", limit = 20, offset = 0 } = {}) => {
    const response = await request(
      `/api/v1/teachers?search=${encodeURIComponent(search)}&limit=${limit}&offset=${offset}`
    );

    return response.data;
  },

  getTeacherById: async (id) => {
    const response = await request(`/api/v1/teachers/${id}`);
    return response.data;
  },

  createTeacher: async (payload) => {
    const response = await request("/api/v1/teachers", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return response.data;
  },

  updateTeacher: async (id, payload) => {
    const response = await request(`/api/v1/teachers/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    return response.data;
  },

  deleteTeacher: async (id) => {
    const response = await request(`/api/v1/teachers/${id}`, {
      method: "DELETE",
    });

    return response.data;
  },

  activateTeacher: async (id) => {
    const response = await request(`/api/v1/teachers/${id}/activate`, {
      method: "PATCH",
    });

    return response.data;
  },

  terminateTeacher: async (id) => {
    const response = await request(`/api/v1/teachers/${id}/terminate`, {
      method: "PATCH",
    });

    return response.data;
  },

  getTeacherProfile: async (id) => {
    const response = await request(`/api/v1/teachers/${id}/profile`);
    return response.data;
  },
};

export default teacherService;

