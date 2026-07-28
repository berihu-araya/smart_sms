class SubjectRepository {
  constructor(database) {
    this.database = database;
  }

  async findAll({
    search = '',
    limit = 20,
    offset = 0,
  } = {}) {
    const searchPattern = `%${search.trim()}%`;

    const countResult = await this.database.query(
      `
        SELECT COUNT(*)::int AS total
        FROM subjects s
        WHERE s.deleted_at IS NULL
          AND (
            LOWER(s.subject_name) LIKE LOWER($1)
            OR LOWER(s.subject_code) LIKE LOWER($1)
            OR LOWER(COALESCE(s.short_name, '')) LIKE LOWER($1)
          )
      `,
      [searchPattern]
    );


    const result = await this.database.query(
      `
        SELECT
          s.id,
          s.subject_code,
          s.subject_name,
          s.short_name,
          s.description,
          s.credit_hours,
          s.pass_mark,
          s.max_mark,
          s.is_elective,
          s.is_lab,
          s.display_order,
          s.status,
          s.created_at,
          s.updated_at
        FROM subjects s
        WHERE s.deleted_at IS NULL
          AND (
            LOWER(s.subject_name) LIKE LOWER($1)
            OR LOWER(s.subject_code) LIKE LOWER($1)
            OR LOWER(COALESCE(s.short_name, '')) LIKE LOWER($1)
          )
        ORDER BY s.display_order ASC,
                 s.subject_name ASC
        LIMIT $2 OFFSET $3
      `,
      [
        searchPattern,
        limit,
        offset,
      ]
    );


    return {
      items: result.rows,
      total: countResult.rows[0].total,
    };
  }


  async findById(id) {
    const result = await this.database.query(
      `
        SELECT
          s.id,
          s.subject_code,
          s.subject_name,
          s.short_name,
          s.description,
          s.credit_hours,
          s.pass_mark,
          s.max_mark,
          s.is_elective,
          s.is_lab,
          s.display_order,
          s.status,
          s.created_at,
          s.updated_at
        FROM subjects s
        WHERE s.id = $1
          AND s.deleted_at IS NULL
        LIMIT 1
      `,
      [id]
    );


    return result.rows[0] || null;
  }


  async findByCode(code) {
    const result = await this.database.query(
      `
        SELECT *
        FROM subjects
        WHERE subject_code = $1
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [code]
    );


    return result.rows[0] || null;
  }


  async findByName(name) {
    const result = await this.database.query(
      `
        SELECT *
        FROM subjects
        WHERE LOWER(subject_name) = LOWER($1)
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [name]
    );


    return result.rows[0] || null;
  }


  async create(payload) {
    const result = await this.database.query(
      `
        INSERT INTO subjects
        (
          subject_code,
          subject_name,
          short_name,
          description,
          credit_hours,
          pass_mark,
          max_mark,
          is_elective,
          is_lab,
          display_order,
          status
        )
        VALUES
        (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
        )
        RETURNING *
      `,
      [
        payload.subject_code,
        payload.subject_name,
        payload.short_name,
        payload.description,
        payload.credit_hours,
        payload.pass_mark,
        payload.max_mark,
        payload.is_elective,
        payload.is_lab,
        payload.display_order,
        payload.status,
      ]
    );


    return result.rows[0] || null;
  }


  async update(id, payload) {
    const fields = [];
    const values = [];

    let index = 1;


    Object.entries(payload).forEach(
      ([key, value]) => {

        if (value !== undefined) {

          fields.push(
            `${key} = $${index}`
          );

          values.push(value);

          index++;
        }

      }
    );


    if (fields.length === 0) {
      return this.findById(id);
    }


    fields.push(
      `updated_at = CURRENT_TIMESTAMP`
    );


    values.push(id);


    const result = await this.database.query(
      `
        UPDATE subjects
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
        UPDATE subjects
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
}


module.exports = SubjectRepository;