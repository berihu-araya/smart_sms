/**
 * Transport Controller
 * HTTP request handlers for Transport endpoints.
 */

const { db } = require('../../config/database');
const TransportRepository = require('./transport.repository');
const TransportService = require('./transport.service');
const {
  validateVehicle,
  validateDriver,
  validateRoute,
  validateStop,
  validateBulkStops,
  validateStudentAllocation,
  validateTrip,
  validateAttendanceBatch,
  validateTransportSettings,
} = require('./transport.validation');

const repository = new TransportRepository(db);
const service = new TransportService(repository);

function getContext(req) {
  const userId = req.user?.sub || req.user?.id;
  const schoolId = req.user?.school_id || req.headers['x-school-id'] || null;
  return { userId, schoolId };
}

// ==========================================
// 1. SETTINGS & CONFIGURATION
// ==========================================

async function getSettings(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const settings = await service.getSettings(schoolId);
    res.json({
      success: true,
      message: 'Transport settings retrieved successfully',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
}

async function updateSettings(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const validation = validateTransportSettings(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors,
      });
    }

    const updated = await service.updateSettings(schoolId, req.body);
    res.json({
      success: true,
      message: 'Transport settings updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 2. DASHBOARD METRICS
// ==========================================

async function getDashboardStats(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const stats = await service.getDashboardMetrics(schoolId);
    res.json({
      success: true,
      message: 'Transport dashboard metrics retrieved successfully',
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 3. VEHICLES (FLEET)
// ==========================================

async function listVehicles(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const { search, status, page, limit } = req.query;
    const result = await service.listVehicles({
      schoolId,
      search,
      status,
      page: parseInt(page, 10) || 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
    res.json({
      success: true,
      message: 'Vehicles retrieved successfully',
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getVehicleById(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const vehicle = await service.getVehicleById(req.params.id, schoolId);
    res.json({
      success: true,
      message: 'Vehicle retrieved successfully',
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
}

async function createVehicle(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const validation = validateVehicle(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors,
      });
    }

    const vehicle = await service.createVehicle(schoolId, req.body);
    res.status(201).json({
      success: true,
      message: 'Vehicle created successfully',
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
}

async function updateVehicle(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const validation = validateVehicle(req.body, true);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors,
      });
    }

    const vehicle = await service.updateVehicle(req.params.id, schoolId, req.body);
    res.json({
      success: true,
      message: 'Vehicle updated successfully',
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteVehicle(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    await service.deleteVehicle(req.params.id, schoolId);
    res.json({
      success: true,
      message: 'Vehicle deleted successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 4. DRIVERS (REUSING EXISTING USERS)
// ==========================================

async function listDrivers(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const { search, status, page, limit } = req.query;
    const result = await service.listDrivers({
      schoolId,
      search,
      status,
      page: parseInt(page, 10) || 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
    res.json({
      success: true,
      message: 'Drivers retrieved successfully',
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getDriverById(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const driver = await service.getDriverById(req.params.id, schoolId);
    res.json({
      success: true,
      message: 'Driver retrieved successfully',
      data: driver,
    });
  } catch (error) {
    next(error);
  }
}

async function createDriver(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const validation = validateDriver(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors,
      });
    }

    const driver = await service.createDriver(schoolId, req.body);
    res.status(201).json({
      success: true,
      message: 'Driver profile created successfully',
      data: driver,
    });
  } catch (error) {
    next(error);
  }
}

async function updateDriver(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const validation = validateDriver(req.body, true);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors,
      });
    }

    const driver = await service.updateDriver(req.params.id, schoolId, req.body);
    res.json({
      success: true,
      message: 'Driver updated successfully',
      data: driver,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteDriver(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    await service.deleteDriver(req.params.id, schoolId);
    res.json({
      success: true,
      message: 'Driver deleted successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 5. ROUTES & ORDERED STOPS
// ==========================================

async function listRoutes(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const { search, status, page, limit } = req.query;
    const result = await service.listRoutes({
      schoolId,
      search,
      status,
      page: parseInt(page, 10) || 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
    res.json({
      success: true,
      message: 'Routes retrieved successfully',
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getRouteById(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const route = await service.getRouteById(req.params.id, schoolId);
    res.json({
      success: true,
      message: 'Route retrieved successfully',
      data: route,
    });
  } catch (error) {
    next(error);
  }
}

async function createRoute(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const validation = validateRoute(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors,
      });
    }

    const route = await service.createRoute(schoolId, req.body);
    res.status(201).json({
      success: true,
      message: 'Route created successfully',
      data: route,
    });
  } catch (error) {
    next(error);
  }
}

async function updateRoute(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const validation = validateRoute(req.body, true);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors,
      });
    }

    const route = await service.updateRoute(req.params.id, schoolId, req.body);
    res.json({
      success: true,
      message: 'Route updated successfully',
      data: route,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteRoute(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    await service.deleteRoute(req.params.id, schoolId);
    res.json({
      success: true,
      message: 'Route deleted successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
}

async function listStopsByRoute(req, res, next) {
  try {
    const stops = await service.listStopsByRoute(req.params.routeId);
    res.json({
      success: true,
      message: 'Stops retrieved successfully',
      data: stops,
    });
  } catch (error) {
    next(error);
  }
}

async function createStop(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const validation = validateStop(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors,
      });
    }

    const stop = await service.createStop(schoolId, req.body);
    res.status(201).json({
      success: true,
      message: 'Stop created successfully',
      data: stop,
    });
  } catch (error) {
    next(error);
  }
}

async function createBulkStops(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const validation = validateBulkStops(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors,
      });
    }

    const stops = await service.createBulkStops(schoolId, req.params.routeId, req.body.stops);
    res.status(201).json({
      success: true,
      message: `${stops.length} stops created successfully`,
      data: stops,
    });
  } catch (error) {
    next(error);
  }
}

async function updateStop(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const validation = validateStop(req.body, true);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors,
      });
    }

    const stop = await service.updateStop(req.params.id, schoolId, req.body);
    res.json({
      success: true,
      message: 'Stop updated successfully',
      data: stop,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteStop(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    await service.deleteStop(req.params.id, schoolId);
    res.json({
      success: true,
      message: 'Stop deleted successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 6. STUDENT TRANSPORT ALLOCATIONS
// ==========================================

async function listStudentAllocations(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const { search, routeId, vehicleId, status, gradeId, page, limit } = req.query;
    const result = await service.listStudentAllocations({
      schoolId,
      search,
      routeId,
      vehicleId,
      status,
      gradeId,
      page: parseInt(page, 10) || 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
    res.json({
      success: true,
      message: 'Student allocations retrieved successfully',
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getAllocationById(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const allocation = await service.getAllocationById(req.params.id, schoolId);
    res.json({
      success: true,
      message: 'Student allocation retrieved successfully',
      data: allocation,
    });
  } catch (error) {
    next(error);
  }
}

async function getMyTransportInfo(req, res, next) {
  try {
    const { userId, schoolId } = getContext(req);
    // Find student record for this user
    const studentRes = await db.query(
      `SELECT id FROM students WHERE user_id = $1 AND deleted_at IS NULL LIMIT 1`,
      [userId]
    );
    if (!studentRes.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'No student profile linked to this account',
      });
    }

    const allocation = await service.getAllocationByStudentId(studentRes.rows[0].id, schoolId);
    res.json({
      success: true,
      message: 'Transport information retrieved successfully',
      data: allocation,
    });
  } catch (error) {
    next(error);
  }
}

async function createStudentAllocation(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const validation = validateStudentAllocation(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors,
      });
    }

    const allocation = await service.createStudentAllocation(schoolId, req.body);
    res.status(201).json({
      success: true,
      message: 'Student successfully allocated to transport route',
      data: allocation,
    });
  } catch (error) {
    next(error);
  }
}

async function updateStudentAllocation(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const validation = validateStudentAllocation(req.body, true);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors,
      });
    }

    const allocation = await service.updateStudentAllocation(req.params.id, schoolId, req.body);
    res.json({
      success: true,
      message: 'Student allocation updated successfully',
      data: allocation,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteStudentAllocation(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    await service.deleteStudentAllocation(req.params.id, schoolId);
    res.json({
      success: true,
      message: 'Student transport allocation deleted successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 7. DAILY TRIPS & BOARDING ATTENDANCE
// ==========================================

async function listTrips(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const { search, date, routeId, vehicleId, driverId, status, page, limit } = req.query;
    const result = await service.listTrips({
      schoolId,
      search,
      date,
      routeId,
      vehicleId,
      driverId,
      status,
      page: parseInt(page, 10) || 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
    res.json({
      success: true,
      message: 'Trips retrieved successfully',
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getTripById(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const trip = await service.getTripById(req.params.id, schoolId);
    res.json({
      success: true,
      message: 'Trip retrieved successfully',
      data: trip,
    });
  } catch (error) {
    next(error);
  }
}

async function createTrip(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const validation = validateTrip(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors,
      });
    }

    const trip = await service.createTrip(schoolId, req.body);
    res.status(201).json({
      success: true,
      message: 'Transport trip scheduled successfully',
      data: trip,
    });
  } catch (error) {
    next(error);
  }
}

async function updateTrip(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const validation = validateTrip(req.body, true);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors,
      });
    }

    const trip = await service.updateTrip(req.params.id, schoolId, req.body);
    res.json({
      success: true,
      message: 'Transport trip updated successfully',
      data: trip,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteTrip(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    await service.deleteTrip(req.params.id, schoolId);
    res.json({
      success: true,
      message: 'Transport trip deleted successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
}

async function getTripPassengerRoster(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const data = await service.getTripPassengerRoster(req.params.id, schoolId);
    res.json({
      success: true,
      message: 'Passenger roster retrieved successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function recordAttendanceBatch(req, res, next) {
  try {
    const { userId, schoolId } = getContext(req);
    const validation = validateAttendanceBatch({
      trip_id: req.params.id,
      records: req.body.records,
    });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors,
      });
    }

    const results = await service.recordAttendanceBatch(
      req.params.id,
      schoolId,
      userId,
      req.body.records
    );
    res.json({
      success: true,
      message: `Boarding attendance recorded for ${results.length} students`,
      data: results,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 8. REPORTS
// ==========================================

async function getRouteRosterReport(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const report = await service.getRouteRosterReport(req.params.routeId, schoolId);
    res.json({
      success: true,
      message: 'Route roster report generated successfully',
      data: report,
    });
  } catch (error) {
    next(error);
  }
}

async function getFleetUtilizationReport(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const report = await service.getFleetUtilizationReport(schoolId);
    res.json({
      success: true,
      message: 'Fleet utilization report generated successfully',
      data: report,
    });
  } catch (error) {
    next(error);
  }
}

async function getDailyAttendanceReport(req, res, next) {
  try {
    const { schoolId } = getContext(req);
    const { date, routeId } = req.query;
    const report = await service.getDailyAttendanceReport({
      schoolId,
      date,
      routeId,
    });
    res.json({
      success: true,
      message: 'Daily transport attendance report generated successfully',
      data: report,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSettings,
  updateSettings,
  getDashboardStats,
  listVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  listDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  deleteDriver,
  listRoutes,
  getRouteById,
  createRoute,
  updateRoute,
  deleteRoute,
  listStopsByRoute,
  createStop,
  createBulkStops,
  updateStop,
  deleteStop,
  listStudentAllocations,
  getAllocationById,
  getMyTransportInfo,
  createStudentAllocation,
  updateStudentAllocation,
  deleteStudentAllocation,
  listTrips,
  getTripById,
  createTrip,
  updateTrip,
  deleteTrip,
  getTripPassengerRoster,
  recordAttendanceBatch,
  getRouteRosterReport,
  getFleetUtilizationReport,
  getDailyAttendanceReport,
};
