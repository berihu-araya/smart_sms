import { request } from "./apiClient";

export async function listSections({ search = "", gradeId = "", grade_id = "", limit = 20, offset = 0 } = {}) {
  const targetGrade = gradeId || grade_id || "";
  let url = `/api/v1/sections?search=${encodeURIComponent(search)}&limit=${limit}&offset=${offset}`;
  if (targetGrade) {
    url += `&gradeId=${encodeURIComponent(targetGrade)}`;
  }

  const response = await request(url);
  return response.data;
}

export async function getSectionById(id) {
  const response = await request(`/api/v1/sections/${id}`);
  return response.data;
}

export async function createSection(payload) {
  const response = await request("/api/v1/sections", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function updateSection(id, payload) {
  const response = await request(`/api/v1/sections/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function deleteSection(id) {
  const response = await request(`/api/v1/sections/${id}`, {
    method: "DELETE",
  });
  return response.data;
}

const sectionService = {
  listSections,
  getSectionById,
  createSection,
  updateSection,
  deleteSection,
};

export default sectionService;
