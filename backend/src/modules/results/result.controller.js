const ResultRepository = require('./result.repository');
const ResultService = require('./result.service');
const { isValidUUID } = require('../exams/exam.validation');
const { db } = require('../../config/database');

const resultService = new ResultService(new ResultRepository(db));

async function getSectionResults(req, res, next) {
  const sectionId = req.query.sectionId;

  if (!sectionId || !isValidUUID(sectionId)) {
    return res.status(400).json({
      success: false,
      message: 'Valid sectionId is required',
      data: null,
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
        `SELECT 1 FROM teacher_subjects WHERE teacher_id = $1 AND section_id = $2 AND deleted_at IS NULL LIMIT 1`,
        [teacherId, sectionId]
      );

      if (!assignmentCheck.rows.length) {
        return res.status(403).json({
          success: false,
          message: 'You are not assigned to this class section',
          data: null,
        });
      }
    }

    const data = await resultService.calculateSectionResults({
      sectionId,
      academicYearId: req.query.academicYearId && isValidUUID(req.query.academicYearId) ? req.query.academicYearId : null,
      term: req.query.term || null,
      teacherId,
    });

    return res.status(200).json({
      success: true,
      message: 'Section results computed successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function getStudentReportCard(req, res, next) {
  const studentId = req.params.studentId;

  if (!isValidUUID(studentId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid student ID format',
      data: null,
    });
  }

  try {
    const role = (req.user?.role || '').toLowerCase();
    let teacherId = null;

    if (role.includes('student') && !role.includes('admin')) {
      const studentRes = await db.query(
        `SELECT id FROM students WHERE user_id = $1 AND deleted_at IS NULL LIMIT 1`,
        [req.user.sub]
      );

      if (!studentRes.rows.length || studentRes.rows[0].id !== studentId) {
        return res.status(403).json({
          success: false,
          message: 'Students can only access their own report card',
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
        [teacherId, studentId]
      );

      if (!assignmentCheck.rows.length) {
        return res.status(403).json({
          success: false,
          message: 'You are not assigned to this student\'s class',
          data: null,
        });
      }
    }

    const data = await resultService.getReportCard(studentId, {
      academicYearId: req.query.academicYearId && isValidUUID(req.query.academicYearId) ? req.query.academicYearId : null,
      term: req.query.term || null,
      teacherId,
    });

    return res.status(200).json({
      success: true,
      message: 'Student report card generated',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getSectionResults,
  getStudentReportCard,
};
