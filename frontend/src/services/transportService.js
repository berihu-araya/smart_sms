import { request } from './apiClient';

// ==========================================
// 1. Settings
// ==========================================
export async function getTransportSettings() {
  const res = await request('/api/v1/transport/config');
  return res.data;
}

export async function updateTransportSettings(data) {
  const res = await request('/api/v1/transport/config', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.data;
}

// ==========================================
// 2. Dashboard KPIs
// ==========================================
export async function getTransportStats() {
  const res = await request('/api/v1/transport/stats');
  return res.data;
}

// ==========================================
// 3. Vehicles (Fleet Management)
// ==========================================
export async function listVehicles(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.status) query.append('status', params.status);
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);

  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await request(`/api/v1/transport/vehicles${qs}`);
  return res;
}

export async function getVehicleById(id) {
  const res = await request(`/api/v1/transport/vehicles/${id}`);
  return res.data;
}

export async function createVehicle(data) {
  const res = await request('/api/v1/transport/vehicles', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function updateVehicle(id, data) {
  const res = await request(`/api/v1/transport/vehicles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function deleteVehicle(id) {
  const res = await request(`/api/v1/transport/vehicles/${id}`, {
    method: 'DELETE',
  });
  return res;
}

// ==========================================
// 4. Drivers (Linked to Users)
// ==========================================
export async function listDrivers(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.status) query.append('status', params.status);
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);

  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await request(`/api/v1/transport/drivers${qs}`);
  return res;
}

export async function getDriverById(id) {
  const res = await request(`/api/v1/transport/drivers/${id}`);
  return res.data;
}

export async function createDriver(data) {
  const res = await request('/api/v1/transport/drivers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function updateDriver(id, data) {
  const res = await request(`/api/v1/transport/drivers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function deleteDriver(id) {
  const res = await request(`/api/v1/transport/drivers/${id}`, {
    method: 'DELETE',
  });
  return res;
}

// ==========================================
// 5. Routes & Ordered Stops
// ==========================================
export async function listRoutes(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.status) query.append('status', params.status);
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);

  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await request(`/api/v1/transport/routes${qs}`);
  return res;
}

export async function getRouteById(id) {
  const res = await request(`/api/v1/transport/routes/${id}`);
  return res.data;
}

export async function createRoute(data) {
  const res = await request('/api/v1/transport/routes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function updateRoute(id, data) {
  const res = await request(`/api/v1/transport/routes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function deleteRoute(id) {
  const res = await request(`/api/v1/transport/routes/${id}`, {
    method: 'DELETE',
  });
  return res;
}

export async function listStopsByRoute(routeId) {
  const res = await request(`/api/v1/transport/routes/${routeId}/stops`);
  return res.data;
}

export async function createStop(data) {
  const res = await request('/api/v1/transport/stops', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function createBulkStops(routeId, stops) {
  const res = await request(`/api/v1/transport/routes/${routeId}/stops/bulk`, {
    method: 'POST',
    body: JSON.stringify({ stops }),
  });
  return res.data;
}

export async function updateStop(id, data) {
  const res = await request(`/api/v1/transport/stops/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function deleteStop(id) {
  const res = await request(`/api/v1/transport/stops/${id}`, {
    method: 'DELETE',
  });
  return res;
}

// ==========================================
// 6. Student Transport Allocations
// ==========================================
export async function listStudentAllocations(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.routeId) query.append('routeId', params.routeId);
  if (params.vehicleId) query.append('vehicleId', params.vehicleId);
  if (params.status) query.append('status', params.status);
  if (params.gradeId) query.append('gradeId', params.gradeId);
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);

  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await request(`/api/v1/transport/allocations${qs}`);
  return res;
}

export async function getAllocationById(id) {
  const res = await request(`/api/v1/transport/allocations/${id}`);
  return res.data;
}

export async function getMyTransportInfo() {
  const res = await request('/api/v1/transport/allocations/my-info');
  return res.data;
}

export async function createStudentAllocation(data) {
  const res = await request('/api/v1/transport/allocations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function updateStudentAllocation(id, data) {
  const res = await request(`/api/v1/transport/allocations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function deleteStudentAllocation(id) {
  const res = await request(`/api/v1/transport/allocations/${id}`, {
    method: 'DELETE',
  });
  return res;
}

// ==========================================
// 7. Daily Transport Trips & Attendance
// ==========================================
export async function listTrips(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.date) query.append('date', params.date);
  if (params.routeId) query.append('routeId', params.routeId);
  if (params.vehicleId) query.append('vehicleId', params.vehicleId);
  if (params.driverId) query.append('driverId', params.driverId);
  if (params.status) query.append('status', params.status);
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);

  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await request(`/api/v1/transport/trips${qs}`);
  return res;
}

export async function getTripById(id) {
  const res = await request(`/api/v1/transport/trips/${id}`);
  return res.data;
}

export async function createTrip(data) {
  const res = await request('/api/v1/transport/trips', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function updateTrip(id, data) {
  const res = await request(`/api/v1/transport/trips/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function deleteTrip(id) {
  const res = await request(`/api/v1/transport/trips/${id}`, {
    method: 'DELETE',
  });
  return res;
}

export async function getTripPassengerRoster(tripId) {
  const res = await request(`/api/v1/transport/trips/${tripId}/roster`);
  return res.data;
}

export async function recordTripAttendance(tripId, records) {
  const res = await request(`/api/v1/transport/trips/${tripId}/attendance`, {
    method: 'POST',
    body: JSON.stringify({ records }),
  });
  return res.data;
}

// ==========================================
// 8. Reports
// ==========================================
export async function getRouteRosterReport(routeId) {
  const res = await request(`/api/v1/transport/reports/route-roster/${routeId}`);
  return res.data;
}

export async function getFleetUtilizationReport() {
  const res = await request('/api/v1/transport/reports/fleet-utilization');
  return res.data;
}

export async function getDailyAttendanceReport(params = {}) {
  const query = new URLSearchParams();
  if (params.date) query.append('date', params.date);
  if (params.routeId) query.append('routeId', params.routeId);

  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await request(`/api/v1/transport/reports/daily-attendance${qs}`);
  return res.data;
}
