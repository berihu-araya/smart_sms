const StudentRepository = require('./student.repository');
const { StudentService } = require('./student.service');
const {
  validateCreateStudentInput,
  validateUpdateStudentInput,
  validateStudentId,
} = require('./student.validation');
const { db } = require('../../config/database');

const studentService = new StudentService(new StudentRepository(db));

async function listStudents(req, res, next) {
  try {
    const data = await studentService.listStudents({
      search: req.query.search || '',
      limit: Number(req.query.limit || 20),
      offset: Number(req.query.offset || 0),
    });

    return res.status(200).json({
      success: true,
      message: 'Students loaded successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function getStudentById(req, res, next) {
  const { id, errors } = validateStudentId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', data: errors });
  }

  try {
    const data = await studentService.getStudentById(id);

    return res.status(200).json({
      success: true,
      message: 'Student loaded successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function createStudent(req, res, next) {
  const input = validateCreateStudentInput(req.body);

  if (Object.keys(input.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: input.errors,
    });
  }

  try {
    const data = await studentService.createStudent(input);

    return res.status(201).json({
      success: true,
      message: 'Student created successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateStudent(req, res, next) {
  const { id, errors: idErrors } = validateStudentId(req.params.id);

  if (Object.keys(idErrors).length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', data: idErrors });
  }

  const { errors: validationErrors, ...cleanInput } = validateUpdateStudentInput(req.body);

  if (Object.keys(validationErrors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: validationErrors,
    });
  }

  try {
    const data = await studentService.updateStudent(id, cleanInput);

    return res.status(200).json({
      success: true,
      message: 'Student updated successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteStudent(req, res, next) {
  const { id, errors } = validateStudentId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', data: errors });
  }

  try {
    const data = await studentService.deleteStudent(id);

    return res.status(200).json({
      success: true,
      message: 'Student deleted successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function activateStudent(req, res, next) {
  const { id, errors } = validateStudentId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', data: errors });
  }

  try {
    const data = await studentService.activateStudent(id);

    return res.status(200).json({
      success: true,
      message: 'Student activated successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function suspendStudent(req, res, next) {
  const { id, errors } = validateStudentId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', data: errors });
  }

  try {
    const data = await studentService.suspendStudent(id);

    return res.status(200).json({
      success: true,
      message: 'Student suspended successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function getStudentProfile(req, res, next) {
  const { id, errors } = validateStudentId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', data: errors });
  }

  try {
    const data = await studentService.getStudentProfile(id);

    return res.status(200).json({
      success: true,
      message: 'Student profile loaded successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function getStudentGuardian(req, res, next) {
  const { id, errors } = validateStudentId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', data: errors });
  }

  try {
    const data = await studentService.getStudentGuardian(id);

    return res.status(200).json({
      success: true,
      message: 'Student guardian loaded successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  activateStudent,
  suspendStudent,
  getStudentProfile,
  getStudentGuardian,
};
