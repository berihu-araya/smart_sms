class SettingRepository {
  constructor(database) {
    this.database = database;
  }

  async getSettings() {
    const result = await this.database.query(
      `
      SELECT
        s.id,
        s.school_name,
        s.school_code,
        s.email,
        s.phone,
        s.address,
        s.motto,
        s.logo_url,
        s.active_academic_year_id,
        s.active_term,
        s.currency,
        s.created_at,
        s.updated_at,
        ay.name AS active_academic_year_name
      FROM settings s
      LEFT JOIN academic_years ay ON ay.id = s.active_academic_year_id
      LIMIT 1
      `
    );

    return result.rows[0] || null;
  }

  async updateSettings(payload) {
    const current = await this.getSettings();
    if (!current) {
      // Insert if none exists
      const insertRes = await this.database.query(
        `
        INSERT INTO settings (school_name, school_code, email, phone, address, motto)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        `,
        [
          payload.schoolName || 'Smart SMS International Academy',
          payload.schoolCode || 'SMS-001',
          payload.email || 'info@smartsms.edu.et',
          payload.phone || '+251 11 123 4567',
          payload.address || 'Addis Ababa, Ethiopia',
          payload.motto || 'Empowering Minds Through Digital Excellence',
        ]
      );
      return insertRes.rows[0];
    }

    const fields = [];
    const values = [];
    let index = 1;

    const columnMap = {
      schoolName: 'school_name',
      schoolCode: 'school_code',
      email: 'email',
      phone: 'phone',
      address: 'address',
      motto: 'motto',
      logoUrl: 'logo_url',
      activeAcademicYearId: 'active_academic_year_id',
      activeTerm: 'active_term',
      currency: 'currency',
    };

    Object.entries(payload).forEach(([key, val]) => {
      if (val !== undefined && columnMap[key]) {
        fields.push(`${columnMap[key]} = $${index}`);
        values.push(val);
        index++;
      }
    });

    if (fields.length === 0) return current;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(current.id);

    const result = await this.database.query(
      `
      UPDATE settings
      SET ${fields.join(', ')}
      WHERE id = $${index}
      RETURNING *
      `,
      values
    );

    return result.rows[0] || null;
  }
}

module.exports = SettingRepository;
