class NotificationRepository {
  constructor(database) {
    this.database = database;
  }

  /**
   * Builds the SQL condition and parameter list that restricts notifications
   * to those visible to a specific user based on school, role, grade, section, or direct recipient.
   */
  _buildVisibilityScope(user, initialValues = []) {
    const values = [...initialValues];
    const role = (user?.role || '').toLowerCase();
    const isStudent = role === 'student';
    const isParent = role === 'parent';
    const isTeacher = role === 'teacher';
    const isAdmin = role.includes('admin') || role === 'staff';

    let index = values.length + 1;
    values.push(user?.school_id || null);
    const schoolParamIndex = index++;

    values.push(user?.sub || user?.id);
    const userParamIndex = index++;

    let audienceCondition = "n.audience = 'ALL'";
    if (isStudent) {
      audienceCondition = "n.audience IN ('ALL', 'STUDENTS')";
    } else if (isParent) {
      audienceCondition = "n.audience IN ('ALL', 'PARENTS')";
    } else if (isTeacher) {
      audienceCondition = "n.audience IN ('ALL', 'TEACHERS')";
    } else if (isAdmin) {
      audienceCondition = "n.audience IN ('ALL', 'STAFF', 'TEACHERS', 'STUDENTS', 'PARENTS')";
    }

    let roleHierarchyScope = '';
    if (isStudent) {
      roleHierarchyScope = `AND (
        (n.grade_id IS NULL AND n.section_id IS NULL)
        OR EXISTS (
          SELECT 1 FROM students s
          WHERE s.user_id = $${userParamIndex} AND s.deleted_at IS NULL
            AND (n.grade_id IS NULL OR n.grade_id = (SELECT sec.grade_id FROM sections sec WHERE sec.id = s.section_id))
            AND (n.section_id IS NULL OR n.section_id = s.section_id)
        )
      )`;
    } else if (isParent) {
      roleHierarchyScope = `AND (
        (n.grade_id IS NULL AND n.section_id IS NULL)
        OR EXISTS (
          SELECT 1 FROM parents p
          JOIN students s ON s.parent_id = p.id AND s.deleted_at IS NULL
          WHERE p.user_id = $${userParamIndex} AND p.deleted_at IS NULL
            AND (n.grade_id IS NULL OR n.grade_id = (SELECT sec.grade_id FROM sections sec WHERE sec.id = s.section_id))
            AND (n.section_id IS NULL OR n.section_id = s.section_id)
        )
      )`;
    } else if (isTeacher) {
      roleHierarchyScope = `AND (
        (n.grade_id IS NULL AND n.section_id IS NULL)
        OR EXISTS (
          SELECT 1 FROM teachers t
          LEFT JOIN class_teachers ct ON ct.teacher_id = t.id AND ct.deleted_at IS NULL
          LEFT JOIN teacher_subjects ts ON ts.teacher_id = t.id AND ts.deleted_at IS NULL
          LEFT JOIN sections sec ON sec.id = COALESCE(ct.section_id, ts.section_id)
          WHERE t.user_id = $${userParamIndex} AND t.deleted_at IS NULL
            AND (n.grade_id IS NULL OR n.grade_id = sec.grade_id)
            AND (n.section_id IS NULL OR n.section_id = sec.id)
        )
      )`;
    }

    const whereClause = `
      n.deleted_at IS NULL
      AND (n.school_id IS NULL OR n.school_id = $${schoolParamIndex})
      AND n.published_at <= CURRENT_TIMESTAMP
      AND (
        n.recipient_user_id = $${userParamIndex}
        OR (
          n.recipient_user_id IS NULL
          AND (${audienceCondition})
          ${roleHierarchyScope}
        )
      )
    `;

    return { whereClause, values, userParamIndex };
  }

