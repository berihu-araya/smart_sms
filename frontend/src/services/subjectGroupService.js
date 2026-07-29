import { request } from "./apiClient";

const subjectGroupService = {
  // ── Groups CRUD ──

  listGroups: async ({ search = "", limit = 20, offset = 0 } = {}) => {
    const response = await request(
      `/api/v1/subjects/groups?search=${encodeURIComponent(search)}&limit=${limit}&offset=${offset}`
    );
    return response.data;
  },

  getGroupById: async (id) => {
    const response = await request(`/api/v1/subjects/groups/${id}`);
    return response.data;
  },

  createGroup: async (payload) => {
    const response = await request("/api/v1/subjects/groups", {
      method: "POST",
      body: JSON.stringify({
        group_name: payload.group_name,
        description: payload.description,
      }),
    });
    return response.data;
  },

  updateGroup: async (id, payload) => {
    const response = await request(`/api/v1/subjects/groups/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        group_name: payload.group_name,
        description: payload.description,
      }),
    });
    return response.data;
  },

  deleteGroup: async (id) => {
    const response = await request(`/api/v1/subjects/groups/${id}`, {
      method: "DELETE",
    });
    return response.data;
  },

  // ── Group Subjects sub-routes ──

  listGroupSubjects: async (groupId) => {
    const response = await request(`/api/v1/subjects/groups/${groupId}/subjects`);
    return response.data;
  },

  assignSubject: async (groupId, subjectId) => {
    const response = await request(`/api/v1/subjects/groups/${groupId}/subjects`, {
      method: "POST",
      body: JSON.stringify({ subject_id: subjectId }),
    });
    return response.data;
  },

  removeSubject: async (groupId, subjectId) => {
    const response = await request(`/api/v1/subjects/groups/${groupId}/subjects/${subjectId}`, {
      method: "DELETE",
    });
    return response.data;
  },
};

export default subjectGroupService;

