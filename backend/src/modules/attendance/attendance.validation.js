const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];

function isValidUUID(value) {
  return typeof value === 'string' && UUID_REGEX.test(value.trim());
}

function isValidDate(dateString) {
  if (!dateString || typeof dateString !== 'string') return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  const d = new Date(dateString);
  return d instanceof Date && !isNaN(d.getTime());
}

function validateSheetQuery(query = {}) {
  const errors = {};

  if (!query.sectionId || !isValidUUID(query.sectionId)) {
    errors.sectionId = 'Valid sectionId is required.';
  }

  if (!query.date || !isValidDate(query.date)) {
    errors.date = 'Valid date in YYYY-MM-DD format is required.';
  }

  return {
    sectionId: query.sectionId ? query.sectionId.trim() : null,
    date: query.date ? query.date.trim() : null,
    academicYearId: query.academicYearId && isValidUUID(query.academicYearId) ? query.academicYearId.trim() : null,
    errors,
  };
}

function validateBulkAttendanceInput(body = {}) {
  const errors = {};

  if (!body.sectionId || !isValidUUID(body.sectionId)) {
    errors.sectionId = 'Valid sectionId is required.';
  }

  if (!body.date || !isValidDate(body.date)) {
    errors.date = 'Valid date (YYYY-MM-DD) is required.';
  }

  if (!Array.isArray(body.records) || body.records.length === 0) {
    errors.records = 'Records array cannot be empty.';
  } else {
    const recordErrors = [];
    body.records.forEach((rec, idx) => {
      const recErr = {};
      if (!rec.studentId || !isValidUUID(rec.studentId)) {
        recErr.studentId = 'Valid studentId is required';
      }
      const status = (rec.status || '').toUpperCase().trim();
      if (!ALLOWED_STATUSES.includes(status)) {
        recErr.status = `Status must be one of: ${ALLOWED_STATUSES.join(', ')}`;
      }
      if (Object.keys(recErr).length > 0) {
        recordErrors.push({ index: idx, ...recErr });
      }
    });

    if (recordErrors.length > 0) {
      errors.recordDetails = recordErrors;
    }
  }

  return {
    sectionId: body.sectionId ? body.sectionId.trim() : null,
    date: body.date ? body.date.trim() : null,
    academicYearId: body.academicYearId && isValidUUID(body.academicYearId) ? body.academicYearId.trim() : null,
    records: Array.isArray(body.records)
      ? body.records.map((r) => ({
          studentId: r.studentId.trim(),
          status: (r.status || 'PRESENT').toUpperCase().trim(),
          remark: r.remark ? r.remark.trim() : null,
        }))
      : [],
    errors,
  };
}

function validateReportQuery(query = {}) {
  const errors = {};

  const academicYearId = query.academicYearId && isValidUUID(query.academicYearId) ? query.academicYearId.trim() : null;
  const gradeId = query.gradeId && isValidUUID(query.gradeId) ? query.gradeId.trim() : null;
  const sectionId = query.sectionId && isValidUUID(query.sectionId) ? query.sectionId.trim() : null;
  const studentId = query.studentId && isValidUUID(query.studentId) ? query.studentId.trim() : null;

  let startDate = query.startDate && isValidDate(query.startDate) ? query.startDate.trim() : null;
  let endDate = query.endDate && isValidDate(query.endDate) ? query.endDate.trim() : null;
  const period = query.period || 'this_month';

  if (!startDate || !endDate) {
    const now = new Date();
    if (period === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      startDate = todayStr;
      endDate = todayStr;
    } else if (period === 'this_week') {
      const day = now.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      startDate = monday.toISOString().split('T')[0];
      endDate = now.toISOString().split('T')[0];
    } else if (period === 'this_month') {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      startDate = `${year}-${month}-01`;
      endDate = now.toISOString().split('T')[0];
    } else {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      startDate = thirtyDaysAgo.toISOString().split('T')[0];
      endDate = now.toISOString().split('T')[0];
    }
  }

  return {
    academicYearId,
    gradeId,
    sectionId,
    studentId,
    startDate,
    endDate,
    period,
    errors,
  };
}

module.exports = {
  isValidUUID,
  isValidDate,
  validateSheetQuery,
  validateBulkAttendanceInput,
  validateReportQuery,
};
