/**
 * High-performance PostgreSQL data access layer for Smart SMS Announcements Module.
 * Enforces strict multi-tenant school_id isolation and dynamic RBAC scoping.
 */

class AnnouncementRepository {
  constructor(database) {
    this.database = database;
  }

  /**
   * Helper: Resolves student's enrolled grade_id and section_id if user is a student.
   * @param {string} userId
   * @returns {Promise<{ gradeId: string|null, sectionId: string|null }>}
   */
  async resolveStudentEnrollment(userId) {
    const res = await this.database.query(
      `SELECT s.section_id, sec.grade_id
       FROM students s
       LEFT JOIN sections sec ON sec.id = s.section_id AND sec.deleted_at IS NULL
       WHERE s.user_id = $1 AND s.deleted_at IS NULL
       LIMIT 1`,
      [userId]
    );

    if (res.rows.length === 0) {
      return { gradeId: null, sectionId: null };
    }

    return {
      gradeId: res.rows[0].grade_id || null,
      sectionId: res.rows[0].section_id || null,
    };
  }

  /**
   * List announcements with filtering, pagination, and role-based visibility.
   * @param {object} params
   * @param {object} userContext - req.user, req.parentScope, req.teacherScope
   * @returns {Promise<{ items: Array, total: number, page: number, limit: number, totalPages: number }>}
   */
  async list(params = {}, userContext = {}) {
    const {
      page = 1,
      limit = 10,
      search = '',
      category,
      priority,
      audience,
      status,
      grade_id,
      section_id,
      is_pinned,
      date_range,
      sort,
    } = params;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const user = userContext.user || {};
    const role = (user.role || '').toLowerCase().trim();
    const isAdmin = ['admin', 'school admin'].includes(role);
    const isTeacher = role === 'teacher';
    const isParent = role === 'parent';
    const isStudent = role === 'student';
    const isStaff = role === 'staff';

    const schoolId = user.school_id;
    const userId = user.sub;

    const filterValues = [schoolId];
    const conditions = [
      'a.school_id = $1',
      'a.deleted_at IS NULL',
    ];

    // 1. Role-Based Audience & Publication Filtering
    if (isAdmin) {
      // Admins see all announcements; filter by status if requested
      if (status) {
        conditions.push(`a.status = $${filterValues.length + 1}`);
        filterValues.push(status.toUpperCase());
      }
    } else {
      // Non-admins only see published, active announcements
      conditions.push(`a.status = 'PUBLISHED'`);
      conditions.push(`a.published_at <= CURRENT_TIMESTAMP`);
      conditions.push(`(a.expires_at IS NULL OR a.expires_at >= CURRENT_TIMESTAMP)`);

      if (isTeacher) {
        conditions.push(`(a.audience IN ('ALL', 'TEACHERS') OR a.created_by = $${filterValues.length + 1})`);
        filterValues.push(userId);
      } else if (isParent) {
        const parentScope = userContext.parentScope || {};
        const childGradeIds = parentScope.child_grade_ids || [];
        const childSectionIds = parentScope.child_section_ids || [];

        conditions.push(`a.audience IN ('ALL', 'PARENTS')`);

        if (childGradeIds.length > 0 || childSectionIds.length > 0) {
          const pSec = filterValues.length + 1;
          const pGrade = filterValues.length + 2;
          conditions.push(`(
            (a.grade_id IS NULL AND a.section_id IS NULL)
            OR (a.section_id IS NOT NULL AND a.section_id = ANY($${pSec}::uuid[]))
            OR (a.section_id IS NULL AND a.grade_id IS NOT NULL AND a.grade_id = ANY($${pGrade}::uuid[]))
          )`);
          filterValues.push(childSectionIds, childGradeIds);
        } else {
          // Parent with no active enrolled children only sees general parent notices
          conditions.push(`(a.grade_id IS NULL AND a.section_id IS NULL)`);
        }
      } else if (isStudent) {
        const enrollment = await this.resolveStudentEnrollment(userId);
        conditions.push(`a.audience IN ('ALL', 'STUDENTS')`);

        if (enrollment.gradeId || enrollment.sectionId) {
          const pSec = filterValues.length + 1;
          const pGrade = filterValues.length + 2;
          conditions.push(`(
            (a.grade_id IS NULL AND a.section_id IS NULL)
            OR (a.section_id IS NOT NULL AND $${pSec}::uuid IS NOT NULL AND a.section_id = $${pSec}::uuid)
            OR (a.section_id IS NULL AND a.grade_id IS NOT NULL AND $${pGrade}::uuid IS NOT NULL AND a.grade_id = $${pGrade}::uuid)
          )`);
          filterValues.push(enrollment.sectionId || null, enrollment.gradeId || null);
        } else {
          conditions.push(`(a.grade_id IS NULL AND a.section_id IS NULL)`);
        }
      } else if (isStaff) {
        conditions.push(`a.audience IN ('ALL', 'STAFF', 'TEACHERS')`);
      } else {
        conditions.push(`a.audience = 'ALL'`);
      }
    }

    // 2. Additional Optional Query Filters
    if (search && search.trim() !== '') {
      const searchPattern = `%${search.trim()}%`;
      const p1 = filterValues.length + 1;
      const p2 = filterValues.length + 2;
      conditions.push(`(a.title ILIKE $${p1} OR a.content ILIKE $${p2})`);
      filterValues.push(searchPattern, searchPattern);
    }

    if (category) {
      conditions.push(`a.category = $${filterValues.length + 1}`);
      filterValues.push(category.toUpperCase());
    }

    if (priority) {
      conditions.push(`a.priority = $${filterValues.length + 1}`);
      filterValues.push(priority.toUpperCase());
    }

    if (audience && isAdmin) {
      conditions.push(`a.audience = $${filterValues.length + 1}`);
      filterValues.push(audience.toUpperCase());
    }

    if (grade_id) {
      conditions.push(`a.grade_id = $${filterValues.length + 1}`);
      filterValues.push(grade_id);
    }

    if (section_id) {
      conditions.push(`a.section_id = $${filterValues.length + 1}`);
      filterValues.push(section_id);
    }

    if (is_pinned !== undefined && is_pinned !== null && is_pinned !== '') {
      conditions.push(`a.is_pinned = $${filterValues.length + 1}`);
      filterValues.push(is_pinned === 'true' || is_pinned === true);
    }

    if (date_range === 'TODAY') {
      conditions.push(`a.published_at >= CURRENT_DATE`);
    } else if (date_range === 'WEEK') {
      conditions.push(`a.published_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'`);
    } else if (date_range === 'MONTH') {
      conditions.push(`a.published_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'`);
    }

    let orderClause = 'a.is_pinned DESC, a.published_at DESC';
    if (sort === 'OLDEST') {
      orderClause = 'a.is_pinned DESC, a.published_at ASC';
    } else if (sort === 'PRIORITY') {
      orderClause = `a.is_pinned DESC, CASE a.priority WHEN 'URGENT' THEN 3 WHEN 'IMPORTANT' THEN 2 ELSE 1 END DESC, a.published_at DESC`;
    } else if (sort === 'MOST_ACKNOWLEDGED') {
      orderClause = 'a.is_pinned DESC, acknowledgement_count DESC, a.published_at DESC';
    }

    const whereClause = conditions.join(' AND ');

    // 3. Count Query - strictly uses filterValues for whereClause
    const countSql = `
      SELECT COUNT(*) AS total
      FROM announcements a
      WHERE ${whereClause}
    `;
    const countResult = await this.database.query(countSql, [...filterValues]);
    const total = parseInt(countResult.rows[0]?.total || 0, 10);

    // 4. Data Query with Joins & Acknowledgement Tracking
    const pUser = filterValues.length + 1;
    const pLimit = filterValues.length + 2;
    const pOffset = filterValues.length + 3;

    const dataSql = `
      SELECT
        a.id,
        a.school_id,
        a.title,
        a.content,
        a.category,
        a.priority,
        a.audience,
        a.grade_id,
        g.name AS grade_name,
        a.section_id,
        sec.name AS section_name,
        a.attachment_url,
        a.attachment_name,
        a.is_pinned,
        a.requires_acknowledgement,
        a.status,
        a.published_at,
        a.expires_at,
        a.created_by,
        CONCAT(u.first_name, ' ', u.last_name) AS author_name,
        r.name AS author_role,
        a.created_at,
        a.updated_at,
        (ack.id IS NOT NULL) AS is_acknowledged,
        ack.acknowledged_at,
        (
          SELECT COUNT(*)
          FROM announcement_acknowledgements acks
          WHERE acks.announcement_id = a.id
        ) AS acknowledgement_count
      FROM announcements a
      LEFT JOIN users u ON u.id = a.created_by
      LEFT JOIN roles r ON r.id = u.role_id
      LEFT JOIN grades g ON g.id = a.grade_id AND g.deleted_at IS NULL
      LEFT JOIN sections sec ON sec.id = a.section_id AND sec.deleted_at IS NULL
      LEFT JOIN announcement_acknowledgements ack ON ack.announcement_id = a.id AND ack.user_id = $${pUser}
      WHERE ${whereClause}
      ORDER BY ${orderClause}
      LIMIT $${pLimit} OFFSET $${pOffset}
    `;

    const dataValues = [...filterValues, userId || null, limitNum, offset];
    const result = await this.database.query(dataSql, dataValues);

    return {
      items: result.rows,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    };
  }

