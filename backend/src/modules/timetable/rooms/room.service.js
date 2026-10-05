class RoomNotFoundError extends Error {
  constructor(message = 'Room not found') {
    super(message);
    this.name = 'RoomNotFoundError';
    this.status = 404;
  }
}

class RoomConflictError extends Error {
  constructor(message = 'A room with this name already exists') {
    super(message);
    this.name = 'RoomConflictError';
    this.status = 409;
  }
}

class RoomValidationError extends Error {
  constructor(message = 'Validation failed', errors = {}) {
    super(message);
    this.name = 'RoomValidationError';
    this.status = 400;
    this.errors = errors;
  }
}

class RoomService {
  constructor(repository) {
    this.repository = repository;
  }

  async listRooms({ search = '', roomType = '', isActive, limit = 50, offset = 0 } = {}) {
    const page = Math.floor(offset / limit) + 1;
    const { items, total } = await this.repository.findAll({
      search,
      roomType,
      isActive,
      limit,
      offset,
    });

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      items,
    };
  }

  async getRoomById(id) {
    const room = await this.repository.findById(id);
    if (!room) {
      throw new RoomNotFoundError();
    }
    return room;
  }

  async createRoom(payload) {
    const existing = await this.repository.findByName(payload.name);
    if (existing) {
      throw new RoomConflictError(`Room "${payload.name}" already exists`);
    }

    const room = await this.repository.create(payload);
    return room;
  }

  async updateRoom(id, payload) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new RoomNotFoundError();
    }

    if (payload.name && payload.name.toLowerCase() !== existing.name.toLowerCase()) {
      const duplicate = await this.repository.findByName(payload.name, id);
      if (duplicate) {
        throw new RoomConflictError(`Room "${payload.name}" already exists`);
      }
    }

    const updated = await this.repository.update(id, payload);
    return updated;
  }

  async deleteRoom(id) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new RoomNotFoundError();
    }

    const isOccupied = await this.repository.isRoomOccupiedInTimetables(id);
    if (isOccupied) {
      throw new RoomConflictError('Cannot delete room because it is scheduled in active timetable entries');
    }

    const deleted = await this.repository.softDelete(id);
    return deleted;
  }
}

module.exports = {
  RoomService,
  RoomNotFoundError,
  RoomConflictError,
  RoomValidationError,
};
