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

async function getMyProfile(req, res, next) {
  try {
    const parentId = req.parentScope?.parent_id;
    if (!parentId) {
      return res.status(404).json({
        success: false,
        message: 'Parent profile not linked to this account',
        data: null,
      });
    }

    const data = await parentService.getParentById(parentId);
    return res.status(200).json({
      success: true,
      message: 'Your parent profile loaded successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function getMyChildren(req, res, next) {
  try {
    const parentId = req.parentScope?.parent_id;
    if (!parentId) {
      return res.status(200).json({
        success: true,
        message: 'No children found',
        data: [],
      });
    }

    const data = await parentService.getParentStudents(parentId);
    return res.status(200).json({
      success: true,
      message: 'Your linked children loaded successfully',
      data: data.students || [],
    });
  } catch (error) {
    return next(error);
  }
}

async function getParentById(req, res, next) {
  let targetId = req.params.id;
  const role = (req.user?.role || '').toLowerCase().trim();

  if (role === 'parent') {
    if (targetId === 'me') {
      targetId = req.parentScope?.parent_id;
    } else if (targetId !== req.parentScope?.parent_id) {
      return res.status(403).json({
        success: false,
        message: 'Parents can only access their own profile',
        data: null,
      });
    }
  }

  const { id, errors } = validateParentId(targetId);

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
  let targetId = req.params.id;
  const role = (req.user?.role || '').toLowerCase().trim();

  if (role === 'parent') {
    if (targetId === 'me') {
      targetId = req.parentScope?.parent_id;
    } else if (targetId !== req.parentScope?.parent_id) {
      return res.status(403).json({
        success: false,
        message: 'Parents can only update their own profile',
        data: null,
      });
    }
  }

  const { id, errors: idErrors } = validateParentId(targetId);

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
  let targetId = req.params.id;
  const role = (req.user?.role || '').toLowerCase().trim();

  if (role === 'parent') {
    if (targetId === 'me') {
      targetId = req.parentScope?.parent_id;
    } else if (targetId !== req.parentScope?.parent_id) {
      return res.status(403).json({
        success: false,
        message: 'Parents can only access their own linked children',
        data: null,
      });
    }
  }

  const { id, errors } = validateParentId(targetId);

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
  getMyProfile,
  getMyChildren,
  createParent,
  updateParent,
  deleteParent,
  getParentStudents,
};
