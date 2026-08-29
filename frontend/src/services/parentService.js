import { request } from "./apiClient";

export async function listParents({ search = "", limit = 20, offset = 0 } = {}) {
  const response = await request(
    `/api/v1/parents?search=${encodeURIComponent(search)}&limit=${limit}&offset=${offset}`
  );

  return {
    items: response.data || [],
    total: response.meta?.total || 0,
    page: response.meta?.page || 1,
    limit: response.meta?.limit || limit,
    totalPages: response.meta?.totalPages || 1,
  };
}

export async function getParentById(id) {
  const response = await request(`/api/v1/parents/${id}`);
  return response.data;
}

export async function getParentStudents(id) {
  const response = await request(`/api/v1/parents/${id}/students`);
  return response.data;
}

export async function createParent(payload) {
  const response = await request("/api/v1/parents", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function updateParent(id, payload) {
  const response = await request(`/api/v1/parents/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function deleteParent(id) {
  const response = await request(`/api/v1/parents/${id}`, {
    method: "DELETE",
  });
  return response.data;
}

const parentService = {
  listParents,
  getParentById,
  getParentStudents,
  createParent,
  updateParent,
  deleteParent,
};

export default parentService;
