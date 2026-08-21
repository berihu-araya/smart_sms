/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns('parents', {
    relationship: {
      type: 'varchar(50)',
      default: 'GUARDIAN',
    },
  });

  pgm.createIndex('parents', 'phone', {
    name: 'parents_phone_active_idx',
    where: 'deleted_at IS NULL',
  });
};

exports.down = (pgm) => {
  pgm.dropIndex('parents', 'phone', { name: 'parents_phone_active_idx' });
  pgm.dropColumns('parents', ['relationship']);
};
