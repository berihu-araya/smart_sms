import { request } from "./apiClient";

export async function listSubjects({ search = "", limit = 20, offset = 0 } = {}) {
  const response = await request(
    `/api/v1/subjects?search=${encodeURIComponent(search)}&limit=${limit}&offset=${offset}`
  );
  return response.data;
}

export async function getSubjectById(id) {
  const response = await request(`/api/v1/subjects/${id}`);
  return response.data;
}

export async function createSubject(payload) {
  const response = await request("/api/v1/subjects", {
    method: "POST",
    body: JSON.stringify({
      subject_code: payload.subject_code,
      subject_name: payload.subject_name,
      short_name: payload.short_name,
      description: payload.description,
      credit_hours: payload.credit_hours,
      pass_mark: payload.pass_mark,
      max_mark: payload.max_mark,
      is_elective: payload.is_elective,
      is_lab: payload.is_lab,
      display_order: payload.display_order,
      status: payload.status,
    }),
  });
  return response.data;
}

export async function updateSubject(id, payload) {
  const response = await request(`/api/v1/subjects/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      subject_code: payload.subject_code,
      subject_name: payload.subject_name,
      short_name: payload.short_name,
      description: payload.description,
      credit_hours: payload.credit_hours,
      pass_mark: payload.pass_mark,
      max_mark: payload.max_mark,
      is_elective: payload.is_elective,
      is_lab: payload.is_lab,
      display_order: payload.display_order,
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

const subjectService = {
  listSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
};

export default subjectService;