  /**
   * Lists notifications for the active user with support for tabs, search, pagination, and read status.
   */
  async listForUser(user, options = {}) {
    const {
      page = 1,
      limit = 20,
      type = null,
      status = 'ALL', // 'ALL', 'UNREAD', 'READ'
      priority = null,
      search = null,
      dateRange = null,
    } = options;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const { whereClause, values, userParamIndex } = this._buildVisibilityScope(user);
    const filterConditions = [];
    let currentIndex = values.length + 1;

    // Filter by notification type (e.g., 'ACADEMIC', 'ATTENDANCE', 'FINANCE', 'TRANSPORT')
    if (type && type !== 'ALL') {
      filterConditions.push(`n.type = $${currentIndex}`);
      values.push(type.toUpperCase());
      currentIndex++;
    }

    // Filter by read status
    if (status === 'UNREAD') {
      filterConditions.push(`COALESCE(un.is_read, false) = false`);
    } else if (status === 'READ') {
      filterConditions.push(`COALESCE(un.is_read, false) = true`);
    }

    // Filter by priority
    if (priority && priority !== 'ALL') {
      filterConditions.push(`n.priority = $${currentIndex}`);
      values.push(priority.toUpperCase());
      currentIndex++;
    }

    // Keyword search in title or body
    if (search && search.trim()) {
      filterConditions.push(`(n.title ILIKE $${currentIndex} OR n.body ILIKE $${currentIndex})`);
      values.push(`%${search.trim()}%`);
      currentIndex++;
    }

    // Date range filter
    if (dateRange === 'TODAY') {
      filterConditions.push(`n.published_at >= CURRENT_DATE`);
    } else if (dateRange === 'WEEK') {
      filterConditions.push(`n.published_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'`);
    } else if (dateRange === 'MONTH') {
      filterConditions.push(`n.published_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'`);
    }

    const additionalWhere = filterConditions.length > 0 ? `AND ${filterConditions.join(' AND ')}` : '';

    // Count total query
    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM notifications n
      LEFT JOIN user_notifications un 
        ON un.notification_id = n.id AND un.user_id = $${userParamIndex}
      WHERE ${whereClause}
        AND COALESCE(un.is_archived, false) = false
        ${additionalWhere}
    `;

    const countResult = await this.database.query(countSql, values);
    const total = countResult.rows[0]?.total || 0;

    // Get unread count specifically
    const unreadSql = `
      SELECT COUNT(*)::int AS unread_count
      FROM notifications n
      LEFT JOIN user_notifications un 
        ON un.notification_id = n.id AND un.user_id = $${userParamIndex}
      WHERE ${whereClause}
        AND COALESCE(un.is_archived, false) = false
        AND COALESCE(un.is_read, false) = false
    `;
    const unreadResult = await this.database.query(unreadSql, values.slice(0, 2));
    const unreadCount = unreadResult.rows[0]?.unread_count || 0;

    // Data query with pagination
    values.push(limitNum);
    const limitIndex = currentIndex++;
    values.push(offset);
    const offsetIndex = currentIndex++;

    const dataSql = `
      SELECT 
        n.id,
        n.school_id,
        n.grade_id,
        n.section_id,
        n.audience,
        n.type,
        n.priority,
        n.title,
        n.body,
        n.action_url,
        n.action_label,
        n.channel,
        n.metadata,
        n.recipient_user_id,
        n.published_at,
        n.created_at,
        COALESCE(un.is_read, false) AS is_read,
        un.read_at,
        COALESCE(un.is_archived, false) AS is_archived,
        COALESCE(un.created_at, n.published_at) AS delivered_at
      FROM notifications n
      LEFT JOIN user_notifications un 
        ON un.notification_id = n.id AND un.user_id = $${userParamIndex}
      WHERE ${whereClause}
        AND COALESCE(un.is_archived, false) = false
        ${additionalWhere}
      ORDER BY n.published_at DESC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
    `;

    const dataResult = await this.database.query(dataSql, values);

    return {
      items: dataResult.rows,
      total,
      unreadCount,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    };
  }

  /**
   * Blazing-fast unread count query designed for the top header notification bell.
   */
  async getUnreadCount(user) {
    const { whereClause, values, userParamIndex } = this._buildVisibilityScope(user);
    const sql = `
      SELECT COUNT(*)::int AS count
      FROM notifications n
      LEFT JOIN user_notifications un 
        ON un.notification_id = n.id AND un.user_id = $${userParamIndex}
      WHERE ${whereClause}
        AND COALESCE(un.is_archived, false) = false
        AND COALESCE(un.is_read, false) = false
    `;
    const result = await this.database.query(sql, values);
    return { count: result.rows[0]?.count || 0 };
  }

  /**
   * Marks a single notification as read for the user via UPSERT.
   */
  async markAsRead(notificationId, user) {
    const userId = user?.sub || user?.id;
    const sql = `
      INSERT INTO user_notifications (notification_id, user_id, is_read, read_at)
      VALUES ($1, $2, true, CURRENT_TIMESTAMP)
      ON CONFLICT (notification_id, user_id)
      DO UPDATE SET is_read = true, read_at = CURRENT_TIMESTAMP
      RETURNING id, notification_id, user_id, is_read, read_at
    `;
    const result = await this.database.query(sql, [notificationId, userId]);
    return result.rows[0];
  }

  /**
   * Marks ALL unread notifications visible to the user as read in a single atomic SQL transaction.
   */
  async markAllAsRead(user) {
    const { whereClause, values, userParamIndex } = this._buildVisibilityScope(user);

    const sql = `
      INSERT INTO user_notifications (notification_id, user_id, is_read, read_at)
      SELECT n.id, $${userParamIndex}, true, CURRENT_TIMESTAMP
      FROM notifications n
      LEFT JOIN user_notifications un 
        ON un.notification_id = n.id AND un.user_id = $${userParamIndex}
      WHERE ${whereClause}
        AND COALESCE(un.is_archived, false) = false
        AND COALESCE(un.is_read, false) = false
      ON CONFLICT (notification_id, user_id)
      DO UPDATE SET is_read = true, read_at = CURRENT_TIMESTAMP
    `;

    const result = await this.database.query(sql, values);
    return { markedCount: result.rowCount || 0 };
  }

  /**
   * Dismisses / Archives a notification from the user's feed.
   */
  async archiveNotification(notificationId, user) {
    const userId = user?.sub || user?.id;
    const sql = `
      INSERT INTO user_notifications (notification_id, user_id, is_archived, archived_at)
      VALUES ($1, $2, true, CURRENT_TIMESTAMP)
      ON CONFLICT (notification_id, user_id)
      DO UPDATE SET is_archived = true, archived_at = CURRENT_TIMESTAMP
      RETURNING id, notification_id, user_id, is_archived, archived_at
    `;
    const result = await this.database.query(sql, [notificationId, userId]);
    return result.rows[0];
  }

  /**
   * Aggregates stats for the Notification Center top KPI dashboard cards.
   */
  async getStats(user) {
    const { whereClause, values, userParamIndex } = this._buildVisibilityScope(user);

    const sql = `
      SELECT 
        COUNT(*)::int AS total,
        COUNT(CASE WHEN COALESCE(un.is_read, false) = false THEN 1 END)::int AS unread,
        COUNT(CASE WHEN n.priority IN ('HIGH', 'URGENT') AND COALESCE(un.is_read, false) = false THEN 1 END)::int AS urgent_unread,
        COUNT(CASE WHEN n.type = 'ACADEMIC' THEN 1 END)::int AS academic_total,
        COUNT(CASE WHEN n.type = 'ATTENDANCE' THEN 1 END)::int AS attendance_total,
        COUNT(CASE WHEN n.type = 'FINANCE' THEN 1 END)::int AS finance_total,
        COUNT(CASE WHEN n.type = 'TRANSPORT' THEN 1 END)::int AS transport_total
      FROM notifications n
      LEFT JOIN user_notifications un 
        ON un.notification_id = n.id AND un.user_id = $${userParamIndex}
      WHERE ${whereClause}
        AND COALESCE(un.is_archived, false) = false
    `;

    const result = await this.database.query(sql, values);
    const row = result.rows[0] || {};
    return {
      total: row.total || 0,
      unread: row.unread || 0,
      urgentUnread: row.urgent_unread || 0,
      academicTotal: row.academic_total || 0,
      attendanceTotal: row.attendance_total || 0,
      financeTotal: row.finance_total || 0,
      transportTotal: row.transport_total || 0,
    };
  }

  /**
   * Creates and dispatches a notification.
   */
  async create(payload) {
    const {
      schoolId = null,
      gradeId = null,
      sectionId = null,
      audience = 'ALL',
      type = 'GENERAL',
      priority = 'NORMAL',
      title,
      body,
      actionUrl = null,
      actionLabel = null,
      channel = 'IN_APP',
      metadata = {},
      recipientUserId = null,
      publishedAt = null,
      createdBy,
    } = payload;

    const sql = `
      INSERT INTO notifications (
        school_id, grade_id, section_id, audience, type, priority,
        title, body, action_url, action_label, channel, metadata,
        recipient_user_id, published_at, created_by
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12,
        $13, COALESCE($14, CURRENT_TIMESTAMP), $15
      )
      RETURNING 
        id, school_id, grade_id, section_id, audience, type, priority,
        title, body, action_url, action_label, channel, metadata,
        recipient_user_id, published_at, created_at
    `;

    const result = await this.database.query(sql, [
      schoolId,
      gradeId,
      sectionId,
      audience,
      type,
      priority,
      title,
      body,
      actionUrl,
      actionLabel,
      channel,
      JSON.stringify(metadata),
      recipientUserId,
      publishedAt,
      createdBy,
    ]);

    const created = result.rows[0];

    // If directly dispatched to an individual recipient, proactively seed user_notifications
    if (recipientUserId) {
      await this.database.query(
        `INSERT INTO user_notifications (notification_id, user_id, is_read, created_at)
         VALUES ($1, $2, false, CURRENT_TIMESTAMP)
         ON CONFLICT (notification_id, user_id) DO NOTHING`,
        [created.id, recipientUserId]
      );
    }

    return created;
  }
}

module.exports = NotificationRepository;