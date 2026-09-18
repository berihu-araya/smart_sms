/**
 * Transport Service
 * Business logic layer for school transport operations with capacity enforcement and validation.
 */

class TransportService {
  constructor(repository) {
    this.repository = repository;
  }

  // ==========================================
  // 1. SETTINGS
  // ==========================================

  async getSettings(schoolId) {
    return this.repository.getSettings(schoolId);
  }

  async updateSettings(schoolId, data) {
    return this.repository.updateSettings(schoolId, data);
  }

  // ==========================================
  // 2. VEHICLES (FLEET)
  // ==========================================

  async listVehicles(params) {
    return this.repository.listVehicles(params);
  }

  async getVehicleById(id, schoolId) {
    const vehicle = await this.repository.getVehicleById(id, schoolId);
    if (!vehicle) {
      const err = new Error(`Vehicle with ID ${id} not found`);
      err.status = 404;
      throw err;
    }
    return vehicle;
  }

  async createVehicle(schoolId, data) {
    return this.repository.createVehicle(schoolId, data);
  }

  async updateVehicle(id, schoolId, data) {
    await this.getVehicleById(id, schoolId);
    return this.repository.updateVehicle(id, schoolId, data);
  }

  async deleteVehicle(id, schoolId) {
    await this.getVehicleById(id, schoolId);
    return this.repository.deleteVehicle(id, schoolId);
  }

  // ==========================================
  // 3. DRIVERS (REUSING EXISTING USERS)
  // ==========================================

  async listDrivers(params) {
    return this.repository.listDrivers(params);
  }

  async getDriverById(id, schoolId) {
    const driver = await this.repository.getDriverById(id, schoolId);
    if (!driver) {
      const err = new Error(`Driver with ID ${id} not found`);
      err.status = 404;
      throw err;
    }
    return driver;
  }

  async getDriverByUserId(userId, schoolId) {
    return this.repository.getDriverByUserId(userId, schoolId);
  }

  async createDriver(schoolId, data) {
    // Check if user is already registered as a transport driver
    const existing = await this.repository.getDriverByUserId(data.user_id, schoolId);
    if (existing) {
      const err = new Error('This staff/user record is already registered as a transport driver');
      err.status = 400;
      throw err;
    }
    return this.repository.createDriver(schoolId, data);
  }

  async updateDriver(id, schoolId, data) {
    await this.getDriverById(id, schoolId);
    return this.repository.updateDriver(id, schoolId, data);
  }

  async deleteDriver(id, schoolId) {
    await this.getDriverById(id, schoolId);
    return this.repository.deleteDriver(id, schoolId);
  }

  // ==========================================
  // 4. ROUTES & ORDERED STOPS
  // ==========================================

  async listRoutes(params) {
    return this.repository.listRoutes(params);
  }

  async getRouteById(id, schoolId) {
    const route = await this.repository.getRouteById(id, schoolId);
    if (!route) {
      const err = new Error(`Route with ID ${id} not found`);
      err.status = 404;
      throw err;
    }
    return route;
  }

  async createRoute(schoolId, data) {
    return this.repository.createRoute(schoolId, data);
  }

  async updateRoute(id, schoolId, data) {
    await this.getRouteById(id, schoolId);
    return this.repository.updateRoute(id, schoolId, data);
  }

  async deleteRoute(id, schoolId) {
    await this.getRouteById(id, schoolId);
    return this.repository.deleteRoute(id, schoolId);
  }

  async listStopsByRoute(routeId) {
    return this.repository.listStopsByRoute(routeId);
  }

  async createStop(schoolId, data) {
    // Ensure route exists
    await this.getRouteById(data.route_id, schoolId);
    return this.repository.createStop(schoolId, data);
  }

  async updateStop(id, schoolId, data) {
    return this.repository.updateStop(id, schoolId, data);
  }

  async deleteStop(id, schoolId) {
    return this.repository.deleteStop(id, schoolId);
  }

