class GradeSubjectRepository {
  constructor(database) {
    this.database = database;
  }

  async findAll({
    grade_id,
    academic_year_id,
    status,
    is_compulsory,
    search = '',
    limit = 20,
    offset = 0,
  } = {}) {
    const searchPattern = `%${search.trim()}%`;
    const values = [searchPattern];
    let conditions = ['gs.deleted_at IS NULL'];

    if (grade_id) {
      values.push(grade_id);
      conditions.push(`gs.grade_id = $${values.length}`);
    }

    if (academic_year_id) {
      values.push(academic_year_id);
      conditions.push(`gs.academic_year_id = $${values.length}`);
    }

    if (status) {
      values.push(status);
      conditions.push(`gs.status = $${values.length}`);
    }

    if (is_compulsory !== undefined && is_compulsory !== null && is_compulsory !== '') {
      values.push(is_compulsory === true || is_compulsory === 'true');
      conditions.push(`gs.is_compulsory = $${values.length}`);
    }

    const whereClause = `
      WHERE ${conditions.join(' AND ')}
      AND (
        LOWER(s.subject_name) LIKE LOWER($1)
        OR LOWER(s.subject_code) LIKE LOWER($1)
        OR LOWER(COALESCE(s.short_name, '')) LIKE LOWER($1)
      )
    `;

    // 1. Get Total Count
    const countResult = await this.database.query(
      `
      SELECT COUNT(*)::int AS total
      FROM grade_subjects gs
      INNER JOIN grades g ON g.id = gs.grade_id
      INNER JOIN subjects s ON s.id = gs.subject_id
      INNER JOIN academic_years ay ON ay.id = gs.academic_year_id
      ${whereClause}
      `,
      values
    );
    const total = countResult.rows[0]?.total || 0;

    // 2. Query Paginated Items
    const limitIndex = values.length + 1;
    const offsetIndex = values.length + 2;
    const queryValues = [...values, limit, offset];

    const result = await this.database.query(
      `
      SELECT
        gs.id,
        gs.grade_id,
        g.name AS grade_name,
        gs.subject_id,
        s.subject_name,
        s.subject_code,
        s.short_name AS subject_short_name,
        gs.academic_year_id,
        ay.name AS academic_year_name,
        ay.is_active AS is_active_year,
        gs.is_compulsory,
        gs.weekly_periods,
        gs.total_marks,
        gs.pass_marks,
        gs.display_order,
        gs.status,
        gs.created_at,
        gs.updated_at
      FROM grade_subjects gs
      INNER JOIN grades g ON g.id = gs.grade_id
      INNER JOIN subjects s ON s.id = gs.subject_id
      INNER JOIN academic_years ay ON ay.id = gs.academic_year_id
      ${whereClause}
      ORDER BY
        gs.display_order ASC,
        s.subject_name ASC
      LIMIT $${limitIndex}
      OFFSET $${offsetIndex}
      `,
      queryValues
    );

    return {
      items: result.rows,
      total,
    };
  }