  /**
   * Retrieves dashboard KPI statistics for Announcements.
   * @param {object} userContext
   * @returns {Promise<object>}
   */
  async getStats(userContext = {}) {
    const user = userContext.user || {};
    const schoolId = user.school_id;
    const userId = user.sub;

    const statsSql = `
      SELECT
        COUNT(*) AS total_announcements,
        COUNT(*) FILTER (WHERE status = 'PUBLISHED' AND published_at <= CURRENT_TIMESTAMP AND (expires_at IS NULL OR expires_at >= CURRENT_TIMESTAMP)) AS active_announcements,
        COUNT(*) FILTER (WHERE status = 'PUBLISHED' AND priority = 'URGENT' AND (expires_at IS NULL OR expires_at >= CURRENT_TIMESTAMP)) AS urgent_alerts,
        COUNT(*) FILTER (WHERE status = 'PUBLISHED' AND is_pinned = true AND (expires_at IS NULL OR expires_at >= CURRENT_TIMESTAMP)) AS pinned_announcements,
        COUNT(*) FILTER (
          WHERE status = 'PUBLISHED'
            AND requires_acknowledgement = true
            AND (expires_at IS NULL OR expires_at >= CURRENT_TIMESTAMP)
            AND NOT EXISTS (
              SELECT 1 FROM announcement_acknowledgements ack
              WHERE ack.announcement_id = announcements.id AND ack.user_id = $2
            )
        ) AS pending_acknowledgements
      FROM announcements
      WHERE school_id = $1 AND deleted_at IS NULL
    `;

    const res = await this.database.query(statsSql, [schoolId, userId]);
    const row = res.rows[0] || {};

    // Also check for the most urgent unacknowledged notice for user alert prompt
    const urgentNoticeSql = `
      SELECT a.id, a.title, a.category, a.priority, a.published_at
      FROM announcements a
      WHERE a.school_id = $1
        AND a.deleted_at IS NULL
        AND a.status = 'PUBLISHED'
        AND a.priority = 'URGENT'
        AND (a.expires_at IS NULL OR a.expires_at >= CURRENT_TIMESTAMP)
        AND NOT EXISTS (
          SELECT 1 FROM announcement_acknowledgements ack
          WHERE ack.announcement_id = a.id AND ack.user_id = $2
        )
      ORDER BY a.published_at DESC
      LIMIT 1
    `;

    const urgentRes = await this.database.query(urgentNoticeSql, [schoolId, userId]);

    return {
      totalAnnouncements: parseInt(row.total_announcements || 0, 10),
      activeAnnouncements: parseInt(row.active_announcements || 0, 10),
      urgentAlerts: parseInt(row.urgent_alerts || 0, 10),
      pinnedAnnouncements: parseInt(row.pinned_announcements || 0, 10),
      pendingAcknowledgements: parseInt(row.pending_acknowledgements || 0, 10),
      urgentUnacknowledgedNotice: urgentRes.rows[0] || null,
    };
  }

