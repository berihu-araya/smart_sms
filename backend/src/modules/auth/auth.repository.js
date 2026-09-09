class AuthRepository {
  constructor(database) {
    this.database = database;
  }

  async findActiveUserByEmail(email) {
    const result = await this.database.query(
      `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.school_id,
        u.profile_image,
        u.password_hash,
        u.status,
        r.name AS role_name
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE LOWER(u.email) = $1
        AND u.deleted_at IS NULL
        AND r.deleted_at IS NULL
      LIMIT 1
      `,
      [email.trim().toLowerCase()]
    );

    return result.rows[0] || null;
  }

  async findUserById(id) {
    const result = await this.database.query(
      `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.school_id,
        u.profile_image,
        u.password_hash,
        u.status,
        r.name AS role_name
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.id = $1
        AND u.deleted_at IS NULL
        AND r.deleted_at IS NULL
      LIMIT 1
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  async updateLastLogin(userId) {
    await this.database.query(
      `
      UPDATE users
      SET last_login = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [userId]
    );
  }

  async savePasswordResetToken(userId, token, expiresInHours) {
    await this.database.query(
      `
      INSERT INTO password_reset_tokens
        (user_id, token, expires_at)
      VALUES
        ($1, $2, CURRENT_TIMESTAMP + ($3 || ' hour')::interval)
      `,
      [userId, token, expiresInHours]
    );
  }

  async findValidPasswordResetToken(token) {
    const result = await this.database.query(
      `
      SELECT
        t.user_id,
        t.expires_at,
        t.used_at
      FROM password_reset_tokens t
      WHERE t.token = $1
        AND t.deleted_at IS NULL
      LIMIT 1
      `,
      [token]
    );

    return result.rows[0] || null;
  }

  async markPasswordResetTokenUsed(token) {
    await this.database.query(
      `
      UPDATE password_reset_tokens
      SET used_at = CURRENT_TIMESTAMP
      WHERE token = $1
      `,
      [token]
    );
  }

  async updatePasswordHash(userId, passwordHash) {
    await this.database.query(
      `
      UPDATE users
      SET
        password_hash = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [passwordHash, userId]
    );
  }
  async updateProfileImage(userId, profileImage) {
    await this.database.query(
      `
      UPDATE users
      SET
        profile_image = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [profileImage, userId]
    );
  }

  async findRoleByName(roleName) {
    let normalized = (roleName || '').trim();
    if (normalized.toLowerCase() === 'admin') {
      normalized = 'School Admin';
    }

    const result = await this.database.query(
      `
      SELECT id, name, description
      FROM roles
      WHERE LOWER(name) = LOWER($1)
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [normalized]
    );

    return result.rows[0] || null;
  }

  async findRoleById(roleId) {
    const result = await this.database.query(
      `SELECT id, name, description FROM roles WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [roleId]
    );
    return result.rows[0] || null;
  }

  async createAccountRegistration({ firstName, lastName, email, phone, roleName, schoolId, registeredBy }) {
    const result = await this.database.query(
      `
      INSERT INTO account_registrations
        (first_name, last_name, email, phone, role_name, school_id, registered_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, first_name, last_name, email, phone, role_name, school_id, status, created_at
      `,
      [
        firstName.trim(),
        lastName.trim(),
        email.trim().toLowerCase(),
        phone?.trim() || null,
        roleName,
        schoolId || null,
        registeredBy,
      ]
    );

    return result.rows[0];
  }

  async findEligibleRegistration(email, roleName) {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedRole = roleName.trim().toLowerCase();
    const invitation = await this.database.query(
      `
      SELECT id, user_id, school_id, first_name, last_name, email, phone, role_name
      FROM account_registrations
      WHERE LOWER(email) = $1 AND LOWER(role_name) = $2
        AND status = 'PRE_REGISTERED' AND user_id IS NULL AND deleted_at IS NULL
      LIMIT 1
      `,
      [normalizedEmail, normalizedRole]
    );

    if (invitation.rows[0]) return invitation.rows[0];

    const participantTables = { student: 'students', teacher: 'teachers', parent: 'parents' };
    const table = participantTables[normalizedRole];
    if (!table) return null;

    const participant = await this.database.query(
      `
      SELECT id, user_id, school_id, email, phone,
        ${table === 'parents' ? "split_part(full_name, ' ', 1)" : 'first_name'} AS first_name,
        ${table === 'parents' ? "NULLIF(regexp_replace(full_name, '^\\S+\\s*', ''), '')" : 'last_name'} AS last_name
      FROM ${table}
      WHERE LOWER(email) = $1 AND user_id IS NULL
        AND status = 'ACTIVE' AND deleted_at IS NULL
      LIMIT 1
      `,
      [normalizedEmail]
    );

    return participant.rows[0]
      ? { ...participant.rows[0], role_name: roleName, participant_type: normalizedRole }
      : null;
  }

  async claimRegistration(registration, userId, roleName) {
    if (registration.participant_type) {
      const table = {
        student: 'students',
        teacher: 'teachers',
        parent: 'parents',
      }[roleName.trim().toLowerCase()];
      if (!table) return;

      await this.database.query(
        `UPDATE ${table} SET user_id = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND user_id IS NULL AND deleted_at IS NULL`,
        [userId, registration.id]
      );
      return;
    }

    await this.database.query(
      `UPDATE account_registrations
       SET status = 'CLAIMED', user_id = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND status = 'PRE_REGISTERED' AND user_id IS NULL`,
      [userId, registration.id]
    );
  }

  async findAllRoles() {
    const result = await this.database.query(
      `
      SELECT id, name, description
      FROM roles
      WHERE deleted_at IS NULL
      ORDER BY 
        CASE 
          WHEN name = 'School Admin' THEN 1
          WHEN name = 'Teacher' THEN 2
          WHEN name = 'Student' THEN 3
          WHEN name = 'Parent' THEN 4
          WHEN name = 'Staff' THEN 5
          ELSE 6
        END ASC,
        name ASC
      `
    );

    return result.rows;
  }

  async createUser({ roleId, firstName, lastName, email, phone, passwordHash, status = 'ACTIVE' }) {
    const result = await this.database.query(
      `
      INSERT INTO users (
        role_id,
        first_name,
        last_name,
        email,
        phone,
        password_hash,
        status,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING
        id,
        role_id,
        first_name,
        last_name,
        email,
        phone,
        status,
        profile_image,
        created_at
      `,
      [
        roleId,
        firstName.trim(),
        lastName.trim(),
        email.trim().toLowerCase(),
        phone ? phone.trim() : null,
        passwordHash,
        status,
      ]
    );

    return result.rows[0];
  }

  async linkUserToRelatedEntities(userId, email, roleName) {
    const normalizedRole = (roleName || '').toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    try {
      if (normalizedRole.includes('teacher')) {
        await this.database.query(
          `UPDATE teachers SET user_id = $1 WHERE LOWER(email) = $2 AND user_id IS NULL`,
          [userId, cleanEmail]
        );
      } else if (normalizedRole.includes('student')) {
        await this.database.query(
          `UPDATE students SET user_id = $1 WHERE LOWER(email) = $2 AND user_id IS NULL`,
          [userId, cleanEmail]
        );
      } else if (normalizedRole.includes('parent')) {
        await this.database.query(
          `UPDATE parents SET user_id = $1 WHERE LOWER(email) = $2 AND user_id IS NULL`,
          [userId, cleanEmail]
        );
      }
    } catch (err) {
      console.warn('Auto-link entity warning:', err.message);
    }
  }
}

module.exports = AuthRepository;