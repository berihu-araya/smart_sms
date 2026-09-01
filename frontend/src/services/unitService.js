import { request } from "./apiClient";

export async function listUnits({ search = "", limit = 100, offset = 0 } = {}) {
  const params = new URLSearchParams({
    search,
    limit,
    offset,
  }).toString();

  const response = await request(`/api/v1/units?${params}`);
  return response.data;
}

export async function getUnitById(id) {
  const response = await request(`/api/v1/units/${id}`);
  return response.data;
}

export async function createUnit(payload) {
  const response = await request("/api/v1/units", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function updateUnit(id, payload) {
  const response = await request(`/api/v1/units/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function deleteUnit(id) {
  const response = await request(`/api/v1/units/${id}`, {
    method: "DELETE",
  });
  return response.data;
}

export async function assignClassToUnit(payload) {
  const response = await request("/api/v1/units/assign-class", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function getUnitClasses(unitId, { limit = 100, offset = 0 } = {}) {
  const params = new URLSearchParams({
    limit,
    offset,
  }).toString();

  const response = await request(`/api/v1/units/${unitId}/classes?${params}`);
  return response.data;
}

export async function removeClassFromUnit(unitId, assignmentId) {
  const response = await request(`/api/v1/units/${unitId}/classes/${assignmentId}`, {
    method: "DELETE",
  });
  return response.data;
}

export default {
  listUnits,
  getUnitById,
  createUnit,
  updateUnit,
  deleteUnit,
  assignClassToUnit,
  getUnitClasses,
  removeClassFromUnit,
};
