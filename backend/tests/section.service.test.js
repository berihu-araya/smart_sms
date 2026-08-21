const test = require('node:test');
const assert = require('node:assert/strict');
const { SectionService } = require('../src/modules/sections/section.service');

test('SectionService.listSections forwards gradeId to repository.findAll', async () => {
  let capturedArgs = null;
  const mockRepo = {
    async findAll(args) {
      capturedArgs = args;
      return [
        { id: 'sec-1', name: 'Section A', grade_id: 'grade-10' },
        { id: 'sec-2', name: 'Section B', grade_id: 'grade-10' },
      ];
    },
  };

  const service = new SectionService(mockRepo);
  const result = await service.listSections({
    search: 'sec',
    gradeId: 'grade-10',
    limit: 10,
    offset: 0,
  });

  assert.deepEqual(capturedArgs, {
    search: 'sec',
    gradeId: 'grade-10',
    limit: 10,
    offset: 0,
  });
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].grade_id, 'grade-10');
  assert.equal(result.limit, 10);
  assert.equal(result.page, 1);
});
