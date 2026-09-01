import { request } from "./apiClient";

export async function listRoles({ search = "", limit = 100, offset = 0 } = {}) {
  const params = new URLSearchParams({
    search,
    limit,
    offset,
  }).toString();

  const response = await request(`/api/v1/staff-roles?${params}`);
  return response.data;
}

export async function listRoleAssignments({
  search = "",
  limit = 100,
  offset = 0,
  teacherId = "",
  academicYearId = "",
  roleId = "",
} = {}) {
  const params = new URLSearchParams({
    search,
    limit,
    offset,
    ...(teacherId && { teacher_id: teacherId }),
    ...(academicYearId && { academic_year_id: academicYearId }),
    ...(roleId && { role_id: roleId }),
  }).toString();

  const response = await request(`/api/v1/staff-roles/assignments?${params}`);
  return response.data;
}

export async function assignStaffRole(payload) {
  const response = await request("/api/v1/staff-roles/assignments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function getRoleAssignmentsByTeacher(teacherId, { limit = 100, offset = 0 } = {}) {
  const params = new URLSearchParams({
    limit,
    offset,
  }).toString();

  const response = await request(
    `/api/v1/staff-roles/assignments/teacher/${teacherId}?${params}`
  );
  return response.data;
}

export async function deactivateRoleAssignment(id) {
  const response = await request(`/api/v1/staff-roles/assignments/${id}/deactivate`, {
    method: "PATCH",
  });
  return response.data;
}

export default {
  listRoles,
  listRoleAssignments,
  assignStaffRole,
  getRoleAssignmentsByTeacher,
  deactivateRoleAssignment,
};
