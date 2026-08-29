const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_EXAM_TYPES = ['MIDTERM', 'FINAL', 'QUIZ', 'ASSIGNMENT', 'PROJECT', 'TEST'];

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

function validateCreateExamInput(body = {}) {
  const errors = {};

  if (!body.title || typeof body.title !== 'string' || body.title.trim().length < 2) {
    errors.title = 'Title must be at least 2 characters long.';
  }

  const examType = (body.examType || 'FINAL').toUpperCase().trim();
  if (!ALLOWED_EXAM_TYPES.includes(examType)) {
    errors.examType = `Exam type must be one of: ${ALLOWED_EXAM_TYPES.join(', ')}`;
  }

  const maxMarks = Number(body.maxMarks);
  if (isNaN(maxMarks) || maxMarks <= 0 || maxMarks > 1000) {
    errors.maxMarks = 'Max marks must be a positive number up to 1000.';
  }

  const weightPercentage = Number(body.weightPercentage ?? 100);
  if (isNaN(weightPercentage) || weightPercentage < 0 || weightPercentage > 100) {
    errors.weightPercentage = 'Weight percentage must be between 0 and 100.';
  }

  if (body.examDate && !isValidDate(body.examDate)) {
    errors.examDate = 'Exam date must be a valid date in YYYY-MM-DD format.';
  }

  if (body.gradeId && !isValidUUID(body.gradeId)) {
    errors.gradeId = 'Invalid grade ID format.';
  }

  if (body.subjectId && !isValidUUID(body.subjectId)) {
    errors.subjectId = 'Invalid subject ID format.';
  }

  if (body.academicYearId && !isValidUUID(body.academicYearId)) {
    errors.academicYearId = 'Invalid academic year ID format.';
  }

  return {
    title: body.title ? body.title.trim() : '',
    termOrSemester: body.termOrSemester ? body.termOrSemester.trim() : 'Semester 1',
    examType,
    maxMarks: maxMarks || 100,
    weightPercentage: weightPercentage || 100,
    examDate: body.examDate ? body.examDate.trim() : null,
    gradeId: body.gradeId ? body.gradeId.trim() : null,
    subjectId: body.subjectId ? body.subjectId.trim() : null,
    academicYearId: body.academicYearId ? body.academicYearId.trim() : null,
    isPublished: Boolean(body.isPublished),
    description: body.description ? body.description.trim() : null,
    errors,
  };
}

function validateUpdateExamInput(body = {}) {
  const errors = {};

  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim().length < 2) {
      errors.title = 'Title must be at least 2 characters long.';
    }
  }

  if (body.examType !== undefined) {
    const examType = (body.examType || '').toUpperCase().trim();
    if (!ALLOWED_EXAM_TYPES.includes(examType)) {
      errors.examType = `Exam type must be one of: ${ALLOWED_EXAM_TYPES.join(', ')}`;
    }
  }

  if (body.maxMarks !== undefined) {
    const maxMarks = Number(body.maxMarks);
    if (isNaN(maxMarks) || maxMarks <= 0 || maxMarks > 1000) {
      errors.maxMarks = 'Max marks must be a positive number up to 1000.';
    }
  }

  if (body.weightPercentage !== undefined) {
    const weight = Number(body.weightPercentage);
    if (isNaN(weight) || weight < 0 || weight > 100) {
      errors.weightPercentage = 'Weight percentage must be between 0 and 100.';
    }
  }

  if (body.examDate !== undefined && body.examDate !== null && !isValidDate(body.examDate)) {
    errors.examDate = 'Exam date must be a valid date in YYYY-MM-DD format.';
  }

  return {
    title: body.title !== undefined ? body.title.trim() : undefined,
    termOrSemester: body.termOrSemester !== undefined ? body.termOrSemester.trim() : undefined,
    examType: body.examType !== undefined ? body.examType.toUpperCase().trim() : undefined,
    maxMarks: body.maxMarks !== undefined ? Number(body.maxMarks) : undefined,
    weightPercentage: body.weightPercentage !== undefined ? Number(body.weightPercentage) : undefined,
    examDate: body.examDate !== undefined ? body.examDate : undefined,
    gradeId: body.gradeId !== undefined ? (body.gradeId ? body.gradeId.trim() : null) : undefined,
    subjectId: body.subjectId !== undefined ? (body.subjectId ? body.subjectId.trim() : null) : undefined,
    academicYearId: body.academicYearId !== undefined ? (body.academicYearId ? body.academicYearId.trim() : null) : undefined,
    isPublished: body.isPublished !== undefined ? Boolean(body.isPublished) : undefined,
    description: body.description !== undefined ? body.description.trim() : undefined,
    errors,
  };
}

module.exports = {
  isValidUUID,
  validateCreateExamInput,
  validateUpdateExamInput,
};