  /**
   * Find a single announcement by ID.
   * @param {string} id
   * @param {object} userContext
   * @returns {Promise<object|null>}
   */
  async findById(id, userContext = {}) {
    const user = userContext.user || {};
    const schoolId = user.school_id;
    const userId = user.sub;

    const sql = `
      SELECT
        a.id,
        a.school_id,
        a.title,
        a.content,
        a.category,
        a.priority,
        a.audience,
        a.grade_id,
        g.name AS grade_name,
        a.section_id,
        sec.name AS section_name,
        a.attachment_url,
        a.attachment_name,
        a.is_pinned,
        a.requires_acknowledgement,
        a.status,
        a.published_at,
        a.expires_at,
        a.created_by,
        CONCAT(u.first_name, ' ', u.last_name) AS author_name,
        r.name AS author_role,
        a.created_at,
        a.updated_at,
        (ack.id IS NOT NULL) AS is_acknowledged,
        ack.acknowledged_at,
        (
          SELECT COUNT(*)
          FROM announcement_acknowledgements acks
          WHERE acks.announcement_id = a.id
        ) AS acknowledgement_count
      FROM announcements a
      LEFT JOIN users u ON u.id = a.created_by
      LEFT JOIN roles r ON r.id = u.role_id
      LEFT JOIN grades g ON g.id = a.grade_id AND g.deleted_at IS NULL
      LEFT JOIN sections sec ON sec.id = a.section_id AND sec.deleted_at IS NULL
      LEFT JOIN announcement_acknowledgements ack ON ack.announcement_id = a.id AND ack.user_id = $2
      WHERE a.id = $3
        AND a.school_id = $1
        AND a.deleted_at IS NULL
    `;

    const res = await this.database.query(sql, [schoolId, userId, id]);
    return res.rows[0] || null;
  }

