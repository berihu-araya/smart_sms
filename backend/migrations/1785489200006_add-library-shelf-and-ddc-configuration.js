const up = async (pgm) => {
  pgm.addColumn('library_settings', {
    shelf_locations: {
      type: 'jsonb',
      notNull: true,
      default: pgm.func("'[]'::jsonb"),
    },
    ddc_classifications: {
      type: 'jsonb',
      notNull: true,
      default: pgm.func("'[]'::jsonb"),
    },
  });
};

const down = async (pgm) => {
  pgm.dropColumn('library_settings', ['shelf_locations', 'ddc_classifications']);
};

module.exports = { up, down };
