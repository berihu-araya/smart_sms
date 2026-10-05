import { request } from "./apiClient";

export async function getTeacherAvailability(teacherId, academicYearId) {
  const params = new URLSearchParams();
  if (academicYearId) params.append("academic_year_id", academicYearId);

  const res = await request(`/api/v1/timetable/availability/${teacherId}?${params.toString()}`);
  return res.data;
}

export async function updateTeacherAvailability({ teacherId, academicYearId, slots = [] }) {
  const res = await request("/api/v1/timetable/availability", {
    method: "POST",
    body: JSON.stringify({
      teacher_id: teacherId,
      academic_year_id: academicYearId,
      slots,
    }),
  });
  return res.data;
}

const teacherAvailabilityService = {
  getTeacherAvailability,
  updateTeacherAvailability,
};

export default teacherAvailabilityService;
