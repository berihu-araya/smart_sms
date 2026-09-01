const { db } = require('../../config/database');
const UnitRepository = require('./unit.repository');
const { UnitService } = require('./unit.service');
const {
  validateCreateUnitInput,
  validateUpdateUnitInput,
  validateUnitId,
  validateAssignClassToUnitInput,
} = require('./unit.validation');

const unitService = new UnitService(new UnitRepository(db));

async function listUnits(req, res, next) {
  try {
    const data = await unitService.listUnits({
      search: req.query.search || '',
      status: req.query.status || 'active',
      limit: Number(req.query.limit || 20),
      offset: Number(req.query.offset || 0),
    });

    return res.status(200).json({ success: true, message: 'Units loaded successfully.', data });
  } catch (error) {
    return next(error);
  }
}

async function getUnitById(req, res, next) {
  const { id, errors } = validateUnitId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', data: errors });
  }

  try {
    const data = await unitService.getUnitById(id);
    return res.status(200).json({ success: true, message: 'Unit loaded successfully.', data });
  } catch (error) {
    return next(error);
  }
}

async function createUnit(req, res, next) {
  const { errors, ...payload } = validateCreateUnitInput(req.body);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', data: errors });
  }

  try {
    const data = await unitService.createUnit(payload);
    return res.status(201).json({ success: true, message: 'Unit created successfully.', data });
  } catch (error) {
    return next(error);
  }
}

async function updateUnit(req, res, next) {
  const { id, errors: idErrors } = validateUnitId(req.params.id);

  if (Object.keys(idErrors).length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', data: idErrors });
  }

  const { errors, ...payload } = validateUpdateUnitInput(req.body);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', data: errors });
  }

  try {
    const data = await unitService.updateUnit(id, payload);
    return res.status(200).json({ success: true, message: 'Unit updated successfully.', data });
  } catch (error) {
    return next(error);
  }
}

async function deleteUnit(req, res, next) {
  const { id, errors } = validateUnitId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', data: errors });
  }

  try {
    const data = await unitService.deleteUnit(id);
    return res.status(200).json({ success: true, message: 'Unit deactivated successfully.', data });
  } catch (error) {
    return next(error);
  }
}

async function assignClassToUnit(req, res, next) {
  const { errors, ...payload } = validateAssignClassToUnitInput(req.body);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', data: errors });
  }

  try {
    const data = await unitService.assignClassToUnit(payload);
    return res.status(201).json({ success: true, message: 'Class assigned to unit successfully.', data });
  } catch (error) {
    return next(error);
  }
}

async function getUnitClasses(req, res, next) {
  const { id, errors } = validateUnitId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', data: errors });
  }

  try {
    const data = await unitService.getUnitClassAssignments(id);
    return res.status(200).json({ success: true, message: 'Unit class assignments loaded successfully.', data });
  } catch (error) {
    return next(error);
  }
}

async function removeClassFromUnit(req, res, next) {
  const { id, errors } = validateUnitId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', data: errors });
  }

  try {
    const data = await unitService.removeClassFromUnit(id);
    return res.status(200).json({ success: true, message: 'Class removed from unit successfully.', data });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listUnits,
  getUnitById,
  createUnit,
  updateUnit,
  deleteUnit,
  assignClassToUnit,
  getUnitClasses,
  removeClassFromUnit,
};
