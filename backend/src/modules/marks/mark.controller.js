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
    let isReadOnly = false;

    if (role.includes('teacher') && !role.includes('admin')) {
      teacherId = req.teacherScope?.teacher_id;
      if (!teacherId) {
        return res.status(403).json({
          success: false,
          message: 'Teacher profile is not linked or has no active assignments',
          data: null,
        });
      }

      const isSubjectTeacher = req.teacherScope?.canEditMarks(query.subjectId, query.sectionId);
      const isHomeroomClassTeacher = req.teacherScope?.homeroom_section_ids?.includes(query.sectionId);

      if (isSubjectTeacher) {
        isReadOnly = false;
      } else if (isHomeroomClassTeacher) {
        isReadOnly = true;
      } else {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view marks for this class and subject',
          data: null,
        });
      }
    }

    const data = await markService.getMarksSheet({ ...query, teacherId, isReadOnly });
    return res.status(200).json({
      success: true,
      message: 'Marks sheet loaded successfully',
      data: {
        ...data,
        isReadOnly,
      },
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
      teacherId = req.teacherScope?.teacher_id;
      if (!teacherId) {
        return res.status(403).json({
          success: false,
          message: 'Teacher profile is not linked or has no active assignments',
          data: null,
        });
      }

      const canEdit = req.teacherScope?.canEditMarks(input.subjectId, input.sectionId);
      if (!canEdit) {
        return res.status(403).json({
          success: false,
          message: 'Only the assigned subject teacher can enter or edit marks for this subject and class',
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
  let studentId = req.params.studentId;
  const role = (req.user?.role || '').toLowerCase();
  const userSub = req.user?.sub;
  const userEmail = (req.user?.email || '').trim().toLowerCase();

  try {
    if (role.includes('parent')) {
      if (studentId === 'me') {
        studentId = req.parentScope?.child_student_ids[0];
        if (!studentId) {
          return res.status(200).json({
            success: true,
            message: 'No children linked to parent',
            data: [],
          });
        }
      } else if (!req.parentScope?.child_student_ids.includes(studentId)) {
        return res.status(403).json({
          success: false,
          message: 'Parents can only access marks of their own linked children',
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
          message: 'Student marks loaded',
          data: [],
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
          message: 'Students can only access their own marks',
          data: null,
        });
      }

      studentId = matchedStudent.id;
    } else if (!isValidUUID(studentId)) {
      return res.status(400).json({ success: false, message: 'Invalid student ID', data: null });
    }

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
        // Class teacher can view all marks for students in their homeroom section
        filterTeacherId = null;
      } else if (isAssignedSubjectTeacher) {
        // Subject teacher can view marks for their assigned subject
        filterTeacherId = teacherId;
      } else {
        return res.status(403).json({
          success: false,
          message: 'You are not assigned to this student\'s class or homeroom section',
          data: null,
        });
      }
    }

    const data = await markService.getStudentMarks(studentId, {
      academicYearId: req.query.academicYearId && isValidUUID(req.query.academicYearId) ? req.query.academicYearId : null,
      teacherId: filterTeacherId,
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
