const TeacherRepository = require('./teacher.repository');
const { TeacherService } = require('./teacher.service');
const {
  validateCreateTeacherInput,
  validateUpdateTeacherInput,
  validateTeacherId,
} = require('./teacher.validation');
const { db } = require('../../config/database');

const teacherService = new TeacherService(new TeacherRepository(db));

async function listTeachers(req, res, next) {
  try {
    const data = await teacherService.listTeachers({
      search: req.query.search || '',
      limit: Number(req.query.limit || 20),
      offset: Number(req.query.offset || 0),
    });

    return res.status(200).json({
      success: true,
      message: 'Teachers loaded successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function getTeacherById(req, res, next) {
  const { id, errors } = validateTeacherId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', data: errors });
  }

  try {
    const data = await teacherService.getTeacherById(id);

    return res.status(200).json({
      success: true,
      message: 'Teacher loaded successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function createTeacher(req, res, next) {
  const input = validateCreateTeacherInput(req.body);

  if (Object.keys(input.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: input.errors,
    });
  }

  try {
    const data = await teacherService.createTeacher(input);

    return res.status(201).json({
      success: true,
      message: 'Teacher created successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateTeacher(req, res, next) {
  const { id, errors: idErrors } = validateTeacherId(req.params.id);

  if (Object.keys(idErrors).length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', data: idErrors });
  }

  const { errors: validationErrors, ...cleanInput } = validateUpdateTeacherInput(req.body);

  if (Object.keys(validationErrors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: validationErrors,
    });
  }

  try {
    const data = await teacherService.updateTeacher(id, cleanInput);

    return res.status(200).json({
      success: true,
      message: 'Teacher updated successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteTeacher(req, res, next) {
  const { id, errors } = validateTeacherId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', data: errors });
  }

  try {
    const data = await teacherService.deleteTeacher(id);

    return res.status(200).json({
      success: true,
      message: 'Teacher deleted successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function activateTeacher(req, res, next) {
  const { id, errors } = validateTeacherId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', data: errors });
  }

  try {
    const data = await teacherService.activateTeacher(id);

    return res.status(200).json({
      success: true,
      message: 'Teacher activated successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function terminateTeacher(req, res, next) {
  const { id, errors } = validateTeacherId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', data: errors });
  }

  try {
    const data = await teacherService.terminateTeacher(id);

    return res.status(200).json({
      success: true,
      message: 'Teacher terminated successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function getTeacherProfile(req, res, next) {
  const { id, errors } = validateTeacherId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', data: errors });
  }

  try {
    const data = await teacherService.getTeacherProfile(id);

    return res.status(200).json({
      success: true,
      message: 'Teacher profile loaded successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  activateTeacher,
  terminateTeacher,
  getTeacherProfile,
};

