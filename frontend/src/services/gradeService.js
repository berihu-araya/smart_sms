import { request } from "./apiClient";

export async function listGrades({ search = "", limit = 20, offset = 0 } = {}) {
  const response = await request(
    `/api/v1/grades?search=${encodeURIComponent(search)}&limit=${limit}&offset=${offset}`
  );
  return response.data;
}

export async function getGradeById(id) {
  const response = await request(`/api/v1/grades/${id}`);
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

const gradeService = {
  listGrades,
  getGradeById,
  createGrade,
  updateGrade,
  deleteGrade,
};

export default gradeService;
