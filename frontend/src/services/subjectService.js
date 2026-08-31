import { request } from "./apiClient";

export async function listSubjects({
  search = "",
  status = "active",
  sortBy = "subject_name",
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

  const response = await request(`/api/v1/subjects?${params.toString()}`);
  return response.data;
}

export async function getSubjectById(id) {
  const response = await request(`/api/v1/subjects/${id}`);
  return response.data;
}

export async function checkSubjectReferences(id) {
  const response = await request(`/api/v1/subjects/${id}/references`);
  return response.data;
}

export async function createSubject(payload) {
  const response = await request("/api/v1/subjects", {
    method: "POST",
    body: JSON.stringify({
      subject_code: payload.subject_code || payload.subjectCode,
      subject_name: payload.subject_name || payload.subjectName,
      short_name: payload.short_name || payload.shortName || null,
      description: payload.description || null,
      credit_hours: payload.credit_hours !== undefined && payload.credit_hours !== "" ? Number(payload.credit_hours) : null,
      pass_mark: payload.pass_mark !== undefined && payload.pass_mark !== "" ? Number(payload.pass_mark) : null,
      max_mark: payload.max_mark !== undefined && payload.max_mark !== "" ? Number(payload.max_mark) : null,
      is_elective: Boolean(payload.is_elective),
      is_lab: Boolean(payload.is_lab),
      display_order: payload.display_order ? Number(payload.display_order) : 0,
      status: payload.status || "ACTIVE",
    }),
  });
  return response.data;
}

export async function updateSubject(id, payload) {
  const response = await request(`/api/v1/subjects/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      subject_code: payload.subject_code || payload.subjectCode,
      subject_name: payload.subject_name || payload.subjectName,
      short_name: payload.short_name || payload.shortName || null,
      description: payload.description || null,
      credit_hours: payload.credit_hours !== undefined && payload.credit_hours !== "" ? Number(payload.credit_hours) : null,
      pass_mark: payload.pass_mark !== undefined && payload.pass_mark !== "" ? Number(payload.pass_mark) : null,
      max_mark: payload.max_mark !== undefined && payload.max_mark !== "" ? Number(payload.max_mark) : null,
      is_elective: Boolean(payload.is_elective),
      is_lab: Boolean(payload.is_lab),
      display_order: payload.display_order ? Number(payload.display_order) : 0,
      status: payload.status,
    }),
  });
  return response.data;
}

export async function deleteSubject(id) {
  const response = await request(`/api/v1/subjects/${id}`, {
    method: "DELETE",
  });
  return response.data;
}

export async function restoreSubject(id) {
  const response = await request(`/api/v1/subjects/${id}/restore`, {
    method: "POST",
  });
  return response.data;
}

const subjectService = {
  listSubjects,
  getSubjectById,
  checkSubjectReferences,
  createSubject,
  updateSubject,
  deleteSubject,
  restoreSubject,
};

export default subjectService;