  async createBulkStops(schoolId, routeId, stops) {
    await this.getRouteById(routeId, schoolId);
    const createdStops = [];
    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];
      const res = await this.repository.createStop(schoolId, {
        ...stop,
        route_id: routeId,
        stop_order: stop.stop_order || (i + 1),
      });
      createdStops.push(res);
    }
    return createdStops;
  }

  // ==========================================
  // 5. STUDENT TRANSPORT ALLOCATIONS (CAPACITY ENFORCEMENT)
  // ==========================================

  async listStudentAllocations(params) {
    return this.repository.listStudentAllocations(params);
  }

  async getAllocationById(id, schoolId) {
    const allocation = await this.repository.getAllocationById(id, schoolId);
    if (!allocation) {
      const err = new Error(`Student transport allocation with ID ${id} not found`);
      err.status = 404;
      throw err;
    }
    return allocation;
  }

  async getAllocationByStudentId(studentId, schoolId) {
    return this.repository.getAllocationByStudentId(studentId, schoolId);
  }

  async createStudentAllocation(schoolId, data) {
    // 1. Fetch Route
    const route = await this.getRouteById(data.route_id, schoolId);

    // 2. Determine target vehicle (either explicitly specified or route's default vehicle)
    const targetVehicleId = data.assigned_vehicle_id || route.default_vehicle_id;

    // 3. Check Capacity if vehicle is assigned
    if (targetVehicleId) {
      const vehicle = await this.repository.getVehicleById(targetVehicleId, schoolId);
      if (vehicle) {
        const currentCount = await this.repository.countActiveAllocationsByVehicle(targetVehicleId);
        const settings = await this.repository.getSettings(schoolId);

        if (currentCount >= vehicle.seating_capacity && settings.enforce_strict_capacity) {
          const err = new Error(
            `Vehicle capacity exceeded! Bus '${vehicle.vehicle_number}' has a capacity of ${vehicle.seating_capacity} seats, and already has ${currentCount} active students allocated.`
          );
          err.status = 400;
          throw err;
        }
      }
    }

    // Set assigned_vehicle_id to targetVehicleId if not provided
    const payload = {
      ...data,
      assigned_vehicle_id: targetVehicleId || null,
    };

    return this.repository.createStudentAllocation(schoolId, payload);
  }

  async updateStudentAllocation(id, schoolId, data) {
    const existing = await this.getAllocationById(id, schoolId);

    const targetVehicleId = data.assigned_vehicle_id !== undefined
      ? (data.assigned_vehicle_id || null)
      : existing.assigned_vehicle_id;

    if (targetVehicleId && targetVehicleId !== existing.assigned_vehicle_id) {
      const vehicle = await this.repository.getVehicleById(targetVehicleId, schoolId);
      if (vehicle) {
        const currentCount = await this.repository.countActiveAllocationsByVehicle(targetVehicleId);
        const settings = await this.repository.getSettings(schoolId);

        if (currentCount >= vehicle.seating_capacity && settings.enforce_strict_capacity) {
          const err = new Error(
            `Vehicle capacity exceeded! Bus '${vehicle.vehicle_number}' has a capacity of ${vehicle.seating_capacity} seats, and already has ${currentCount} active students allocated.`
          );
          err.status = 400;
          throw err;
        }
      }
    }

    return this.repository.updateStudentAllocation(id, schoolId, data);
  }

  async deleteStudentAllocation(id, schoolId) {
    await this.getAllocationById(id, schoolId);
    return this.repository.deleteStudentAllocation(id, schoolId);
  }

  // ==========================================
  // 6. DAILY TRANSPORT TRIPS & BOARDING ATTENDANCE
  // ==========================================

  async listTrips(params) {
    return this.repository.listTrips(params);
  }

  async getTripById(id, schoolId) {
    const trip = await this.repository.getTripById(id, schoolId);
    if (!trip) {
      const err = new Error(`Transport trip with ID ${id} not found`);
      err.status = 404;
      throw err;
    }
    return trip;
  }

  async createTrip(schoolId, data) {
    // Validate vehicle and driver exist and are active
    const vehicle = await this.getVehicleById(data.vehicle_id, schoolId);
    if (vehicle.status !== 'ACTIVE') {
      const err = new Error(`Cannot assign vehicle ${vehicle.vehicle_number} because its status is ${vehicle.status}`);
      err.status = 400;
      throw err;
    }

    const driver = await this.getDriverById(data.driver_id, schoolId);
    if (driver.status === 'INACTIVE' || driver.status === 'SUSPENDED') {
      const err = new Error(`Cannot assign driver because their status is ${driver.status}`);
      err.status = 400;
      throw err;
    }

    return this.repository.createTrip(schoolId, data);
  }

  async updateTrip(id, schoolId, data) {
    await this.getTripById(id, schoolId);
    return this.repository.updateTrip(id, schoolId, data);
  }

  async deleteTrip(id, schoolId) {
    await this.getTripById(id, schoolId);
    return this.repository.deleteTrip(id, schoolId);
  }

  async getTripPassengerRoster(tripId, schoolId) {
    const data = await this.repository.getTripPassengerRoster(tripId, schoolId);
    if (!data) {
      const err = new Error(`Trip with ID ${tripId} not found`);
      err.status = 404;
      throw err;
    }
    return data;
  }

  async recordAttendanceBatch(tripId, schoolId, userId, records) {
    await this.getTripById(tripId, schoolId);
    return this.repository.recordAttendanceBatch(tripId, schoolId, userId, records);
  }

  // ==========================================
  // 7. DASHBOARD & REPORTS
  // ==========================================

  async getDashboardMetrics(schoolId) {
    return this.repository.getDashboardMetrics(schoolId);
  }

  async getRouteRosterReport(routeId, schoolId) {
    await this.getRouteById(routeId, schoolId);
    return this.repository.getRouteRosterReport(routeId, schoolId);
  }

  async getFleetUtilizationReport(schoolId) {
    return this.repository.getFleetUtilizationReport(schoolId);
  }

  async getDailyAttendanceReport(params) {
    return this.repository.getDailyAttendanceReport(params);
  }
}

module.exports = TransportService;
