/**
 * Finance Repository Layer
 * Executes parameterized PostgreSQL queries for all financial entities.
 */

class FinanceRepository {
  constructor(database) {
    this.db = database;
  }

  // ==========================================
  // 1. SETTINGS
  // ==========================================
  async getSettings(schoolId) {
    const res = await this.db.query(
      `SELECT * FROM finance_settings WHERE (school_id = $1 OR school_id IS NULL) LIMIT 1`,
      [schoolId] // this query retrieves the finance settings for a specific school from the finance_settings table. If no settings are found for the given school_id, it will return the default settings (where school_id is NULL). The LIMIT 1 ensures that only one record is returned, even if multiple records exist for the same school_id.
    );
    if (res.rows.length > 0) {
      const row = res.rows[0];
      return {
        ...row,
        transport_tax_exemption_limit: row.transport_tax_exemption_limit !== null && row.transport_tax_exemption_limit !== undefined
          ? Number(row.transport_tax_exemption_limit)
          : 600.00,
        pension_employee_rate: row.pension_employee_rate !== null && row.pension_employee_rate !== undefined
          ? Number(row.pension_employee_rate)
          : 7.00,
        pension_employer_rate: row.pension_employer_rate !== null && row.pension_employer_rate !== undefined
          ? Number(row.pension_employer_rate)
          : 11.00,
        tax_brackets_json: row.tax_brackets_json || [
          { min: 0, max: 2000, rate: 0.00, offset: 0.00 },
          { min: 2000, max: 4000, rate: 0.15, offset: 300.00 },
          { min: 4000, max: 7000, rate: 0.20, offset: 500.00 },
          { min: 7000, max: 10000, rate: 0.25, offset: 850.00 },
          { min: 10000, max: 14000, rate: 0.30, offset: 1350.00 },
          { min: 14000, max: null, rate: 0.35, offset: 2050.00 },
        ],
      };
    }

    // Return defaults if not initialized yet
    return {
      currency_symbol: 'ETB',
      currency_code: 'ETB',
      receipt_prefix: 'REC',
      invoice_prefix: 'INV',
      voucher_prefix: 'EXP',
      payslip_prefix: 'PAY',
      enable_bank_slip_verification: true,
      transport_tax_exemption_limit: 600.00,
      pension_employee_rate: 7.00,
      pension_employer_rate: 11.00,
      tax_brackets_json: [
        { min: 0, max: 2000, rate: 0.00, offset: 0.00 },
        { min: 2000, max: 4000, rate: 0.15, offset: 300.00 },
        { min: 4000, max: 7000, rate: 0.20, offset: 500.00 },
        { min: 7000, max: 10000, rate: 0.25, offset: 850.00 },
        { min: 10000, max: 14000, rate: 0.30, offset: 1350.00 },
        { min: 14000, max: null, rate: 0.35, offset: 2050.00 },
      ],
    };
  }

  async upsertSettings(schoolId, data) {
    const res = await this.db.query(
      `INSERT INTO finance_settings 
       (school_id, currency_symbol, currency_code, receipt_prefix, invoice_prefix, voucher_prefix, payslip_prefix, enable_bank_slip_verification, tax_identification_number, transport_tax_exemption_limit, pension_employee_rate, pension_employer_rate, tax_brackets_json, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)
       ON CONFLICT (school_id) DO UPDATE SET
         currency_symbol = EXCLUDED.currency_symbol,
         currency_code = EXCLUDED.currency_code,
         receipt_prefix = EXCLUDED.receipt_prefix,
         invoice_prefix = EXCLUDED.invoice_prefix,
         voucher_prefix = EXCLUDED.voucher_prefix,
         payslip_prefix = EXCLUDED.payslip_prefix,
         enable_bank_slip_verification = EXCLUDED.enable_bank_slip_verification,
         tax_identification_number = EXCLUDED.tax_identification_number,
         transport_tax_exemption_limit = EXCLUDED.transport_tax_exemption_limit,
         pension_employee_rate = EXCLUDED.pension_employee_rate,
         pension_employer_rate = EXCLUDED.pension_employer_rate,
         tax_brackets_json = EXCLUDED.tax_brackets_json,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        schoolId,
        data.currency_symbol || 'ETB',
        data.currency_code || 'ETB',
        data.receipt_prefix || 'REC',
        data.invoice_prefix || 'INV',
        data.voucher_prefix || 'EXP',
        data.payslip_prefix || 'PAY',
        data.enable_bank_slip_verification !== undefined ? data.enable_bank_slip_verification : true,
        data.tax_identification_number || null,
        data.transport_tax_exemption_limit !== undefined ? Number(data.transport_tax_exemption_limit) : 600.00,
        data.pension_employee_rate !== undefined ? Number(data.pension_employee_rate) : 7.00,
        data.pension_employer_rate !== undefined ? Number(data.pension_employer_rate) : 11.00,
        data.tax_brackets_json ? JSON.stringify(data.tax_brackets_json) : null,
      ]
    );
    return res.rows[0];
  }

  // ==========================================
  // 2. FEE CATEGORIES
  // ==========================================
  async listFeeCategories(schoolId) {
    const res = await this.db.query(
      `SELECT fc.*, 
              (SELECT COUNT(*) FROM fee_structures fs WHERE fs.fee_category_id = fc.id AND fs.deleted_at IS NULL) as structures_count
       FROM fee_categories fc
       WHERE (fc.school_id = $1 OR fc.school_id IS NULL) AND fc.deleted_at IS NULL
       ORDER BY fc.name ASC`,
      [schoolId] // this query retrieves all fee categories for a specific school from the fee_categories table, including a count of associated fee structures for each category. It filters out any deleted categories and orders the results alphabetically by category name. The use of a subquery allows for counting the number of fee structures linked to each category without requiring a separate query.
    );
    return res.rows;
  }

  async getFeeCategoryById(id, schoolId) {
    const res = await this.db.query(
      `SELECT * FROM fee_categories 
       WHERE id = $1 AND (school_id = $2 OR school_id IS NULL) AND deleted_at IS NULL`,
      [id, schoolId]
    );
    return res.rows[0] || null;
  }

  async createFeeCategory(schoolId, data) {
    const res = await this.db.query(
      `INSERT INTO fee_categories (school_id, name, code, description, is_refundable, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        schoolId,
        data.name.trim(),
        data.code.trim().toUpperCase(),
        data.description || null,
        data.is_refundable || false,
        data.is_active !== undefined ? data.is_active : true,
      ] // this query inserts a new fee category into the fee_categories table for a specific school. It takes the school ID and category details (name, code, description, refundable status, and active status) as parameters. The name is trimmed to remove extra whitespace, and the code is converted to uppercase for consistency. The query returns the newly created fee category record for further processing or confirmation.
    );
    return res.rows[0];
  }

  async updateFeeCategory(id, schoolId, data) {
    const res = await this.db.query(
      `UPDATE fee_categories 
       SET name = COALESCE($1, name),
           code = COALESCE($2, code),
           description = COALESCE($3, description),
           is_refundable = COALESCE($4, is_refundable),
           is_active = COALESCE($5, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND (school_id = $7 OR school_id IS NULL) AND deleted_at IS NULL
       RETURNING *`,
      [
        data.name ? data.name.trim() : null,
        data.code ? data.code.trim().toUpperCase() : null,
        data.description !== undefined ? data.description : null,
        data.is_refundable !== undefined ? data.is_refundable : null,
        data.is_active !== undefined ? data.is_active : null,
        id,
        schoolId,
      ]
    );
    return res.rows[0] || null;
  }

