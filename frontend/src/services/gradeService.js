import { request } from "./apiClient";

export async function listGrades({
  search = "",
  status = "active",
  sortBy = "name",
  sortOrder = "ASC",
  limit = 20,
  offset = 0,
} = {}) {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (status) params.append("status", status);
  if (sortBy) params.append("sortBy", sortBy);
  if (sortOrder) params.append("sortOrder", sortOrder);
  if (limit) params.append("limit", limit);
  if (offset) params.append("offset", offset);

  const response = await request(`/api/v1/grades?${params.toString()}`);
  return response.data;
}

export async function getGradeById(id) {
  const response = await request(`/api/v1/grades/${id}`);
  return response.data;
}

export async function checkGradeReferences(id) {
  const response = await request(`/api/v1/grades/${id}/references`);
  return response.data;
}

export async function createGrade(payload) {
  const response = await request("/api/v1/grades", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function updateGrade(id, payload) {
  const response = await request(`/api/v1/grades/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function deleteGrade(id) {
  const response = await request(`/api/v1/grades/${id}`, {
    method: "DELETE",
  });
  return response.data;
}

export async function restoreGrade(id) {
  const response = await request(`/api/v1/grades/${id}/restore`, {
    method: "POST",
  });
  return response.data;
}

const gradeService = {
  listGrades,
  getGradeById,
  checkGradeReferences,
  createGrade,
  updateGrade,
  deleteGrade,
  restoreGrade,
};

export default gradeService;
