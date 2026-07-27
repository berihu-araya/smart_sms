const GradeRepository = require('./grade.repository'); // this loads another file that is grade. repository.js which contains the database queries for the grades module. It is used to interact with the database and perform CRUD operations on the grades data.
const { GradeService } = require('./grade.service'); // Notice the { }. that means the file exports an object with multiple properties, and we are only importing the GradeService property from that object. This is a common pattern in JavaScript when you want to export multiple functions or classes from a single file.
const {
  validateCreateGradeInput,
  validateUpdateGradeInput,
  validateGradeId,
} = require('./grade.validation');// This loads the grade.validation.js file which contains functions to validate the input data for creating, updating, and deleting grades. It ensures that the data sent to the server meets certain criteria before it is processed further.
const { db } = require('../../config/database'); // This loads the database configuration from the config folder. The db object is used to establish a connection to the database and perform queries. It is passed to the GradeRepository to allow it to interact with the database.

const gradeService = new GradeService(new GradeRepository(db));

async function listGrades(req, res, next) {
  try {
    const data = await gradeService.listGrades({
      search: req.query.search || '', // if search exists use it, otherwise ''(no search)
      limit: Number(req.query.limit || 20),
      offset: Number(req.query.offset || 0),
    });

    return res.status(200).json({
      success: true,
      message: 'Grades loaded successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function getGradeById(req, res, next) {
  const { id, errors } = validateGradeId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ 
        success: false, 
        message: 'Validation failed', 
        data: errors
    });
  }

  try {
    const data = await gradeService.getGradeById(id);

    return res.status(200).json({
      success: true,
      message: 'Grade loaded successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function createGrade(req, res, next) {
  const input = validateCreateGradeInput(req.body);

  if (Object.keys(input.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: input.errors,
    });
  }

  try {
    const data = await gradeService.createGrade(input);

    return res.status(201).json({
      success: true,
      message: 'Grade created successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateGrade(req, res, next) {
  const { id, errors } = validateGradeId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', data: errors });
  }

  const input = validateUpdateGradeInput(req.body);

  if (Object.keys(input.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: input.errors,
    });
  }

  try {
    const data = await gradeService.updateGrade(id, input);

    return res.status(200).json({
      success: true,
      message: 'Grade updated successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteGrade(req, res, next) {
  const { id, errors } = validateGradeId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', data: errors });
  }

  try {
    const data = await gradeService.deleteGrade(id);

    return res.status(200).json({
      success: true,
      message: 'Grade deleted successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listGrades,
  getGradeById,
  createGrade,
  updateGrade,
  deleteGrade,
};

