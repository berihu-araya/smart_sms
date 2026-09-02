class RoomRepository {
  constructor(database) {
    this.database = database;
  }

  async findAll({ search = '', roomType = '', isActive, limit = 50, offset = 0 } = {}) {
    const conditions = ['r.deleted_at IS NULL'];
    const values = [];
    let index = 1;

    if (search && search.trim()) {
      const searchPattern = `%${search.trim()}%`;
      conditions.push(`(
        LOWER(r.name) LIKE LOWER($${index})
        OR LOWER(COALESCE(r.building, '')) LIKE LOWER($${index})
        OR LOWER(COALESCE(r.floor, '')) LIKE LOWER($${index})
      )`);
      values.push(searchPattern);
      index += 1;
    }

    if (roomType && roomType.trim()) {
      conditions.push(`r.room_type = $${index}`);
      values.push(roomType.trim().toUpperCase());
      index += 1;
    }

    if (isActive !== undefined && isActive !== null && isActive !== '') {
      conditions.push(`r.is_active = $${index}`);
      values.push(isActive === true || isActive === 'true');
      index += 1;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await this.database.query(
      `SELECT COUNT(*)::int AS total FROM rooms r ${whereClause}`,
      values
    );
    const total = countResult.rows[0]?.total || 0;

    const limitIndex = index;
    const offsetIndex = index + 1;
    values.push(limit, offset);

    const result = await this.database.query(
      `
      SELECT
        r.id,
        r.name,
        r.building,
        r.floor,
        r.capacity,
        r.room_type,
        r.is_active,
        r.created_at,
        r.updated_at,
        (
          SELECT COUNT(*)::int
          FROM sections sec
          WHERE sec.room_id = r.id AND sec.deleted_at IS NULL
        ) AS assigned_sections_count
      FROM rooms r
      ${whereClause}
      ORDER BY r.name ASC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
      `,
      values
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
        r.id,
        r.name,
        r.building,
        r.floor,
        r.capacity,
        r.room_type,
        r.is_active,
        r.created_at,
        r.updated_at,
        (
          SELECT COUNT(*)::int
          FROM sections sec
          WHERE sec.room_id = r.id AND sec.deleted_at IS NULL
        ) AS assigned_sections_count
      FROM rooms r
      WHERE r.id = $1 AND r.deleted_at IS NULL
      LIMIT 1
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  async findByName(name, excludeId = null) {
    const conditions = ['LOWER(r.name) = LOWER($1)', 'r.deleted_at IS NULL'];
    const values = [name.trim()];

    if (excludeId) {
      conditions.push('r.id != $2');
      values.push(excludeId);
    }

    const result = await this.database.query(
      `SELECT r.id, r.name FROM rooms r WHERE ${conditions.join(' AND ')} LIMIT 1`,
      values
    );

    return result.rows[0] || null;
  }

  async create(payload, client = null) {
    const db = client || this.database;
    const result = await db.query(
      `
      INSERT INTO rooms (
        name,
        building,
        floor,
        capacity,
        room_type,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [
        payload.name,
        payload.building || null,
        payload.floor || null,
        payload.capacity || 40,
        payload.room_type || 'NORMAL',
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
      UPDATE rooms
      SET ${fields.join(', ')}
      WHERE id = $${index} AND deleted_at IS NULL
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
      UPDATE rooms
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

  async isRoomOccupiedInTimetables(roomId) {
    const result = await this.database.query(
      `
      SELECT COUNT(*)::int AS count
      FROM timetable_entries te
      WHERE te.room_id = $1 AND te.deleted_at IS NULL
      `,
      [roomId]
    );

    return (result.rows[0]?.count || 0) > 0;
  }
}

module.exports = RoomRepository;