  /**
   * Create a new announcement.
   * @param {object} payload
   * @param {object} userContext
   * @returns {Promise<object>}
   */
  async create(payload, userContext = {}) {
    const user = userContext.user || {};
    const schoolId = user.school_id;
    const userId = user.sub;

    if (!schoolId) {
      throw new Error('school_id is required: token is missing school context.');
    }

    const sql = `
      INSERT INTO announcements (
        school_id,
        title,
        content,
        category,
        priority,
        audience,
        grade_id,
        section_id,
        attachment_url,
        attachment_name,
        is_pinned,
        requires_acknowledgement,
        status,
        published_at,
        expires_at,
        created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      )
      RETURNING *
    `;

    const values = [
      schoolId,
      payload.title,
      payload.content,
      payload.category || 'GENERAL',
      payload.priority || 'NORMAL',
      payload.audience || 'ALL',
      payload.grade_id || null,
      payload.section_id || null,
      payload.attachment_url || null,
      payload.attachment_name || null,
      payload.is_pinned || false,
      payload.requires_acknowledgement || false,
      payload.status || 'PUBLISHED',
      payload.published_at || new Date().toISOString(),
      payload.expires_at || null,
      userId,
    ];

    const res = await this.database.query(sql, values);
    return res.rows[0];
  }

