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

      const assignmentCheck = await db.query(
        `SELECT 1 FROM teacher_subjects WHERE teacher_id = $1 AND subject_id = $2 AND section_id = $3 AND deleted_at IS NULL LIMIT 1`,
        [teacherId, query.subjectId, query.sectionId]
      );

      if (!assignmentCheck.rows.length) {
        return res.status(403).json({
          success: false,
          message: 'You are not assigned to this class and subject',
          data: null,
        });
      }
    }

    const data = await markService.getMarksSheet({ ...query, teacherId });
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

      const assignmentCheck = await db.query(
        `SELECT 1 FROM teacher_subjects WHERE teacher_id = $1 AND subject_id = $2 AND section_id = $3 AND deleted_at IS NULL LIMIT 1`,
        [teacherId, input.subjectId, input.sectionId]
      );

      if (!assignmentCheck.rows.length) {
        return res.status(403).json({
          success: false,
          message: 'You are not assigned to this class and subject',
          data: null,
        });
      }
    }

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
    const role = (req.user?.role || '').toLowerCase();
    let teacherId = null;

    if (role.includes('student') && !role.includes('admin')) {
      const studentRes = await db.query(
        `SELECT id FROM students WHERE user_id = $1 AND deleted_at IS NULL LIMIT 1`,
        [req.user.sub]
      );

      if (!studentRes.rows.length || studentRes.rows[0].id !== req.params.studentId) {
        return res.status(403).json({
          success: false,
          message: 'Students can only access their own marks',
          data: null,
        });
      }
    }

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

      const assignmentCheck = await db.query(
        `SELECT 1
         FROM teacher_subjects ts
         JOIN students s ON s.section_id = ts.section_id
         WHERE ts.teacher_id = $1 AND s.id = $2 AND ts.deleted_at IS NULL
         LIMIT 1`,
        [teacherId, req.params.studentId]
      );

      if (!assignmentCheck.rows.length) {
        return res.status(403).json({
          success: false,
          message: 'You are not assigned to this student\'s class',
          data: null,
        });
      }
    }

    const data = await markService.getStudentMarks(req.params.studentId, {
      academicYearId: req.query.academicYearId && isValidUUID(req.query.academicYearId) ? req.query.academicYearId : null,
      teacherId,
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