  async deleteFeeCategory(id, schoolId) {
    const res = await this.db.query(
      `UPDATE fee_categories 
       SET deleted_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND (school_id = $2 OR school_id IS NULL) AND deleted_at IS NULL
       RETURNING id`,
      [id, schoolId]
    );
    return res.rows.length > 0;
  }

  // ==========================================
  // 3. FEE STRUCTURES (Fee Master)
  // ==========================================
  async listFeeStructures(schoolId, filters = {}) { // this function retrieves a list of fee structures for a specific school, applying optional filters such as academic year, grade, fee category, and active status. It constructs a dynamic SQL query based on the provided filters and returns the matching fee structures along with their associated category, grade, and academic year details. The results are ordered by grade name and structure name for easy reference.
    let query = `
      SELECT fs.*,
             fc.name as category_name, fc.code as category_code,
             g.name as grade_name,
             ay.name as academic_year_name
      FROM fee_structures fs
      INNER JOIN fee_categories fc ON fc.id = fs.fee_category_id
      LEFT JOIN grades g ON g.id = fs.grade_id
      LEFT JOIN academic_years ay ON ay.id = fs.academic_year_id
      WHERE (fs.school_id = $1 OR fs.school_id IS NULL) AND fs.deleted_at IS NULL
    `;
    const params = [schoolId];

    if (filters.academic_year_id) {
      params.push(filters.academic_year_id);
      query += ` AND fs.academic_year_id = $${params.length}`;
    }
    if (filters.grade_id) {
      params.push(filters.grade_id);
      query += ` AND fs.grade_id = $${params.length}`;
    }
    if (filters.fee_category_id) {
      params.push(filters.fee_category_id);
      query += ` AND fs.fee_category_id = $${params.length}`;
    }
    if (filters.is_active !== undefined) {
      params.push(filters.is_active);
      query += ` AND fs.is_active = $${params.length}`;
    }

    query += ` ORDER BY g.name ASC NULLS FIRST, fs.name ASC`;
    const res = await this.db.query(query, params);
    return res.rows;
  }

  async getFeeStructureById(id, schoolId) {
    const res = await this.db.query(
      `SELECT fs.*,
              fc.name as category_name, fc.code as category_code,
              g.name as grade_name,
              ay.name as academic_year_name
       FROM fee_structures fs
       INNER JOIN fee_categories fc ON fc.id = fs.fee_category_id
       LEFT JOIN grades g ON g.id = fs.grade_id
       LEFT JOIN academic_years ay ON ay.id = fs.academic_year_id
       WHERE fs.id = $1 AND (fs.school_id = $2 OR fs.school_id IS NULL) AND fs.deleted_at IS NULL`,
      [id, schoolId]
    );
    return res.rows[0] || null;
  } 

