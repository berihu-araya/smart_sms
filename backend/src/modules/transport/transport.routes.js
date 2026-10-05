const express = require('express');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');
const {
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
} = require('./transport.controller');

const router = express.Router();

router.use(authMiddleware);

// Roles definitions
const ADMIN_ROLES = ['School Admin', 'Admin'];
const MANAGEMENT_ROLES = ['School Admin', 'Admin', 'Staff'];
const DRIVER_AND_MANAGEMENT = ['School Admin', 'Admin', 'Staff', 'Driver'];
const ALL_PORTAL_ROLES = ['School Admin', 'Admin', 'Staff', 'Teacher', 'Driver', 'Parent', 'Student'];

// 1. SETTINGS & CONFIG
router.get('/config', authorizeRoles(...MANAGEMENT_ROLES), getSettings);
router.put('/config', authorizeRoles(...ADMIN_ROLES), updateSettings);

// 2. DASHBOARD STATS
router.get('/stats', authorizeRoles(...DRIVER_AND_MANAGEMENT), getDashboardStats);

// 3. VEHICLES (FLEET MANAGEMENT)
router.get('/vehicles', authorizeRoles(...ALL_PORTAL_ROLES), listVehicles);
router.get('/vehicles/:id', authorizeRoles(...ALL_PORTAL_ROLES), getVehicleById);
router.post('/vehicles', authorizeRoles(...MANAGEMENT_ROLES), createVehicle);
router.put('/vehicles/:id', authorizeRoles(...MANAGEMENT_ROLES), updateVehicle);
router.delete('/vehicles/:id', authorizeRoles(...ADMIN_ROLES), deleteVehicle);

// 4. DRIVERS (LINKED TO EXISTING STAFF/USERS)
router.get('/drivers', authorizeRoles(...ALL_PORTAL_ROLES), listDrivers);
router.get('/drivers/:id', authorizeRoles(...ALL_PORTAL_ROLES), getDriverById);
router.post('/drivers', authorizeRoles(...MANAGEMENT_ROLES), createDriver);
router.put('/drivers/:id', authorizeRoles(...MANAGEMENT_ROLES), updateDriver);
router.delete('/drivers/:id', authorizeRoles(...ADMIN_ROLES), deleteDriver);

// 5. ROUTES & ORDERED STOPS
router.get('/routes', authorizeRoles(...ALL_PORTAL_ROLES), listRoutes);
router.get('/routes/:id', authorizeRoles(...ALL_PORTAL_ROLES), getRouteById);
router.post('/routes', authorizeRoles(...MANAGEMENT_ROLES), createRoute);
router.put('/routes/:id', authorizeRoles(...MANAGEMENT_ROLES), updateRoute);
router.delete('/routes/:id', authorizeRoles(...ADMIN_ROLES), deleteRoute);

router.get('/routes/:routeId/stops', authorizeRoles(...ALL_PORTAL_ROLES), listStopsByRoute);
router.post('/stops', authorizeRoles(...MANAGEMENT_ROLES), createStop);
router.post('/routes/:routeId/stops/bulk', authorizeRoles(...MANAGEMENT_ROLES), createBulkStops);
router.put('/stops/:id', authorizeRoles(...MANAGEMENT_ROLES), updateStop);
router.delete('/stops/:id', authorizeRoles(...ADMIN_ROLES), deleteStop);

// 6. STUDENT TRANSPORT ALLOCATIONS (CAPACITY ENFORCEMENT)
router.get('/allocations/my-info', authorizeRoles('Student', 'Parent'), getMyTransportInfo);
router.get('/allocations', authorizeRoles(...ALL_PORTAL_ROLES), listStudentAllocations);
router.get('/allocations/:id', authorizeRoles(...ALL_PORTAL_ROLES), getAllocationById);
router.post('/allocations', authorizeRoles(...MANAGEMENT_ROLES), createStudentAllocation);
router.put('/allocations/:id', authorizeRoles(...MANAGEMENT_ROLES), updateStudentAllocation);
router.delete('/allocations/:id', authorizeRoles(...ADMIN_ROLES), deleteStudentAllocation);

// 7. DAILY TRANSPORT TRIPS & BOARDING ATTENDANCE
router.get('/trips', authorizeRoles(...ALL_PORTAL_ROLES), listTrips);
router.get('/trips/:id', authorizeRoles(...ALL_PORTAL_ROLES), getTripById);
router.post('/trips', authorizeRoles(...MANAGEMENT_ROLES), createTrip);
router.put('/trips/:id', authorizeRoles(...DRIVER_AND_MANAGEMENT), updateTrip);
router.delete('/trips/:id', authorizeRoles(...ADMIN_ROLES), deleteTrip);

router.get('/trips/:id/roster', authorizeRoles(...DRIVER_AND_MANAGEMENT), getTripPassengerRoster);
router.post('/trips/:id/attendance', authorizeRoles(...DRIVER_AND_MANAGEMENT), recordAttendanceBatch);

// 8. TRANSPORT REPORTS
router.get('/reports/route-roster/:routeId', authorizeRoles(...MANAGEMENT_ROLES), getRouteRosterReport);
router.get('/reports/fleet-utilization', authorizeRoles(...MANAGEMENT_ROLES), getFleetUtilizationReport);
router.get('/reports/daily-attendance', authorizeRoles(...MANAGEMENT_ROLES), getDailyAttendanceReport);

module.exports = router;
