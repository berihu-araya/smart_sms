const test = require('node:test');
const assert = require('node:assert/strict');
const { ParentConflictError, ParentService } = require('../src/modules/parents/parent.service');

test('createParent rejects an existing phone number instead of silently reusing the parent', async () => {
  const repository = {
    findByPhone: async () => ({ id: 'existing-parent' }),
    create: async () => {
      throw new Error('create should not be called');
    },
  };

  await assert.rejects(
    () => new ParentService(repository).createParent({ fullName: 'New Parent', phone: '+251911234567' }),
    (error) => {
      assert.ok(error instanceof ParentConflictError);
      assert.equal(error.status, 409);
      return true;
    }
  );
});