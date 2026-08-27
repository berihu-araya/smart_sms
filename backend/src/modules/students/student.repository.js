class StudentRepository {
  constructor(database) {
    this.database = database;
  }

  async findAll({ search = '', name = '', gender = '', gradeId = '', sectionId = '', status = '', limit = 20, offset = 0 } = {}, client = null) {
    const db = client || this.database;
    const conditions = ['s.deleted_at IS NULL'];
    const values = [];
    let index = 1;

    const nameFilter = name.trim() || search.trim();
    if (nameFilter) {
      conditions.push(`(
        LOWER(s.first_name) LIKE LOWER($${index})
        OR LOWER(s.last_name) LIKE LOWER($${index})
        OR LOWER(CONCAT_WS(' ', s.first_name, s.last_name)) LIKE LOWER($${index})
        OR LOWER(s.admission_number) LIKE LOWER($${index})
        OR LOWER(COALESCE(p.full_name, '')) LIKE LOWER($${index})
      )`);
      values.push(`%${nameFilter}%`);
      index += 1;
    }

    if (gender.trim()) {
      conditions.push(`s.gender = $${index}`);
      values.push(gender.trim());
      index += 1;
    }

    if (gradeId.trim()) {
      conditions.push(`g.id = $${index}`);
      values.push(gradeId.trim());
      index += 1;
    }

    if (sectionId.trim()) {
      conditions.push(`s.section_id = $${index}`);
      values.push(sectionId.trim());
      index += 1;
    }

    if (status.trim()) {
      conditions.push(`s.status = $${index}`);
      values.push(status.trim());
      index += 1;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const countValues = [...values];

    const countResult = await db.query(
      `
        SELECT COUNT(*) AS total
        FROM students s
        LEFT JOIN parents p ON p.id = s.parent_id
        LEFT JOIN sections sec ON sec.id = s.section_id AND sec.deleted_at IS NULL
        LEFT JOIN grades g ON g.id = sec.grade_id AND g.deleted_at IS NULL
        ${whereClause}
      `,
      countValues
    );

    values.push(limit, offset);
    const limitIndex = index;
    const offsetIndex = index + 1;

    const result = await db.query(
      `
        SELECT
          s.id,
          s.admission_number,
          s.first_name,
          s.last_name,
          s.gender,
          s.date_of_birth,
          s.admission_date,
          s.status,
          s.address,
          s.email,
          s.phone,
          s.parent_id,
          s.section_id,
          s.created_at,
          s.updated_at,
          p.full_name AS parent_name,
          p.phone AS parent_phone,
          p.email AS parent_email,
          p.occupation AS parent_occupation,
          p.address AS parent_address,
          COALESCE(p.relationship, 'GUARDIAN') AS parent_relationship,
          sec.name AS section_name,
          g.id AS grade_id,
          g.name AS grade_name
        FROM students s
        LEFT JOIN parents p ON p.id = s.parent_id
        LEFT JOIN sections sec ON sec.id = s.section_id AND sec.deleted_at IS NULL
        LEFT JOIN grades g ON g.id = sec.grade_id AND g.deleted_at IS NULL
        ${whereClause}
        ORDER BY s.created_at DESC
        LIMIT $${limitIndex} OFFSET $${offsetIndex}
      `,
      values
    );

    return {
      items: result.rows,
      total: Number(countResult.rows[0]?.total || 0),
    };
  }

  async findById(id, client = null) {
    const db = client || this.database;
    const result = await db.query(
      `
        SELECT
          s.id,
          s.user_id,
          s.parent_id,
          s.section_id,
          s.admission_number,
          s.first_name,
          s.last_name,
          s.gender,
          s.date_of_birth,
          s.admission_date,
          s.address,
          s.email,
          s.phone,
          s.status,
          s.created_at,
          s.updated_at,
          p.full_name AS parent_name,
          p.phone AS parent_phone,
          p.email AS parent_email,
          p.occupation AS parent_occupation,
          p.address AS parent_address,
          COALESCE(p.relationship, 'GUARDIAN') AS parent_relationship,
          sec.name AS section_name,
          sec.room_number AS section_room_number,
          sec.grade_id,
          g.name AS grade_name,
          g.description AS grade_description
        FROM students s
        LEFT JOIN parents p ON p.id = s.parent_id
        LEFT JOIN sections sec ON sec.id = s.section_id AND sec.deleted_at IS NULL
        LEFT JOIN grades g ON g.id = sec.grade_id AND g.deleted_at IS NULL
        WHERE s.id = $1
          AND s.deleted_at IS NULL
        LIMIT 1
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  async generateAdmissionNumber(client) {
    const activeYearResult = await client.query(
      `
        SELECT EXTRACT(YEAR FROM start_date)::integer AS start_year
        FROM academic_years
        WHERE is_active = true
          AND status = 'ACTIVE'
          AND deleted_at IS NULL
        LIMIT 1
      `
    );
    const startYear = activeYearResult.rows[0]?.start_year;

    if (!startYear) {
      const error = new Error('An active academic year is required to generate an admission number');
      error.code = 'ACTIVE_ACADEMIC_YEAR_REQUIRED';
      throw error;
    }

    await client.query(
      `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
      [`admission-number:${startYear}`]
    );

    const sequenceResult = await client.query(
      `
        SELECT COALESCE(
          MAX((substring(admission_number FROM '^ADM-([0-9]+)-'))::integer),
          0
        ) + 1 AS next_number
        FROM students
        WHERE admission_number ~ $1
      `,
      [`^ADM-[0-9]+-${startYear}/[0-9]{2}$`]
    );
    const sequenceNumber = sequenceResult.rows[0].next_number;
    const academicYear = `${startYear}/${String(startYear + 1).slice(-2)}`;

    return `ADM-${String(sequenceNumber).padStart(4, '0')}-${academicYear}`;
  }

  async createStudent(payload, client = null) {
    const db = client || this.database;
    const result = await db.query(
      `
        INSERT INTO students (
          user_id,
          parent_id,
          section_id,
          admission_number,
          first_name,
          last_name,
          gender,
          date_of_birth,
          admission_date,
          address,
          email,
          phone,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `,
      [
        payload.userId || payload.user_id || null,
        payload.parentId || payload.parent_id || null,
        payload.sectionId || payload.section_id || null,
        payload.admissionNumber || payload.admission_number,
        payload.firstName || payload.first_name,
        payload.lastName || payload.last_name,
        payload.gender,
        payload.dateOfBirth || payload.date_of_birth || null,
        payload.admissionDate || payload.admission_date,
        payload.address || null,
        payload.email || null,
        payload.phone || null,
        payload.status || 'ACTIVE',
      ]
    );

    return result.rows[0];
  }

  async updateStudent(id, payload, client = null) {
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
      return this.findById(id, db);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await db.query(
      `
        UPDATE students
        SET ${fields.join(', ')}
        WHERE id = $${index}
          AND deleted_at IS NULL
        RETURNING *
      `,
      values
    );

    return result.rows[0] || null;
  }

  async softDelete(id, client = null) {
    const db = client || this.database;
    const result = await db.query(
      `
        UPDATE students
        SET deleted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP,
            status = 'INACTIVE'
        WHERE id = $1
          AND deleted_at IS NULL
        RETURNING *
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  async updateStatus(id, status, client = null) {
    const db = client || this.database;
    const result = await db.query(
      `
        UPDATE students
        SET status = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
          AND deleted_at IS NULL
        RETURNING *
      `,
      [status, id]
    );

    return result.rows[0] || null;
  }
}

module.exports = StudentRepository;
