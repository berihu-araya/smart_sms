const { db } = require('../config/database');

/**
 * Middleware to attach teacher scope to the request object.
 * Identifies the logged-in teacher and resolves all their active subject and class-teacher (homeroom) assignments.
 *
 * Populates req.teacherScope = {
 *   teacher_id: string | null,
 *   teacher: object | null,
 *   isClassTeacher: boolean,
 *   isSubjectTeacher: boolean,
 *   isHybrid: boolean,
 *   homeroom_section_ids: Array<string>,
 *   homeroom_grade_ids: Array<string>,
 *   assigned_subject_ids: Array<string>,
 *   assigned_section_ids: Array<string>,
 *   assigned_grade_ids: Array<string>,
 *   all_accessible_section_ids: Array<string>,
 *   all_accessible_grade_ids: Array<string>,
 *   subject_assignments: Array<object>,
 *   class_teacher_assignments: Array<object>,
 *   school_id: string | null,
 *   canEditMarks: Function,
 *   canViewMarks: Function,
 *   canAccessStudent: Function,
 *   canAccessSection: Function,
 *   canCalculateSectionRank: Function,
 * }
 */
async function attachTeacherScope(req, res, next) {
  const role = (req.user?.role || '').toLowerCase().trim();
  if (role !== 'teacher') return next();

  try {
    const userSub = req.user?.sub;
    const userEmail = (req.user?.email || '').trim().toLowerCase();

    // 1. Find teacher profile linked to user_id or matching email
    const teacherRes = await db.query(
      `SELECT t.id, t.user_id, t.employee_number, t.first_name, t.last_name, t.email, t.phone, t.gender, t.department, t.designation, t.status
       FROM teachers t
       WHERE (t.user_id = $1 OR (t.email IS NOT NULL AND LOWER(t.email) = LOWER($2)))
         AND t.deleted_at IS NULL
       ORDER BY (CASE WHEN t.user_id = $1 THEN 0 ELSE 1 END) ASC
       LIMIT 1`,
      [userSub, userEmail]
    );

    const teacher = teacherRes.rows[0] || null;

    // Auto-link user_id if matched by email
    if (teacher && !teacher.user_id && userSub) {
      db.query(
        `UPDATE teachers SET user_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id IS NULL`,
        [userSub, teacher.id]
      ).catch(() => {});
      teacher.user_id = userSub;
    }

    if (!teacher) {
      req.teacherScope = {
        teacher_id: null,
        teacher: null,
        isClassTeacher: false,
        isSubjectTeacher: false,
        isHybrid: false,
        homeroom_section_ids: [],
        homeroom_grade_ids: [],
        assigned_subject_ids: [],
        major_subject_ids: [],
        assigned_section_ids: [],
        assigned_grade_ids: [],
        all_accessible_section_ids: [],
        all_accessible_grade_ids: [],
        subject_assignments: [],
        class_teacher_assignments: [],
        school_id: req.user?.school_id || null,
        canEditMarks: () => false,
        canViewMarks: () => false,
        canAccessStudent: () => false,
        canAccessSection: () => false,
        canCalculateSectionRank: () => false,
      };
      return next();
    }

    // 2. Fetch all active subject assignments
    const subjectAssignmentsRes = await db.query(
      `SELECT
         ts.id,
         ts.teacher_id,
         ts.subject_id,
         ts.grade_id,
         ts.section_id,
         ts.academic_year_id,
         sub.subject_name,
         sub.subject_code,
         sec.name AS section_name,
         g.name AS grade_name
       FROM teacher_subjects ts
       JOIN subjects sub ON sub.id = ts.subject_id AND sub.deleted_at IS NULL
       JOIN sections sec ON sec.id = ts.section_id AND sec.deleted_at IS NULL
       LEFT JOIN grades g ON g.id = ts.grade_id AND g.deleted_at IS NULL
       WHERE ts.teacher_id = $1
         AND ts.status = 'ACTIVE'
         AND ts.deleted_at IS NULL
       ORDER BY sub.subject_name ASC`,
      [teacher.id]
    );

    // 3. Fetch all active class-teacher (homeroom) assignments
    const classTeacherAssignmentsRes = await db.query(
      `SELECT
         ct.id,
         ct.teacher_id,
         ct.section_id,
         ct.academic_year_id,
         ct.start_date,
         ct.end_date,
         sec.name AS section_name,
         sec.room_number,
         sec.grade_id,
         g.name AS grade_name
       FROM class_teachers ct
       JOIN sections sec ON sec.id = ct.section_id AND sec.deleted_at IS NULL
       LEFT JOIN grades g ON g.id = sec.grade_id AND g.deleted_at IS NULL
       WHERE ct.teacher_id = $1
         AND ct.status = 'ACTIVE'
         AND ct.deleted_at IS NULL
       ORDER BY sec.name ASC`,
      [teacher.id]
    );

    // 4. Resolve subjects matching teacher's registered department/major specialization
    let majorSubjectIds = [];
    if (teacher.department && teacher.department.trim()) {
      const deptPattern = `%${teacher.department.trim()}%`;
      const deptRes = await db.query(
        `SELECT id FROM subjects
         WHERE deleted_at IS NULL
           AND (LOWER(subject_name) LIKE LOWER($1) OR LOWER($2) LIKE LOWER('%' || subject_name || '%'))`,
        [deptPattern, teacher.department.trim()]
      );
      majorSubjectIds = deptRes.rows.map((r) => r.id);
    }

    const subjectAssignments = subjectAssignmentsRes.rows || [];
    const classTeacherAssignments = classTeacherAssignmentsRes.rows || [];

    const explicitlyAssignedSubjectIds = subjectAssignments.map((a) => a.subject_id).filter(Boolean);
    const assignedSubjectIds = [...new Set([...explicitlyAssignedSubjectIds, ...majorSubjectIds])];
    const assignedSectionIds = [...new Set(subjectAssignments.map((a) => a.section_id).filter(Boolean))];
    const assignedGradeIds = [...new Set(subjectAssignments.map((a) => a.grade_id).filter(Boolean))];

    const homeroomSectionIds = [...new Set(classTeacherAssignments.map((a) => a.section_id).filter(Boolean))];
    const homeroomGradeIds = [...new Set(classTeacherAssignments.map((a) => a.grade_id).filter(Boolean))];

    const allAccessibleSectionIds = [...new Set([...assignedSectionIds, ...homeroomSectionIds])];
    const allAccessibleGradeIds = [...new Set([...assignedGradeIds, ...homeroomGradeIds])];

    const isClassTeacher = homeroomSectionIds.length > 0;
    const isSubjectTeacher = assignedSubjectIds.length > 0;
    const isHybrid = isClassTeacher && isSubjectTeacher;

    req.teacherScope = {
      teacher_id: teacher.id,
      teacher,
      isClassTeacher,
      isSubjectTeacher,
      isHybrid,
      homeroom_section_ids: homeroomSectionIds,
      homeroom_grade_ids: homeroomGradeIds,
      assigned_subject_ids: assignedSubjectIds,
      assigned_section_ids: assignedSectionIds,
      assigned_grade_ids: assignedGradeIds,
      all_accessible_section_ids: allAccessibleSectionIds,
      all_accessible_grade_ids: allAccessibleGradeIds,
      subject_assignments: subjectAssignments,
      class_teacher_assignments: classTeacherAssignments,
      school_id: teacher.school_id || req.user?.school_id || null,

      // Helper permissions methods
      canEditMarks: (subjectId, sectionId) => {
        return subjectAssignments.some(
          (a) => a.subject_id === subjectId && (!sectionId || a.section_id === sectionId)
        );
      },
      canViewMarks: (subjectId, sectionId) => {
        if (sectionId && homeroomSectionIds.includes(sectionId)) return true;
        return subjectAssignments.some(
          (a) => a.subject_id === subjectId && (!sectionId || a.section_id === sectionId)
        );
      },
      canAccessStudent: (studentSectionId) => {
        return allAccessibleSectionIds.includes(studentSectionId);
      },
      canAccessSection: (sectionId) => {
        return allAccessibleSectionIds.includes(sectionId);
      },
      canCalculateSectionRank: (sectionId) => {
        return homeroomSectionIds.includes(sectionId);
      },
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware verifying that a teacher is the assigned Subject Teacher for (subjectId, sectionId)
 * Required for entering/editing marks and creating assignments.
 */
function requireTeacherOwnSubject(subjectParam = 'subjectId', sectionParam = 'sectionId') {
  return (req, res, next) => {
    const role = (req.user?.role || '').toLowerCase().trim();
    if (role !== 'teacher') return next();

    const subjectId = req.params[subjectParam] || req.query[subjectParam] || req.body[subjectParam] || req.body?.subject_id;
    const sectionId = req.params[sectionParam] || req.query[sectionParam] || req.body[sectionParam] || req.body?.section_id;

    if (!subjectId) {
      return res.status(400).json({
        success: false,
        message: 'Subject ID is required for this action',
        data: null,
      });
    }

    const canEdit = req.teacherScope?.canEditMarks(subjectId, sectionId);
    if (!canEdit) {
      return res.status(403).json({
        success: false,
        message: 'Only the assigned subject teacher can perform this action for this subject and class',
        data: null,
      });
    }

    next();
  };
}

/**
 * Middleware verifying teacher has access to a specific section (homeroom or taught subject)
 */
function requireTeacherSectionAccess(sectionParam = 'sectionId') {
  return (req, res, next) => {
    const role = (req.user?.role || '').toLowerCase().trim();
    if (role !== 'teacher') return next();

    const sectionId = req.params[sectionParam] || req.query[sectionParam] || req.body[sectionParam] || req.body?.section_id;
    if (!sectionId) return next();

    const canAccess = req.teacherScope?.canAccessSection(sectionId);
    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this class section as a subject teacher or class teacher',
        data: null,
      });
    }

    next();
  };
}

/**
 * Middleware verifying teacher has access to calculate/manage full section ranks (must be Class Teacher)
 */
function requireTeacherClassTeacher(sectionParam = 'sectionId') {
  return (req, res, next) => {
    const role = (req.user?.role || '').toLowerCase().trim();
    if (role !== 'teacher') return next();

    const sectionId = req.params[sectionParam] || req.query[sectionParam] || req.body[sectionParam] || req.body?.section_id;
    if (!sectionId) return next();

    const isClassTeacher = req.teacherScope?.canCalculateSectionRank(sectionId);
    if (!isClassTeacher) {
      return res.status(403).json({
        success: false,
        message: 'Only the assigned Class Teacher can calculate rankings and manage final results for this section',
        data: null,
      });
    }

    next();
  };
}

module.exports = {
  attachTeacherScope,
  requireTeacherOwnSubject,
  requireTeacherSectionAccess,
  requireTeacherClassTeacher,
};
