import { request } from "./apiClient";

export async function listTimetables({
  academic_year_id,
  academicYearId,
  term,
  status,
  limit = 50,
  offset = 0,
} = {}) {
  const params = new URLSearchParams();
  const yearId = academic_year_id || academicYearId;
  if (yearId) params.append("academic_year_id", yearId);
  if (term) params.append("term", term);
  if (status) params.append("status", status);
  if (limit) params.append("limit", limit);
  if (offset) params.append("offset", offset);

  const res = await request(`/api/v1/timetable?${params.toString()}`);
  return res.data;
}

export async function getTimetableById(id) {
  const res = await request(`/api/v1/timetable/${id}`);
  return res.data;
}

export async function createTimetable(payload) {
  const res = await request("/api/v1/timetable", {
    method: "POST",
    body: JSON.stringify({
      academic_year_id: payload.academic_year_id || payload.academicYearId,
      term: payload.term,
      name: payload.name,
      status: payload.status || "DRAFT",
    }),
  });
  return res.data;
}

export async function updateTimetable(id, payload) {
  const res = await request(`/api/v1/timetable/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function deleteTimetable(id) {
  const res = await request(`/api/v1/timetable/${id}`, {
    method: "DELETE",
  });
  return res.data;
}

export async function cloneTimetable(id, { name } = {}) {
  const res = await request(`/api/v1/timetable/${id}/clone`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return res.data;
}

export async function getActiveTimetable(academicYearId = null) {
  const params = new URLSearchParams();
  if (academicYearId) params.append("academic_year_id", academicYearId);
  const res = await request(`/api/v1/timetable/active?${params.toString()}`);
  return res.data;
}

export async function getMySchedule(academicYearId = null) {
  const params = new URLSearchParams();
  if (academicYearId) params.append("academic_year_id", academicYearId);
  const res = await request(`/api/v1/timetable/my-schedule?${params.toString()}`);
  return res.data;
}

export async function validateTimetable(id) {
  const res = await request(`/api/v1/timetable/${id}/validate`, {
    method: "POST",
  });
  return res.data;
}

// --- Timetable Entries ---

export async function listTimetableEntries(timetableId, query = {}) {
  const params = new URLSearchParams();
  if (query.section_id || query.sectionId) params.append("section_id", query.section_id || query.sectionId);
  if (query.teacher_id || query.teacherId) params.append("teacher_id", query.teacher_id || query.teacherId);
  if (query.room_id || query.roomId) params.append("room_id", query.room_id || query.roomId);
  if (query.day_of_week || query.dayOfWeek) params.append("day_of_week", query.day_of_week || query.dayOfWeek);
  if (query.period_id || query.periodId) params.append("period_id", query.period_id || query.periodId);

  const res = await request(`/api/v1/timetable/${timetableId}/entries?${params.toString()}`);
  return res.data;
}

export async function createTimetableEntry(timetableId, payload) {
  const res = await request(`/api/v1/timetable/${timetableId}/entries`, {
    method: "POST",
    body: JSON.stringify({
      section_id: payload.section_id || payload.sectionId,
      subject_id: payload.subject_id || payload.subjectId,
      teacher_id: payload.teacher_id || payload.teacherId,
      room_id: payload.room_id || payload.roomId || null,
      period_id: payload.period_id || payload.periodId,
      day_of_week: payload.day_of_week || payload.dayOfWeek,
    }),
  });
  return res.data;
}

export async function updateTimetableEntry(entryId, payload) {
  const res = await request(`/api/v1/timetable/entries/${entryId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function deleteTimetableEntry(entryId) {
  const res = await request(`/api/v1/timetable/entries/${entryId}`, {
    method: "DELETE",
  });
  return res.data;
}

export async function checkEntryConflict(timetableId, payload) {
  const res = await request(`/api/v1/timetable/${timetableId}/entries/check-conflict`, {
    method: "POST",
    body: JSON.stringify({
      section_id: payload.section_id || payload.sectionId,
      teacher_id: payload.teacher_id || payload.teacherId,
      room_id: payload.room_id || payload.roomId || null,
      period_id: payload.period_id || payload.periodId,
      day_of_week: payload.day_of_week || payload.dayOfWeek,
      exclude_entry_id: payload.exclude_entry_id || payload.excludeEntryId || null,
    }),
  });
  return res.data;
}

export async function publishTimetable(id) {
  const res = await request(`/api/v1/timetable/${id}/publish`, {
    method: "POST",
  });
  return res.data;
}

export async function archiveTimetable(id) {
  const res = await request(`/api/v1/timetable/${id}/archive`, {
    method: "POST",
  });
  return res.data;
}

export async function autoGenerateTimetable(id, options = {}) {
  const res = await request(`/api/v1/timetable/${id}/auto-generate`, {
    method: "POST",
    body: JSON.stringify({
      clear_existing: options.clearExisting ?? options.clear_existing ?? true,
      enforce_availability: options.enforceAvailability ?? options.enforce_availability ?? true,
      match_room_types: options.matchRoomTypes ?? options.match_room_types ?? true,
    }),
  });
  return res.data;
}

const timetableService = {
  listTimetables,
  getTimetableById,
  getActiveTimetable,
  getMySchedule,
  createTimetable,
  updateTimetable,
  deleteTimetable,
  cloneTimetable,
  publishTimetable,
  archiveTimetable,
  validateTimetable,
  autoGenerateTimetable,
  listTimetableEntries,
  createTimetableEntry,
  updateTimetableEntry,
  deleteTimetableEntry,
  checkEntryConflict,
};

export default timetableService;
