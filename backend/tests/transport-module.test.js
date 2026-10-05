/**
 * Transport Module Integration & Unit Test Suite
 * Tests Vehicles, Drivers (linked to users), Routes, Ordered Stops,
 * Student Allocations (Capacity Enforcement), Daily Trips, Boarding Attendance, and Reports.
 */

const { db } = require('../src/config/database');
const TransportRepository = require('../src/modules/transport/transport.repository');
const TransportService = require('../src/modules/transport/transport.service');

async function runTests() {
  console.log('=== STARTING TRANSPORT MODULE TESTS ===');
  const repository = new TransportRepository(db);
  const service = new TransportService(repository);

  let testUserId = null;
  let testDriverId = null;
  let testVehicleId = null;
  let testRouteId = null;
  let testStop1Id = null;
  let testStop2Id = null;
  let testStudentId = null;
  let testAllocationId = null;
  let testTripId = null;

  try {
    // 0. Fetch or create a test staff user and a test student for foreign key integrity
    console.log('\n[0] Setting up test user and student references...');
    const userRes = await db.query(`SELECT id FROM users WHERE deleted_at IS NULL LIMIT 1`);
    if (userRes.rows.length > 0) {
      testUserId = userRes.rows[0].id;
    } else {
      const roleRes = await db.query(`SELECT id FROM roles WHERE LOWER(name) = 'staff' LIMIT 1`);
      const roleId = roleRes.rows[0]?.id;
      const newUser = await db.query(
        `INSERT INTO users (first_name, last_name, email, password_hash, role_id)
         VALUES ('Transport', 'DriverTester', 'transport.tester@test.com', 'hash', $1)
         RETURNING id`,
        [roleId]
      );
      testUserId = newUser.rows[0].id;
    }
    console.log('✓ Test user ID:', testUserId);

    const studentRes = await db.query(`SELECT id FROM students WHERE deleted_at IS NULL LIMIT 1`);
    if (studentRes.rows.length > 0) {
      testStudentId = studentRes.rows[0].id;
    } else {
      const newStudent = await db.query(
        `INSERT INTO students (admission_number, first_name, last_name, gender, admission_date)
         VALUES ('ADM-TRANS-01', 'TestStudent', 'Passenger', 'Male', CURRENT_DATE)
         RETURNING id`
      );
      testStudentId = newStudent.rows[0].id;
    }
    console.log('✓ Test student ID:', testStudentId);

    // 1. Settings
    console.log('\n[1] Testing Transport Settings...');
    const settings = await service.getSettings();
    console.log('✓ Default settings retrieved:', {
      strict_capacity: settings.enforce_strict_capacity,
      currency: settings.fare_currency,
      morning_departure: settings.default_morning_departure,
    });

    const updatedSettings = await service.updateSettings(null, {
      enforce_strict_capacity: true,
      default_morning_departure: '06:45',
      default_afternoon_departure: '15:15',
      fare_currency: 'USD',
    });
    console.log('✓ Settings updated:', {
      morning_departure: updatedSettings.default_morning_departure,
      afternoon_departure: updatedSettings.default_afternoon_departure,
    });

    // 2. Vehicles (Fleet Management)
    console.log('\n[2] Testing Vehicle Fleet CRUD & Capacity...');
    const vehicle = await service.createVehicle(null, {
      vehicle_number: 'BUS-TEST-101',
      vehicle_model: 'Mercedes-Benz Sprinter 516',
      seating_capacity: 1, // Set to 1 for capacity enforcement testing!
      fuel_type: 'Diesel',
      registration_number: 'REG-98765-FL',
      ownership_type: 'OWNED',
      status: 'ACTIVE',
      notes: 'Dedicated test minibus',
    });
    testVehicleId = vehicle.id;
    console.log('✓ Vehicle created successfully:', {
      id: vehicle.id,
      number: vehicle.vehicle_number,
      capacity: vehicle.seating_capacity,
      status: vehicle.status,
    });

    const vehicleList = await service.listVehicles({ search: 'BUS-TEST-101' });
    if (vehicleList.data.length === 0) throw new Error('Vehicle search failed');
    console.log('✓ Vehicle listed in fleet search, count:', vehicleList.data.length);

    // 3. Drivers (Reusing existing users)
    console.log('\n[3] Testing Driver Onboarding & Linking to User...');
    // Delete any previous test driver with same user_id
    await db.query(`DELETE FROM transport_drivers WHERE user_id = $1`, [testUserId]);

    const driver = await service.createDriver(null, {
      user_id: testUserId,
      license_number: 'DL-COMM-2026-999',
      license_type: 'Commercial Heavy',
      emergency_contact: '+1 555-0199',
      status: 'ACTIVE',
      notes: 'Experienced school bus operator',
    });
    testDriverId = driver.id;
    console.log('✓ Driver registered and linked to user account:', {
      id: driver.id,
      name: `${driver.first_name} ${driver.last_name}`,
      license: driver.license_number,
      status: driver.status,
    });

    // 4. Routes & Ordered Stops
    console.log('\n[4] Testing Routes & Ordered Stops...');
    const route = await service.createRoute(null, {
      route_name: 'Route 101 - North Highland to Main Campus',
      route_code: 'R-101-N',
      start_location: 'North Highland Gate',
      end_location: 'Main Campus East Entrance',
      default_vehicle_id: testVehicleId,
      default_driver_id: testDriverId,
      distance_km: 14.5,
      estimated_duration_minutes: 35,
      fare_amount: 50.00,
      status: 'ACTIVE',
      description: 'Morning and afternoon suburban route',
    });
    testRouteId = route.id;
    console.log('✓ Route created:', {
      id: route.id,
      name: route.route_name,
      code: route.route_code,
      distance: route.distance_km,
    });

    // Add ordered stops
    const stop1 = await service.createStop(null, {
      route_id: testRouteId,
      stop_name: 'Highland Square Crossing',
      stop_order: 1,
      pickup_time: '07:05',
      dropoff_time: '15:45',
      landmark: 'Opposite Central Park Gate',
    });
    testStop1Id = stop1.id;

    const stop2 = await service.createStop(null, {
      route_id: testRouteId,
      stop_name: 'Oakridge Library Junction',
      stop_order: 2,
      pickup_time: '07:20',
      dropoff_time: '15:30',
      landmark: 'Near Public Library',
    });
    testStop2Id = stop2.id;
    console.log('✓ Ordered stops created:', [stop1.stop_name, stop2.stop_name]);

    const stopsList = await service.listStopsByRoute(testRouteId);
    if (stopsList.length !== 2) throw new Error('Stops listing count mismatch');
    console.log('✓ Ordered stops verified in sequence:', stopsList.map((s) => `${s.stop_order}. ${s.stop_name}`));

    // 5. Student Allocations & Capacity Enforcement
    console.log('\n[5] Testing Student Transport Allocation & Capacity Enforcement...');
    const allocation = await service.createStudentAllocation(null, {
      student_id: testStudentId,
      route_id: testRouteId,
      pickup_stop_id: testStop1Id,
      dropoff_stop_id: testStop2Id,
      assigned_vehicle_id: testVehicleId,
      trip_type: 'BOTH',
      seat_number: '1A',
      status: 'ACTIVE',
    });
    testAllocationId = allocation.id;
    console.log('✓ Student allocated to route and stop:', {
      id: allocation.id,
      student: `${allocation.student_first_name} ${allocation.student_last_name}`,
      pickup: allocation.pickup_stop_name,
      dropoff: allocation.dropoff_stop_name,
      seat: allocation.seat_number,
    });

    // Test Capacity Enforcement: Bus capacity is 1, and 1 student is active.
    // Attempting to allocate another student should fail with capacity error!
    console.log('\n[5b] Testing Over-Capacity Protection (Max capacity: 1, current: 1)...');
    try {
      // Find or create second student
      const student2Res = await db.query(
        `SELECT id FROM students WHERE id != $1 AND deleted_at IS NULL LIMIT 1`,
        [testStudentId]
      );
      let secondStudentId = student2Res.rows[0]?.id;
      if (!secondStudentId) {
        const s2 = await db.query(
          `INSERT INTO students (admission_number, first_name, last_name, gender, admission_date)
           VALUES ('ADM-TRANS-02', 'SecondStudent', 'Overflow', 'Female', CURRENT_DATE)
           RETURNING id`
        );
        secondStudentId = s2.rows[0].id;
      }

      await service.createStudentAllocation(null, {
        student_id: secondStudentId,
        route_id: testRouteId,
        pickup_stop_id: testStop1Id,
        assigned_vehicle_id: testVehicleId,
        status: 'ACTIVE',
      });
      throw new Error('FAILED: Capacity limit was not enforced!');
    } catch (capErr) {
      if (capErr.message && capErr.message.includes('Vehicle capacity exceeded')) {
        console.log('✓ Capacity enforcement correctly blocked over-allocation:', capErr.message);
      } else {
        throw capErr;
      }
    }

    // 6. Daily Transport Trips
    console.log('\n[6] Testing Daily Transport Trip Creation & Assignment...');
    const todayStr = new Date().toISOString().split('T')[0];
    const trip = await service.createTrip(null, {
      route_id: testRouteId,
      vehicle_id: testVehicleId,
      driver_id: testDriverId,
      trip_date: todayStr,
      trip_type: 'PICKUP',
      scheduled_start_time: '07:00',
      scheduled_end_time: '07:45',
      status: 'SCHEDULED',
      odometer_start: 12450.0,
      notes: 'Morning school run',
    });
    testTripId = trip.id;
    console.log('✓ Daily trip dispatched and scheduled:', {
      id: trip.id,
      date: trip.trip_date,
      type: trip.trip_type,
      route: trip.route_name,
      vehicle: trip.vehicle_number,
      driver: `${trip.driver_first_name} ${trip.driver_last_name}`,
    });

    // 7. Student Boarding Attendance
    console.log('\n[7] Testing Passenger Roster & Boarding Attendance...');
    const rosterData = await service.getTripPassengerRoster(testTripId);
    console.log(`✓ Passenger roster loaded: ${rosterData.passengers.length} passenger(s) on route`);

    const attendanceRecords = await service.recordAttendanceBatch(testTripId, null, testUserId, [
      {
        student_id: testStudentId,
        stop_id: testStop1Id,
        status: 'BOARDED',
        remarks: 'Boarded at Highland Square on time',
      },
    ]);
    console.log('✓ Attendance marked successfully:', {
      student_id: attendanceRecords[0].student_id,
      status: attendanceRecords[0].status,
      remarks: attendanceRecords[0].remarks,
    });

    // Update trip status to IN_PROGRESS and then COMPLETED
    const completedTrip = await service.updateTrip(testTripId, null, {
      status: 'COMPLETED',
      odometer_end: 12464.5,
    });
    console.log('✓ Trip status updated to:', completedTrip.status);

    // 8. Dashboard Metrics & Reports
    console.log('\n[8] Testing Dashboard Metrics & Reports...');
    const metrics = await service.getDashboardMetrics();
    console.log('✓ Dashboard metrics computed:', {
      total_vehicles: metrics.total_vehicles,
      active_vehicles: metrics.active_vehicles,
      total_drivers: metrics.total_drivers,
      total_routes: metrics.total_routes,
      allocated_students: metrics.allocated_students,
      capacity_utilization_rate: `${metrics.capacity_utilization_rate}%`,
      today_total_trips: metrics.today_total_trips,
      today_boarded_count: metrics.today_boarded_count,
    });

    const routeRoster = await service.getRouteRosterReport(testRouteId);
    console.log(`✓ Route roster report generated with ${routeRoster.length} student entries`);

    const fleetUtil = await service.getFleetUtilizationReport();
    console.log(`✓ Fleet utilization report generated for ${fleetUtil.length} vehicle(s)`);

    const dailyAttendance = await service.getDailyAttendanceReport({ date: todayStr });
    console.log(`✓ Daily attendance report generated with ${dailyAttendance.length} entries`);

    console.log('\n=== ALL TRANSPORT MODULE TESTS PASSED SUCCESSFULLY! ===');
  } catch (error) {
    console.error('\n❌ TRANSPORT TEST FAILED:', error);
    process.exitCode = 1;
  } finally {
    // Cleanup test records
    console.log('\n[Cleanup] Cleaning up test records...');
    try {
      if (testTripId) await db.query(`DELETE FROM transport_trips WHERE id = $1`, [testTripId]);
      if (testAllocationId) await db.query(`DELETE FROM transport_student_allocations WHERE id = $1`, [testAllocationId]);
      if (testStop1Id) await db.query(`DELETE FROM transport_stops WHERE id = $1`, [testStop1Id]);
      if (testStop2Id) await db.query(`DELETE FROM transport_stops WHERE id = $1`, [testStop2Id]);
      if (testRouteId) await db.query(`DELETE FROM transport_routes WHERE id = $1`, [testRouteId]);
      if (testDriverId) await db.query(`DELETE FROM transport_drivers WHERE id = $1`, [testDriverId]);
      if (testVehicleId) await db.query(`DELETE FROM transport_vehicles WHERE id = $1`, [testVehicleId]);
      console.log('✓ Cleanup completed');
    } catch (cleanupErr) {
      console.error('Error during test cleanup:', cleanupErr.message);
    }
  }
}

runTests().then(() => {
  if (process.exitCode === 1) {
    process.exit(1);
  } else {
    process.exit(0);
  }
});
