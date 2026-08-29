import { request } from "./apiClient";

export async function listStudents({ name = "", gender = "", gradeId = "", sectionId = "", status = "", limit = 20, offset = 0 } = {}) {
  const params = new URLSearchParams();
  if (name) params.append("name", name);
  if (gender) params.append("gender", gender);
  if (gradeId) params.append("gradeId", gradeId);
  if (sectionId) params.append("sectionId", sectionId);
  if (status) params.append("status", status);
  params.append("limit", limit);
  params.append("offset", offset);

  const response = await request(`/api/v1/students?${params.toString()}`);
  return response.data;
}

export async function getStudentById(id) {
  const response = await request(`/api/v1/students/${id}`);
  return response.data;
}

export async function getStudentProfile(id) {
  const response = await request(`/api/v1/students/${id}/profile`);
  return response.data;
}

export async function createStudent(payload) {
  const response = await request("/api/v1/students", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function updateStudent(id, payload) {
  const response = await request(`/api/v1/students/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function deleteStudent(id) {
  const response = await request(`/api/v1/students/${id}`, {
    method: "DELETE",
  });
  return response.data;
}

const studentService = {
  listStudents,
  getStudentById,
  getStudentProfile,
  createStudent,
  updateStudent,
  deleteStudent,
};

export default studentService;
