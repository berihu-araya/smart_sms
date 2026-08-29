const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(value) {
  return typeof value === 'string' && UUID_REGEX.test(value.trim());
}

function validateMarksSheetQuery(query = {}) {
  const errors = {};

  if (!query.examId || !isValidUUID(query.examId)) {
    errors.examId = 'Valid examId is required.';
  }

  if (!query.subjectId || !isValidUUID(query.subjectId)) {
    errors.subjectId = 'Valid subjectId is required.';
  }

  if (!query.sectionId || !isValidUUID(query.sectionId)) {
    errors.sectionId = 'Valid sectionId is required.';
  }

  return {
    examId: query.examId ? query.examId.trim() : null,
    subjectId: query.subjectId ? query.subjectId.trim() : null,
    sectionId: query.sectionId ? query.sectionId.trim() : null,
    errors,
  };
}

function validateBatchMarksInput(body = {}) {
  const errors = {};

  if (!body.examId || !isValidUUID(body.examId)) {
    errors.examId = 'Valid examId is required.';
  }

  if (!body.subjectId || !isValidUUID(body.subjectId)) {
    errors.subjectId = 'Valid subjectId is required.';
  }

  if (!body.sectionId || !isValidUUID(body.sectionId)) {
    errors.sectionId = 'Valid sectionId is required.';
  }

  if (!Array.isArray(body.marks) || body.marks.length === 0) {
    errors.marks = 'Marks array cannot be empty.';
  } else {
    const markErrors = [];
    body.marks.forEach((m, idx) => {
      const itemErr = {};
      if (!m.studentId || !isValidUUID(m.studentId)) {
        itemErr.studentId = 'Valid studentId is required';
      }
      const score = Number(m.score);
      if (!m.isAbsent && (isNaN(score) || score < 0 || score > 1000)) {
        itemErr.score = 'Score must be a valid non-negative number';
      }
      if (Object.keys(itemErr).length > 0) {
        markErrors.push({ index: idx, ...itemErr });
      }
    });

    if (markErrors.length > 0) {
      errors.markDetails = markErrors;
    }
  }

  return {
    examId: body.examId ? body.examId.trim() : null,
    subjectId: body.subjectId ? body.subjectId.trim() : null,
    sectionId: body.sectionId ? body.sectionId.trim() : null,
    marks: Array.isArray(body.marks)
      ? body.marks.map((m) => ({
          studentId: m.studentId.trim(),
          score: m.isAbsent ? 0 : Number(m.score || 0),
          isAbsent: Boolean(m.isAbsent),
          remarks: m.remarks ? m.remarks.trim() : null,
        }))
      : [],
    errors,
  };
}

module.exports = {
  isValidUUID,
  validateMarksSheetQuery,
  validateBatchMarksInput,
};
