class StudentRepository {
  constructor(database) {
    this.database = database;
  }

  async findAll({ search = '', limit = 20, offset = 0 }) {
    const searchPattern = `%${search.trim()}%`;

    const result = await this.database.query(
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
          s.created_at,
          s.updated_at,
          p.full_name AS parent_name,
          sec.name AS section_name
        FROM students s
        LEFT JOIN parents p ON p.id = s.parent_id
        LEFT JOIN sections sec ON sec.id = s.section_id
        WHERE s.deleted_at IS NULL
          AND (
            LOWER(s.admission_number) LIKE LOWER($1)
            OR LOWER(s.first_name) LIKE LOWER($1)
            OR LOWER(s.last_name) LIKE LOWER($1)
            OR LOWER(p.full_name) LIKE LOWER($1)
          )
        ORDER BY s.created_at DESC
        LIMIT $2 OFFSET $3
      `,
      [searchPattern, limit, offset]
    );

    return result.rows;
  }

  async findById(id) {
    const result = await this.database.query(
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
          p.address AS parent_address,
          sec.name AS section_name,
          sec.room_number AS section_room_number
        FROM students s
        LEFT JOIN parents p ON p.id = s.parent_id
        LEFT JOIN sections sec ON sec.id = s.section_id
        WHERE s.id = $1
          AND s.deleted_at IS NULL
        LIMIT 1
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  async createStudent(payload) {
    const result = await this.database.query(
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
        payload.userId || null,
        payload.parentId || null,
        payload.sectionId || null,
        payload.admissionNumber,
        payload.firstName,
        payload.lastName,
        payload.gender,
        payload.dateOfBirth || null,
        payload.admissionDate,
        payload.address || null,
        payload.email || null,
        payload.phone || null,
        payload.status || 'ACTIVE',
      ]
    );

    return result.rows[0];
  }

  async updateStudent(id, payload) {
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

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await this.database.query(
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

  async softDelete(id) {
    const result = await this.database.query(
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

  async updateStatus(id, status) {
    const result = await this.database.query(
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
