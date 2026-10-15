/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
const shorthands = undefined;

const up = (pgm) => {
  pgm.addColumn('students', {
    photo: { type: 'text' },
  });
};

const down = (pgm) => {
  pgm.dropColumn('students', 'photo');
};

module.exports = {
  shorthands,
  up,
  down,
};