  async findById(id) {
    const result = await this.database.query(
      `
      SELECT
        gs.*,
        g.name AS grade_name,
        s.subject_name,
        s.subject_code,
        s.short_name AS subject_short_name,
        ay.name AS academic_year_name,
        ay.is_active AS is_active_year
      FROM grade_subjects gs
      INNER JOIN grades g ON g.id = gs.grade_id
      INNER JOIN subjects s ON s.id = gs.subject_id
      INNER JOIN academic_years ay ON ay.id = gs.academic_year_id
      WHERE
        gs.id = $1
        AND gs.deleted_at IS NULL
      LIMIT 1
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  async create(payload) {
    const result = await this.database.query(
      `
      INSERT INTO grade_subjects (
        grade_id,
        subject_id,
        academic_year_id,
        is_compulsory,
        weekly_periods,
        total_marks,
        pass_marks,
        display_order,
        status,
        deleted_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, NULL, CURRENT_TIMESTAMP
      )
      ON CONFLICT (academic_year_id, grade_id, subject_id)
      DO UPDATE SET
        is_compulsory = EXCLUDED.is_compulsory,
        weekly_periods = EXCLUDED.weekly_periods,
        total_marks = EXCLUDED.total_marks,
        pass_marks = EXCLUDED.pass_marks,
        display_order = EXCLUDED.display_order,
        status = EXCLUDED.status,
        deleted_at = NULL,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
      `,
      [
        payload.grade_id,
        payload.subject_id,
        payload.academic_year_id,
        payload.is_compulsory ?? true,
        payload.weekly_periods ?? null,
        payload.total_marks ?? null,
        payload.pass_marks ?? null,
        payload.display_order ?? 0,
        payload.status || 'ACTIVE',
      ]
    );

    return result.rows[0];
  }

  async bulkUpsert({ grade_id, academic_year_id, subjects }) {
    if (!subjects || subjects.length === 0) return [];

    const client = await this.database.connect();
    try {
      await client.query('BEGIN');
      const saved = [];

      for (let i = 0; i < subjects.length; i++) {
        const item = subjects[i];
        const res = await client.query(
          `
          INSERT INTO grade_subjects (
            grade_id,
            subject_id,
            academic_year_id,
            is_compulsory,
            weekly_periods,
            total_marks,
            pass_marks,
            display_order,
            status,
            deleted_at,
            updated_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, NULL, CURRENT_TIMESTAMP
          )
          ON CONFLICT (academic_year_id, grade_id, subject_id)
          DO UPDATE SET
            is_compulsory = EXCLUDED.is_compulsory,
            weekly_periods = EXCLUDED.weekly_periods,
            total_marks = EXCLUDED.total_marks,
            pass_marks = EXCLUDED.pass_marks,
            display_order = EXCLUDED.display_order,
            status = EXCLUDED.status,
            deleted_at = NULL,
            updated_at = CURRENT_TIMESTAMP
          RETURNING *
          `,
          [
            grade_id,
            item.subject_id,
            academic_year_id,
            item.is_compulsory !== undefined ? item.is_compulsory : true,
            item.weekly_periods !== undefined ? item.weekly_periods : null,
            item.total_marks !== undefined ? item.total_marks : null,
            item.pass_marks !== undefined ? item.pass_marks : null,
            item.display_order !== undefined ? item.display_order : i + 1,
            item.status || 'ACTIVE',
          ]
        );
        saved.push(res.rows[0]);
      }

      await client.query('COMMIT');
      return saved;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async cloneAssignments({
    source_grade_id,
    source_academic_year_id,
    target_grade_id,
    target_academic_year_id,
  }) {
    const sourceRows = await this.database.query(
      `
      SELECT
        subject_id,
        is_compulsory,
        weekly_periods,
        total_marks,
        pass_marks,
        display_order,
        status
      FROM grade_subjects
      WHERE grade_id = $1
        AND academic_year_id = $2
        AND deleted_at IS NULL
      ORDER BY display_order ASC
      `,
      [source_grade_id, source_academic_year_id]
    );

    if (sourceRows.rows.length === 0) {
      return { clonedCount: 0, items: [] };
    }

    const items = sourceRows.rows.map((r) => ({
      subject_id: r.subject_id,
      is_compulsory: r.is_compulsory,
      weekly_periods: r.weekly_periods,
      total_marks: r.total_marks,
      pass_marks: r.pass_marks,
      display_order: r.display_order,
      status: r.status,
    }));

    const result = await this.bulkUpsert({
      grade_id: target_grade_id,
      academic_year_id: target_academic_year_id,
      subjects: items,
    });

    return {
      clonedCount: result.length,
      items: result,
    };
  }

  async getCurriculumStats({ grade_id, academic_year_id } = {}) {
    const values = [];
    let conditions = ['deleted_at IS NULL'];

    if (grade_id) {
      values.push(grade_id);
      conditions.push(`grade_id = $${values.length}`);
    }

    if (academic_year_id) {
      values.push(academic_year_id);
      conditions.push(`academic_year_id = $${values.length}`);
    }

    const result = await this.database.query(
      `
      SELECT
        COUNT(*)::int AS total_assignments,
        COUNT(DISTINCT subject_id)::int AS unique_subjects,
        COUNT(DISTINCT grade_id)::int AS grades_covered,
        COUNT(*) FILTER (WHERE is_compulsory = true)::int AS compulsory_count,
        COUNT(*) FILTER (WHERE is_compulsory = false)::int AS elective_count,
        COALESCE(SUM(weekly_periods), 0)::int AS total_weekly_periods,
        COALESCE(SUM(total_marks), 0)::numeric AS total_curriculum_marks,
        COALESCE(AVG(total_marks), 0)::numeric(5,2) AS avg_subject_marks,
        COALESCE(AVG(pass_marks), 0)::numeric(5,2) AS avg_pass_marks
      FROM grade_subjects
      WHERE ${conditions.join(' AND ')}
      `,
      values
    );

    return result.rows[0] || {};
  }

  async getSubjectMappedGrades(subject_id, academic_year_id = null) {
    const values = [subject_id];
    let yearCondition = '';

    if (academic_year_id) {
      values.push(academic_year_id);
      yearCondition = `AND gs.academic_year_id = $2`;
    }

    const result = await this.database.query(
      `
      SELECT
        gs.id AS grade_subject_id,
        gs.grade_id,
        g.name AS grade_name,
        gs.academic_year_id,
        ay.name AS academic_year_name,
        ay.is_active AS is_active_year,
        gs.is_compulsory,
        gs.weekly_periods,
        gs.total_marks,
        gs.pass_marks,
        gs.display_order,
        gs.status
      FROM grade_subjects gs
      INNER JOIN grades g ON g.id = gs.grade_id
      INNER JOIN academic_years ay ON ay.id = gs.academic_year_id
      WHERE gs.subject_id = $1
        AND gs.deleted_at IS NULL
        ${yearCondition}
      ORDER BY g.name ASC, ay.start_date DESC
      `,
      values
    );

    return result.rows;
  }

  async update(id, payload) {
    const fields = [];
    const values = [];
    let index = 1;

    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${index}`);
        values.push(value);
        index++;
      }
    });

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await this.database.query(
      `
      UPDATE grade_subjects
      SET ${fields.join(', ')}
      WHERE id = $${index}
        AND deleted_at IS NULL
      RETURNING *
      `,
      values
    );

    return result.rows[0] || null;
  }

  async softDelete(id) {
    const result = await this.database.query(
      `
      UPDATE grade_subjects
      SET
        deleted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND deleted_at IS NULL
      RETURNING *
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  async findAssignment(grade_id, subject_id, academic_year_id) {
    const result = await this.database.query(
      `
      SELECT id
      FROM grade_subjects
      WHERE grade_id = $1
        AND subject_id = $2
        AND academic_year_id = $3
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [grade_id, subject_id, academic_year_id]
    );

    return result.rows[0] || null;
  }

  async gradeExists(id) {
    const result = await this.database.query(
      `
      SELECT id
      FROM grades
      WHERE id = $1
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  async subjectExists(id) {
    const result = await this.database.query(
      `
      SELECT id
      FROM subjects
      WHERE id = $1
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  async academicYearExists(id) {
    const result = await this.database.query(
      `
      SELECT id
      FROM academic_years
      WHERE id = $1
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [id]
    );

    return result.rows[0] || null;
  }
}

module.exports = GradeSubjectRepository;