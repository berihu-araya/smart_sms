const { db } = require('../config/database');

/**
 * Middleware to attach parent scope to the request object.
 * Identifies the logged-in parent and resolves all their active linked children.
 *
 * Populates req.parentScope = {
 *   parent_id: string | null,
 *   parent: object | null,
 *   children: Array<object>,
 *   child_student_ids: Array<string>,
 *   child_section_ids: Array<string>,
 *   child_grade_ids: Array<string>,
 *   school_id: string | null,
 * }
 */
async function attachParentScope(req, res, next) {
  const role = (req.user?.role || '').toLowerCase().trim();
  if (role !== 'parent') return next();

  try {
    const userSub = req.user?.sub;
    const userEmail = (req.user?.email || '').trim().toLowerCase();
    const userPhone = (req.user?.phone || '').trim();

    // 1. Find parent profile linked to user_id or matching email/phone
    const parentRes = await db.query(
      `SELECT p.id, p.user_id, p.full_name, p.phone, p.email, p.occupation, p.address, p.relationship, p.school_id
       FROM parents p
       WHERE (p.user_id = $1 OR (p.email IS NOT NULL AND LOWER(p.email) = LOWER($2)) OR (p.phone IS NOT NULL AND p.phone = $3))
         AND p.deleted_at IS NULL
       ORDER BY (CASE WHEN p.user_id = $1 THEN 0 ELSE 1 END) ASC
       LIMIT 1`,
      [userSub, userEmail, userPhone || '___NO_PHONE___']
    );

    const parent = parentRes.rows[0] || null;

    // Auto-link user_id if matched by email or phone
    if (parent && !parent.user_id && userSub) {
      db.query(
        `UPDATE parents SET user_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id IS NULL`,
        [userSub, parent.id]
      ).catch(() => {});
      parent.user_id = userSub;
    }

    if (!parent) {
      req.parentScope = {
        parent_id: null,
        parent: null,
        children: [],
        child_student_ids: [],
        child_section_ids: [],
        child_grade_ids: [],
        school_id: req.user?.school_id || null,
      };
      return next();
    }

    // 2. Fetch all active linked children for this parent
    const childrenRes = await db.query(
      `SELECT
        s.id,
        s.user_id,
        s.admission_number,
        s.first_name,
        s.last_name,
        s.gender,
        s.date_of_birth,
        NULL AS roll_number,
        s.status,
        s.school_id,
        sec.id AS section_id,
        sec.name AS section_name,
        sec.room_number,
        g.id AS grade_id,
        g.name AS grade_name,
        sch.name AS school_name
      FROM students s
      LEFT JOIN sections sec ON sec.id = s.section_id AND sec.deleted_at IS NULL
      LEFT JOIN grades g ON g.id = sec.grade_id AND g.deleted_at IS NULL
      LEFT JOIN schools sch ON sch.id = s.school_id AND sch.deleted_at IS NULL
      WHERE s.parent_id = $1
        AND s.deleted_at IS NULL
      ORDER BY s.first_name ASC, s.last_name ASC`,
      [parent.id]
    );

    const children = childrenRes.rows || [];
    const childStudentIds = children.map((c) => c.id).filter(Boolean);
    const childSectionIds = [...new Set(children.map((c) => c.section_id).filter(Boolean))];
    const childGradeIds = [...new Set(children.map((c) => c.grade_id).filter(Boolean))];

    req.parentScope = {
      parent_id: parent.id,
      parent,
      children,
      child_student_ids: childStudentIds,
      child_section_ids: childSectionIds,
      child_grade_ids: childGradeIds,
      school_id: parent.school_id || req.user?.school_id || null,
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware that verifies a Parent only accesses their own linked child.
 * If caller is a Parent, target student ID in params or query MUST be one of their children.
 * @param {string} paramName - Name of the request parameter holding studentId (defaults to 'id')
 */
function requireParentOwnChild(paramName = 'id') {
  return (req, res, next) => {
    const role = (req.user?.role || '').toLowerCase().trim();
    if (role !== 'parent') return next();

    const targetStudentId = req.params[paramName] || req.query[paramName] || req.body[paramName];

    // 'me' or null/empty might be resolved dynamically in controller
    if (!targetStudentId || targetStudentId === 'me') {
      return next();
    }

    const childIds = req.parentScope?.child_student_ids || [];
    if (!childIds.includes(targetStudentId)) {
      return res.status(403).json({
        success: false,
        message: 'Parents can only access records of their own linked children',
        data: null,
      });
    }

    next();
  };
}

/**
 * Middleware that verifies a Parent only accesses or modifies their own parent profile.
 * @param {string} paramName - Name of the parameter holding parentId (defaults to 'id')
 */
function requireParentOwnProfile(paramName = 'id') {
  return (req, res, next) => {
    const role = (req.user?.role || '').toLowerCase().trim();
    if (role !== 'parent') return next();

    const targetParentId = req.params[paramName];
    if (targetParentId === 'me' || targetParentId === req.parentScope?.parent_id) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Parents can only access their own profile',
      data: null,
    });
  };
}

module.exports = {
  attachParentScope,
  requireParentOwnChild,
  requireParentOwnProfile,
};
