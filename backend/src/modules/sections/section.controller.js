const SectionRepository = require('./section.repository');
const { SectionService } = require('./section.service');
const {
  validateCreateSectionInput,
  validateUpdateSectionInput,
  validateSectionId,
} = require('./section.validation');
const { db } = require('../../config/database');

const sectionService = new SectionService(new SectionRepository(db));

async function listSections(req, res, next) {
  try {
    const data = await sectionService.listSections({
      search: req.query.search || '',
      gradeId: req.query.gradeId || req.query.grade_id || '',
      status: req.query.status || 'active',
      sortBy: req.query.sortBy || 'name',
      sortOrder: req.query.sortOrder || 'ASC',
      limit: Number(req.query.limit || 20),
      offset: Number(req.query.offset || 0),
    });

    return res.status(200).json({
      success: true,
      message: 'Sections loaded successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function getSectionById(req, res, next) {
  const { id, errors } = validateSectionId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', data: errors });
  }

  try {
    const data = await sectionService.getSectionById(id);

    return res.status(200).json({
      success: true,
      message: 'Section loaded successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function checkSectionReferences(req, res, next) {
  const { id, errors } = validateSectionId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', data: errors });
  }

  try {
    const data = await sectionService.checkSectionReferences(id);

    return res.status(200).json({
      success: true,
      message: 'Section references calculated successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function createSection(req, res, next) {
  const input = validateCreateSectionInput(req.body);

  if (Object.keys(input.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: input.errors,
    });
  }

  try {
    const data = await sectionService.createSection(input);

    return res.status(201).json({
      success: true,
      message: 'Section created successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateSection(req, res, next) {
  const { id, errors } = validateSectionId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', data: errors });
  }

  const input = validateUpdateSectionInput(req.body);

  if (Object.keys(input.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: input.errors,
    });
  }

  try {
    const data = await sectionService.updateSection(id, input);

    return res.status(200).json({
      success: true,
      message: 'Section updated successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteSection(req, res, next) {
  const { id, errors } = validateSectionId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', data: errors });
  }

  try {
    const data = await sectionService.deleteSection(id);

    return res.status(200).json({
      success: true,
      message: 'Section deactivated successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function restoreSection(req, res, next) {
  const { id, errors } = validateSectionId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', data: errors });
  }

  try {
    const data = await sectionService.restoreSection(id);

    return res.status(200).json({
      success: true,
      message: 'Section restored successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listSections,
  getSectionById,
  checkSectionReferences,
  createSection,
  updateSection,
  deleteSection,
  restoreSection,
};
