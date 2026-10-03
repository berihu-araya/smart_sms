/**
 * Migration: Create Finance Module Tables
 *
 * Creates:
 * 1. Seed 'Accountant' role in roles table
 * 2. finance_settings (Currency, prefixes, receipt options)
 * 3. fee_categories (Tuition, Transport, Lab, Registration, Hostel)
 * 4. fee_structures (Fee Master by Grade, Year, Frequency, Late fines)
 * 5. fee_discounts (Scholarships, Sibling, Staff-child waivers)
 * 6. student_fee_invoices (Student bill header)
 * 7. student_fee_invoice_items (Itemized invoice lines)
 * 8. fee_payments (Cashier payment records with receipt numbers)
 * 9. bank_slip_submissions (Parent slip uploads for verification)
 * 10. expense_categories (Chart of accounts with monthly budgets)
 * 11. expenses (Operational vouchers and receipt attachments)
 * 12. income_categories (Non-tuition revenue sources)
 * 13. incomes (Direct revenue transactions)
 * 14. salary_structures (Staff base salary, allowances, and tax/pension setup)
 * 15. payroll_runs (Monthly batch payroll headers)
 * 16. payslips (Individual staff payslips)
 * 17. payslip_items (Itemized payslip breakdown)
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
const shorthands = undefined;

const up = async (pgm) => {
  // 1. Seed 'Accountant' role if not exists
  await pgm.sql(`
    INSERT INTO roles (id, name, description, created_at, updated_at)
    SELECT gen_random_uuid(), 'Accountant', 'Finance officer responsible for student fee collection, expense tracking, payroll processing, and financial accounting', current_timestamp, current_timestamp
    WHERE NOT EXISTS (SELECT 1 FROM roles WHERE LOWER(name) = 'accountant');
  `);

  // 2. finance_settings
  pgm.createTable('finance_settings', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    school_id: {
      type: 'uuid',
      references: 'schools(id)',
      onDelete: 'cascade',
    },
    currency_symbol: {
      type: 'varchar(10)',
      notNull: true,
      default: 'ETB',
    },
    currency_code: {
      type: 'varchar(10)',
      notNull: true,
      default: 'ETB',
    },
    receipt_prefix: {
      type: 'varchar(10)',
      notNull: true,
      default: 'REC',
    },
    invoice_prefix: {
      type: 'varchar(10)',
      notNull: true,
      default: 'INV',
    },
    voucher_prefix: {
      type: 'varchar(10)',
      notNull: true,
      default: 'EXP',
    },
    payslip_prefix: {
      type: 'varchar(10)',
      notNull: true,
      default: 'PAY',
    },
    enable_bank_slip_verification: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    tax_identification_number: {
      type: 'varchar(50)',
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.createIndex('finance_settings', 'school_id', {
    name: 'finance_settings_school_idx',
    unique: true,
  });

  // 3. fee_categories
  pgm.createTable('fee_categories', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    school_id: {
      type: 'uuid',
      references: 'schools(id)',
      onDelete: 'restrict',
    },
    name: {
      type: 'varchar(100)',
      notNull: true,
    },
    code: {
      type: 'varchar(30)',
      notNull: true,
    },
    description: {
      type: 'text',
    },
    is_refundable: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    deleted_at: {
      type: 'timestamp with time zone',
    },
  });

  pgm.createIndex('fee_categories', ['school_id', 'code'], {
    name: 'fee_categories_school_code_idx',
    unique: true,
    where: 'deleted_at IS NULL',
  });

  // 4. fee_structures (Fee Master)
  pgm.createTable('fee_structures', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    school_id: {
      type: 'uuid',
      references: 'schools(id)',
      onDelete: 'restrict',
    },
    academic_year_id: {
      type: 'uuid',
      references: 'academic_years(id)',
      onDelete: 'restrict',
    },
    grade_id: {
      type: 'uuid',
      references: 'grades(id)',
      onDelete: 'restrict',
    },
    fee_category_id: {
      type: 'uuid',
      notNull: true,
      references: 'fee_categories(id)',
      onDelete: 'restrict',
    },
    name: {
      type: 'varchar(150)',
      notNull: true,
    },
    amount: {
      type: 'numeric(12, 2)',
      notNull: true,
      default: 0.00,
    },
    frequency: {
      type: 'varchar(30)',
      notNull: true,
      default: 'MONTHLY',
    },
    due_day_of_month: {
      type: 'integer',
      default: 10,
    },
    due_date: {
      type: 'date',
    },
    late_fine_type: {
      type: 'varchar(20)',
      notNull: true,
      default: 'NONE',
    },
    late_fine_amount: {
      type: 'numeric(10, 2)',
      notNull: true,
      default: 0.00,
    },
    grace_period_days: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    deleted_at: {
      type: 'timestamp with time zone',
    },
  });

  pgm.createIndex('fee_structures', ['school_id', 'academic_year_id', 'grade_id'], {
    name: 'fee_structures_school_year_grade_idx',
    where: 'deleted_at IS NULL',
  });

  // 5. fee_discounts (Scholarships / Waivers)
  pgm.createTable('fee_discounts', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    school_id: {
      type: 'uuid',
      references: 'schools(id)',
      onDelete: 'restrict',
    },
    name: {
      type: 'varchar(100)',
      notNull: true,
    },
    code: {
      type: 'varchar(30)',
      notNull: true,
    },
    discount_type: {
      type: 'varchar(20)',
      notNull: true,
      default: 'PERCENTAGE',
    },
    value: {
      type: 'numeric(10, 2)',
      notNull: true,
      default: 0.00,
    },
    description: {
      type: 'text',
    },
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    deleted_at: {
      type: 'timestamp with time zone',
    },
  });

  pgm.createIndex('fee_discounts', ['school_id', 'code'], {
    name: 'fee_discounts_school_code_idx',
    unique: true,
    where: 'deleted_at IS NULL',
  });

  // 6. student_fee_invoices
  pgm.createTable('student_fee_invoices', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    school_id: {
      type: 'uuid',
      references: 'schools(id)',
      onDelete: 'restrict',
    },
    invoice_number: {
      type: 'varchar(50)',
      notNull: true,
    },
    student_id: {
      type: 'uuid',
      notNull: true,
      references: 'students(id)',
      onDelete: 'restrict',
    },
    academic_year_id: {
      type: 'uuid',
      references: 'academic_years(id)',
      onDelete: 'restrict',
    },
    grade_id: {
      type: 'uuid',
      references: 'grades(id)',
      onDelete: 'restrict',
    },
    section_id: {
      type: 'uuid',
      references: 'sections(id)',
      onDelete: 'set null',
    },
    title: {
      type: 'varchar(150)',
      notNull: true,
    },
    month: {
      type: 'integer',
    },
    term_name: {
      type: 'varchar(50)',
    },
    issue_date: {
      type: 'date',
      notNull: true,
      default: pgm.func('current_date'),
    },
    due_date: {
      type: 'date',
      notNull: true,
    },
    subtotal_amount: {
      type: 'numeric(12, 2)',
      notNull: true,
      default: 0.00,
    },
    discount_amount: {
      type: 'numeric(12, 2)',
      notNull: true,
      default: 0.00,
    },
    fine_amount: {
      type: 'numeric(12, 2)',
      notNull: true,
      default: 0.00,
    },
    total_amount: {
      type: 'numeric(12, 2)',
      notNull: true,
      default: 0.00,
    },
    paid_amount: {
      type: 'numeric(12, 2)',
      notNull: true,
      default: 0.00,
    },
    balance_amount: {
      type: 'numeric(12, 2)',
      notNull: true,
      default: 0.00,
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'UNPAID',
    },
    notes: {
      type: 'text',
    },
    created_by: {
      type: 'uuid',
      references: 'users(id)',
      onDelete: 'set null',
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    deleted_at: {
      type: 'timestamp with time zone',
    },
  });

  pgm.createIndex('student_fee_invoices', ['school_id', 'invoice_number'], {
    name: 'student_fee_invoices_school_num_idx',
    unique: true,
    where: 'deleted_at IS NULL',
  });
  pgm.createIndex('student_fee_invoices', ['school_id', 'student_id', 'status'], {
    name: 'student_fee_invoices_student_status_idx',
    where: 'deleted_at IS NULL',
  });
  pgm.createIndex('student_fee_invoices', ['school_id', 'due_date', 'status'], {
    name: 'student_fee_invoices_due_date_idx',
    where: 'deleted_at IS NULL',
  });

  // 7. student_fee_invoice_items
  pgm.createTable('student_fee_invoice_items', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    invoice_id: {
      type: 'uuid',
      notNull: true,
      references: 'student_fee_invoices(id)',
      onDelete: 'cascade',
    },
    fee_structure_id: {
      type: 'uuid',
      references: 'fee_structures(id)',
      onDelete: 'set null',
    },
    fee_category_id: {
      type: 'uuid',
      notNull: true,
      references: 'fee_categories(id)',
      onDelete: 'restrict',
    },
    fee_discount_id: {
      type: 'uuid',
      references: 'fee_discounts(id)',
      onDelete: 'set null',
    },
    description: {
      type: 'varchar(200)',
      notNull: true,
    },
    base_amount: {
      type: 'numeric(12, 2)',
      notNull: true,
      default: 0.00,
    },
    discount_amount: {
      type: 'numeric(12, 2)',
      notNull: true,
      default: 0.00,
    },
    final_amount: {
      type: 'numeric(12, 2)',
      notNull: true,
      default: 0.00,
    },
    paid_amount: {
      type: 'numeric(12, 2)',
      notNull: true,
      default: 0.00,
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.createIndex('student_fee_invoice_items', 'invoice_id', {
    name: 'student_fee_invoice_items_inv_idx',
  });

  // 8. fee_payments
  pgm.createTable('fee_payments', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    school_id: {
      type: 'uuid',
      references: 'schools(id)',
      onDelete: 'restrict',
    },
    receipt_number: {
      type: 'varchar(50)',
      notNull: true,
    },
    invoice_id: {
      type: 'uuid',
      notNull: true,
      references: 'student_fee_invoices(id)',
      onDelete: 'restrict',
    },
    student_id: {
      type: 'uuid',
      notNull: true,
      references: 'students(id)',
      onDelete: 'restrict',
    },
    amount: {
      type: 'numeric(12, 2)',
      notNull: true,
    },
    payment_method: {
      type: 'varchar(30)',
      notNull: true,
      default: 'CASH',
    },
    payment_date: {
      type: 'date',
      notNull: true,
      default: pgm.func('current_date'),
    },
    transaction_reference: {
      type: 'varchar(100)',
    },
    bank_name: {
      type: 'varchar(100)',
    },
    slip_image_url: {
      type: 'text',
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'COMPLETED',
    },
    verified_by: {
      type: 'uuid',
      references: 'users(id)',
      onDelete: 'set null',
    },
    verified_at: {
      type: 'timestamp with time zone',
    },
    remarks: {
      type: 'text',
    },
    received_by: {
      type: 'uuid',
      references: 'users(id)',
      onDelete: 'restrict',
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    deleted_at: {
      type: 'timestamp with time zone',
    },
  });

  pgm.createIndex('fee_payments', ['school_id', 'receipt_number'], {
    name: 'fee_payments_school_receipt_idx',
    unique: true,
    where: 'deleted_at IS NULL',
  });
  pgm.createIndex('fee_payments', ['school_id', 'invoice_id'], {
    name: 'fee_payments_invoice_idx',
    where: 'deleted_at IS NULL',
  });
  pgm.createIndex('fee_payments', ['school_id', 'student_id'], {
    name: 'fee_payments_student_idx',
    where: 'deleted_at IS NULL',
  });
  pgm.createIndex('fee_payments', ['school_id', 'payment_date'], {
    name: 'fee_payments_date_idx',
  });

  // 9. bank_slip_submissions
  pgm.createTable('bank_slip_submissions', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    school_id: {
      type: 'uuid',
      references: 'schools(id)',
      onDelete: 'restrict',
    },
    student_id: {
      type: 'uuid',
      notNull: true,
      references: 'students(id)',
      onDelete: 'restrict',
    },
    invoice_id: {
      type: 'uuid',
      notNull: true,
      references: 'student_fee_invoices(id)',
      onDelete: 'restrict',
    },
    submitted_by: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'restrict',
    },
    bank_name: {
      type: 'varchar(100)',
      notNull: true,
    },
    reference_number: {
      type: 'varchar(100)',
      notNull: true,
    },
    amount: {
      type: 'numeric(12, 2)',
      notNull: true,
    },
    deposit_date: {
      type: 'date',
      notNull: true,
    },
    slip_attachment_url: {
      type: 'text',
      notNull: true,
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'PENDING',
    },
    rejection_reason: {
      type: 'text',
    },
    reviewed_by: {
      type: 'uuid',
      references: 'users(id)',
      onDelete: 'set null',
    },
    reviewed_at: {
      type: 'timestamp with time zone',
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.createIndex('bank_slip_submissions', ['school_id', 'status'], {
    name: 'bank_slip_submissions_status_idx',
  });

  // 10. expense_categories
  pgm.createTable('expense_categories', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    school_id: {
      type: 'uuid',
      references: 'schools(id)',
      onDelete: 'restrict',
    },
    name: {
      type: 'varchar(100)',
      notNull: true,
    },
    code: {
      type: 'varchar(30)',
      notNull: true,
    },
    description: {
      type: 'text',
    },
    monthly_budget: {
      type: 'numeric(12, 2)',
      default: 0.00,
    },
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    deleted_at: {
      type: 'timestamp with time zone',
    },
  });

  pgm.createIndex('expense_categories', ['school_id', 'code'], {
    name: 'expense_categories_school_code_idx',
    unique: true,
    where: 'deleted_at IS NULL',
  });

  // 11. expenses
  pgm.createTable('expenses', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    school_id: {
      type: 'uuid',
      references: 'schools(id)',
      onDelete: 'restrict',
    },
    voucher_number: {
      type: 'varchar(50)',
      notNull: true,
    },
    expense_category_id: {
      type: 'uuid',
      notNull: true,
      references: 'expense_categories(id)',
      onDelete: 'restrict',
    },
    title: {
      type: 'varchar(150)',
      notNull: true,
    },
    payee: {
      type: 'varchar(150)',
      notNull: true,
    },
    amount: {
      type: 'numeric(12, 2)',
      notNull: true,
    },
    expense_date: {
      type: 'date',
      notNull: true,
      default: pgm.func('current_date'),
    },
    payment_method: {
      type: 'varchar(30)',
      notNull: true,
      default: 'CASH',
    },
    reference_number: {
      type: 'varchar(100)',
    },
    receipt_attachment_url: {
      type: 'text',
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'APPROVED',
    },
    notes: {
      type: 'text',
    },
    recorded_by: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'restrict',
    },
    approved_by: {
      type: 'uuid',
      references: 'users(id)',
      onDelete: 'set null',
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    deleted_at: {
      type: 'timestamp with time zone',
    },
  });

  pgm.createIndex('expenses', ['school_id', 'voucher_number'], {
    name: 'expenses_school_voucher_idx',
    unique: true,
    where: 'deleted_at IS NULL',
  });
  pgm.createIndex('expenses', ['school_id', 'expense_category_id', 'expense_date'], {
    name: 'expenses_category_date_idx',
    where: 'deleted_at IS NULL',
  });

  // 12. income_categories
  pgm.createTable('income_categories', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    school_id: {
      type: 'uuid',
      references: 'schools(id)',
      onDelete: 'restrict',
    },
    name: {
      type: 'varchar(100)',
      notNull: true,
    },
    code: {
      type: 'varchar(30)',
      notNull: true,
    },
    description: {
      type: 'text',
    },
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    deleted_at: {
      type: 'timestamp with time zone',
    },
  });

  pgm.createIndex('income_categories', ['school_id', 'code'], {
    name: 'income_categories_school_code_idx',
    unique: true,
    where: 'deleted_at IS NULL',
  });

  // 13. incomes
  pgm.createTable('incomes', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    school_id: {
      type: 'uuid',
      references: 'schools(id)',
      onDelete: 'restrict',
    },
    receipt_number: {
      type: 'varchar(50)',
      notNull: true,
    },
    income_category_id: {
      type: 'uuid',
      notNull: true,
      references: 'income_categories(id)',
      onDelete: 'restrict',
    },
    title: {
      type: 'varchar(150)',
      notNull: true,
    },
    payer: {
      type: 'varchar(150)',
      notNull: true,
    },
    amount: {
      type: 'numeric(12, 2)',
      notNull: true,
    },
    income_date: {
      type: 'date',
      notNull: true,
      default: pgm.func('current_date'),
    },
    payment_method: {
      type: 'varchar(30)',
      notNull: true,
      default: 'CASH',
    },
    reference_number: {
      type: 'varchar(100)',
    },
    receipt_attachment_url: {
      type: 'text',
    },
    notes: {
      type: 'text',
    },
    recorded_by: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'restrict',
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    deleted_at: {
      type: 'timestamp with time zone',
    },
  });

  pgm.createIndex('incomes', ['school_id', 'receipt_number'], {
    name: 'incomes_school_receipt_idx',
    unique: true,
    where: 'deleted_at IS NULL',
  });
  pgm.createIndex('incomes', ['school_id', 'income_category_id', 'income_date'], {
    name: 'incomes_category_date_idx',
    where: 'deleted_at IS NULL',
  });

  // 14. salary_structures
  pgm.createTable('salary_structures', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    school_id: {
      type: 'uuid',
      references: 'schools(id)',
      onDelete: 'restrict',
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'restrict',
    },
    base_salary: {
      type: 'numeric(12, 2)',
      notNull: true,
      default: 0.00,
    },
    housing_allowance: {
      type: 'numeric(10, 2)',
      notNull: true,
      default: 0.00,
    },
    transport_allowance: {
      type: 'numeric(10, 2)',
      notNull: true,
      default: 0.00,
    },
    medical_allowance: {
      type: 'numeric(10, 2)',
      notNull: true,
      default: 0.00,
    },
    other_allowances: {
      type: 'numeric(10, 2)',
      notNull: true,
      default: 0.00,
    },
    tax_rate_percentage: {
      type: 'numeric(5, 2)',
      notNull: true,
      default: 0.00,
    },
    pension_employee_percentage: {
      type: 'numeric(5, 2)',
      notNull: true,
      default: 7.00,
    },
    pension_employer_percentage: {
      type: 'numeric(5, 2)',
      notNull: true,
      default: 11.00,
    },
    bank_name: {
      type: 'varchar(100)',
    },
    bank_account_number: {
      type: 'varchar(50)',
    },
    bank_account_name: {
      type: 'varchar(150)',
    },
    effective_from: {
      type: 'date',
      notNull: true,
      default: pgm.func('current_date'),
    },
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    deleted_at: {
      type: 'timestamp with time zone',
    },
  });

  pgm.createIndex('salary_structures', ['school_id', 'user_id'], {
    name: 'salary_structures_user_idx',
    unique: true,
    where: 'deleted_at IS NULL',
  });

  // 15. payroll_runs
  pgm.createTable('payroll_runs', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    school_id: {
      type: 'uuid',
      references: 'schools(id)',
      onDelete: 'restrict',
    },
    batch_reference: {
      type: 'varchar(50)',
      notNull: true,
    },
    month: {
      type: 'integer',
      notNull: true,
    },
    year: {
      type: 'integer',
      notNull: true,
    },
    total_staff_count: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    total_gross_amount: {
      type: 'numeric(14, 2)',
      notNull: true,
      default: 0.00,
    },
    total_deductions_amount: {
      type: 'numeric(14, 2)',
      notNull: true,
      default: 0.00,
    },
    total_net_amount: {
      type: 'numeric(14, 2)',
      notNull: true,
      default: 0.00,
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'DRAFT',
    },
    processed_by: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'restrict',
    },
    approved_by: {
      type: 'uuid',
      references: 'users(id)',
      onDelete: 'set null',
    },
    disbursed_at: {
      type: 'timestamp with time zone',
    },
    remarks: {
      type: 'text',
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    deleted_at: {
      type: 'timestamp with time zone',
    },
  });

  pgm.createIndex('payroll_runs', ['school_id', 'year', 'month'], {
    name: 'payroll_runs_school_month_year_idx',
    unique: true,
    where: 'deleted_at IS NULL',
  });

  // 16. payslips
  pgm.createTable('payslips', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    payroll_run_id: {
      type: 'uuid',
      notNull: true,
      references: 'payroll_runs(id)',
      onDelete: 'cascade',
    },
    school_id: {
      type: 'uuid',
      references: 'schools(id)',
      onDelete: 'restrict',
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'restrict',
    },
    payslip_number: {
      type: 'varchar(50)',
      notNull: true,
    },
    base_salary: {
      type: 'numeric(12, 2)',
      notNull: true,
      default: 0.00,
    },
    total_allowances: {
      type: 'numeric(12, 2)',
      notNull: true,
      default: 0.00,
    },
    gross_salary: {
      type: 'numeric(12, 2)',
      notNull: true,
      default: 0.00,
    },
    tax_deduction: {
      type: 'numeric(12, 2)',
      notNull: true,
      default: 0.00,
    },
    pension_employee_deduction: {
      type: 'numeric(12, 2)',
      notNull: true,
      default: 0.00,
    },
    pension_employer_contribution: {
      type: 'numeric(12, 2)',
      notNull: true,
      default: 0.00,
    },
    other_deductions: {
      type: 'numeric(12, 2)',
      notNull: true,
      default: 0.00,
    },
    total_deductions: {
      type: 'numeric(12, 2)',
      notNull: true,
      default: 0.00,
    },
    net_salary: {
      type: 'numeric(12, 2)',
      notNull: true,
      default: 0.00,
    },
    payment_method: {
      type: 'varchar(30)',
      notNull: true,
      default: 'BANK_TRANSFER',
    },
    bank_account_number: {
      type: 'varchar(50)',
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'GENERATED',
    },
    payment_date: {
      type: 'date',
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.createIndex('payslips', ['school_id', 'user_id', 'created_at'], {
    name: 'payslips_user_idx',
  });
  pgm.createIndex('payslips', 'payroll_run_id', {
    name: 'payslips_run_idx',
  });

  // 17. payslip_items
  pgm.createTable('payslip_items', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    payslip_id: {
      type: 'uuid',
      notNull: true,
      references: 'payslips(id)',
      onDelete: 'cascade',
    },
    item_type: {
      type: 'varchar(20)',
      notNull: true,
    },
    name: {
      type: 'varchar(100)',
      notNull: true,
    },
    amount: {
      type: 'numeric(12, 2)',
      notNull: true,
      default: 0.00,
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.createIndex('payslip_items', 'payslip_id', {
    name: 'payslip_items_payslip_idx',
  });
};

const down = async (pgm) => {
  pgm.dropTable('payslip_items', { ifExists: true, cascade: true });
  pgm.dropTable('payslips', { ifExists: true, cascade: true });
  pgm.dropTable('payroll_runs', { ifExists: true, cascade: true });
  pgm.dropTable('salary_structures', { ifExists: true, cascade: true });
  pgm.dropTable('incomes', { ifExists: true, cascade: true });
  pgm.dropTable('income_categories', { ifExists: true, cascade: true });
  pgm.dropTable('expenses', { ifExists: true, cascade: true });
  pgm.dropTable('expense_categories', { ifExists: true, cascade: true });
  pgm.dropTable('bank_slip_submissions', { ifExists: true, cascade: true });
  pgm.dropTable('fee_payments', { ifExists: true, cascade: true });
  pgm.dropTable('student_fee_invoice_items', { ifExists: true, cascade: true });
  pgm.dropTable('student_fee_invoices', { ifExists: true, cascade: true });
  pgm.dropTable('fee_discounts', { ifExists: true, cascade: true });
  pgm.dropTable('fee_structures', { ifExists: true, cascade: true });
  pgm.dropTable('fee_categories', { ifExists: true, cascade: true });
  pgm.dropTable('finance_settings', { ifExists: true, cascade: true });
};

module.exports = {
  shorthands,
  up,
  down,
};
