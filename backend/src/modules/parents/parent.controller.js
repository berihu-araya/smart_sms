const ParentRepository = require('./parent.repository');
const { ParentService } = require('./parent.service');
const {
  validateCreateParentInput,
  validateUpdateParentInput,
  validateParentId,
} = require('./parent.validation');
const { db } = require('../../config/database');

const parentService = new ParentService(new ParentRepository(db));

async function listParents(req, res, next) {
  try {
    const data = await parentService.listParents({
      search: req.query.search || '',
      limit: Number(req.query.limit || 20),
      offset: Number(req.query.offset || 0),
    });

    return res.status(200).json({
      success: true,
      message: 'Parents loaded successfully.',
      data: data.items,
      meta: {
        total: data.total,
        page: data.page,
        limit: data.limit,
        totalPages: data.totalPages,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function getParentById(req, res, next) {
  const { id, errors } = validateParentId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: errors,
    });
  }

  try {
    const data = await parentService.getParentById(id);

    return res.status(200).json({
      success: true,
      message: 'Parent details loaded successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function createParent(req, res, next) {
  const input = validateCreateParentInput(req.body);

  if (Object.keys(input.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: input.errors,
    });
  }

  try {
    const data = await parentService.createParent(input);

    return res.status(201).json({
      success: true,
      message: 'Parent registered successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateParent(req, res, next) {
  const { id, errors: idErrors } = validateParentId(req.params.id);

  if (Object.keys(idErrors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: idErrors,
    });
  }

  const { errors: validationErrors, ...cleanInput } = validateUpdateParentInput(req.body);

  if (Object.keys(validationErrors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: validationErrors,
    });
  }

  try {
    const data = await parentService.updateParent(id, cleanInput);

    return res.status(200).json({
      success: true,
      message: 'Parent information updated successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteParent(req, res, next) {
  const { id, errors } = validateParentId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: errors,
    });
  }

  try {
    const data = await parentService.deleteParent(id);

    return res.status(200).json({
      success: true,
      message: 'Parent deleted successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function getParentStudents(req, res, next) {
  const { id, errors } = validateParentId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: errors,
    });
  }

  try {
    const data = await parentService.getParentStudents(id);

    return res.status(200).json({
      success: true,
      message: 'Parent students loaded successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listParents,
  getParentById,
  createParent,
  updateParent,
  deleteParent,
  getParentStudents,
};
