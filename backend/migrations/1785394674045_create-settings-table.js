/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('settings', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    school_name: {
      type: 'varchar(200)',
      notNull: true,
      default: 'Smart SMS International Academy',
    },
    school_code: {
      type: 'varchar(50)',
      default: 'SMS-ETH-001',
    },
    email: {
      type: 'varchar(255)',
      default: 'admin@smartsms.edu.et',
    },
    phone: {
      type: 'varchar(50)',
      default: '+251 11 123 4567',
    },
    address: {
      type: 'text',
      default: 'Addis Ababa, Ethiopia',
    },
    motto: {
      type: 'varchar(255)',
      default: 'Excellence in Digital Education and Leadership',
    },
    logo_url: {
      type: 'text',
    },
    active_academic_year_id: {
      type: 'uuid',
      references: 'academic_years(id)',
      onDelete: 'set null',
    },
    active_term: {
      type: 'varchar(50)',
      default: 'Semester 1',
    },
    currency: {
      type: 'varchar(10)',
      default: 'ETB',
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

  // Seed default settings row
  pgm.sql(`
    INSERT INTO settings (school_name, school_code, email, phone, address, motto)
    VALUES (
      'Smart SMS International Academy',
      'SMS-ETH-001',
      'info@smartsms.edu.et',
      '+251 11 123 4567',
      'Bole Sub-City, Addis Ababa, Ethiopia',
      'Empowering Future Minds Through Digital Excellence'
    )
    ON CONFLICT DO NOTHING;
  `);
};

exports.down = (pgm) => {
  pgm.dropTable('settings');
};
