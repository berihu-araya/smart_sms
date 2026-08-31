function validateUuid(value) {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim())
  );
}

function validateCreateGradeSubjectInput(input = {}) {
  const grade_id = input.grade_id?.trim();
  const subject_id = input.subject_id?.trim();
  const academic_year_id = input.academic_year_id?.trim();
  const status = input.status?.trim() || 'ACTIVE';

  const errors = {};

  if (!validateUuid(grade_id)) {
    errors.grade_id = 'Valid Grade ID is required';
  }

  if (!validateUuid(subject_id)) {
    errors.subject_id = 'Valid Subject ID is required';
  }

  if (!validateUuid(academic_year_id)) {
    errors.academic_year_id = 'Valid Academic Year ID is required';
  }

  if (
    input.weekly_periods !== undefined &&
    input.weekly_periods !== null &&
    input.weekly_periods !== ''
  ) {
    const wp = Number(input.weekly_periods);
    if (isNaN(wp) || wp < 0 || !Number.isInteger(wp)) {
      errors.weekly_periods = 'Weekly periods must be a non-negative integer';
    }
  }

  if (
    input.total_marks !== undefined &&
    input.total_marks !== null &&
    input.total_marks !== ''
  ) {
    const tm = Number(input.total_marks);
    if (isNaN(tm) || tm < 0) {
      errors.total_marks = 'Total marks must be a non-negative number';
    }
  }

  if (
    input.pass_marks !== undefined &&
    input.pass_marks !== null &&
    input.pass_marks !== ''
  ) {
    const pm = Number(input.pass_marks);
    if (isNaN(pm) || pm < 0) {
      errors.pass_marks = 'Pass marks must be a non-negative number';
    }
  }

  if (
    input.pass_marks !== undefined &&
    input.pass_marks !== null &&
    input.pass_marks !== '' &&
    input.total_marks !== undefined &&
    input.total_marks !== null &&
    input.total_marks !== ''
  ) {
    if (Number(input.pass_marks) > Number(input.total_marks)) {
      errors.pass_marks = 'Pass marks cannot exceed total marks';
    }
  }

  return {
    grade_id,
    subject_id,
    academic_year_id,
    is_compulsory: input.is_compulsory !== undefined ? Boolean(input.is_compulsory) : true,
    weekly_periods:
      input.weekly_periods !== undefined && input.weekly_periods !== null && input.weekly_periods !== ''
        ? Number(input.weekly_periods)
        : null,
    total_marks:
      input.total_marks !== undefined && input.total_marks !== null && input.total_marks !== ''
        ? Number(input.total_marks)
        : null,
    pass_marks:
      input.pass_marks !== undefined && input.pass_marks !== null && input.pass_marks !== ''
        ? Number(input.pass_marks)
        : null,
    display_order:
      input.display_order !== undefined && input.display_order !== null && input.display_order !== ''
        ? Number(input.display_order)
        : 0,
    status,
    errors,
  };
}

function validateUpdateGradeSubjectInput(input = {}) {
  const errors = {};
  const payload = {};

  if (input.is_compulsory !== undefined) {
    payload.is_compulsory = Boolean(input.is_compulsory);
  }

  if (input.status !== undefined) {
    const st = String(input.status).toUpperCase().trim();
    if (!['ACTIVE', 'INACTIVE', 'ARCHIVED'].includes(st)) {
      errors.status = 'Status must be ACTIVE, INACTIVE, or ARCHIVED';
    } else {
      payload.status = st;
    }
  }

  if (input.weekly_periods !== undefined) {
    if (input.weekly_periods === null || input.weekly_periods === '') {
      payload.weekly_periods = null;
    } else {
      const wp = Number(input.weekly_periods);
      if (isNaN(wp) || wp < 0) {
        errors.weekly_periods = 'Weekly periods cannot be negative';
      } else {
        payload.weekly_periods = wp;
      }
    }
  }

  if (input.total_marks !== undefined) {
    if (input.total_marks === null || input.total_marks === '') {
      payload.total_marks = null;
    } else {
      const tm = Number(input.total_marks);
      if (isNaN(tm) || tm < 0) {
        errors.total_marks = 'Total marks cannot be negative';
      } else {
        payload.total_marks = tm;
      }
    }
  }

  if (input.pass_marks !== undefined) {
    if (input.pass_marks === null || input.pass_marks === '') {
      payload.pass_marks = null;
    } else {
      const pm = Number(input.pass_marks);
      if (isNaN(pm) || pm < 0) {
        errors.pass_marks = 'Pass marks cannot be negative';
      } else {
        payload.pass_marks = pm;
      }
    }
  }

  if (
    payload.pass_marks !== undefined &&
    payload.pass_marks !== null &&
    payload.total_marks !== undefined &&
    payload.total_marks !== null &&
    payload.pass_marks > payload.total_marks
  ) {
    errors.pass_marks = 'Pass marks cannot exceed total marks';
  }

  if (input.display_order !== undefined) {
    payload.display_order = Number(input.display_order) || 0;
  }

  return {
    payload,
    errors,
  };
}

