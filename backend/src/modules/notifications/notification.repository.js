class NotificationRepository {
  constructor(database) {
    this.database = database;
  }

  async listForUser(user) {
    const role = (user?.role || '').toLowerCase();
    const isStudent = role === 'student';
    const values = [user?.school_id || null];
    let index = 2;
    const audience = isStudent ? "n.audience IN ('ALL', 'STUDENTS')" : "n.audience = 'ALL'";
    let scope = '';

    if (isStudent) {
      values.push(user.sub);
      scope = `AND (
        (n.grade_id IS NULL AND n.section_id IS NULL)
        OR EXISTS (
          SELECT 1 FROM students s
          WHERE s.user_id = $${index} AND s.deleted_at IS NULL
            AND (n.grade_id IS NULL OR n.grade_id = (SELECT sec.grade_id FROM sections sec WHERE sec.id = s.section_id))
            AND (n.section_id IS NULL OR n.section_id = s.section_id)
        )
      )`;
      index += 1;
    }

    const result = await this.database.query(
      `SELECT n.id, n.audience, n.title, n.body, n.published_at, n.created_at
       FROM notifications n
       WHERE n.deleted_at IS NULL
         AND (n.school_id IS NULL OR n.school_id = $1)
         AND ${audience}
         AND n.published_at <= CURRENT_TIMESTAMP
         ${scope}
       ORDER BY n.published_at DESC`,
      values
    );

    return result.rows;
  }

  async create(payload) {
    const result = await this.database.query(
      `INSERT INTO notifications
        (school_id, grade_id, section_id, audience, title, body, published_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, CURRENT_TIMESTAMP), $8)
       RETURNING id, school_id, grade_id, section_id, audience, title, body, published_at, created_at`,
      [payload.schoolId || null, payload.gradeId || null, payload.sectionId || null,
        payload.audience, payload.title, payload.body, payload.publishedAt || null, payload.createdBy]
    );
    return result.rows[0];
  }
}

module.exports = NotificationRepository;