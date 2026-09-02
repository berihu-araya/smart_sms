import { request } from "./apiClient";

export async function listSubstitutions({
  timetable_id,
  timetableId,
  teacher_id,
  teacherId,
  substitute_teacher_id,
  substituteTeacherId,
  date,
  from_date,
  fromDate,
  to_date,
  toDate,
  status,
  limit = 50,
  offset = 0,
} = {}) {
  const params = new URLSearchParams();
  const ttId = timetable_id || timetableId;
  if (ttId) params.append("timetable_id", ttId);
  const tId = teacher_id || teacherId;
  if (tId) params.append("teacher_id", tId);
  const subId = substitute_teacher_id || substituteTeacherId;
  if (subId) params.append("substitute_teacher_id", subId);
  if (date) params.append("date", date);
  const fDate = from_date || fromDate;
  if (fDate) params.append("from_date", fDate);
  const tDate = to_date || toDate;
  if (tDate) params.append("to_date", tDate);
  if (status) params.append("status", status);
  if (limit) params.append("limit", limit);
  if (offset) params.append("offset", offset);

  const res = await request(`/api/v1/timetable/substitutions?${params.toString()}`);
  return res.data;
}

export async function getSubstitutionById(id) {
  const res = await request(`/api/v1/timetable/substitutions/${id}`);
  return res.data;
}

export async function createSubstitution(payload) {
  const res = await request("/api/v1/timetable/substitutions", {
    method: "POST",
    body: JSON.stringify({
      timetable_entry_id: payload.timetable_entry_id || payload.timetableEntryId,
      substitute_teacher_id: payload.substitute_teacher_id || payload.substituteTeacherId,
      substitution_date: payload.substitution_date || payload.substitutionDate,
      reason: payload.reason || null,
      notes: payload.notes || null,
    }),
  });
  return res.data;
}

export async function approveSubstitution(id, { notes } = {}) {
  const res = await request(`/api/v1/timetable/substitutions/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ notes }),
  });
  return res.data;
}

export async function rejectSubstitution(id, { notes } = {}) {
  const res = await request(`/api/v1/timetable/substitutions/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ notes }),
  });
  return res.data;
}

export async function cancelSubstitution(id) {
  const res = await request(`/api/v1/timetable/substitutions/${id}/cancel`, {
    method: "POST",
  });
  return res.data;
}

const substitutionService = {
  listSubstitutions,
  getSubstitutionById,
  createSubstitution,
  approveSubstitution,
  rejectSubstitution,
  cancelSubstitution,
};

export default substitutionService;
