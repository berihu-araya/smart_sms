const { db } = require('../../../config/database');
const RoomRepository = require('./room.repository');
const { RoomService } = require('./room.service');
const {
  validateCreateRoomInput,
  validateUpdateRoomInput,
  validateRoomId,
} = require('./room.validation');

const repository = new RoomRepository(db);
const service = new RoomService(repository);

async function listRooms(req, res, next) {
  try {
    const { search, room_type, roomType, is_active, isActive, limit = 50, offset = 0 } = req.query;

    const parsedLimit = Math.max(1, Math.min(100, Number(limit) || 50));
    const parsedOffset = Math.max(0, Number(offset) || 0);

    const result = await service.listRooms({
      search: search || '',
      roomType: room_type || roomType || '',
      isActive: is_active !== undefined ? is_active : isActive,
      limit: parsedLimit,
      offset: parsedOffset,
    });

    return res.status(200).json({
      success: true,
      message: 'Rooms retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getRoomById(req, res, next) {
  try {
    const { id } = req.params;
    const { isValid, error } = validateRoomId(id);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: error,
        data: null,
      });
    }

    const room = await service.getRoomById(id);
    return res.status(200).json({
      success: true,
      message: 'Room retrieved successfully',
      data: room,
    });
  } catch (error) {
    next(error);
  }
}

async function createRoom(req, res, next) {
  try {
    const { data, errors } = validateCreateRoomInput(req.body);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        data: { errors },
      });
    }

    const room = await service.createRoom(data);
    return res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: room,
    });
  } catch (error) {
    next(error);
  }
}

async function updateRoom(req, res, next) {
  try {
    const { id } = req.params;
    const { isValid, error } = validateRoomId(id);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: error,
        data: null,
      });
    }

    const { data, errors } = validateUpdateRoomInput(req.body);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        data: { errors },
      });
    }

    const room = await service.updateRoom(id, data);
    return res.status(200).json({
      success: true,
      message: 'Room updated successfully',
      data: room,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteRoom(req, res, next) {
  try {
    const { id } = req.params;
    const { isValid, error } = validateRoomId(id);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: error,
        data: null,
      });
    }

    const room = await service.deleteRoom(id);
    return res.status(200).json({
      success: true,
      message: 'Room deleted successfully',
      data: room,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
};
