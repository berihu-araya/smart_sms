import { request } from "./apiClient";

export async function listTeachers({ search = "", limit = 20, offset = 0 } = {}) {
  const response = await request(
    `/api/v1/teachers?search=${encodeURIComponent(search)}&limit=${limit}&offset=${offset}`
  );
  return response.data;
}

export async function getTeacherById(id) {
  const response = await request(`/api/v1/teachers/${id}`);
  return response.data;
}

export async function createTeacher(payload) {
  const response = await request("/api/v1/teachers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function updateTeacher(id, payload) {
  const response = await request(`/api/v1/teachers/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function deleteTeacher(id) {
  const response = await request(`/api/v1/teachers/${id}`, {
    method: "DELETE",
  });
  return response.data;
}

export async function activateTeacher(id) {
  const response = await request(`/api/v1/teachers/${id}/activate`, {
    method: "PATCH",
  });
  return response.data;
}

export async function terminateTeacher(id) {
  const response = await request(`/api/v1/teachers/${id}/terminate`, {
    method: "PATCH",
  });
  return response.data;
}

export async function getTeacherProfile(id) {
  const response = await request(`/api/v1/teachers/${id}/profile`);
  return response.data;
}

const teacherService = {
  listTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  activateTeacher,
  terminateTeacher,
  getTeacherProfile,
};

export default teacherService;