function validateBulkGradeSubjectInput(input = {}) {
  const grade_id = input.grade_id?.trim();
  const academic_year_id = input.academic_year_id?.trim();
  const rawSubjects = input.subjects;

  const errors = {};

  if (!validateUuid(grade_id)) {
    errors.grade_id = 'Valid Grade ID is required';
  }

  if (!validateUuid(academic_year_id)) {
    errors.academic_year_id = 'Valid Academic Year ID is required';
  }

  if (!Array.isArray(rawSubjects) || rawSubjects.length === 0) {
    errors.subjects = 'At least one subject must be provided';
  }

  const validatedSubjects = [];
  if (Array.isArray(rawSubjects)) {
    const seen = new Set();
    rawSubjects.forEach((item, index) => {
      const subId = (typeof item === 'string' ? item : item?.subject_id || item?.id)?.trim();
      if (!validateUuid(subId)) {
        errors[`subjects[${index}].subject_id`] = 'Valid subject ID is required';
        return;
      }
      if (seen.has(subId)) {
        errors[`subjects[${index}].subject_id`] = 'Duplicate subject in bulk assignment';
        return;
      }
      seen.add(subId);

      const isCompulsory = item?.is_compulsory !== undefined ? Boolean(item.is_compulsory) : true;
      const weeklyPeriods =
        item?.weekly_periods !== undefined && item?.weekly_periods !== null && item?.weekly_periods !== ''
          ? Number(item.weekly_periods)
          : null;
      const totalMarks =
        item?.total_marks !== undefined && item?.total_marks !== null && item?.total_marks !== ''
          ? Number(item.total_marks)
          : null;
      const passMarks =
        item?.pass_marks !== undefined && item?.pass_marks !== null && item?.pass_marks !== ''
          ? Number(item.pass_marks)
          : null;
      const displayOrder =
        item?.display_order !== undefined && item?.display_order !== null && item?.display_order !== ''
          ? Number(item.display_order)
          : index + 1;

      if (weeklyPeriods !== null && (isNaN(weeklyPeriods) || weeklyPeriods < 0)) {
        errors[`subjects[${index}].weekly_periods`] = 'Weekly periods must be non-negative';
      }
      if (totalMarks !== null && (isNaN(totalMarks) || totalMarks < 0)) {
        errors[`subjects[${index}].total_marks`] = 'Total marks must be non-negative';
      }
      if (passMarks !== null && (isNaN(passMarks) || passMarks < 0)) {
        errors[`subjects[${index}].pass_marks`] = 'Pass marks must be non-negative';
      }
      if (passMarks !== null && totalMarks !== null && passMarks > totalMarks) {
        errors[`subjects[${index}].pass_marks`] = 'Pass marks cannot exceed total marks';
      }

      validatedSubjects.push({
        subject_id: subId,
        is_compulsory: isCompulsory,
        weekly_periods: weeklyPeriods,
        total_marks: totalMarks,
        pass_marks: passMarks,
        display_order: displayOrder,
        status: item?.status || 'ACTIVE',
      });
    });
  }

  return {
    grade_id,
    academic_year_id,
    subjects: validatedSubjects,
    errors,
  };
}

function validateCloneGradeSubjectInput(input = {}) {
  const source_grade_id = input.source_grade_id?.trim();
  const source_academic_year_id = input.source_academic_year_id?.trim();
  const target_grade_id = input.target_grade_id?.trim();
  const target_academic_year_id = input.target_academic_year_id?.trim();

  const errors = {};

  if (!validateUuid(source_grade_id)) {
    errors.source_grade_id = 'Valid Source Grade ID is required';
  }
  if (!validateUuid(source_academic_year_id)) {
    errors.source_academic_year_id = 'Valid Source Academic Year ID is required';
  }
  if (!validateUuid(target_grade_id)) {
    errors.target_grade_id = 'Valid Target Grade ID is required';
  }
  if (!validateUuid(target_academic_year_id)) {
    errors.target_academic_year_id = 'Valid Target Academic Year ID is required';
  }

  if (
    source_grade_id &&
    target_grade_id &&
    source_academic_year_id &&
    target_academic_year_id &&
    source_grade_id === target_grade_id &&
    source_academic_year_id === target_academic_year_id
  ) {
    errors.target_grade_id = 'Source and target cannot be identical';
  }

  return {
    source_grade_id,
    source_academic_year_id,
    target_grade_id,
    target_academic_year_id,
    errors,
  };
}

function validateGradeSubjectId(id) {
  const errors = {};

  if (!validateUuid(id)) {
    errors.id = 'Valid Grade Subject ID is required';
  }

  return {
    id: id?.trim(),
    errors,
  };
}

module.exports = {
  validateCreateGradeSubjectInput,
  validateUpdateGradeSubjectInput,
  validateBulkGradeSubjectInput,
  validateCloneGradeSubjectInput,
  validateGradeSubjectId,
};
