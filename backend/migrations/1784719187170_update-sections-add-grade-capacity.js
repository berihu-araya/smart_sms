/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
const shorthands = undefined;

const up = (pgm) => {
  pgm.addColumns('sections', {
    grade_id: {
      type: 'uuid',
      references: 'grades(id)',
      onDelete: 'set null',
    },
    capacity: { type: 'integer' },
  });

  pgm.createIndex('sections', 'grade_id');
};

const down = (pgm) => {
  pgm.dropIndex('sections', 'grade_id');
  pgm.dropColumns('sections', ['grade_id', 'capacity']);
};

module.exports = {
  shorthands,
  up,
  down,
};

