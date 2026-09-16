const TeacherSubjectRepository = require('./teacher-subject.repository');
const {
  TeacherSubjectService,
} = require('./teacher-subject.service');

const {
  validateCreateTeacherSubjectInput,
  validateUpdateTeacherSubjectInput,
  validateTeacherSubjectId,
} = require('./teacher-subject.validation');

const { db } = require('../../../config/database');

const teacherSubjectService =
  new TeacherSubjectService(
    new TeacherSubjectRepository(db)
  );

async function listTeacherSubjects(req, res, next) {
  try {
    const role = (req.user?.role || '').toLowerCase().trim();
    let teacherId = req.query.teacher_id;
    if (role === 'teacher' && req.teacherScope) {
      teacherId = req.teacherScope.teacher_id;
    }

    const data =
      await teacherSubjectService.listTeacherSubjects({
        teacher_id: teacherId,
        grade_id: req.query.grade_id,
        section_id: req.query.section_id,
        academic_year_id: req.query.academic_year_id,
        search: req.query.search || '',
        limit: Number(req.query.limit || 100),
        offset: Number(req.query.offset || 0),
      });

    return res.status(200).json({
      success: true,
      message: 'Teacher subjects loaded successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function getMyOverview(req, res, next) {
  try {
    const role = (req.user?.role || '').toLowerCase().trim();
    if (role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'This endpoint is reserved for teachers',
        data: null,
      });
    }

    const teacher = req.teacherScope?.teacher;
    if (!teacher) {
      return res.status(200).json({
        success: true,
        data: {
          teacher: null,
          isSubjectTeacher: false,
          isClassTeacher: false,
          teaching_assignments: [],
          homeroom_classes: [],
        },
      });
    }

    // 1. Fetch teaching assignments with full details
    const teachingAssignmentsRes = await db.query(
      `SELECT
         ts.id,
         ts.teacher_id,
         ts.subject_id,
         ts.grade_id,
         ts.section_id,
         ts.academic_year_id,
         ts.start_date,
         ts.end_date,
         ts.status,
         sub.subject_name,
         sub.subject_code,
         sub.credit_hours,
         sub.pass_mark,
         sub.max_mark,
         sec.name AS section_name,
         sec.room_number,
         g.name AS grade_name,
         ay.name AS academic_year_name,
         (SELECT COUNT(*)::int FROM students s WHERE s.section_id = sec.id AND s.deleted_at IS NULL) AS student_count
       FROM teacher_subjects ts
       JOIN subjects sub ON sub.id = ts.subject_id AND sub.deleted_at IS NULL
       JOIN sections sec ON sec.id = ts.section_id AND sec.deleted_at IS NULL
       JOIN grades g ON g.id = ts.grade_id AND g.deleted_at IS NULL
       LEFT JOIN academic_years ay ON ay.id = ts.academic_year_id
       WHERE ts.teacher_id = $1
         AND ts.deleted_at IS NULL
       ORDER BY g.name ASC, sec.name ASC, sub.subject_name ASC`,
      [teacher.id]
    );

    // 2. Fetch homeroom classes with all their courses
    const homeroomSectionsRes = await db.query(
      `SELECT
         ct.id AS class_teacher_assignment_id,
         ct.section_id,
         ct.start_date,
         ct.end_date,
         sec.name AS section_name,
         sec.room_number,
         sec.capacity,
         sec.grade_id,
         g.name AS grade_name,
         ct.academic_year_id,
         ay.name AS academic_year_name,
         (SELECT COUNT(*)::int FROM students s WHERE s.section_id = sec.id AND s.deleted_at IS NULL) AS student_count
       FROM class_teachers ct
       JOIN sections sec ON sec.id = ct.section_id AND sec.deleted_at IS NULL
       JOIN grades g ON g.id = sec.grade_id AND g.deleted_at IS NULL
       LEFT JOIN academic_years ay ON ay.id = ct.academic_year_id
       WHERE ct.teacher_id = $1
         AND ct.status = 'ACTIVE'
         AND ct.deleted_at IS NULL
       ORDER BY g.name ASC, sec.name ASC`,
      [teacher.id]
    );

    const homeroomClasses = [];
    for (const homeroom of homeroomSectionsRes.rows) {
      // Get all curriculum courses in this homeroom's grade and who teaches them in this section
      const coursesRes = await db.query(
        `SELECT
           gs.id AS grade_subject_id,
           gs.subject_id,
           sub.subject_name,
           sub.subject_code,
           sub.credit_hours,
           COALESCE(gs.pass_marks, sub.pass_mark) AS pass_mark,
           COALESCE(gs.total_marks, sub.max_mark) AS max_mark,
           gs.weekly_periods,
           gs.is_compulsory,
           ts.id AS teacher_subject_id,
           ts.teacher_id,
           CONCAT(t.first_name, ' ', t.last_name) AS teacher_name,
           t.email AS teacher_email,
           (ts.teacher_id = $2) AS is_taught_by_me
         FROM grade_subjects gs
         JOIN subjects sub ON sub.id = gs.subject_id AND sub.deleted_at IS NULL
         LEFT JOIN teacher_subjects ts ON ts.section_id = $1 AND ts.subject_id = sub.id AND ts.status = 'ACTIVE' AND ts.deleted_at IS NULL
         LEFT JOIN teachers t ON t.id = ts.teacher_id AND t.deleted_at IS NULL
         WHERE gs.grade_id = $3
           AND gs.status = 'ACTIVE'
           AND gs.deleted_at IS NULL
         ORDER BY gs.display_order ASC, sub.subject_name ASC`,
        [homeroom.section_id, teacher.id, homeroom.grade_id]
      );

      homeroomClasses.push({
        ...homeroom,
        courses: coursesRes.rows,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        teacher: {
          id: teacher.id,
          employee_number: teacher.employee_number,
          first_name: teacher.first_name,
          last_name: teacher.last_name,
          name: `${teacher.first_name} ${teacher.last_name}`.trim(),
          email: teacher.email,
          phone: teacher.phone,
          department: teacher.department,
          designation: teacher.designation,
        },
        isSubjectTeacher: teachingAssignmentsRes.rows.length > 0,
        isClassTeacher: homeroomClasses.length > 0,
        teaching_assignments: teachingAssignmentsRes.rows,
        homeroom_classes: homeroomClasses,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function getTeacherSubjectById(req, res, next) {
  const { id, errors } =
    validateTeacherSubjectId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: errors,
    });
  }

  try {
    const data =
      await teacherSubjectService.getTeacherSubjectById(id);

    return res.status(200).json({
      success: true,
      message: 'Teacher subject loaded successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function createTeacherSubject(req, res, next) {
  const input =
    validateCreateTeacherSubjectInput(req.body);

  if (Object.keys(input.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: input.errors,
    });
  }

  try {
    const data =
      await teacherSubjectService.createTeacherSubject(
        input
      );

    return res.status(201).json({
      success: true,
      message:
        'Teacher subject assigned successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateTeacherSubject(req, res, next) {
  const { id, errors } =
    validateTeacherSubjectId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: errors,
    });
  }

  const { errors: validationErrors, ...payload } =
    validateUpdateTeacherSubjectInput(req.body);

  if (Object.keys(validationErrors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: validationErrors,
    });
  }

  try {
    const data =
      await teacherSubjectService.updateTeacherSubject(
        id,
        payload
      );

    return res.status(200).json({
      success: true,
      message:
        'Teacher subject updated successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteTeacherSubject(req, res, next) {
  const { id, errors } =
    validateTeacherSubjectId(req.params.id);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: errors,
    });
  }

  try {
    const data =
      await teacherSubjectService.deleteTeacherSubject(
        id
      );

    return res.status(200).json({
      success: true,
      message:
        'Teacher subject deleted successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listTeacherSubjects,
  getMyOverview,
  getTeacherSubjectById,
  createTeacherSubject,
  updateTeacherSubject,
  deleteTeacherSubject,
};