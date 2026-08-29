import { request } from "./apiClient";

export async function listGroups({ search = "", limit = 20, offset = 0 } = {}) {
  const response = await request(
    `/api/v1/subjects/groups?search=${encodeURIComponent(search)}&limit=${limit}&offset=${offset}`
  );
  return response.data;
}

export async function getGroupById(id) {
  const response = await request(`/api/v1/subjects/groups/${id}`);
  return response.data;
}

export async function createGroup(payload) {
  const response = await request("/api/v1/subjects/groups", {
    method: "POST",
    body: JSON.stringify({
      group_name: payload.group_name,
      description: payload.description,
    }),
  });
  return response.data;
}

export async function updateGroup(id, payload) {
  const response = await request(`/api/v1/subjects/groups/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      group_name: payload.group_name,
      description: payload.description,
    }),
  });
  return response.data;
}

export async function deleteGroup(id) {
  const response = await request(`/api/v1/subjects/groups/${id}`, {
    method: "DELETE",
  });
  return response.data;
}

export async function listGroupSubjects(groupId) {
  const response = await request(`/api/v1/subjects/groups/${groupId}/subjects`);
  return response.data;
}

export async function assignSubject(groupId, subjectId) {
  const response = await request(`/api/v1/subjects/groups/${groupId}/subjects`, {
    method: "POST",
    body: JSON.stringify({ subject_id: subjectId }),
  });
  return response.data;
}

export async function removeSubject(groupId, subjectId) {
  const response = await request(`/api/v1/subjects/groups/${groupId}/subjects/${subjectId}`, {
    method: "DELETE",
  });
  return response.data;
}

const subjectGroupService = {
  listGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
  listGroupSubjects,
  assignSubject,
  removeSubject,
};

export default subjectGroupService;
