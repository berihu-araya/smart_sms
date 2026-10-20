/**
 * Enterprise Audit Logging Service
 *
 * Immutably tracks security-sensitive operations, state changes, role elevations,
 * configuration updates, and academic result publications.
 */

class AuditService {
  constructor(database) {
    this.database = database;
  }

  /**
   * Record a new audit log event
   */
  async log({
    schoolId,
    userId,
    action,
    resourceType,
    resourceId = null,
    oldValues = null,
    newValues = null,
    ipAddress = null,
    userAgent = null,
    status = 'SUCCESS',
  }) {
    if (!action) return null;

    try {
      // Resolve school_id from user if not provided
      let effectiveSchoolId = schoolId;
      if (!effectiveSchoolId && userId) {
        const uRes = await this.database.query(
          `SELECT school_id FROM users WHERE id = $1 LIMIT 1`,
          [userId]
        );
        effectiveSchoolId = uRes.rows[0]?.school_id || null;
      }

      // If still no school_id, resolve first school
      if (!effectiveSchoolId) {
        const sRes = await this.database.query(`SELECT id FROM schools LIMIT 1`);
        effectiveSchoolId = sRes.rows[0]?.id || null;
      }

      const res = await this.database.query(
        `
        INSERT INTO audit_logs (
          school_id, user_id, action, resource_type, resource_id,
          old_values, new_values, ip_address, user_agent, status, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
        RETURNING id, created_at
        `,
        [
          effectiveSchoolId,
          userId || null,
          action,
          resourceType || null,
          resourceId || null,
          oldValues ? JSON.stringify(oldValues) : null,
          newValues ? JSON.stringify(newValues) : null,
          ipAddress,
          userAgent,
          status,
        ]
      );

      return res.rows[0];
    } catch (err) {
      console.error('[AuditService.log] Failed to write audit record:', err.message);
      return null;
    }
  }

  /**
   * Query audit logs with pagination and multi-parameter filters
   */
  async query({
    schoolId = null,
    userId = null,
    action = null,
    resourceType = null,
    search = null,
    startDate = null,
    endDate = null,
    page = 1,
    limit = 50,
  } = {}) {
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const params = [];
    let whereClause = 'WHERE 1=1';

    if (schoolId) {
      params.push(schoolId);
      whereClause += ` AND al.school_id = $${params.length}`;
    }

    if (userId) {
      params.push(userId);
      whereClause += ` AND al.user_id = $${params.length}`;
    }

    if (action && action !== 'ALL') {
      params.push(action);
      whereClause += ` AND al.action = $${params.length}`;
    }

    if (resourceType && resourceType !== 'ALL') {
      params.push(resourceType);
      whereClause += ` AND al.resource_type = $${params.length}`;
    }

    if (startDate) {
      params.push(startDate);
      whereClause += ` AND al.created_at >= $${params.length}`;
    }

    if (endDate) {
      params.push(`${endDate} 23:59:59`);
      whereClause += ` AND al.created_at <= $${params.length}`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      whereClause += ` AND (
        al.action ILIKE $${params.length} OR
        al.resource_type ILIKE $${params.length} OR
        u.first_name ILIKE $${params.length} OR
        u.last_name ILIKE $${params.length} OR
        u.email ILIKE $${params.length} OR
        al.ip_address ILIKE $${params.length}
      )`;
    }

    // Count total matching
    const countRes = await this.database.query(
      `
      SELECT COUNT(*)::int AS total
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      ${whereClause}
      `,
      params
    );
    const total = countRes.rows[0]?.total || 0;

    // Fetch items with user context
    params.push(parseInt(limit, 10));
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const itemsRes = await this.database.query(
      `
      SELECT
        al.id,
        al.school_id,
        al.user_id,
        al.action,
        al.resource_type,
        al.resource_id,
        al.old_values,
        al.new_values,
        al.ip_address,
        al.user_agent,
        al.status,
        al.created_at,
        CONCAT(u.first_name, ' ', u.last_name) AS user_name,
        u.email AS user_email,
        r.name AS user_role
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      LEFT JOIN roles r ON r.id = u.role_id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
      `,
      params
    );

    return {
      items: itemsRes.rows,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get single audit record by ID
   */
  async findById(id) {
    const result = await this.database.query(
      `
      SELECT
        al.id,
        al.school_id,
        al.user_id,
        al.action,
        al.resource_type,
        al.resource_id,
        al.old_values,
        al.new_values,
        al.ip_address,
        al.user_agent,
        al.status,
        al.created_at,
        CONCAT(u.first_name, ' ', u.last_name) AS user_name,
        u.email AS user_email,
        r.name AS user_role
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE al.id = $1
      LIMIT 1
      `,
      [id]
    );

    return result.rows[0] || null;
  }
}

module.exports = AuditService;
