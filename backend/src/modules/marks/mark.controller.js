const MarkRepository = require('./mark.repository');
const MarkService = require('./mark.service');
const ExamRepository = require('../exams/exam.repository');
const {
  validateMarksSheetQuery,
  validateBatchMarksInput,
  isValidUUID,
} = require('./mark.validation');
const { db } = require('../../config/database');

const markService = new MarkService(new MarkRepository(db), new ExamRepository(db));

async function getMarksSheet(req, res, next) {
  const query = validateMarksSheetQuery(req.query);

  if (Object.keys(query.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: query.errors,
    });
  }

  try {
    const data = await markService.getMarksSheet(query);
    return res.status(200).json({
      success: true,
      message: 'Marks sheet loaded successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function saveBatchMarks(req, res, next) {
  const input = validateBatchMarksInput(req.body);

  if (Object.keys(input.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: input.errors,
    });
  }

  try {
    const teacherId = req.user ? req.user.teacherId || null : null;
    const data = await markService.saveBatchMarks({
      examId: input.examId,
      subjectId: input.subjectId,
      sectionId: input.sectionId,
      teacherId,
      marks: input.marks,
    });

    return res.status(200).json({
      success: true,
      message: 'Marks recorded successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function getStudentMarks(req, res, next) {
  if (!isValidUUID(req.params.studentId)) {
    return res.status(400).json({ success: false, message: 'Invalid student ID', data: null });
  }

  try {
    const data = await markService.getStudentMarks(req.params.studentId, {
      academicYearId: req.query.academicYearId && isValidUUID(req.query.academicYearId) ? req.query.academicYearId : null,
    });

    return res.status(200).json({
      success: true,
      message: 'Student marks loaded',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getMarksSheet,
  saveBatchMarks,
  getStudentMarks,
};
