const { ROOM_TYPES } = require('../timetable.constants');

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(id) {
  return typeof id === 'string' && UUID_REGEX.test(id.trim());
}

function normalizeOptionalString(value) {
  if (value === undefined || value === null) return null;
  const str = String(value).trim();
  return str.length > 0 ? str : null;
}

function validateCreateRoomInput(input = {}) {
  const errors = {};

  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name) {
    errors.name = 'Room name is required';
  } else if (name.length < 2 || name.length > 100) {
    errors.name = 'Room name must be between 2 and 100 characters';
  }

  const building = normalizeOptionalString(input.building);
  const floor = normalizeOptionalString(input.floor);

  let capacity = 40;
  if (input.capacity !== undefined && input.capacity !== null && input.capacity !== '') {
    const parsed = Number(input.capacity);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      errors.capacity = 'Capacity must be a positive integer';
    } else {
      capacity = parsed;
    }
  }

  let roomType = 'NORMAL';
  if (input.roomType || input.room_type) {
    const rawType = String(input.roomType || input.room_type).trim().toUpperCase();
    if (!Object.values(ROOM_TYPES).includes(rawType)) {
      errors.room_type = `Invalid room type. Allowed: ${Object.values(ROOM_TYPES).join(', ')}`;
    } else {
      roomType = rawType;
    }
  }

  const isActive = input.isActive !== undefined
    ? Boolean(input.isActive)
    : (input.is_active !== undefined ? Boolean(input.is_active) : true);

  return {
    data: {
      name,
      building,
      floor,
      capacity,
      room_type: roomType,
      is_active: isActive,
    },
    errors,
  };
}

function validateUpdateRoomInput(input = {}) {
  const errors = {};
  const data = {};

  if (input.name !== undefined) {
    const name = String(input.name).trim();
    if (!name) {
      errors.name = 'Room name cannot be empty';
    } else if (name.length < 2 || name.length > 100) {
      errors.name = 'Room name must be between 2 and 100 characters';
    } else {
      data.name = name;
    }
  }

  if (input.building !== undefined) {
    data.building = normalizeOptionalString(input.building);
  }

  if (input.floor !== undefined) {
    data.floor = normalizeOptionalString(input.floor);
  }

  if (input.capacity !== undefined) {
    if (input.capacity === null || input.capacity === '') {
      data.capacity = null;
    } else {
      const parsed = Number(input.capacity);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        errors.capacity = 'Capacity must be a positive integer';
      } else {
        data.capacity = parsed;
      }
    }
  }

  if (input.roomType !== undefined || input.room_type !== undefined) {
    const rawType = String(input.roomType !== undefined ? input.roomType : input.room_type).trim().toUpperCase();
    if (!Object.values(ROOM_TYPES).includes(rawType)) {
      errors.room_type = `Invalid room type. Allowed: ${Object.values(ROOM_TYPES).join(', ')}`;
    } else {
      data.room_type = rawType;
    }
  }

  if (input.isActive !== undefined || input.is_active !== undefined) {
    data.is_active = Boolean(input.isActive !== undefined ? input.isActive : input.is_active);
  }

  return {
    data,
    errors,
  };
}

function validateRoomId(id) {
  if (!id || typeof id !== 'string' || !isValidUuid(id)) {
    return {
      isValid: false,
      error: 'Invalid or missing Room ID (must be a valid UUID)',
    };
  }
  return {
    isValid: true,
    error: null,
  };
}

module.exports = {
  validateCreateRoomInput,
  validateUpdateRoomInput,
  validateRoomId,
  isValidUuid,
};
