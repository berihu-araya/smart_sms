function normalizeString(value) {
  return typeof value === 'string'
    ? value.trim()
    : '';
}


function validateCreateGroupInput(input = {}) {
  const group_name = normalizeString(input.group_name);
  const description = normalizeString(input.description);

  const errors = {};

  if (!group_name) {
    errors.group_name = 'Group name is required';
  }

  if (group_name && group_name.length < 2) {
    errors.group_name =
      'Group name must be at least 2 characters';
  }

  return {
    group_name,
    description: description || null,
    errors,
  };
}


function validateUpdateGroupInput(input = {}) {

  const group_name = normalizeString(input.group_name);
  const description = normalizeString(input.description);

  const errors = {};


  if (
    input.group_name !== undefined &&
    !group_name
  ) {
    errors.group_name =
      'Group name is required';
  }


  if (
    input.group_name !== undefined &&
    group_name.length < 2
  ) {
    errors.group_name =
      'Group name must be at least 2 characters';
  }


  return {
    group_name:
      group_name || undefined,

    description:
      description || undefined,

    errors,
  };
}


function validateGroupId(id) {

  const errors = {};

  if (!id || typeof id !== 'string' || !id.trim()) {
    errors.id = 'Group id is required';
  }

  return {
    id: id?.trim(),
    errors,
  };
}


function validateAssignSubjectInput(input = {}) {

  const subject_id = normalizeString(input.subject_id);

  const errors = {};

  if (!subject_id) {
    errors.subject_id =
      'Subject id is required';
  }


  return {
    subject_id,
    errors,
  };
}


module.exports = {
  validateCreateGroupInput,
  validateUpdateGroupInput,
  validateGroupId,
  validateAssignSubjectInput,
};