  async createFeeStructure(schoolId, data) {
    const res = await this.db.query(
      `INSERT INTO fee_structures 
       (school_id, academic_year_id, grade_id, fee_category_id, name, amount, frequency, due_day_of_month, due_date, late_fine_type, late_fine_amount, grace_period_days, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        schoolId,
        data.academic_year_id || null,
        data.grade_id || null,
        data.fee_category_id,
        data.name.trim(),
        Number(data.amount) || 0,
        data.frequency || 'MONTHLY',
        data.due_day_of_month || 10,
        data.due_date || null,
        data.late_fine_type || 'NONE',
        Number(data.late_fine_amount) || 0,
        Number(data.grace_period_days) || 0,
        data.is_active !== undefined ? data.is_active : true,
      ] 
    );
    return res.rows[0];
  }

  async updateFeeStructure(id, schoolId, data) {
    const res = await this.db.query(
      `UPDATE fee_structures 
       SET academic_year_id = COALESCE($1, academic_year_id),
           grade_id = COALESCE($2, grade_id),
           fee_category_id = COALESCE($3, fee_category_id),
           name = COALESCE($4, name),
           amount = COALESCE($5, amount),
           frequency = COALESCE($6, frequency),
           due_day_of_month = COALESCE($7, due_day_of_month),
           due_date = COALESCE($8, due_date),
           late_fine_type = COALESCE($9, late_fine_type),
           late_fine_amount = COALESCE($10, late_fine_amount),
           grace_period_days = COALESCE($11, grace_period_days),
           is_active = COALESCE($12, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $13 AND (school_id = $14 OR school_id IS NULL) AND deleted_at IS NULL
       RETURNING *`,
      [
        data.academic_year_id !== undefined ? data.academic_year_id : null,
        data.grade_id !== undefined ? data.grade_id : null,
        data.fee_category_id || null,
        data.name ? data.name.trim() : null,
        data.amount !== undefined ? Number(data.amount) : null,
        data.frequency || null,
        data.due_day_of_month !== undefined ? Number(data.due_day_of_month) : null,
        data.due_date !== undefined ? data.due_date : null,
        data.late_fine_type || null,
        data.late_fine_amount !== undefined ? Number(data.late_fine_amount) : null,
        data.grace_period_days !== undefined ? Number(data.grace_period_days) : null,
        data.is_active !== undefined ? data.is_active : null,
        id,
        schoolId,
      ]
    );
    return res.rows[0] || null;
  }

  async deleteFeeStructure(id, schoolId) {
    const res = await this.db.query(
      `UPDATE fee_structures 
       SET deleted_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND (school_id = $2 OR school_id IS NULL) AND deleted_at IS NULL
       RETURNING id`,
      [id, schoolId]
    );
    return res.rows.length > 0;
  }

  // ==========================================
  // 4. FEE DISCOUNTS (Scholarships/Waivers)
  // ==========================================
  async listFeeDiscounts(schoolId) {
    const res = await this.db.query(
      `SELECT * FROM fee_discounts 
       WHERE (school_id = $1 OR school_id IS NULL) AND deleted_at IS NULL
       ORDER BY name ASC`,
      [schoolId]
    );
    return res.rows;
  }

  async getFeeDiscountById(id, schoolId) {
    const res = await this.db.query(
      `SELECT * FROM fee_discounts 
       WHERE id = $1 AND (school_id = $2 OR school_id IS NULL) AND deleted_at IS NULL`,
      [id, schoolId]
    );
    return res.rows[0] || null;
  }

  async createFeeDiscount(schoolId, data) {
    const res = await this.db.query(
      `INSERT INTO fee_discounts (school_id, name, code, discount_type, value, description, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        schoolId,
        data.name.trim(),
        data.code.trim().toUpperCase(),
        data.discount_type || 'PERCENTAGE',
        Number(data.value),
        data.description || null,
        data.is_active !== undefined ? data.is_active : true,
      ]
    );
    return res.rows[0];
  }

  async updateFeeDiscount(id, schoolId, data) {
    const res = await this.db.query(
      `UPDATE fee_discounts 
       SET name = COALESCE($1, name),
           code = COALESCE($2, code),
           discount_type = COALESCE($3, discount_type),
           value = COALESCE($4, value),
           description = COALESCE($5, description),
           is_active = COALESCE($6, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND (school_id = $8 OR school_id IS NULL) AND deleted_at IS NULL
       RETURNING *`,
      [
        data.name ? data.name.trim() : null,
        data.code ? data.code.trim().toUpperCase() : null,
        data.discount_type || null,
        data.value !== undefined ? Number(data.value) : null,
        data.description !== undefined ? data.description : null,
        data.is_active !== undefined ? data.is_active : null,
        id,
        schoolId,
      ]
    );
    return res.rows[0] || null;
  }

  async deleteFeeDiscount(id, schoolId) {
    const res = await this.db.query(
      `UPDATE fee_discounts 
       SET deleted_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND (school_id = $2 OR school_id IS NULL) AND deleted_at IS NULL
       RETURNING id`,
      [id, schoolId]
    );
    return res.rows.length > 0;
  }

  // ==========================================
  // 5. STUDENT FEE INVOICES
  // ==========================================
  async listInvoices(schoolId, filters = {}) { // this function retrieves a list of student fee invoices for a specific school, applying optional filters such as student ID, grade ID, section ID, academic year ID, invoice status, and search terms. It constructs a dynamic SQL query based on the provided filters and returns the matching invoices along with associated student, grade, section, academic year, and parent details. The results are paginated and ordered by due date and creation date for easy reference.
    let query = `
      SELECT inv.*,
             s.first_name as student_first_name, s.last_name as student_last_name,
             s.admission_number as student_admission_number,
             g.name as grade_name,
             sec.name as section_name,
             ay.name as academic_year_name,
             p.full_name as parent_name, p.phone as parent_phone
      FROM student_fee_invoices inv
      INNER JOIN students s ON s.id = inv.student_id
      LEFT JOIN grades g ON g.id = inv.grade_id
      LEFT JOIN sections sec ON sec.id = inv.section_id
      LEFT JOIN academic_years ay ON ay.id = inv.academic_year_id
      LEFT JOIN parents p ON p.id = s.parent_id
      WHERE (inv.school_id = $1 OR inv.school_id IS NULL) AND inv.deleted_at IS NULL
    `;
    const params = [schoolId];

    if (filters.student_id) {
      params.push(filters.student_id);
      query += ` AND inv.student_id = $${params.length}`;
    }
    if (filters.grade_id) {
      params.push(filters.grade_id);
      query += ` AND inv.grade_id = $${params.length}`;
    }
    if (filters.section_id) {
      params.push(filters.section_id);
      query += ` AND inv.section_id = $${params.length}`;
    }
    if (filters.academic_year_id) {
      params.push(filters.academic_year_id);
      query += ` AND inv.academic_year_id = $${params.length}`;
    }
    if (filters.status) {
      params.push(filters.status.toUpperCase());
      query += ` AND inv.status = $${params.length}`;
    }
    if (filters.search) {
      params.push(`%${filters.search.toLowerCase()}%`);
      query += ` AND (
        LOWER(inv.invoice_number) LIKE $${params.length} OR 
        LOWER(inv.title) LIKE $${params.length} OR
        LOWER(s.first_name) LIKE $${params.length} OR 
        LOWER(s.last_name) LIKE $${params.length} OR
        LOWER(s.admission_number) LIKE $${params.length}
      )`;
    } 

    // Count for pagination
    const countRes = await this.db.query(`SELECT COUNT(*) FROM (${query}) q`, params);
    const total = Number(countRes.rows[0].count);

    query += ` ORDER BY inv.due_date DESC, inv.created_at DESC`;

    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const offset = (page - 1) * limit;

    params.push(limit, offset);
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const res = await this.db.query(query, params);
    return {
      data: res.rows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getInvoiceById(id, schoolId) {
    const invRes = await this.db.query(
      `SELECT inv.*,
              s.first_name as student_first_name, s.last_name as student_last_name,
              s.admission_number as student_admission_number, s.photo as student_photo,
              s.gender as student_gender,
              g.name as grade_name,
              sec.name as section_name,
              ay.name as academic_year_name,
              p.full_name as parent_name, p.phone as parent_phone, p.email as parent_email,
              u.first_name as created_by_first_name, u.last_name as created_by_last_name
       FROM student_fee_invoices inv
       INNER JOIN students s ON s.id = inv.student_id
       LEFT JOIN grades g ON g.id = inv.grade_id
       LEFT JOIN sections sec ON sec.id = inv.section_id
       LEFT JOIN academic_years ay ON ay.id = inv.academic_year_id
       LEFT JOIN parents p ON p.id = s.parent_id
       LEFT JOIN users u ON u.id = inv.created_by
       WHERE inv.id = $1 AND (inv.school_id = $2 OR inv.school_id IS NULL) AND inv.deleted_at IS NULL`,
      [id, schoolId]
    );

    if (invRes.rows.length === 0) return null;
    const invoice = invRes.rows[0];

    // Fetch line items
    const itemsRes = await this.db.query(
      `SELECT ii.*, fc.name as category_name, fc.code as category_code, fd.name as discount_name
       FROM student_fee_invoice_items ii
       INNER JOIN fee_categories fc ON fc.id = ii.fee_category_id
       LEFT JOIN fee_discounts fd ON fd.id = ii.fee_discount_id
       WHERE ii.invoice_id = $1
       ORDER BY ii.created_at ASC`,
      [id]
    );
    invoice.items = itemsRes.rows;

    // Fetch payments made against this invoice
    const paymentsRes = await this.db.query(
      `SELECT p.*, u.first_name as received_by_first_name, u.last_name as received_by_last_name
       FROM fee_payments p
       LEFT JOIN users u ON u.id = p.received_by
       WHERE p.invoice_id = $1 AND p.deleted_at IS NULL
       ORDER BY p.payment_date DESC, p.created_at DESC`,
      [id]
    );
    invoice.payments = paymentsRes.rows;

    return invoice;
  }

  async getMyInvoices(user, schoolId) {
    let query = '';
    let params = [];

    if (user.role.toLowerCase() === 'student') {
      query = `
        SELECT inv.*,
               s.first_name as student_first_name, s.last_name as student_last_name,
               s.admission_number as student_admission_number,
               g.name as grade_name, sec.name as section_name
        FROM student_fee_invoices inv
        INNER JOIN students s ON s.id = inv.student_id
        LEFT JOIN grades g ON g.id = inv.grade_id
        LEFT JOIN sections sec ON sec.id = inv.section_id
        WHERE s.user_id = $1 AND inv.deleted_at IS NULL
        ORDER BY inv.due_date DESC
      `;
      params = [user.id];
    } else if (user.role.toLowerCase() === 'parent') {
      query = `
        SELECT inv.*,
               s.first_name as student_first_name, s.last_name as student_last_name,
               s.admission_number as student_admission_number,
               g.name as grade_name, sec.name as section_name
        FROM student_fee_invoices inv
        INNER JOIN students s ON s.id = inv.student_id
        INNER JOIN parents p ON p.id = s.parent_id
        LEFT JOIN grades g ON g.id = inv.grade_id
        LEFT JOIN sections sec ON sec.id = inv.section_id
        WHERE (p.user_id = $1 OR p.id::text = $1) AND inv.deleted_at IS NULL
        ORDER BY inv.due_date DESC
      `;
      params = [user.id];
    }

    if (!query) return [];
    const res = await this.db.query(query, params);
    return res.rows;
  }

  // ==========================================
  // 6. PAYMENTS & RECEIPTS
  // ==========================================
  async listPayments(schoolId, filters = {}) {
    let query = `
      SELECT p.*,
             inv.invoice_number, inv.title as invoice_title, inv.total_amount as invoice_total,
             s.first_name as student_first_name, s.last_name as student_last_name,
             s.admission_number as student_admission_number,
             g.name as grade_name,
             u.first_name as received_by_first_name, u.last_name as received_by_last_name
      FROM fee_payments p
      INNER JOIN student_fee_invoices inv ON inv.id = p.invoice_id
      INNER JOIN students s ON s.id = p.student_id
      LEFT JOIN grades g ON g.id = inv.grade_id
      LEFT JOIN users u ON u.id = p.received_by
      WHERE (p.school_id = $1 OR p.school_id IS NULL) AND p.deleted_at IS NULL
    `;
    const params = [schoolId];

    if (filters.student_id) {
      params.push(filters.student_id);
      query += ` AND p.student_id = $${params.length}`;
    }
    if (filters.invoice_id) {
      params.push(filters.invoice_id);
      query += ` AND p.invoice_id = $${params.length}`;
    }
    if (filters.payment_method) {
      params.push(filters.payment_method.toUpperCase());
      query += ` AND p.payment_method = $${params.length}`;
    }
    if (filters.start_date) {
      params.push(filters.start_date);
      query += ` AND p.payment_date >= $${params.length}`;
    }
    if (filters.end_date) {
      params.push(filters.end_date);
      query += ` AND p.payment_date <= $${params.length}`;
    }
    if (filters.search) {
      params.push(`%${filters.search.toLowerCase()}%`);
      query += ` AND (
        LOWER(p.receipt_number) LIKE $${params.length} OR 
        LOWER(p.transaction_reference) LIKE $${params.length} OR
        LOWER(s.first_name) LIKE $${params.length} OR 
        LOWER(s.last_name) LIKE $${params.length} OR
        LOWER(s.admission_number) LIKE $${params.length}
      )`;
    }

    const countRes = await this.db.query(`SELECT COUNT(*) FROM (${query}) q`, params);
    const total = Number(countRes.rows[0].count);

    query += ` ORDER BY p.payment_date DESC, p.created_at DESC`;

    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const offset = (page - 1) * limit;

    params.push(limit, offset);
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const res = await this.db.query(query, params);
    return {
      data: res.rows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getPaymentById(id, schoolId) {
    const res = await this.db.query(
      `SELECT p.*,
              inv.invoice_number, inv.title as invoice_title, inv.total_amount as invoice_total,
              inv.balance_amount as invoice_balance, inv.paid_amount as invoice_total_paid,
              s.first_name as student_first_name, s.last_name as student_last_name,
              s.admission_number as student_admission_number, s.photo as student_photo,
              g.name as grade_name, sec.name as section_name,
              pnt.full_name as parent_name, pnt.phone as parent_phone,
              u.first_name as received_by_first_name, u.last_name as received_by_last_name,
              sch.name as school_name, sch.address as school_address, sch.phone as school_phone,
              sch.email as school_email
       FROM fee_payments p
       INNER JOIN student_fee_invoices inv ON inv.id = p.invoice_id
       INNER JOIN students s ON s.id = p.student_id
       LEFT JOIN grades g ON g.id = inv.grade_id
       LEFT JOIN sections sec ON sec.id = inv.section_id
       LEFT JOIN parents pnt ON pnt.id = s.parent_id
       LEFT JOIN users u ON u.id = p.received_by
       LEFT JOIN schools sch ON sch.id = p.school_id
       WHERE p.id = $1 AND (p.school_id = $2 OR p.school_id IS NULL) AND p.deleted_at IS NULL`,
      [id, schoolId]
    );
    return res.rows[0] || null;
  }

  // ==========================================
  // 7. BANK SLIPS (Offline Verification)
  // ==========================================
  async listBankSlips(schoolId, filters = {}) {
    let query = `
      SELECT bs.*,
             inv.invoice_number, inv.title as invoice_title, inv.total_amount as invoice_total,
             inv.balance_amount as invoice_balance,
             s.first_name as student_first_name, s.last_name as student_last_name,
             s.admission_number as student_admission_number,
             u.first_name as submitted_by_first_name, u.last_name as submitted_by_last_name,
             u.email as submitted_by_email,
             rev.first_name as reviewed_by_first_name, rev.last_name as reviewed_by_last_name
      FROM bank_slip_submissions bs
      INNER JOIN student_fee_invoices inv ON inv.id = bs.invoice_id
      INNER JOIN students s ON s.id = bs.student_id
      INNER JOIN users u ON u.id = bs.submitted_by
      LEFT JOIN users rev ON rev.id = bs.reviewed_by
      WHERE (bs.school_id = $1 OR bs.school_id IS NULL)
    `;
    const params = [schoolId];

    if (filters.status) {
      params.push(filters.status.toUpperCase());
      query += ` AND bs.status = $${params.length}`;
    }

    query += ` ORDER BY bs.created_at DESC`;
    const res = await this.db.query(query, params);
    return res.rows;
  }

  async getBankSlipById(id, schoolId) {
    const res = await this.db.query(
      `SELECT bs.*,
              inv.invoice_number, inv.title as invoice_title, inv.total_amount as invoice_total,
              inv.balance_amount as invoice_balance,
              s.first_name as student_first_name, s.last_name as student_last_name,
              s.admission_number as student_admission_number
       FROM bank_slip_submissions bs
       INNER JOIN student_fee_invoices inv ON inv.id = bs.invoice_id
       INNER JOIN students s ON s.id = bs.student_id
       WHERE bs.id = $1 AND (bs.school_id = $2 OR bs.school_id IS NULL)`,
      [id, schoolId]
    );
    return res.rows[0] || null;
  }

  async createBankSlipSubmission(schoolId, userId, data) {
    const res = await this.db.query(
      `INSERT INTO bank_slip_submissions 
       (school_id, student_id, invoice_id, submitted_by, bank_name, reference_number, amount, deposit_date, slip_attachment_url, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING')
       RETURNING *`,
      [
        schoolId,
        data.student_id,
        data.invoice_id,
        userId,
        data.bank_name.trim(),
        data.reference_number.trim(),
        Number(data.amount),
        data.deposit_date,
        data.slip_attachment_url,
      ]
    );
    return res.rows[0];
  }

  // ==========================================
  // 8. EXPENSES & CATEGORIES
  // ==========================================
  async listExpenseCategories(schoolId) {
    const res = await this.db.query(
      `SELECT ec.*,
              COALESCE((
                SELECT SUM(e.amount) 
                FROM expenses e 
                WHERE e.expense_category_id = ec.id 
                  AND e.deleted_at IS NULL 
                  AND e.status = 'APPROVED'
                  AND EXTRACT(MONTH FROM e.expense_date) = EXTRACT(MONTH FROM CURRENT_DATE)
                  AND EXTRACT(YEAR FROM e.expense_date) = EXTRACT(YEAR FROM CURRENT_DATE)
              ), 0) as current_month_spent
       FROM expense_categories ec
       WHERE (ec.school_id = $1 OR ec.school_id IS NULL) AND ec.deleted_at IS NULL
       ORDER BY ec.name ASC`,
      [schoolId]
    );
    return res.rows;
  }

  async createExpenseCategory(schoolId, data) {
    const res = await this.db.query(
      `INSERT INTO expense_categories (school_id, name, code, description, monthly_budget, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        schoolId,
        data.name.trim(),
        data.code.trim().toUpperCase(),
        data.description || null,
        Number(data.monthly_budget) || 0,
        data.is_active !== undefined ? data.is_active : true,
      ]
    );
    return res.rows[0];
  }

  async updateExpenseCategory(id, schoolId, data) {
    const res = await this.db.query(
      `UPDATE expense_categories 
       SET name = COALESCE($1, name),
           code = COALESCE($2, code),
           description = COALESCE($3, description),
           monthly_budget = COALESCE($4, monthly_budget),
           is_active = COALESCE($5, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND (school_id = $7 OR school_id IS NULL) AND deleted_at IS NULL
       RETURNING *`,
      [
        data.name ? data.name.trim() : null,
        data.code ? data.code.trim().toUpperCase() : null,
        data.description !== undefined ? data.description : null,
        data.monthly_budget !== undefined ? Number(data.monthly_budget) : null,
        data.is_active !== undefined ? data.is_active : null,
        id,
        schoolId,
      ]
    );
    return res.rows[0] || null;
  }

  async deleteExpenseCategory(id, schoolId) {
    const res = await this.db.query(
      `UPDATE expense_categories 
       SET deleted_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND (school_id = $2 OR school_id IS NULL) AND deleted_at IS NULL
       RETURNING id`,
      [id, schoolId]
    );
    return res.rows.length > 0;
  }

  async listExpenses(schoolId, filters = {}) {
    let query = `
      SELECT e.*,
             ec.name as category_name, ec.code as category_code,
             u.first_name as recorded_by_first_name, u.last_name as recorded_by_last_name,
             app.first_name as approved_by_first_name, app.last_name as approved_by_last_name
      FROM expenses e
      INNER JOIN expense_categories ec ON ec.id = e.expense_category_id
      LEFT JOIN users u ON u.id = e.recorded_by
      LEFT JOIN users app ON app.id = e.approved_by
      WHERE (e.school_id = $1 OR e.school_id IS NULL) AND e.deleted_at IS NULL
    `;
    const params = [schoolId];

    if (filters.expense_category_id) {
      params.push(filters.expense_category_id);
      query += ` AND e.expense_category_id = $${params.length}`;
    }
    if (filters.status) {
      params.push(filters.status.toUpperCase());
      query += ` AND e.status = $${params.length}`;
    }
    if (filters.payment_method) {
      params.push(filters.payment_method.toUpperCase());
      query += ` AND e.payment_method = $${params.length}`;
    }
    if (filters.start_date) {
      params.push(filters.start_date);
      query += ` AND e.expense_date >= $${params.length}`;
    }
    if (filters.end_date) {
      params.push(filters.end_date);
      query += ` AND e.expense_date <= $${params.length}`;
    }
    if (filters.search) {
      params.push(`%${filters.search.toLowerCase()}%`);
      query += ` AND (
        LOWER(e.voucher_number) LIKE $${params.length} OR 
        LOWER(e.title) LIKE $${params.length} OR
        LOWER(e.payee) LIKE $${params.length} OR
        LOWER(e.reference_number) LIKE $${params.length}
      )`;
    }

    const countRes = await this.db.query(`SELECT COUNT(*) FROM (${query}) q`, params);
    const total = Number(countRes.rows[0].count);

    query += ` ORDER BY e.expense_date DESC, e.created_at DESC`;

    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const offset = (page - 1) * limit;

    params.push(limit, offset);
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const res = await this.db.query(query, params);
    return {
      data: res.rows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getExpenseById(id, schoolId) {
    const res = await this.db.query(
      `SELECT e.*,
              ec.name as category_name, ec.code as category_code,
              u.first_name as recorded_by_first_name, u.last_name as recorded_by_last_name,
              app.first_name as approved_by_first_name, app.last_name as approved_by_last_name
       FROM expenses e
       INNER JOIN expense_categories ec ON ec.id = e.expense_category_id
       LEFT JOIN users u ON u.id = e.recorded_by
       LEFT JOIN users app ON app.id = e.approved_by
       WHERE e.id = $1 AND (e.school_id = $2 OR e.school_id IS NULL) AND e.deleted_at IS NULL`,
      [id, schoolId]
    );
    return res.rows[0] || null;
  }

  async createExpense(schoolId, userId, data) {
    // Generate sequential voucher number
    const countRes = await this.db.query(
      `SELECT COUNT(*) FROM expenses WHERE (school_id = $1 OR school_id IS NULL)`,
      [schoolId]
    );
    const count = Number(countRes.rows[0].count) + 1;
    const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
    const voucherNumber = `EXP-${yearMonth}-${String(count).padStart(4, '0')}`;

    const res = await this.db.query(
      `INSERT INTO expenses 
       (school_id, voucher_number, expense_category_id, title, payee, amount, expense_date, payment_method, reference_number, receipt_attachment_url, status, notes, recorded_by, approved_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        schoolId,
        voucherNumber,
        data.expense_category_id,
        data.title.trim(),
        data.payee.trim(),
        Number(data.amount),
        data.expense_date || new Date(),
        data.payment_method || 'CASH',
        data.reference_number || null,
        data.receipt_attachment_url || null,
        data.status || 'APPROVED',
        data.notes || null,
        userId,
        data.status === 'APPROVED' ? userId : null,
      ]
    );
    return res.rows[0];
  }

  async updateExpense(id, schoolId, data) {
    const res = await this.db.query(
      `UPDATE expenses 
       SET expense_category_id = COALESCE($1, expense_category_id),
           title = COALESCE($2, title),
           payee = COALESCE($3, payee),
           amount = COALESCE($4, amount),
           expense_date = COALESCE($5, expense_date),
           payment_method = COALESCE($6, payment_method),
           reference_number = COALESCE($7, reference_number),
           receipt_attachment_url = COALESCE($8, receipt_attachment_url),
           status = COALESCE($9, status),
           notes = COALESCE($10, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $11 AND (school_id = $12 OR school_id IS NULL) AND deleted_at IS NULL
       RETURNING *`,
      [
        data.expense_category_id || null,
        data.title ? data.title.trim() : null,
        data.payee ? data.payee.trim() : null,
        data.amount !== undefined ? Number(data.amount) : null,
        data.expense_date || null,
        data.payment_method || null,
        data.reference_number !== undefined ? data.reference_number : null,
        data.receipt_attachment_url !== undefined ? data.receipt_attachment_url : null,
        data.status || null,
        data.notes !== undefined ? data.notes : null,
        id,
        schoolId,
      ]
    );
    return res.rows[0] || null;
  }

  async deleteExpense(id, schoolId) {
    const res = await this.db.query(
      `UPDATE expenses 
       SET deleted_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND (school_id = $2 OR school_id IS NULL) AND deleted_at IS NULL
       RETURNING id`,
      [id, schoolId]
    );
    return res.rows.length > 0;
  }

  // ==========================================
  // 9. INCOMES & CATEGORIES
  // ==========================================
  async listIncomeCategories(schoolId) {
    const res = await this.db.query(
      `SELECT ic.*,
              COALESCE((
                SELECT SUM(inc.amount) 
                FROM incomes inc 
                WHERE inc.income_category_id = ic.id 
                  AND inc.deleted_at IS NULL
                  AND EXTRACT(MONTH FROM inc.income_date) = EXTRACT(MONTH FROM CURRENT_DATE)
                  AND EXTRACT(YEAR FROM inc.income_date) = EXTRACT(YEAR FROM CURRENT_DATE)
              ), 0) as current_month_income
       FROM income_categories ic
       WHERE (ic.school_id = $1 OR ic.school_id IS NULL) AND ic.deleted_at IS NULL
       ORDER BY ic.name ASC`,
      [schoolId]
    );
    return res.rows;
  }

  async createIncomeCategory(schoolId, data) {
    const res = await this.db.query(
      `INSERT INTO income_categories (school_id, name, code, description, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        schoolId,
        data.name.trim(),
        data.code.trim().toUpperCase(),
        data.description || null,
        data.is_active !== undefined ? data.is_active : true,
      ]
    );
    return res.rows[0];
  }

  async updateIncomeCategory(id, schoolId, data) {
    const res = await this.db.query(
      `UPDATE income_categories 
       SET name = COALESCE($1, name),
           code = COALESCE($2, code),
           description = COALESCE($3, description),
           is_active = COALESCE($4, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND (school_id = $6 OR school_id IS NULL) AND deleted_at IS NULL
       RETURNING *`,
      [
        data.name ? data.name.trim() : null,
        data.code ? data.code.trim().toUpperCase() : null,
        data.description !== undefined ? data.description : null,
        data.is_active !== undefined ? data.is_active : null,
        id,
        schoolId,
      ]
    );
    return res.rows[0] || null;
  }

  async deleteIncomeCategory(id, schoolId) {
    const res = await this.db.query(
      `UPDATE income_categories 
       SET deleted_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND (school_id = $2 OR school_id IS NULL) AND deleted_at IS NULL
       RETURNING id`,
      [id, schoolId]
    );
    return res.rows.length > 0;
  }

  async listIncomes(schoolId, filters = {}) {
    let query = `
      SELECT inc.*,
             ic.name as category_name, ic.code as category_code,
             u.first_name as recorded_by_first_name, u.last_name as recorded_by_last_name
      FROM incomes inc
      INNER JOIN income_categories ic ON ic.id = inc.income_category_id
      LEFT JOIN users u ON u.id = inc.recorded_by
      WHERE (inc.school_id = $1 OR inc.school_id IS NULL) AND inc.deleted_at IS NULL
    `;
    const params = [schoolId];

    if (filters.income_category_id) {
      params.push(filters.income_category_id);
      query += ` AND inc.income_category_id = $${params.length}`;
    }
    if (filters.payment_method) {
      params.push(filters.payment_method.toUpperCase());
      query += ` AND inc.payment_method = $${params.length}`;
    }
    if (filters.start_date) {
      params.push(filters.start_date);
      query += ` AND inc.income_date >= $${params.length}`;
    }
    if (filters.end_date) {
      params.push(filters.end_date);
      query += ` AND inc.income_date <= $${params.length}`;
    }
    if (filters.search) {
      params.push(`%${filters.search.toLowerCase()}%`);
      query += ` AND (
        LOWER(inc.receipt_number) LIKE $${params.length} OR 
        LOWER(inc.title) LIKE $${params.length} OR
        LOWER(inc.payer) LIKE $${params.length} OR
        LOWER(inc.reference_number) LIKE $${params.length}
      )`;
    }

    const countRes = await this.db.query(`SELECT COUNT(*) FROM (${query}) q`, params);
    const total = Number(countRes.rows[0].count);

    query += ` ORDER BY inc.income_date DESC, inc.created_at DESC`;

    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const offset = (page - 1) * limit;

    params.push(limit, offset);
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const res = await this.db.query(query, params);
    return {
      data: res.rows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async createIncome(schoolId, userId, data) {
    const countRes = await this.db.query(
      `SELECT COUNT(*) FROM incomes WHERE (school_id = $1 OR school_id IS NULL)`,
      [schoolId]
    );
    const count = Number(countRes.rows[0].count) + 1;
    const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
    const receiptNumber = `INC-${yearMonth}-${String(count).padStart(4, '0')}`;

    const res = await this.db.query(
      `INSERT INTO incomes 
       (school_id, receipt_number, income_category_id, title, payer, amount, income_date, payment_method, reference_number, receipt_attachment_url, notes, recorded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        schoolId,
        receiptNumber,
        data.income_category_id,
        data.title.trim(),
        data.payer.trim(),
        Number(data.amount),
        data.income_date || new Date(),
        data.payment_method || 'CASH',
        data.reference_number || null,
        data.receipt_attachment_url || null,
        data.notes || null,
        userId,
      ]
    );
    return res.rows[0];
  }

  async deleteIncome(id, schoolId) {
    const res = await this.db.query(
      `UPDATE incomes 
       SET deleted_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND (school_id = $2 OR school_id IS NULL) AND deleted_at IS NULL
       RETURNING id`,
      [id, schoolId]
    );
    return res.rows.length > 0;
  }

  // ==========================================
  // 10. SALARY STRUCTURES & PAYROLL RUNS
  // ==========================================
  async listSalaryStructures(schoolId) {
    const res = await this.db.query(
      `SELECT ss.*,
              u.first_name, u.last_name, u.email, u.phone, u.profile_image,
              r.name as role_name
       FROM salary_structures ss
       INNER JOIN users u ON u.id = ss.user_id
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE (ss.school_id = $1 OR ss.school_id IS NULL) AND ss.deleted_at IS NULL
       ORDER BY u.first_name ASC, u.last_name ASC`,
      [schoolId]
    );
    return res.rows;
  }

  async getSalaryStructureByUserId(userId, schoolId) {
    const res = await this.db.query(
      `SELECT ss.*,
              u.first_name, u.last_name, u.email, u.phone,
              r.name as role_name
       FROM salary_structures ss
       INNER JOIN users u ON u.id = ss.user_id
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE ss.user_id = $1 AND (ss.school_id = $2 OR ss.school_id IS NULL) AND ss.deleted_at IS NULL`,
      [userId, schoolId]
    );
    return res.rows[0] || null;
  }

  async deleteSalaryStructure(id, schoolId) {
    const res = await this.db.query(
      `UPDATE salary_structures
       SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND (school_id = $2 OR school_id IS NULL) AND deleted_at IS NULL
       RETURNING id`,
      [id, schoolId]
    );
    return res.rows.length > 0;
  }

  async updateSalaryStructure(id, schoolId, data) {
    const formatToDateOnly = (val) => {
      if (!val) return null;
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
        if (trimmed.includes('T')) return trimmed.split('T')[0];
        return trimmed;
      }
      if (val instanceof Date && !isNaN(val.getTime())) {
        const yyyy = val.getFullYear();
        const mm = String(val.getMonth() + 1).padStart(2, '0');
        const dd = String(val.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
      return val;
    };

    const contractStartDate = formatToDateOnly(data.contract_start_date || data.effective_from) || new Date().toISOString().split('T')[0];
    const contractEndDate = formatToDateOnly(data.contract_end_date);

    const res = await this.db.query(
      `UPDATE salary_structures
       SET base_salary = $1,
           housing_allowance = $2,
           transport_allowance = $3,
           professional_allowance = $4,
           medical_allowance = $5,
           other_allowances = $6,
           custom_earnings = $7,
           custom_deductions = $8,
           tax_rate_percentage = $9,
           pension_employee_percentage = $10,
           pension_employer_percentage = $11,
           bank_name = $12,
           bank_account_number = $13,
           bank_account_name = $14,
           effective_from = $15,
           is_active = $16,
           contract_type = $17,
           contract_start_date = $18,
           contract_end_date = $19,
           employment_type = $20,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $21
         AND (school_id = $22 OR school_id IS NULL)
         AND deleted_at IS NULL
       RETURNING *`,
      [
        Number(data.base_salary) || 0,
        Number(data.housing_allowance) || 0,
        Number(data.transport_allowance) || 0,
        Number(data.professional_allowance) || 0,
        Number(data.medical_allowance) || 0,
        Number(data.other_allowances) || 0,
        JSON.stringify(data.custom_earnings || []),
        JSON.stringify(data.custom_deductions || []),
        Number(data.tax_rate_percentage) || 0,
        data.pension_employee_percentage !== undefined ? Number(data.pension_employee_percentage) : 7.0,
        data.pension_employer_percentage !== undefined ? Number(data.pension_employer_percentage) : 11.0,
        data.bank_name || null,
        data.bank_account_number || null,
        data.bank_account_name || null,
        contractStartDate,
        data.is_active !== undefined ? data.is_active : true,
        data.contract_type || 'PERMANENT',
        contractStartDate,
        contractEndDate,
        data.employment_type || 'FULL_TIME',
        id,
        schoolId,
      ]
    );
    return res.rows[0] || null;
  }

  async upsertSalaryStructure(schoolId, data) {
    const formatToDateOnly = (val) => {
      if (!val) return null;
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
        if (trimmed.includes('T')) return trimmed.split('T')[0];
        return trimmed;
      }
      if (val instanceof Date && !isNaN(val.getTime())) {
        const yyyy = val.getFullYear();
        const mm = String(val.getMonth() + 1).padStart(2, '0');
        const dd = String(val.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
      return val;
    };

    const contractStartDate = formatToDateOnly(data.contract_start_date || data.effective_from) || new Date().toISOString().split('T')[0];
    const contractEndDate = formatToDateOnly(data.contract_end_date);

    const res = await this.db.query(
      `INSERT INTO salary_structures 
       (school_id, user_id, base_salary, housing_allowance, transport_allowance, professional_allowance, medical_allowance, other_allowances, custom_earnings, custom_deductions, tax_rate_percentage, pension_employee_percentage, pension_employer_percentage, bank_name, bank_account_number, bank_account_name, effective_from, is_active, contract_type, contract_start_date, contract_end_date, employment_type, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, CURRENT_TIMESTAMP)
       ON CONFLICT (school_id, user_id) WHERE deleted_at IS NULL DO UPDATE SET
         base_salary = EXCLUDED.base_salary,
         housing_allowance = EXCLUDED.housing_allowance,
         transport_allowance = EXCLUDED.transport_allowance,
         professional_allowance = EXCLUDED.professional_allowance,
         medical_allowance = EXCLUDED.medical_allowance,
         other_allowances = EXCLUDED.other_allowances,
         custom_earnings = EXCLUDED.custom_earnings,
         custom_deductions = EXCLUDED.custom_deductions,
         tax_rate_percentage = EXCLUDED.tax_rate_percentage,
         pension_employee_percentage = EXCLUDED.pension_employee_percentage,
         pension_employer_percentage = EXCLUDED.pension_employer_percentage,
         bank_name = EXCLUDED.bank_name,
         bank_account_number = EXCLUDED.bank_account_number,
         bank_account_name = EXCLUDED.bank_account_name,
         effective_from = EXCLUDED.effective_from,
         is_active = EXCLUDED.is_active,
         contract_type = EXCLUDED.contract_type,
         contract_start_date = EXCLUDED.contract_start_date,
         contract_end_date = EXCLUDED.contract_end_date,
         employment_type = EXCLUDED.employment_type,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        schoolId,
        data.user_id,
        Number(data.base_salary) || 0,
        Number(data.housing_allowance) || 0,
        Number(data.transport_allowance) || 0,
        Number(data.professional_allowance) || 0,
        Number(data.medical_allowance) || 0,
        Number(data.other_allowances) || 0,
        JSON.stringify(data.custom_earnings || []),
        JSON.stringify(data.custom_deductions || []),
        Number(data.tax_rate_percentage) || 0,
        data.pension_employee_percentage !== undefined ? Number(data.pension_employee_percentage) : 7.0,
        data.pension_employer_percentage !== undefined ? Number(data.pension_employer_percentage) : 11.0,
        data.bank_name || null,
        data.bank_account_number || null,
        data.bank_account_name || null,
        contractStartDate,
        data.is_active !== undefined ? data.is_active : true,
        data.contract_type || 'PERMANENT',
        contractStartDate,
        contractEndDate,
        data.employment_type || 'FULL_TIME',
      ]
    );
    return res.rows[0];
  }

  async listPayrollRuns(schoolId) {
    const res = await this.db.query(
      `SELECT pr.*,
              u.first_name as processed_by_first_name, u.last_name as processed_by_last_name,
              app.first_name as approved_by_first_name, app.last_name as approved_by_last_name
       FROM payroll_runs pr
       INNER JOIN users u ON u.id = pr.processed_by
       LEFT JOIN users app ON app.id = pr.approved_by
       WHERE (pr.school_id = $1 OR pr.school_id IS NULL) AND pr.deleted_at IS NULL
       ORDER BY pr.year DESC, pr.month DESC`,
      [schoolId]
    );
    return res.rows;
  }

  async getPayrollRunById(id, schoolId) {
    const runRes = await this.db.query(
      `SELECT pr.*,
              u.first_name as processed_by_first_name, u.last_name as processed_by_last_name,
              app.first_name as approved_by_first_name, app.last_name as approved_by_last_name
       FROM payroll_runs pr
       INNER JOIN users u ON u.id = pr.processed_by
       LEFT JOIN users app ON app.id = pr.approved_by
       WHERE pr.id = $1 AND (pr.school_id = $2 OR pr.school_id IS NULL) AND pr.deleted_at IS NULL`,
      [id, schoolId]
    );

    if (runRes.rows.length === 0) return null;
    const run = runRes.rows[0];

    // Fetch individual payslips
    const payslipsRes = await this.db.query(
      `SELECT ps.*,
              u.first_name, u.last_name, u.email, u.phone,
              r.name as role_name
       FROM payslips ps
       INNER JOIN users u ON u.id = ps.user_id
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE ps.payroll_run_id = $1
       ORDER BY u.first_name ASC, u.last_name ASC`,
      [id]
    );
    run.payslips = payslipsRes.rows;

    return run;
  }

  async getPayslipById(id, schoolId) {
    const res = await this.db.query(
      `SELECT ps.*,
              pr.month, pr.year, pr.batch_reference,
              u.first_name, u.last_name, u.email, u.phone, u.profile_image,
              r.name as role_name,
              sch.name as school_name, sch.address as school_address, sch.phone as school_phone,
              sch.email as school_email, sch.logo as school_logo
       FROM payslips ps
       INNER JOIN payroll_runs pr ON pr.id = ps.payroll_run_id
       INNER JOIN users u ON u.id = ps.user_id
       LEFT JOIN roles r ON r.id = u.role_id
       LEFT JOIN schools sch ON sch.id = ps.school_id
       WHERE ps.id = $1 AND (ps.school_id = $2 OR ps.school_id IS NULL)`,
      [id, schoolId]
    );
    if (res.rows.length === 0) return null;
    const payslip = res.rows[0];

    const itemsRes = await this.db.query(
      `SELECT * FROM payslip_items WHERE payslip_id = $1 ORDER BY item_type ASC, name ASC`,
      [id]
    );
    payslip.items = itemsRes.rows;
    return payslip;
  }

  async getMyPayslips(userId) {
    const res = await this.db.query(
      `SELECT ps.*,
              pr.month, pr.year, pr.batch_reference
       FROM payslips ps
       INNER JOIN payroll_runs pr ON pr.id = ps.payroll_run_id
       WHERE ps.user_id = $1
       ORDER BY pr.year DESC, pr.month DESC`,
      [userId]
    );
    return res.rows;
  }

  // ==========================================
  // 11. FINANCIAL REPORTS & KPIS
  // ==========================================
  async getOverviewKPIs(schoolId) {
    // 1. Fee Invoices Summary
    const invoiceSummaryRes = await this.db.query(
      `SELECT 
         COALESCE(SUM(total_amount), 0) as total_invoiced,
         COALESCE(SUM(paid_amount), 0) as total_collected,
         COALESCE(SUM(balance_amount), 0) as total_outstanding,
         COUNT(*) as total_invoices,
         COUNT(CASE WHEN status = 'PAID' THEN 1 END) as paid_invoices_count,
         COUNT(CASE WHEN status = 'PARTIALLY_PAID' THEN 1 END) as partial_invoices_count,
         COUNT(CASE WHEN status = 'UNPAID' THEN 1 END) as unpaid_invoices_count,
         COUNT(CASE WHEN due_date < CURRENT_DATE AND status NOT IN ('PAID', 'CANCELLED') THEN 1 END) as overdue_invoices_count
       FROM student_fee_invoices
       WHERE (school_id = $1 OR school_id IS NULL) AND deleted_at IS NULL`,
      [schoolId]
    );

    // 2. Total Direct Incomes
    const incomeRes = await this.db.query(
      `SELECT COALESCE(SUM(amount), 0) as total_other_income
       FROM incomes
       WHERE (school_id = $1 OR school_id IS NULL) AND deleted_at IS NULL`,
      [schoolId]
    );

    // 3. Total Expenses
    const expenseRes = await this.db.query(
      `SELECT COALESCE(SUM(amount), 0) as total_expenses
       FROM expenses
       WHERE (school_id = $1 OR school_id IS NULL) AND deleted_at IS NULL AND status = 'APPROVED'`,
      [schoolId]
    );

    // 4. Total Payroll Disbursed
    const payrollRes = await this.db.query(
      `SELECT COALESCE(SUM(total_net_amount), 0) as total_payroll
       FROM payroll_runs
       WHERE (school_id = $1 OR school_id IS NULL) AND deleted_at IS NULL
         AND status IN ('PAID', 'DONE', 'DISBURSED')`,
      [schoolId]
    );

    // 5. Pending Bank Slips Count
    const slipRes = await this.db.query(
      `SELECT COUNT(*) as pending_slips_count
       FROM bank_slip_submissions
       WHERE (school_id = $1 OR school_id IS NULL) AND status = 'PENDING'`,
      [schoolId]
    );

    const inv = invoiceSummaryRes.rows[0];
    const totalCollected = Number(inv.total_collected);
    const totalInvoiced = Number(inv.total_invoiced);
    const collectionEfficiency = totalInvoiced > 0 ? ((totalCollected / totalInvoiced) * 100).toFixed(1) : '100.0';

    const totalOtherIncome = Number(incomeRes.rows[0].total_other_income);
    const totalExpenses = Number(expenseRes.rows[0].total_expenses);
    const totalPayroll = Number(payrollRes.rows[0].total_payroll);
    const totalOutflow = totalExpenses + totalPayroll;
    const netCashFlow = (totalCollected + totalOtherIncome) - totalOutflow;

    return {
      totalInvoiced,
      totalCollected,
      totalOutstanding: Number(inv.total_outstanding),
      collectionEfficiency: Number(collectionEfficiency),
      totalInvoicesCount: Number(inv.total_invoices),
      paidInvoicesCount: Number(inv.paid_invoices_count),
      partialInvoicesCount: Number(inv.partial_invoices_count),
      unpaidInvoicesCount: Number(inv.unpaid_invoices_count),
      overdueInvoicesCount: Number(inv.overdue_invoices_count),
      totalOtherIncome,
      totalExpenses,
      totalPayroll,
      totalOutflow,
      netCashFlow,
      pendingBankSlipsCount: Number(slipRes.rows[0].pending_slips_count),
    };
  }

  async getDefaultersReport(schoolId, filters = {}) {
    let query = `
      SELECT inv.id as invoice_id, inv.invoice_number, inv.title as invoice_title,
             inv.due_date, inv.total_amount, inv.paid_amount, inv.balance_amount,
             (CURRENT_DATE - inv.due_date) as days_overdue,
             s.id as student_id, s.first_name as student_first_name, s.last_name as student_last_name,
             s.admission_number,
             g.name as grade_name, sec.name as section_name,
             p.full_name as parent_name, p.phone as parent_phone, p.email as parent_email
      FROM student_fee_invoices inv
      INNER JOIN students s ON s.id = inv.student_id
      LEFT JOIN grades g ON g.id = inv.grade_id
      LEFT JOIN sections sec ON sec.id = inv.section_id
      LEFT JOIN parents p ON p.id = s.parent_id
      WHERE (inv.school_id = $1 OR inv.school_id IS NULL)
        AND inv.deleted_at IS NULL
        AND inv.balance_amount > 0
        AND inv.status NOT IN ('CANCELLED', 'REFUNDED')
    `;
    const params = [schoolId];

    if (filters.grade_id) {
      params.push(filters.grade_id);
      query += ` AND inv.grade_id = $${params.length}`;
    }
    if (filters.only_overdue === 'true' || filters.only_overdue === true) {
      query += ` AND inv.due_date < CURRENT_DATE`;
    }

    query += ` ORDER BY inv.due_date ASC, inv.balance_amount DESC`;
    const res = await this.db.query(query, params);
    return res.rows;
  }

  async getIncomeVsExpenseReport(schoolId, year) {
    const targetYear = Number(year) || new Date().getFullYear();

    const monthlyRes = await this.db.query(
      `
      WITH months AS (
        SELECT generate_series(1, 12) AS month
      ),
      fee_coll AS (
        SELECT EXTRACT(MONTH FROM payment_date)::int as month, SUM(amount) as fee_amount
        FROM fee_payments
        WHERE (school_id = $1 OR school_id IS NULL) 
          AND deleted_at IS NULL 
          AND EXTRACT(YEAR FROM payment_date) = $2
        GROUP BY EXTRACT(MONTH FROM payment_date)
      ),
      other_inc AS (
        SELECT EXTRACT(MONTH FROM income_date)::int as month, SUM(amount) as other_inc_amount
        FROM incomes
        WHERE (school_id = $1 OR school_id IS NULL) 
          AND deleted_at IS NULL 
          AND EXTRACT(YEAR FROM income_date) = $2
        GROUP BY EXTRACT(MONTH FROM income_date)
      ),
      exp AS (
        SELECT EXTRACT(MONTH FROM expense_date)::int as month, SUM(amount) as exp_amount
        FROM expenses
        WHERE (school_id = $1 OR school_id IS NULL) 
          AND deleted_at IS NULL 
          AND status = 'APPROVED'
          AND EXTRACT(YEAR FROM expense_date) = $2
        GROUP BY EXTRACT(MONTH FROM expense_date)
      ),
      pay AS (
        SELECT pr.month, SUM(pr.total_net_amount) as payroll_amount
        FROM payroll_runs pr
        WHERE (pr.school_id = $1 OR pr.school_id IS NULL) 
          AND pr.deleted_at IS NULL 
          AND pr.year = $2 
          AND pr.status IN ('PAID', 'DONE', 'DISBURSED')
        GROUP BY pr.month
      )
      SELECT 
        m.month,
        COALESCE(fc.fee_amount, 0) as fee_collections,
        COALESCE(oi.other_inc_amount, 0) as direct_incomes,
        (COALESCE(fc.fee_amount, 0) + COALESCE(oi.other_inc_amount, 0)) as total_income,
        COALESCE(e.exp_amount, 0) as operational_expenses,
        COALESCE(p.payroll_amount, 0) as payroll_expenses,
        (COALESCE(e.exp_amount, 0) + COALESCE(p.payroll_amount, 0)) as total_expense,
        ((COALESCE(fc.fee_amount, 0) + COALESCE(oi.other_inc_amount, 0)) - (COALESCE(e.exp_amount, 0) + COALESCE(p.payroll_amount, 0))) as net_profit_loss
      FROM months m
      LEFT JOIN fee_coll fc ON fc.month = m.month
      LEFT JOIN other_inc oi ON oi.month = m.month
      LEFT JOIN exp e ON e.month = m.month
      LEFT JOIN pay p ON p.month = m.month
      ORDER BY m.month ASC
      `,
      [schoolId, targetYear]
    );

    return {
      year: targetYear,
      monthlyBreakdown: monthlyRes.rows,
    };
  }

  async getCashierShiftReport(schoolId, date) {
    const targetDate = date || new Date().toISOString().slice(0, 10);

    const res = await this.db.query(
      `SELECT 
         p.payment_method,
         COUNT(*) as transaction_count,
         SUM(p.amount) as total_collected
       FROM fee_payments p
       WHERE (p.school_id = $1 OR p.school_id IS NULL)
         AND p.deleted_at IS NULL
         AND p.payment_date = $2
       GROUP BY p.payment_method
       ORDER BY total_collected DESC`,
      [schoolId, targetDate]
    );

    const totalCollected = res.rows.reduce((sum, r) => sum + Number(r.total_collected), 0);
    const totalTransactions = res.rows.reduce((sum, r) => sum + Number(r.transaction_count), 0);

    return {
      date: targetDate,
      totalCollected,
      totalTransactions,
      methodsBreakdown: res.rows,
    };
  }
}

module.exports = FinanceRepository;
