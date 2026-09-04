class PeriodRepository {
  constructor(database) {
    this.database = database;
  }

  async findAll({ academicYearId, isActive, search = '' } = {}) {
    const conditions = ['p.deleted_at IS NULL'];
    const values = [];
    let index = 1;

    if (academicYearId) {
      conditions.push(`p.academic_year_id = $${index}`);
      values.push(academicYearId);
      index += 1;
    }

    if (isActive !== undefined && isActive !== null && isActive !== '') {
      conditions.push(`p.is_active = $${index}`);
      values.push(isActive === true || isActive === 'true');
      index += 1;
    }

    if (search && search.trim()) {
      conditions.push(`LOWER(p.name) LIKE LOWER($${index})`);
      values.push(`%${search.trim()}%`);
      index += 1;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const result = await this.database.query(
      `
      SELECT
        p.id,
        p.academic_year_id,
        ay.name AS academic_year_name,
        p.name,
        p.period_type,
        TO_CHAR(p.start_time, 'HH24:MI') AS start_time,
        TO_CHAR(p.end_time, 'HH24:MI') AS end_time,
        p.period_order,
        p.is_break,
        p.days_of_week,
        p.is_active,
        p.created_at,
        p.updated_at
      FROM periods p
      INNER JOIN academic_years ay ON ay.id = p.academic_year_id
      ${whereClause}
      ORDER BY p.period_order ASC, p.start_time ASC
      `,
      values
    );

    return result.rows;
  }

  async findAllPeriods(params) {
    return this.findAll(params);
  }

  async findById(id) {
    const result = await this.database.query(
      `
      SELECT
        p.id,
        p.academic_year_id,
        ay.name AS academic_year_name,
        p.name,
        p.period_type,
        TO_CHAR(p.start_time, 'HH24:MI') AS start_time,
        TO_CHAR(p.end_time, 'HH24:MI') AS end_time,
        p.period_order,
        p.is_break,
        p.days_of_week,
        p.is_active,
        p.created_at,
        p.updated_at
      FROM periods p
      INNER JOIN academic_years ay ON ay.id = p.academic_year_id
      WHERE p.id = $1 AND p.deleted_at IS NULL
      LIMIT 1
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  async findByOrder(academicYearId, periodOrder, excludeId = null) {
    const conditions = [
      'p.academic_year_id = $1',
      'p.period_order = $2',
      'p.deleted_at IS NULL',
    ];
    const values = [academicYearId, periodOrder];

    if (excludeId) {
      conditions.push('p.id != $3');
      values.push(excludeId);
    }

    const result = await this.database.query(
      `SELECT p.id, p.name, p.period_order FROM periods p WHERE ${conditions.join(' AND ')} LIMIT 1`,
      values
    );

    return result.rows[0] || null;
  }

  async findActiveAcademicYear() {
    const result = await this.database.query(
      `
      SELECT id, name
      FROM academic_years
      WHERE is_active = true AND status = 'ACTIVE' AND deleted_at IS NULL
      LIMIT 1
      `
    );
    return result.rows[0] || null;
  }

  async create(payload, client = null) {
    const db = client || this.database;
    const result = await db.query(
      `
      INSERT INTO periods (
        academic_year_id,
        name,
        period_type,
        start_time,
        end_time,
        period_order,
        is_break,
        days_of_week,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING
        id,
        academic_year_id,
        name,
        period_type,
        TO_CHAR(start_time, 'HH24:MI') AS start_time,
        TO_CHAR(end_time, 'HH24:MI') AS end_time,
        period_order,
        is_break,
        days_of_week,
        is_active,
        created_at,
        updated_at
      `,
      [
        payload.academic_year_id,
        payload.name,
        payload.period_type || 'LESSON',
        payload.start_time,
        payload.end_time,
        payload.period_order,
        payload.is_break !== undefined ? payload.is_break : false,
        payload.days_of_week,
        payload.is_active !== undefined ? payload.is_active : true,
      ]
    );

    return result.rows[0];
  }

  async update(id, payload, client = null) {
    const db = client || this.database;
    const fields = [];
    const values = [];
    let index = 1;

    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${index}`);
        values.push(value);
        index += 1;
      }
    });

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const result = await db.query(
      `
      UPDATE periods
      SET ${fields.join(', ')}
      WHERE id = $${index} AND deleted_at IS NULL
      RETURNING
        id,
        academic_year_id,
        name,
        period_type,
        TO_CHAR(start_time, 'HH24:MI') AS start_time,
        TO_CHAR(end_time, 'HH24:MI') AS end_time,
        period_order,
        is_break,
        days_of_week,
        is_active,
        created_at,
        updated_at
      `,
      values
    );

    return result.rows[0] || null;
  }

  async softDelete(id, client = null) {
    const db = client || this.database;
    const result = await db.query(
      `
      UPDATE periods
      SET deleted_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP,
          is_active = false
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  async isPeriodUsedInTimetables(periodId) {
    const result = await this.database.query(
      `
      SELECT COUNT(*)::int AS count
      FROM timetable_entries te
      WHERE te.period_id = $1 AND te.deleted_at IS NULL
      `,
      [periodId]
    );

    return (result.rows[0]?.count || 0) > 0;
  }
}

module.exports = PeriodRepository;
