const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateCreateRoomInput,
  validateUpdateRoomInput,
  validateRoomId,
} = require('../src/modules/timetable/rooms/room.validation');

test('validateCreateRoomInput rejects empty name', () => {
  const result = validateCreateRoomInput({});
  assert.ok(result.errors.name);
});

test('validateCreateRoomInput accepts valid room payload and sets defaults', () => {
  const result = validateCreateRoomInput({
    name: 'Science Lab 101',
    building: 'Main Block',
    floor: '2nd Floor',
    capacity: 35,
    room_type: 'LAB',
  });

  assert.equal(result.data.name, 'Science Lab 101');
  assert.equal(result.data.building, 'Main Block');
  assert.equal(result.data.floor, '2nd Floor');
  assert.equal(result.data.capacity, 35);
  assert.equal(result.data.room_type, 'LAB');
  assert.equal(result.data.is_active, true);
  assert.deepEqual(result.errors, {});
});

test('validateCreateRoomInput rejects invalid room type', () => {
  const result = validateCreateRoomInput({
    name: 'Room 202',
    room_type: 'INVALID_TYPE',
  });
  assert.ok(result.errors.room_type);
});

test('validateCreateRoomInput rejects negative or zero capacity', () => {
  const result = validateCreateRoomInput({
    name: 'Room 202',
    capacity: -5,
  });
  assert.ok(result.errors.capacity);
});

test('validateUpdateRoomInput allows partial update', () => {
  const result = validateUpdateRoomInput({
    capacity: 50,
  });
  assert.equal(result.data.capacity, 50);
  assert.deepEqual(result.errors, {});
});

test('validateRoomId validates UUID format', () => {
  const valid = validateRoomId('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
  assert.equal(valid.isValid, true);

  const invalid = validateRoomId('invalid-uuid');
  assert.equal(invalid.isValid, false);
});
