/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('units', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    name: {
      type: 'varchar(120)',
      notNull: true,
    },
    description: {
      type: 'text',
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'ACTIVE',
      check: "status IN ('ACTIVE', 'INACTIVE')",
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

  pgm.addConstraint('units', 'units_name_unique_active', {
    unique: ['name'],
    where: "deleted_at IS NULL",
  });

  pgm.createTable('unit_classes', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    unit_id: {
      type: 'uuid',
      notNull: true,
      references: 'units(id)',
      onDelete: 'cascade',
    },
    section_id: {
      type: 'uuid',
      notNull: true,
      references: 'sections(id)',
      onDelete: 'cascade',
    },
    academic_year_id: {
      type: 'uuid',
      notNull: true,
      references: 'academic_years(id)',
      onDelete: 'cascade',
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'ACTIVE',
      check: "status IN ('ACTIVE', 'INACTIVE')",
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

  pgm.addConstraint('unit_classes', 'unit_classes_active_unique', {
    unique: ['unit_id', 'section_id', 'academic_year_id'],
    where: "deleted_at IS NULL AND status = 'ACTIVE'",
  });

  pgm.createIndex('unit_classes', ['unit_id']);
  pgm.createIndex('unit_classes', ['section_id']);
  pgm.createIndex('unit_classes', ['academic_year_id']);

  pgm.createTable('staff_roles', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    name: {
      type: 'varchar(120)',
      notNull: true,
    },
    scope_type: {
      type: 'varchar(20)',
      notNull: true,
      check: "scope_type IN ('school', 'unit', 'section')",
    },
    description: {
      type: 'text',
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'ACTIVE',
      check: "status IN ('ACTIVE', 'INACTIVE')",
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

  pgm.addConstraint('staff_roles', 'staff_roles_name_unique_active', {
    unique: ['name'],
    where: "deleted_at IS NULL",
  });

  pgm.createTable('staff_role_assignments', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    staff_role_id: {
      type: 'uuid',
      notNull: true,
      references: 'staff_roles(id)',
      onDelete: 'cascade',
    },
    teacher_id: {
      type: 'uuid',
      notNull: true,
      references: 'teachers(id)',
      onDelete: 'cascade',
    },
    academic_year_id: {
      type: 'uuid',
      notNull: true,
      references: 'academic_years(id)',
      onDelete: 'cascade',
    },
    unit_id: {
      type: 'uuid',
      references: 'units(id)',
      onDelete: 'cascade',
    },
    section_id: {
      type: 'uuid',
      references: 'sections(id)',
      onDelete: 'cascade',
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'ACTIVE',
      check: "status IN ('ACTIVE', 'INACTIVE')",
    },
    assignment_date: {
      type: 'date',
      notNull: true,
      default: pgm.func('CURRENT_DATE'),
    },
    end_date: {
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
    deleted_at: {
      type: 'timestamp with time zone',
    },
  });

  pgm.addConstraint('staff_role_assignments', 'staff_role_assignments_school_unique_active', {
    unique: ['academic_year_id', 'staff_role_id'],
    where: "deleted_at IS NULL AND status = 'ACTIVE' AND unit_id IS NULL AND section_id IS NULL",
  });

  pgm.addConstraint('staff_role_assignments', 'staff_role_assignments_unit_unique_active', {
    unique: ['academic_year_id', 'staff_role_id', 'unit_id'],
    where: "deleted_at IS NULL AND status = 'ACTIVE' AND unit_id IS NOT NULL AND section_id IS NULL",
  });

  pgm.addConstraint('staff_role_assignments', 'staff_role_assignments_section_unique_active', {
    unique: ['academic_year_id', 'staff_role_id', 'section_id'],
    where: "deleted_at IS NULL AND status = 'ACTIVE' AND section_id IS NOT NULL",
  });

  pgm.addConstraint('staff_role_assignments', 'staff_role_assignments_end_date_check', {
    check: 'end_date IS NULL OR end_date >= assignment_date',
  });

  pgm.createIndex('staff_role_assignments', ['staff_role_id']);
  pgm.createIndex('staff_role_assignments', ['teacher_id']);
  pgm.createIndex('staff_role_assignments', ['academic_year_id']);
  pgm.createIndex('staff_role_assignments', ['unit_id']);
  pgm.createIndex('staff_role_assignments', ['section_id']);

  pgm.createTable('class_teachers', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    teacher_id: {
      type: 'uuid',
      notNull: true,
      references: 'teachers(id)',
      onDelete: 'cascade',
    },
    section_id: {
      type: 'uuid',
      notNull: true,
      references: 'sections(id)',
      onDelete: 'cascade',
    },
    academic_year_id: {
      type: 'uuid',
      notNull: true,
      references: 'academic_years(id)',
      onDelete: 'cascade',
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'ACTIVE',
      check: "status IN ('ACTIVE', 'INACTIVE')",
    },
    assignment_date: {
      type: 'date',
      notNull: true,
      default: pgm.func('CURRENT_DATE'),
    },
    end_date: {
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
    deleted_at: {
      type: 'timestamp with time zone',
    },
  });

  pgm.addConstraint('class_teachers', 'class_teachers_active_unique', {
    unique: ['academic_year_id', 'section_id'],
    where: "deleted_at IS NULL AND status = 'ACTIVE'",
  });

  pgm.addConstraint('class_teachers', 'class_teachers_end_date_check', {
    check: 'end_date IS NULL OR end_date >= assignment_date',
  });

  pgm.createIndex('class_teachers', ['teacher_id']);
  pgm.createIndex('class_teachers', ['section_id']);
  pgm.createIndex('class_teachers', ['academic_year_id']);

  pgm.sql(`
    INSERT INTO staff_roles (id, name, scope_type, description)
    VALUES
      (gen_random_uuid(), 'School Director', 'school', 'Top leadership role for the entire school'),
      (gen_random_uuid(), 'Vice Director', 'school', 'Deputy leadership role for the entire school'),
      (gen_random_uuid(), 'Unit Leader', 'unit', 'Leadership role for an academic unit or grouping of classes'),
      (gen_random_uuid(), 'Class Teacher', 'section', 'Homeroom teacher for a class or section')
    ON CONFLICT DO NOTHING;
  `);
};

exports.down = (pgm) => {
  pgm.dropTable('class_teachers');
  pgm.dropTable('staff_role_assignments');
  pgm.dropTable('staff_roles');
  pgm.dropTable('unit_classes');
  pgm.dropTable('units');
};
