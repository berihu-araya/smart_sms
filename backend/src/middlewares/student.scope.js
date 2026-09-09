const { db } = require('../config/database');

async function attachStudentScope(req, res, next) {
  if ((req.user?.role || '').toLowerCase().trim() !== 'student') return next();

  try {
    const result = await db.query(
      `SELECT s.id AS student_id, s.section_id, sec.grade_id, s.school_id
       FROM students s
       LEFT JOIN sections sec ON sec.id = s.section_id AND sec.deleted_at IS NULL
       WHERE s.user_id = $1 AND s.deleted_at IS NULL
       LIMIT 1`,
      [req.user.sub]
    );

    if (!result.rows[0]) {
      return res.status(403).json({
        success: false,
        message: 'Student profile is not linked to this account',
        data: null,
      });
    }

    req.studentScope = result.rows[0];
    next();
  } catch (error) {
    next(error);
  }
}

function requireStudentOwnParam(paramName) {
  return (req, res, next) => {
    if ((req.user?.role || '').toLowerCase().trim() !== 'student') return next();

    if (req.params[paramName] !== req.studentScope?.student_id) {
      return res.status(403).json({
        success: false,
        message: 'Students can only access their own records',
        data: null,
      });
    }

    next();
  };
}

function requireStudentScopeMatch(scopeKey, paramName = 'id') {
  return (req, res, next) => {
    if ((req.user?.role || '').toLowerCase().trim() !== 'student') return next();
    if (req.params[paramName] !== req.studentScope?.[scopeKey]) {
      return res.status(403).json({
        success: false,
        message: 'Students can only access their assigned academic records',
        data: null,
      });
    }
    next();
  };
}

function requireStudentRelatedRecord(kind, paramName = 'id') {
  const queries = {
    exam: `SELECT 1 FROM exams e WHERE e.id = $1 AND e.grade_id = $2 AND e.is_published = TRUE AND e.deleted_at IS NULL LIMIT 1`,
    subject: `SELECT 1 FROM grade_subjects gs WHERE gs.subject_id = $1 AND gs.grade_id = $2 AND gs.deleted_at IS NULL LIMIT 1`,
    gradeSubject: `SELECT 1 FROM grade_subjects gs WHERE gs.id = $1 AND gs.grade_id = $2 AND gs.deleted_at IS NULL LIMIT 1`,
    timetable: `SELECT 1 FROM timetable_entries te WHERE te.timetable_id = $1 AND te.section_id = $2 AND te.deleted_at IS NULL LIMIT 1`,
    teacher: `SELECT 1 FROM teachers t WHERE t.id = $1 AND t.deleted_at IS NULL AND (EXISTS (SELECT 1 FROM class_teachers ct WHERE ct.teacher_id = t.id AND ct.section_id = $2 AND ct.deleted_at IS NULL) OR EXISTS (SELECT 1 FROM teacher_subjects ts WHERE ts.teacher_id = t.id AND ts.section_id = $2 AND ts.deleted_at IS NULL)) LIMIT 1`,
  };

  return async (req, res, next) => {
    if ((req.user?.role || '').toLowerCase().trim() !== 'student') return next();

    try {
      const scopeValue = kind === 'teacher' || kind === 'timetable'
        ? req.studentScope?.section_id
        : req.studentScope?.grade_id;
      const result = await db.query(queries[kind], [req.params[paramName], scopeValue]);
      if (!result.rows[0]) {
        return res.status(403).json({
          success: false,
          message: 'Students can only access records assigned to their academic scope',
          data: null,
        });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  attachStudentScope,
  requireStudentOwnParam,
  requireStudentScopeMatch,
  requireStudentRelatedRecord,
};