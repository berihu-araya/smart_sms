import { request } from "./apiClient";

export async function listAcademicYears({ search = "", limit = 20, offset = 0 } = {}) {
  const response = await request(
    `/api/v1/academic-years?search=${encodeURIComponent(search)}&limit=${limit}&offset=${offset}`
  );
  return response.data;
}

export async function getAcademicYearById(id) {
  const response = await request(`/api/v1/academic-years/${id}`);
  return response.data;
}

export async function getActiveAcademicYear() {
  const response = await request("/api/v1/academic-years/active");
  return response.data;
}

export async function createAcademicYear(payload) {
  const response = await request("/api/v1/academic-years", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function updateAcademicYear(id, payload) {
  const response = await request(`/api/v1/academic-years/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function setActiveAcademicYear(id) {
  const response = await request(`/api/v1/academic-years/${id}/activate`, {
    method: "PATCH",
  });
  return response.data;
}

export async function deleteAcademicYear(id) {
  const response = await request(`/api/v1/academic-years/${id}`, {
    method: "DELETE",
  });
  return response.data;
}

const academicYearService = {
  listAcademicYears,
  getAcademicYearById,
  getActiveAcademicYear,
  createAcademicYear,
  updateAcademicYear,
  setActiveAcademicYear,
  deleteAcademicYear,
};

export default academicYearService;
