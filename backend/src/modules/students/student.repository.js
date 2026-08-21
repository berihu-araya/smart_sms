class StudentRepository {
  constructor(database) {
    this.database = database;
  }

  async findAll({ search = '', limit = 20, offset = 0 } = {}, client = null) {
    const db = client || this.database;
    const searchPattern = `%${search.trim()}%`;

    const countResult = await db.query(
      `
        SELECT COUNT(*) AS total
        FROM students s
        LEFT JOIN parents p ON p.id = s.parent_id
        WHERE s.deleted_at IS NULL
          AND (
            LOWER(s.admission_number) LIKE LOWER($1)
            OR LOWER(s.first_name) LIKE LOWER($1)
            OR LOWER(s.last_name) LIKE LOWER($1)
            OR LOWER(COALESCE(p.full_name, '')) LIKE LOWER($1)
          )
      `,
      [searchPattern]
    );

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
        WHERE s.deleted_at IS NULL
          AND (
            LOWER(s.admission_number) LIKE LOWER($1)
            OR LOWER(s.first_name) LIKE LOWER($1)
            OR LOWER(s.last_name) LIKE LOWER($1)
            OR LOWER(COALESCE(p.full_name, '')) LIKE LOWER($1)
          )
        ORDER BY s.created_at DESC
        LIMIT $2 OFFSET $3
      `,
      [searchPattern, limit, offset]
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
