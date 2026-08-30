const ExamRepository = require('./exam.repository');
const ExamService = require('./exam.service');
const {
  validateCreateExamInput,
  validateUpdateExamInput,
  isValidUUID,
} = require('./exam.validation');
const { db } = require('../../config/database');

const examService = new ExamService(new ExamRepository(db));

async function listExams(req, res, next) {
  try {
    const role = (req.user?.role || '').toLowerCase();
    let teacherId = null;

    if (role.includes('teacher') && !role.includes('admin')) {
      const teacherRes = await db.query(
        `SELECT id FROM teachers WHERE user_id = $1 AND deleted_at IS NULL LIMIT 1`,
        [req.user.sub]
      );

      teacherId = teacherRes.rows[0]?.id || null;
      if (!teacherId) {
        return res.status(403).json({
          success: false,
          message: 'Teacher is not assigned to any class subjects',
          data: null,
        });
      }
    }

    const data = await examService.listExams({
      search: req.query.search || '',
      academicYearId: req.query.academicYearId && isValidUUID(req.query.academicYearId) ? req.query.academicYearId : null,
      gradeId: req.query.gradeId && isValidUUID(req.query.gradeId) ? req.query.gradeId : null,
      teacherId,
      limit: Number(req.query.limit || 50),
      offset: Number(req.query.offset || 0),
    });

    return res.status(200).json({
      success: true,
      message: 'Exams loaded successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function getExamById(req, res, next) {
  if (!isValidUUID(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid exam ID', data: null });
  }

  try {
    const data = await examService.getExamById(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Exam details loaded',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function createExam(req, res, next) {
  const input = validateCreateExamInput(req.body);

  if (Object.keys(input.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: input.errors,
    });
  }

  try {
    const data = await examService.createExam(input);
    return res.status(201).json({
      success: true,
      message: 'Exam created successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateExam(req, res, next) {
  if (!isValidUUID(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid exam ID', data: null });
  }

  const input = validateUpdateExamInput(req.body);
  if (Object.keys(input.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: input.errors,
    });
  }

  try {
    const data = await examService.updateExam(req.params.id, input);
    return res.status(200).json({
      success: true,
      message: 'Exam updated successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function togglePublishExam(req, res, next) {
  if (!isValidUUID(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid exam ID', data: null });
  }

  try {
    const isPublished = Boolean(req.body.isPublished);
    const data = await examService.togglePublish(req.params.id, isPublished);
    return res.status(200).json({
      success: true,
      message: `Exam ${isPublished ? 'published' : 'unpublished'} successfully`,
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteExam(req, res, next) {
  if (!isValidUUID(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid exam ID', data: null });
  }

  try {
    const data = await examService.deleteExam(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Exam deleted successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listExams,
  getExamById,
  createExam,
  updateExam,
  togglePublishExam,
  deleteExam,
};
