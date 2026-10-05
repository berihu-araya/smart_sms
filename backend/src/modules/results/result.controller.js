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
    let filterTeacherId = null;

    if (role.includes('teacher') && !role.includes('admin')) {
      const teacherId = req.teacherScope?.teacher_id;
      if (!teacherId) {
        return res.status(403).json({
          success: false,
          message: 'Teacher profile is not linked or has no active assignments',
          data: null,
        });
      }

      const isHomeroomClassTeacher = req.teacherScope?.homeroom_section_ids?.includes(sectionId);
      const isAssignedSubjectTeacher = req.teacherScope?.assigned_section_ids?.includes(sectionId);

      if (isHomeroomClassTeacher) {
        // Class teacher can calculate and view full section results across all subjects
        filterTeacherId = null;
      } else if (isAssignedSubjectTeacher) {
        // Subject teacher can view results for their assigned subject
        filterTeacherId = teacherId;
      } else {
        return res.status(403).json({
          success: false,
          message: 'You are not assigned to this class section as a subject teacher or class teacher',
          data: null,
        });
      }
    }

    const data = await resultService.calculateSectionResults({
      sectionId,
      academicYearId: req.query.academicYearId && isValidUUID(req.query.academicYearId) ? req.query.academicYearId : null,
      term: req.query.term || null,
      teacherId: filterTeacherId,
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
  let studentId = req.params.studentId || 'me';
  const role = (req.user?.role || '').toLowerCase();
  const userSub = req.user?.sub;
  const userEmail = (req.user?.email || '').trim().toLowerCase();
  let filterTeacherId = null;

  try {
    if (role.includes('parent')) {
      if (studentId === 'me') {
        studentId = req.parentScope?.child_student_ids[0];
        if (!studentId) {
          return res.status(200).json({
            success: true,
            message: 'No children linked to parent',
            data: { student: null, academicSummary: {}, subjects: [], gradingScales: [] },
          });
        }
      } else if (!req.parentScope?.child_student_ids.includes(studentId)) {
        return res.status(403).json({
          success: false,
          message: 'Parents can only access report cards of their own linked children',
          data: null,
        });
      }
    } else if (studentId === 'me' || (role.includes('student') && !role.includes('admin'))) {
      let studentRes = await db.query(
        `SELECT id, user_id FROM students
         WHERE (user_id = $1 OR (email IS NOT NULL AND LOWER(email) = LOWER($2)))
           AND deleted_at IS NULL
         ORDER BY (CASE WHEN user_id = $1 THEN 0 ELSE 1 END) ASC
         LIMIT 1`,
        [userSub, userEmail]
      );

      if (!studentRes.rows.length) {
        return res.status(200).json({
          success: true,
          message: 'Student report card',
          data: {
            student: {
              first_name: req.user?.firstName || 'Student',
              last_name: req.user?.lastName || '',
              admission_number: '—',
              grade_name: '—',
              section_name: '—',
            },
            school: {},
            attendance: {},
            academicSummary: {
              term: req.query.term || 'Current Term',
              totalSubjects: 0,
              completedSubjects: 0,
              isComplete: false,
              grandTotal: 0,
              averageScore: 0,
              finalGradeLetter: '—',
              rankInSection: 1,
              totalSectionStudents: 1,
              promotionStatus: 'NO MARKS RECORDED',
              conduct: 'Good',
            },
            subjects: [],
            gradingScales: [],
          },
        });
      }

      const matchedStudent = studentRes.rows[0];
      if (!matchedStudent.user_id && userSub) {
        db.query(
          `UPDATE students SET user_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id IS NULL`,
          [userSub, matchedStudent.id]
        ).catch(() => {});
      }

      if (studentId !== 'me' && matchedStudent.id !== studentId) {
        return res.status(403).json({
          success: false,
          message: 'Students can only access their own report card',
          data: null,
        });
      }

      studentId = matchedStudent.id;
    } else if (!isValidUUID(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID format',
        data: null,
      });
    }

    if (role.includes('teacher') && !role.includes('admin')) {
      const teacherId = req.teacherScope?.teacher_id;
      if (!teacherId) {
        return res.status(403).json({
          success: false,
          message: 'Teacher profile is not linked or has no active assignments',
          data: null,
        });
      }

      const studentRes = await db.query(
        `SELECT section_id FROM students WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
        [studentId]
      );

      if (!studentRes.rows.length) {
        return res.status(404).json({
          success: false,
          message: 'Student not found',
          data: null,
        });
      }

      const studentSectionId = studentRes.rows[0]?.section_id;
      const isHomeroomClassTeacher = req.teacherScope?.homeroom_section_ids?.includes(studentSectionId);
      const isAssignedSubjectTeacher = req.teacherScope?.assigned_section_ids?.includes(studentSectionId);

      if (isHomeroomClassTeacher) {
        // Class teacher can generate full report card across all subjects for homeroom students
        filterTeacherId = null;
      } else if (isAssignedSubjectTeacher) {
        // Subject teacher can view report card with their subject evaluations
        filterTeacherId = teacherId;
      } else {
        return res.status(403).json({
          success: false,
          message: 'You are not assigned to this student\'s class or homeroom section',
          data: null,
        });
      }
    }

    const data = await resultService.getReportCard(studentId, {
      academicYearId: req.query.academicYearId && isValidUUID(req.query.academicYearId) ? req.query.academicYearId : null,
      term: req.query.term || null,
      teacherId: filterTeacherId,
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
