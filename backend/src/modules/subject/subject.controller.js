const SubjectRepository = require('./subject.repository');
const { SubjectService } = require('./subject.service');
const {
  validateCreateSubjectInput,
  validateUpdateSubjectInput,
  validateSubjectId,
} = require('./subject.validation');
const { db } = require('../../config/database');

const subjectService = new SubjectService(new SubjectRepository(db));

async function listSubjects(req, res, next) {
  try {
    const role = (req.user?.role || '').toLowerCase().trim();
    let subjectIds = null;

    if (role === 'teacher' && req.teacherScope) {
      subjectIds = req.teacherScope.all_accessible_subject_ids || req.teacherScope.assigned_subject_ids || [];
    }

    const data = await subjectService.listSubjects({
      search: req.query.search || '',
      status: req.query.status || 'active',
      sortBy: req.query.sortBy || 'subject_name',
      sortOrder: req.query.sortOrder || 'ASC',
      gradeId: req.studentScope?.grade_id || null,
      subjectIds,
      limit: Number(req.query.limit || 20),
      offset: Number(req.query.offset || 0),
    });

    return res.status(200).json({
      success: true,
      message: 'Subjects loaded successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function getSubjectById(req, res, next) {
  const { id, errors } = validateSubjectId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: errors,
    });
  }

  try {
    const role = (req.user?.role || '').toLowerCase().trim();
    if (role === 'teacher' && req.teacherScope) {
      const allowedIds = req.teacherScope.all_accessible_subject_ids || req.teacherScope.assigned_subject_ids || [];
      const isAssigned = allowedIds.includes(id);

      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to view this subject',
          data: null,
        });
      }
    }

    const data = await subjectService.getSubjectById(id);

    return res.status(200).json({
      success: true,
      message: 'Subject loaded successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function checkSubjectReferences(req, res, next) {
  const { id, errors } = validateSubjectId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: errors,
    });
  }

  try {
    const data = await subjectService.checkSubjectReferences(id);

    return res.status(200).json({
      success: true,
      message: 'Subject references calculated successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function createSubject(req, res, next) {
  const { errors, ...payload } = validateCreateSubjectInput(req.body);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: errors,
    });
  }

  try {
    const data = await subjectService.createSubject(payload);

    return res.status(201).json({
      success: true,
      message: 'Subject created successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateSubject(req, res, next) {
  const { id, errors: idErrors } = validateSubjectId(req.params.id);

  if (Object.keys(idErrors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: idErrors,
    });
  }

  const { errors, ...payload } = validateUpdateSubjectInput(req.body);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: errors,
    });
  }

  try {
    const data = await subjectService.updateSubject(id, payload);

    return res.status(200).json({
      success: true,
      message: 'Subject updated successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteSubject(req, res, next) {
  const { id, errors } = validateSubjectId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: errors,
    });
  }

  try {
    const data = await subjectService.deleteSubject(id);

    return res.status(200).json({
      success: true,
      message: 'Subject deactivated successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function restoreSubject(req, res, next) {
  const { id, errors } = validateSubjectId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: errors,
    });
  }

  try {
    const data = await subjectService.restoreSubject(id);

    return res.status(200).json({
      success: true,
      message: 'Subject restored successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listSubjects,
  getSubjectById,
  checkSubjectReferences,
  createSubject,
  updateSubject,
  deleteSubject,
  restoreSubject,
};