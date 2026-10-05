/**
 * Migration: Create Comprehensive Library Module Tables
 *
 * Creates:
 * 1. Seed 'Librarian' role in roles table
 * 2. library_settings (configurable library policies per school/tenant)
 * 3. library_categories
 * 4. library_subjects
 * 5. library_authors
 * 6. library_publishers
 * 7. library_books
 * 8. library_book_authors
 * 9. library_book_copies
 * 10. library_members
 * 11. library_loans
 * 12. library_renewals
 * 13. library_reservations
 * 14. library_fines
 * 15. library_fine_payments
 * 16. library_audit_logs
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
const shorthands = undefined;

const up = async (pgm) => {
  // 1. Seed 'Librarian' role if not exists
  await pgm.sql(`
    INSERT INTO roles (id, name, description, created_at, updated_at)
    SELECT gen_random_uuid(), 'Librarian', 'Library manager responsible for cataloging, circulation, fines, and resources', current_timestamp, current_timestamp
    WHERE NOT EXISTS (SELECT 1 FROM roles WHERE LOWER(name) = 'librarian');
  `);

  // 2. library_settings
  pgm.createTable('library_settings', {
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
    library_name: {
      type: 'varchar(255)',
      notNull: true,
      default: 'Main Campus Library',
    },
    branch: {
      type: 'varchar(100)',
      default: 'Main Branch',
    },
    opening_hours: {
      type: 'varchar(255)',
      default: 'Mon-Fri 08:00 - 17:00, Sat 09:00 - 13:00',
    },
    max_active_loans_student: {
      type: 'integer',
      notNull: true,
      default: 3,
    },
    max_active_loans_teacher: {
      type: 'integer',
      notNull: true,
      default: 10,
    },
    max_active_loans_staff: {
      type: 'integer',
      notNull: true,
      default: 5,
    },
    default_student_loan_period: {
      type: 'integer',
      notNull: true,
      default: 14, // days
    },
    default_teacher_loan_period: {
      type: 'integer',
      notNull: true,
      default: 30, // days
    },
    default_staff_loan_period: {
      type: 'integer',
      notNull: true,
      default: 21, // days
    },
    max_loan_period: {
      type: 'integer',
      notNull: true,
      default: 60, // days
    },
    max_renewal_count: {
      type: 'integer',
      notNull: true,
      default: 2,
    },
    fine_per_overdue_day: {
      type: 'numeric(10, 2)',
      notNull: true,
      default: 2.00,
    },
    allow_reservations: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    allow_renewals: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    allow_student_borrowing: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    allow_teacher_borrowing: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    allow_staff_borrowing: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    require_signature: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    require_librarian_approval: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    reservation_hold_period: {
      type: 'integer',
      notNull: true,
      default: 3, // days
    },
    max_outstanding_fine: {
      type: 'numeric(10, 2)',
      notNull: true,
      default: 50.00,
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

  // Seed default library settings
  await pgm.sql(`
    INSERT INTO library_settings (library_name, branch, opening_hours)
    VALUES ('Smart SMS Central Library', 'Main Campus', 'Mon-Fri 08:00 - 17:00, Sat 09:00 - 13:00');
  `);

  // 3. library_categories
  pgm.createTable('library_categories', {
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
    name: {
      type: 'varchar(100)',
      notNull: true,
    },
    code: {
      type: 'varchar(50)',
    },
    description: {
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
  pgm.createIndex('library_categories', ['school_id', 'name']);

  // Seed standard categories
  await pgm.sql(`
    INSERT INTO library_categories (name, code, description) VALUES
    ('Science & Mathematics', 'SCI-MATH', 'Scientific studies, physics, chemistry, biology, and applied mathematics'),
    ('Literature & Fiction', 'LIT-FIC', 'Classic literature, novels, short stories, and prose'),
    ('History & Social Studies', 'HIST-SOC', 'World history, geography, civics, sociology, and economics'),
    ('Computer Science & Technology', 'CS-TECH', 'Programming, computer networks, algorithms, and artificial intelligence'),
    ('Reference & Dictionaries', 'REF-DICT', 'Encyclopedias, atlases, handbooks, and reference manuals'),
    ('Languages & Linguistics', 'LANG-LING', 'English, French, Amharic, Arabic, and grammatical guides');
  `);

  // 4. library_subjects
  pgm.createTable('library_subjects', {
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
    name: {
      type: 'varchar(100)',
      notNull: true,
    },
    code: {
      type: 'varchar(50)',
    },
    description: {
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
  pgm.createIndex('library_subjects', ['school_id', 'name']);

  // Seed sample library subjects
  await pgm.sql(`
    INSERT INTO library_subjects (name, code, description) VALUES
    ('Physics', 'PHY', 'Classical mechanics, thermodynamics, and quantum physics'),
    ('Chemistry', 'CHEM', 'Organic and inorganic chemistry, molecular dynamics'),
    ('Biology', 'BIO', 'Genetics, cell biology, ecology, and human anatomy'),
    ('Mathematics', 'MATH', 'Algebra, calculus, statistics, and geometry'),
    ('World History', 'WHIST', 'Ancient civilizations to modern world history'),
    ('Computer Programming', 'PROG', 'Software development, Python, JavaScript, and algorithms');
  `);

  // 5. library_authors
  pgm.createTable('library_authors', {
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
    name: {
      type: 'varchar(255)',
      notNull: true,
    },
    biography: {
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
  pgm.createIndex('library_authors', ['school_id', 'name']);

  // 6. library_publishers
  pgm.createTable('library_publishers', {
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
    name: {
      type: 'varchar(255)',
      notNull: true,
    },
    contact_email: {
      type: 'varchar(255)',
    },
    contact_phone: {
      type: 'varchar(50)',
    },
    address: {
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
  pgm.createIndex('library_publishers', ['school_id', 'name']);

  // 7. library_books
  pgm.createTable('library_books', {
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
    title: {
      type: 'varchar(255)',
      notNull: true,
    },
    isbn: {
      type: 'varchar(50)',
    },
    edition: {
      type: 'varchar(50)',
    },
    category_id: {
      type: 'uuid',
      references: 'library_categories(id)',
      onDelete: 'set null',
    },
    subject_id: {
      type: 'uuid',
      references: 'library_subjects(id)',
      onDelete: 'set null',
    },
    publisher_id: {
      type: 'uuid',
      references: 'library_publishers(id)',
      onDelete: 'set null',
    },
    publication_year: {
      type: 'integer',
    },
    language: {
      type: 'varchar(50)',
      default: 'English',
    },
    pages: {
      type: 'integer',
    },
    ddc_number: {
      type: 'varchar(50)', // Dewey Decimal / Classification
    },
    shelf_location: {
      type: 'varchar(100)',
    },
    cover_image: {
      type: 'text',
    },
    description: {
      type: 'text',
    },
    total_copies: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    available_copies: {
      type: 'integer',
      notNull: true,
      default: 0,
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
  pgm.createIndex('library_books', ['school_id', 'title']);
  pgm.createIndex('library_books', ['school_id', 'isbn']);
  pgm.createIndex('library_books', ['school_id', 'category_id']);
  pgm.createIndex('library_books', ['school_id', 'subject_id']);

  // 8. library_book_authors
  pgm.createTable('library_book_authors', {
    book_id: {
      type: 'uuid',
      notNull: true,
      references: 'library_books(id)',
      onDelete: 'cascade',
    },
    author_id: {
      type: 'uuid',
      notNull: true,
      references: 'library_authors(id)',
      onDelete: 'cascade',
    },
  });
  pgm.addConstraint('library_book_authors', 'library_book_authors_pkey', {
    primaryKey: ['book_id', 'author_id'],
  });

  // 9. library_book_copies
  pgm.createTable('library_book_copies', {
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
    book_id: {
      type: 'uuid',
      notNull: true,
      references: 'library_books(id)',
      onDelete: 'cascade',
    },
    accession_number: {
      type: 'varchar(100)',
      notNull: true,
    },
    barcode: {
      type: 'varchar(100)',
    },
    call_number: {
      type: 'varchar(100)',
    },
    condition: {
      type: 'varchar(30)',
      notNull: true,
      default: 'EXCELLENT', // EXCELLENT, GOOD, FAIR, POOR, DAMAGED
    },
    status: {
      type: 'varchar(30)',
      notNull: true,
      default: 'AVAILABLE', // AVAILABLE, BORROWED, RESERVED, LOST, DAMAGED, MAINTENANCE
    },
    acquisition_date: {
      type: 'date',
      default: pgm.func('current_date'),
    },
    price: {
      type: 'numeric(10, 2)',
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
  pgm.createIndex('library_book_copies', ['school_id', 'accession_number']);
  pgm.createIndex('library_book_copies', ['school_id', 'barcode']);
  pgm.createIndex('library_book_copies', ['school_id', 'status']);
  pgm.createIndex('library_book_copies', ['book_id', 'status']);

  // 10. library_members
  pgm.createTable('library_members', {
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
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'cascade',
    },
    member_number: {
      type: 'varchar(50)',
      notNull: true,
    },
    member_type: {
      type: 'varchar(30)',
      notNull: true,
      default: 'STUDENT', // STUDENT, TEACHER, STAFF
    },
    status: {
      type: 'varchar(30)',
      notNull: true,
      default: 'ACTIVE', // ACTIVE, SUSPENDED, EXPIRED
    },
    max_loans_override: {
      type: 'integer',
    },
    expiry_date: {
      type: 'date',
    },
    notes: {
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
  pgm.createIndex('library_members', ['school_id', 'user_id'], { unique: true, where: 'deleted_at IS NULL' });
  pgm.createIndex('library_members', ['school_id', 'member_number']);
  pgm.createIndex('library_members', ['school_id', 'status']);

  // 11. library_loans
  pgm.createTable('library_loans', {
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
    copy_id: {
      type: 'uuid',
      notNull: true,
      references: 'library_book_copies(id)',
      onDelete: 'restrict',
    },
    book_id: {
      type: 'uuid',
      notNull: true,
      references: 'library_books(id)',
      onDelete: 'restrict',
    },
    member_id: {
      type: 'uuid',
      notNull: true,
      references: 'library_members(id)',
      onDelete: 'restrict',
    },
    issued_by: {
      type: 'uuid',
      references: 'users(id)',
      onDelete: 'set null',
    },
    loan_duration_days: {
      type: 'integer',
      notNull: true,
    },
    issue_date: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    due_date: {
      type: 'timestamp with time zone',
      notNull: true,
    },
    return_date: {
      type: 'timestamp with time zone',
    },
    renewal_count: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    status: {
      type: 'varchar(30)',
      notNull: true,
      default: 'ACTIVE', // ACTIVE, RETURNED, OVERDUE, LOST, CLAIMED_RETURNED
    },
    condition_on_issue: {
      type: 'varchar(30)',
      default: 'GOOD',
    },
    condition_on_return: {
      type: 'varchar(30)',
    },
    borrower_acknowledgment_type: {
      type: 'varchar(30)',
      default: 'SIGNATURE', // SIGNATURE, DIGITAL_ACK, OTP, NONE
    },
    borrower_signature: {
      type: 'text', // Base64 signature image or electronic ack token
    },
    issue_notes: {
      type: 'text',
    },
    return_notes: {
      type: 'text',
    },
    received_by: {
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
  });
  pgm.createIndex('library_loans', ['school_id', 'status']);
  pgm.createIndex('library_loans', ['school_id', 'member_id']);
  pgm.createIndex('library_loans', ['school_id', 'due_date']);
  pgm.createIndex('library_loans', ['copy_id', 'status']);

  // 12. library_renewals
  pgm.createTable('library_renewals', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    loan_id: {
      type: 'uuid',
      notNull: true,
      references: 'library_loans(id)',
      onDelete: 'cascade',
    },
    renewed_by: {
      type: 'uuid',
      references: 'users(id)',
      onDelete: 'set null',
    },
    previous_due_date: {
      type: 'timestamp with time zone',
      notNull: true,
    },
    new_due_date: {
      type: 'timestamp with time zone',
      notNull: true,
    },
    renewal_date: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    notes: {
      type: 'text',
    },
  });
  pgm.createIndex('library_renewals', ['loan_id']);

  // 13. library_reservations
  pgm.createTable('library_reservations', {
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
    book_id: {
      type: 'uuid',
      notNull: true,
      references: 'library_books(id)',
      onDelete: 'cascade',
    },
    copy_id: {
      type: 'uuid',
      references: 'library_book_copies(id)',
      onDelete: 'set null',
    },
    member_id: {
      type: 'uuid',
      notNull: true,
      references: 'library_members(id)',
      onDelete: 'cascade',
    },
    reservation_date: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    hold_until: {
      type: 'timestamp with time zone',
    },
    status: {
      type: 'varchar(30)',
      notNull: true,
      default: 'PENDING', // PENDING, READY_FOR_PICKUP, FULFILLED, EXPIRED, CANCELLED
    },
    priority: {
      type: 'integer',
      default: 1,
    },
    notes: {
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
  });
  pgm.createIndex('library_reservations', ['school_id', 'book_id', 'status']);
  pgm.createIndex('library_reservations', ['school_id', 'member_id']);

  // 14. library_fines
  pgm.createTable('library_fines', {
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
    loan_id: {
      type: 'uuid',
      references: 'library_loans(id)',
      onDelete: 'set null',
    },
    member_id: {
      type: 'uuid',
      notNull: true,
      references: 'library_members(id)',
      onDelete: 'cascade',
    },
    fine_type: {
      type: 'varchar(50)',
      notNull: true,
      default: 'OVERDUE', // OVERDUE, LOST_BOOK, DAMAGED_BOOK, PROCESSING_FEE
    },
    amount: {
      type: 'numeric(10, 2)',
      notNull: true,
    },
    amount_paid: {
      type: 'numeric(10, 2)',
      notNull: true,
      default: 0.00,
    },
    status: {
      type: 'varchar(30)',
      notNull: true,
      default: 'UNPAID', // UNPAID, PARTIALLY_PAID, PAID, WAIVED
    },
    overdue_days: {
      type: 'integer',
      default: 0,
    },
    reason: {
      type: 'text',
    },
    waived_by: {
      type: 'uuid',
      references: 'users(id)',
      onDelete: 'set null',
    },
    waived_reason: {
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
  });
  pgm.createIndex('library_fines', ['school_id', 'member_id', 'status']);
  pgm.createIndex('library_fines', ['school_id', 'status']);

  // 15. library_fine_payments
  pgm.createTable('library_fine_payments', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    fine_id: {
      type: 'uuid',
      notNull: true,
      references: 'library_fines(id)',
      onDelete: 'cascade',
    },
    amount: {
      type: 'numeric(10, 2)',
      notNull: true,
    },
    payment_method: {
      type: 'varchar(50)',
      notNull: true,
      default: 'CASH', // CASH, MOBILE_MONEY, CARD, BANK_TRANSFER, SYSTEM_BALANCE
    },
    reference_number: {
      type: 'varchar(100)',
    },
    received_by: {
      type: 'uuid',
      references: 'users(id)',
      onDelete: 'set null',
    },
    payment_date: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    receipt_number: {
      type: 'varchar(100)',
    },
    notes: {
      type: 'text',
    },
  });
  pgm.createIndex('library_fine_payments', ['fine_id']);

  // 16. library_audit_logs
  pgm.createTable('library_audit_logs', {
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
    user_id: {
      type: 'uuid',
      references: 'users(id)',
      onDelete: 'set null',
    },
    action: {
      type: 'varchar(100)',
      notNull: true,
    },
    entity_type: {
      type: 'varchar(50)',
      notNull: true,
    },
    entity_id: {
      type: 'uuid',
    },
    details: {
      type: 'jsonb',
    },
    ip_address: {
      type: 'varchar(45)',
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });
  pgm.createIndex('library_audit_logs', ['school_id', 'created_at']);
  pgm.createIndex('library_audit_logs', ['entity_type', 'entity_id']);
  pgm.createIndex('library_audit_logs', ['user_id', 'action']);
};

const down = async (pgm) => {
  pgm.dropTable('library_audit_logs', { ifExists: true });
  pgm.dropTable('library_fine_payments', { ifExists: true });
  pgm.dropTable('library_fines', { ifExists: true });
  pgm.dropTable('library_reservations', { ifExists: true });
  pgm.dropTable('library_renewals', { ifExists: true });
  pgm.dropTable('library_loans', { ifExists: true });
  pgm.dropTable('library_members', { ifExists: true });
  pgm.dropTable('library_book_copies', { ifExists: true });
  pgm.dropTable('library_book_authors', { ifExists: true });
  pgm.dropTable('library_books', { ifExists: true });
  pgm.dropTable('library_publishers', { ifExists: true });
  pgm.dropTable('library_authors', { ifExists: true });
  pgm.dropTable('library_subjects', { ifExists: true });
  pgm.dropTable('library_categories', { ifExists: true });
  pgm.dropTable('library_settings', { ifExists: true });
};

module.exports = {
  shorthands,
  up,
  down,
};
