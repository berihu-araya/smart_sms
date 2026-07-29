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
      body: JSON.stringify({
        subject_code: payload.subject_code,
        subject_name: payload.subject_name,
        short_name: payload.short_name,
        description: payload.description,
        credit_hours: payload.credit_hours,
        pass_mark: payload.pass_mark,
        max_mark: payload.max_mark,
        is_elective: payload.is_elective,
        is_lab: payload.is_lab,
        display_order: payload.display_order,
        status: payload.status,
      }),
    });

    return response.data;
  },

  updateSubject: async (id, payload) => {
    const response = await request(`/api/v1/subjects/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        subject_code: payload.subject_code,
        subject_name: payload.subject_name,
        short_name: payload.short_name,
        description: payload.description,
        credit_hours: payload.credit_hours,
        pass_mark: payload.pass_mark,
        max_mark: payload.max_mark,
        is_elective: payload.is_elective,
        is_lab: payload.is_lab,
        display_order: payload.display_order,
        status: payload.status,
      }),
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
