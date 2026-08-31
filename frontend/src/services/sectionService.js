import { request } from "./apiClient";

export async function listSections({
  search = "",
  gradeId = "",
  grade_id = "",
  status = "active",
  sortBy = "name",
  sortOrder = "ASC",
  limit = 20,
  offset = 0,
} = {}) {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  const targetGrade = gradeId || grade_id || "";
  if (targetGrade) params.append("gradeId", targetGrade);
  if (status) params.append("status", status);
  if (sortBy) params.append("sortBy", sortBy);
  if (sortOrder) params.append("sortOrder", sortOrder);
  if (limit) params.append("limit", limit);
  if (offset) params.append("offset", offset);

  const response = await request(`/api/v1/sections?${params.toString()}`);
  return response.data;
}

export async function getSectionById(id) {
  const response = await request(`/api/v1/sections/${id}`);
  return response.data;
}

export async function checkSectionReferences(id) {
  const response = await request(`/api/v1/sections/${id}/references`);
  return response.data;
}

export async function createSection(payload) {
  const response = await request("/api/v1/sections", {
    method: "POST",
    body: JSON.stringify({
      name: payload.name,
      gradeId: payload.gradeId || payload.grade_id,
      roomNumber: payload.roomNumber || payload.room_number,
      capacity: payload.capacity ? Number(payload.capacity) : null,
    }),
  });
  return response.data;
}

export async function updateSection(id, payload) {
  const response = await request(`/api/v1/sections/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      name: payload.name,
      gradeId: payload.gradeId || payload.grade_id,
      roomNumber: payload.roomNumber || payload.room_number,
      capacity: payload.capacity ? Number(payload.capacity) : null,
    }),
  });
  return response.data;
}

export async function deleteSection(id) {
  const response = await request(`/api/v1/sections/${id}`, {
    method: "DELETE",
  });
  return response.data;
}

export async function restoreSection(id) {
  const response = await request(`/api/v1/sections/${id}/restore`, {
    method: "POST",
  });
  return response.data;
}

const sectionService = {
  listSections,
  getSectionById,
  checkSectionReferences,
  createSection,
  updateSection,
  deleteSection,
  restoreSection,
};

export default sectionService;
