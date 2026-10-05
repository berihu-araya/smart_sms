import { request } from "./apiClient";

export async function listPeriods({
  academic_year_id,
  academicYearId,
  is_active,
  isActive,
  search = "",
} = {}) {
  const params = new URLSearchParams();
  const yearId = academic_year_id || academicYearId;
  if (yearId) params.append("academic_year_id", yearId);
  const active = is_active !== undefined ? is_active : isActive;
  if (active !== undefined && active !== null && active !== "") {
    params.append("is_active", active);
  }
  if (search) params.append("search", search);

  const res = await request(`/api/v1/timetable/periods?${params.toString()}`);
  return res.data;
}

export async function getPeriodById(id) {
  const res = await request(`/api/v1/timetable/periods/${id}`);
  return res.data;
}

export async function createPeriod(payload) {
  const res = await request("/api/v1/timetable/periods", {
    method: "POST",
    body: JSON.stringify({
      academic_year_id: payload.academic_year_id || payload.academicYearId,
      name: payload.name,
      period_type: payload.period_type || payload.periodType || "LESSON",
      start_time: payload.start_time || payload.startTime,
      end_time: payload.end_time || payload.endTime,
      period_order: Number(payload.period_order || payload.periodOrder),
      is_break: payload.is_break !== undefined ? payload.is_break : payload.isBreak ?? false,
      days_of_week: payload.days_of_week || payload.daysOfWeek,
      is_active: payload.is_active !== undefined ? payload.is_active : payload.isActive ?? true,
    }),
  });
  return res.data;
}

export async function updatePeriod(id, payload) {
  const res = await request(`/api/v1/timetable/periods/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function deletePeriod(id) {
  const res = await request(`/api/v1/timetable/periods/${id}`, {
    method: "DELETE",
  });
  return res.data;
}

export async function bulkReorderPeriods(items) {
  const res = await request("/api/v1/timetable/periods/bulk-reorder", {
    method: "POST",
    body: JSON.stringify({ items }),
  });
  return res.data;
}

const periodService = {
  listPeriods,
  getPeriodById,
  createPeriod,
  updatePeriod,
  deletePeriod,
  bulkReorderPeriods,
};

export default periodService;