  /**
   * Update an existing announcement.
   * @param {string} id
   * @param {object} payload
   * @param {object} userContext
   * @returns {Promise<object|null>}
   */
  async update(id, payload, userContext = {}) {
    const user = userContext.user || {};
    const schoolId = user.school_id;

    // Check existence
    const existing = await this.findById(id, userContext);
    if (!existing) return null;

    const updates = [];
    const values = [id, schoolId];
    let paramIndex = 3;

    const allowedFields = [
      'title',
      'content',
      'category',
      'priority',
      'audience',
      'grade_id',
      'section_id',
      'attachment_url',
      'attachment_name',
      'is_pinned',
      'requires_acknowledgement',
      'status',
      'published_at',
      'expires_at',
    ];

    for (const field of allowedFields) {
      if (payload[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(payload[field]);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return existing;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    const sql = `
      UPDATE announcements
      SET ${updates.join(', ')}
      WHERE id = $1 AND school_id = $2 AND deleted_at IS NULL
      RETURNING *
    `;

    const res = await this.database.query(sql, values);
    return res.rows[0] || null;
  }

  /**
   * Toggle pinned status of an announcement.
   * @param {string} id
   * @param {string} schoolId
   * @returns {Promise<object|null>}
   */
  async togglePin(id, schoolId) {
    const sql = `
      UPDATE announcements
      SET is_pinned = NOT is_pinned, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND school_id = $2 AND deleted_at IS NULL
      RETURNING id, is_pinned, title
    `;
    const res = await this.database.query(sql, [id, schoolId]);
    return res.rows[0] || null;
  }

  /**
   * Toggle or set status (e.g. DRAFT, PUBLISHED, ARCHIVED).
   * @param {string} id
   * @param {string} status
   * @param {string} schoolId
   * @returns {Promise<object|null>}
   */
  async toggleStatus(id, status, schoolId) {
    const sql = `
      UPDATE announcements
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND school_id = $3 AND deleted_at IS NULL
      RETURNING id, status, title
    `;
    const res = await this.database.query(sql, [status.toUpperCase(), id, schoolId]);
    return res.rows[0] || null;
  }

  /**
   * Acknowledge an announcement for the current user.
   * @param {string} announcementId
   * @param {string} userId
   * @returns {Promise<object>}
   */
  async acknowledge(announcementId, userId) {
    const sql = `
      INSERT INTO announcement_acknowledgements (announcement_id, user_id)
      VALUES ($1, $2)
      ON CONFLICT (announcement_id, user_id) DO UPDATE
      SET acknowledged_at = announcement_acknowledgements.acknowledged_at
      RETURNING id, announcement_id, user_id, acknowledged_at
    `;
    const res = await this.database.query(sql, [announcementId, userId]);
    return res.rows[0];
  }

  /**
   * List users who have acknowledged an announcement (Audit Log for Admin/Teachers).
   * @param {string} announcementId
   * @param {string} schoolId
   * @returns {Promise<{ items: Array, total: number, targetCount: number, percentage: number }>}
   */
  async getAcknowledgements(announcementId, schoolId) {
    // 1. Fetch announcement targeting info
    const annRes = await this.database.query(
      `SELECT id, audience, grade_id, section_id FROM announcements WHERE id = $1 AND school_id = $2 AND deleted_at IS NULL`,
      [announcementId, schoolId]
    );

    if (annRes.rows.length === 0) {
      return null;
    }

    const ann = annRes.rows[0];

    // 2. Fetch list of acknowledged users
    const ackSql = `
      SELECT
        ack.id,
        ack.acknowledged_at,
        u.id AS user_id,
        CONCAT(u.first_name, ' ', u.last_name) AS full_name,
        u.email,
        u.phone,
        r.name AS role_name
      FROM announcement_acknowledgements ack
      JOIN users u ON u.id = ack.user_id AND u.deleted_at IS NULL
      JOIN roles r ON r.id = u.role_id
      WHERE ack.announcement_id = $1
      ORDER BY ack.acknowledged_at DESC
    `;
    const acksResult = await this.database.query(ackSql, [announcementId]);
    const items = acksResult.rows;

    // 3. Compute target population count based on audience / grade
    let targetCount = 0;
    if (ann.audience === 'PARENTS') {
      let q = `SELECT COUNT(DISTINCT p.user_id) AS cnt FROM parents p JOIN students s ON s.parent_id = p.id WHERE p.school_id = $1 AND p.user_id IS NOT NULL AND p.deleted_at IS NULL AND s.deleted_at IS NULL`;
      const qValues = [schoolId];
      if (ann.grade_id) {
        q += ` AND s.section_id IN (SELECT sec.id FROM sections sec WHERE sec.grade_id = $2)`;
        qValues.push(ann.grade_id);
      }
      const cntRes = await this.database.query(q, qValues);
      targetCount = parseInt(cntRes.rows[0]?.cnt || 0, 10);
    } else if (ann.audience === 'STUDENTS') {
      let q = `SELECT COUNT(DISTINCT s.user_id) AS cnt FROM students s WHERE s.school_id = $1 AND s.user_id IS NOT NULL AND s.deleted_at IS NULL`;
      const qValues = [schoolId];
      if (ann.grade_id) {
        q += ` AND s.section_id IN (SELECT sec.id FROM sections sec WHERE sec.grade_id = $2)`;
        qValues.push(ann.grade_id);
      }
      const cntRes = await this.database.query(q, qValues);
      targetCount = parseInt(cntRes.rows[0]?.cnt || 0, 10);
    } else if (ann.audience === 'TEACHERS') {
      const cntRes = await this.database.query(
        `SELECT COUNT(DISTINCT t.user_id) AS cnt FROM teachers t WHERE t.school_id = $1 AND t.user_id IS NOT NULL AND t.deleted_at IS NULL`,
        [schoolId]
      );
      targetCount = parseInt(cntRes.rows[0]?.cnt || 0, 10);
    } else {
      // ALL
      const cntRes = await this.database.query(
        `SELECT COUNT(*) AS cnt FROM users WHERE school_id = $1 AND deleted_at IS NULL AND status = 'ACTIVE'`,
        [schoolId]
      );
      targetCount = parseInt(cntRes.rows[0]?.cnt || 0, 10);
    }

    const totalAcknowledged = items.length;
    const percentage = targetCount > 0 ? Math.min(100, Math.round((totalAcknowledged / targetCount) * 100)) : 0;

    return {
      items,
      total: totalAcknowledged,
      targetCount,
      percentage,
    };
  }

  /**
   * Soft delete an announcement.
   * @param {string} id
   * @param {string} schoolId
   * @returns {Promise<boolean>}
   */
  async delete(id, schoolId) {
    const sql = `
      UPDATE announcements
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND school_id = $2 AND deleted_at IS NULL
      RETURNING id
    `;
    const res = await this.database.query(sql, [id, schoolId]);
    return res.rows.length > 0;
  }
}

module.exports = AnnouncementRepository;
