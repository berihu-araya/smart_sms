const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(value) {
  return typeof value === 'string' && UUID_REGEX.test(value.trim());
}

function sanitizeText(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseNumber(value, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function validateCreateAssignmentInput(body = {}) {
  const errors = {};

  const title = sanitizeText(body.title);
  if (!title) {
    errors.title = 'Assignment title is required';
  } else if (title.length < 3 || title.length > 255) {
    errors.title = 'Title must be between 3 and 255 characters';
  }

  const gradeId = body.gradeId || body.grade_id;
  if (!gradeId || !isValidUUID(gradeId)) {
    errors.gradeId = 'A valid grade selection is required';
  }

  const subjectId = body.subjectId || body.subject_id;
  if (!subjectId || !isValidUUID(subjectId)) {
    errors.subjectId = 'A valid subject selection is required';
  }

  const academicYearId = body.academicYearId || body.academic_year_id;
  if (academicYearId && !isValidUUID(academicYearId)) {
    errors.academicYearId = 'Invalid academic year format';
  }

  const sectionId = body.sectionId || body.section_id;
  if (sectionId && !isValidUUID(sectionId)) {
    errors.sectionId = 'Invalid section format';
  }

  const teacherId = body.teacherId || body.teacher_id;
  if (teacherId && !isValidUUID(teacherId)) {
    errors.teacherId = 'Invalid teacher format';
  }

  const dueDate = body.dueDate || body.due_date;
  if (!dueDate) {
    errors.dueDate = 'Due date is required';
  } else {
    const parsedDate = new Date(dueDate);
    if (Number.isNaN(parsedDate.getTime())) {
      errors.dueDate = 'Invalid due date format';
    }
  }

  const maxMarks = parseNumber(body.maxMarks ?? body.max_marks, 100);
  if (maxMarks <= 0 || maxMarks > 1000) {
    errors.maxMarks = 'Max marks must be between 1 and 1000';
  }

  const passMarks = parseNumber(body.passMarks ?? body.pass_marks, null);
  if (passMarks !== null && (passMarks < 0 || passMarks > maxMarks)) {
    errors.passMarks = 'Pass marks cannot exceed max marks';
  }

  const status = sanitizeText(body.status) || 'PUBLISHED';
  if (!['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED'].includes(status.toUpperCase())) {
    errors.status = 'Status must be DRAFT, PUBLISHED, CLOSED, or ARCHIVED';
  }

  const submissionType = sanitizeText(body.submissionType || body.submission_type) || 'ONLINE_TEXT_AND_FILE';
  if (!['ONLINE_TEXT', 'FILE_UPLOAD', 'ONLINE_TEXT_AND_FILE', 'PHYSICAL_SUBMISSION'].includes(submissionType.toUpperCase())) {
    errors.submissionType = 'Invalid submission type';
  }

  let attachmentUrls = body.attachmentUrls || body.attachment_urls || [];
  if (typeof attachmentUrls === 'string') {
    try {
      attachmentUrls = JSON.parse(attachmentUrls);
    } catch {
      attachmentUrls = [attachmentUrls];
    }
  }
  if (!Array.isArray(attachmentUrls)) {
    attachmentUrls = [];
  }

  return {
    errors,
    title,
    description: sanitizeText(body.description),
    gradeId,
    sectionId: sectionId || null,
    subjectId,
    academicYearId: academicYearId || null,
    teacherId: teacherId || null,
    dueDate: dueDate ? new Date(dueDate).toISOString() : null,
    assignedDate: body.assignedDate || body.assigned_date || null,
    maxMarks,
    passMarks: passMarks ?? Number((maxMarks * 0.5).toFixed(2)),
    allowLateSubmissions: body.allowLateSubmissions !== undefined ? Boolean(body.allowLateSubmissions) : true,
    submissionType: submissionType.toUpperCase(),
    status: status.toUpperCase(),
    attachmentUrls,
  };
}

function validateUpdateAssignmentInput(body = {}) {
  const errors = {};
  const payload = {};

  if (body.title !== undefined) {
    const title = sanitizeText(body.title);
    if (!title || title.length < 3 || title.length > 255) {
      errors.title = 'Title must be between 3 and 255 characters';
    } else {
      payload.title = title;
    }
  }

  if (body.description !== undefined) {
    payload.description = sanitizeText(body.description);
  }

  if (body.gradeId !== undefined || body.grade_id !== undefined) {
    const gradeId = body.gradeId || body.grade_id;
    if (!isValidUUID(gradeId)) {
      errors.gradeId = 'Invalid grade format';
    } else {
      payload.gradeId = gradeId;
    }
  }

  if (body.sectionId !== undefined || body.section_id !== undefined) {
    const sectionId = body.sectionId || body.section_id;
    if (sectionId && !isValidUUID(sectionId)) {
      errors.sectionId = 'Invalid section format';
    } else {
      payload.sectionId = sectionId || null;
    }
  }

  if (body.subjectId !== undefined || body.subject_id !== undefined) {
    const subjectId = body.subjectId || body.subject_id;
    if (!isValidUUID(subjectId)) {
      errors.subjectId = 'Invalid subject format';
    } else {
      payload.subjectId = subjectId;
    }
  }

  if (body.academicYearId !== undefined || body.academic_year_id !== undefined) {
    const academicYearId = body.academicYearId || body.academic_year_id;
    if (academicYearId && !isValidUUID(academicYearId)) {
      errors.academicYearId = 'Invalid academic year format';
    } else {
      payload.academicYearId = academicYearId || null;
    }
  }

  if (body.teacherId !== undefined || body.teacher_id !== undefined) {
    const teacherId = body.teacherId || body.teacher_id;
    if (teacherId && !isValidUUID(teacherId)) {
      errors.teacherId = 'Invalid teacher format';
    } else {
      payload.teacherId = teacherId || null;
    }
  }

  if (body.dueDate !== undefined || body.due_date !== undefined) {
    const dueDate = body.dueDate || body.due_date;
    const parsedDate = new Date(dueDate);
    if (Number.isNaN(parsedDate.getTime())) {
      errors.dueDate = 'Invalid due date format';
    } else {
      payload.dueDate = parsedDate.toISOString();
    }
  }

  if (body.maxMarks !== undefined || body.max_marks !== undefined) {
    const maxMarks = parseNumber(body.maxMarks ?? body.max_marks);
    if (maxMarks === null || maxMarks <= 0 || maxMarks > 1000) {
      errors.maxMarks = 'Max marks must be between 1 and 1000';
    } else {
      payload.maxMarks = maxMarks;
    }
  }

  if (body.passMarks !== undefined || body.pass_marks !== undefined) {
    const passMarks = parseNumber(body.passMarks ?? body.pass_marks);
    if (passMarks === null || passMarks < 0) {
      errors.passMarks = 'Invalid pass marks';
    } else {
      payload.passMarks = passMarks;
    }
  }

  if (body.allowLateSubmissions !== undefined || body.allow_late_submissions !== undefined) {
    payload.allowLateSubmissions = Boolean(body.allowLateSubmissions ?? body.allow_late_submissions);
  }

  if (body.status !== undefined) {
    const status = sanitizeText(body.status)?.toUpperCase();
    if (!['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED'].includes(status)) {
      errors.status = 'Status must be DRAFT, PUBLISHED, CLOSED, or ARCHIVED';
    } else {
      payload.status = status;
    }
  }

  if (body.submissionType !== undefined || body.submission_type !== undefined) {
    const subType = sanitizeText(body.submissionType || body.submission_type)?.toUpperCase();
    if (!['ONLINE_TEXT', 'FILE_UPLOAD', 'ONLINE_TEXT_AND_FILE', 'PHYSICAL_SUBMISSION'].includes(subType)) {
      errors.submissionType = 'Invalid submission type';
    } else {
      payload.submissionType = subType;
    }
  }

  if (body.attachmentUrls !== undefined || body.attachment_urls !== undefined) {
    let urls = body.attachmentUrls || body.attachment_urls;
    if (typeof urls === 'string') {
      try {
        urls = JSON.parse(urls);
      } catch {
        urls = [urls];
      }
    }
    payload.attachmentUrls = Array.isArray(urls) ? urls : [];
  }

  return { errors, payload };
}

function validateSubmissionInput(body = {}) {
  const errors = {};

  const submissionText = sanitizeText(body.submissionText || body.submission_text);
  let attachmentUrls = body.attachmentUrls || body.attachment_urls || [];

  if (typeof attachmentUrls === 'string') {
    try {
      attachmentUrls = JSON.parse(attachmentUrls);
    } catch {
      attachmentUrls = [attachmentUrls];
    }
  }
  if (!Array.isArray(attachmentUrls)) {
    attachmentUrls = [];
  }

  if (!submissionText && attachmentUrls.length === 0) {
    errors.submission = 'Submission must include either text notes or at least one attached file/link';
  }

  return {
    errors,
    submissionText,
    attachmentUrls,
    isDraft: Boolean(body.isDraft || body.is_draft),
  };
}

function validateGradeSubmissionInput(body = {}, maxMarks = 100) {
  const errors = {};

  const obtainedMarks = parseNumber(body.obtainedMarks ?? body.obtained_marks);
  if (obtainedMarks === null || obtainedMarks < 0 || obtainedMarks > maxMarks) {
    errors.obtainedMarks = `Obtained marks must be a number between 0 and ${maxMarks}`;
  }

  const status = sanitizeText(body.status)?.toUpperCase() || 'GRADED';
  if (!['GRADED', 'RESUBMIT_REQUESTED'].includes(status)) {
    errors.status = 'Grading status must be GRADED or RESUBMIT_REQUESTED';
  }

  return {
    errors,
    obtainedMarks,
    feedback: sanitizeText(body.feedback),
    status,
  };
}

module.exports = {
  isValidUUID,
  validateCreateAssignmentInput,
  validateUpdateAssignmentInput,
  validateSubmissionInput,
  validateGradeSubmissionInput,
};
