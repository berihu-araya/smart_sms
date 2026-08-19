/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
const shorthands = undefined;

const up = (pgm) => {
  pgm.addColumn('users', {
    profile_image: { type: 'text' },
  });
};

const down = (pgm) => {
  pgm.dropColumn('users', 'profile_image');
};

module.exports = {
  shorthands,
  up,
  down,
};