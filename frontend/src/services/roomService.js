import { request } from "./apiClient";

export async function listRooms({
  search = "",
  room_type,
  roomType,
  is_active,
  isActive,
  limit = 50,
  offset = 0,
} = {}) {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  const type = room_type || roomType;
  if (type) params.append("room_type", type);
  const active = is_active !== undefined ? is_active : isActive;
  if (active !== undefined && active !== null && active !== "") {
    params.append("is_active", active);
  }
  if (limit) params.append("limit", limit);
  if (offset) params.append("offset", offset);

  const res = await request(`/api/v1/timetable/rooms?${params.toString()}`);
  return res.data;
}

export async function getRoomById(id) {
  const res = await request(`/api/v1/timetable/rooms/${id}`);
  return res.data;
}

export async function createRoom(payload) {
  const res = await request("/api/v1/timetable/rooms", {
    method: "POST",
    body: JSON.stringify({
      name: payload.name,
      building: payload.building || null,
      floor: payload.floor || null,
      capacity: payload.capacity ? Number(payload.capacity) : 40,
      room_type: payload.room_type || payload.roomType || "NORMAL",
      is_active: payload.is_active !== undefined ? payload.is_active : payload.isActive ?? true,
    }),
  });
  return res.data;
}

export async function updateRoom(id, payload) {
  const res = await request(`/api/v1/timetable/rooms/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function deleteRoom(id) {
  const res = await request(`/api/v1/timetable/rooms/${id}`, {
    method: "DELETE",
  });
  return res.data;
}

const roomService = {
  listRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
};

export default roomService;
