/**
 * Transport Validation Module
 * Validates request payloads for Transport entities.
 */

function validateUUID(value, fieldName = 'ID') {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!value || !uuidRegex.test(value)) {
    return `${fieldName} must be a valid UUID`;
  }
  return null;
}

function validateVehicle(data, isUpdate = false) {
  const errors = [];

  if (!isUpdate || data.vehicle_number !== undefined) {
    if (!data.vehicle_number || typeof data.vehicle_number !== 'string' || !data.vehicle_number.trim()) {
      errors.push('Vehicle number/plate is required');
    }
  }

  if (!isUpdate || data.vehicle_model !== undefined) {
    if (!data.vehicle_model || typeof data.vehicle_model !== 'string' || !data.vehicle_model.trim()) {
      errors.push('Vehicle model is required');
    }
  }

  if (data.seating_capacity !== undefined) {
    const cap = parseInt(data.seating_capacity, 10);
    if (isNaN(cap) || cap <= 0 || cap > 200) {
      errors.push('Seating capacity must be a positive integer between 1 and 200');
    }
  } else if (!isUpdate) {
    errors.push('Seating capacity is required');
  }

  if (data.status && !['ACTIVE', 'MAINTENANCE', 'OUT_OF_SERVICE', 'RETIRED'].includes(data.status.toUpperCase())) {
    errors.push('Status must be ACTIVE, MAINTENANCE, OUT_OF_SERVICE, or RETIRED');
  }

  if (data.fuel_type && !['Diesel', 'Petrol', 'Electric', 'Hybrid', 'CNG', 'Other'].includes(data.fuel_type)) {
    errors.push('Invalid fuel type');
  }

  return { isValid: errors.length === 0, errors };
}

function validateDriver(data, isUpdate = false) {
  const errors = [];

  if (!isUpdate || data.user_id !== undefined) {
    const uuidErr = validateUUID(data.user_id, 'User ID');
    if (uuidErr) errors.push(uuidErr);
  }

  if (!isUpdate || data.license_number !== undefined) {
    if (!data.license_number || typeof data.license_number !== 'string' || !data.license_number.trim()) {
      errors.push('License number is required');
    }
  }

  if (data.status && !['ACTIVE', 'INACTIVE', 'ON_DUTY', 'SUSPENDED'].includes(data.status.toUpperCase())) {
    errors.push('Status must be ACTIVE, INACTIVE, ON_DUTY, or SUSPENDED');
  }

  return { isValid: errors.length === 0, errors };
}

function validateRoute(data, isUpdate = false) {
  const errors = [];

  if (!isUpdate || data.route_name !== undefined) {
    if (!data.route_name || typeof data.route_name !== 'string' || !data.route_name.trim()) {
      errors.push('Route name is required');
    }
  }

  if (!isUpdate || data.route_code !== undefined) {
    if (!data.route_code || typeof data.route_code !== 'string' || !data.route_code.trim()) {
      errors.push('Route code is required');
    }
  }

  if (!isUpdate || data.start_location !== undefined) {
    if (!data.start_location || typeof data.start_location !== 'string' || !data.start_location.trim()) {
      errors.push('Start location is required');
    }
  }

  if (!isUpdate || data.end_location !== undefined) {
    if (!data.end_location || typeof data.end_location !== 'string' || !data.end_location.trim()) {
      errors.push('End location is required');
    }
  }

  if (data.default_vehicle_id) {
    const uuidErr = validateUUID(data.default_vehicle_id, 'Default Vehicle ID');
    if (uuidErr) errors.push(uuidErr);
  }

  if (data.default_driver_id) {
    const uuidErr = validateUUID(data.default_driver_id, 'Default Driver ID');
    if (uuidErr) errors.push(uuidErr);
  }

  if (data.distance_km !== undefined && data.distance_km !== null && data.distance_km !== '') {
    const dist = parseFloat(data.distance_km);
    if (isNaN(dist) || dist < 0) {
      errors.push('Distance must be a non-negative number');
    }
  }

  if (data.fare_amount !== undefined && data.fare_amount !== null && data.fare_amount !== '') {
    const fare = parseFloat(data.fare_amount);
    if (isNaN(fare) || fare < 0) {
      errors.push('Fare amount must be a non-negative number');
    }
  }

  if (data.status && !['ACTIVE', 'INACTIVE'].includes(data.status.toUpperCase())) {
    errors.push('Status must be ACTIVE or INACTIVE');
  }

  return { isValid: errors.length === 0, errors };
}

function validateStop(data, isUpdate = false) {
  const errors = [];

  if (!isUpdate || data.route_id !== undefined) {
    const uuidErr = validateUUID(data.route_id, 'Route ID');
    if (uuidErr) errors.push(uuidErr);
  }

  if (!isUpdate || data.stop_name !== undefined) {
    if (!data.stop_name || typeof data.stop_name !== 'string' || !data.stop_name.trim()) {
      errors.push('Stop name is required');
    }
  }

  if (data.stop_order !== undefined) {
    const order = parseInt(data.stop_order, 10);
    if (isNaN(order) || order < 1) {
      errors.push('Stop order must be a positive integer starting at 1');
    }
  }

  return { isValid: errors.length === 0, errors };
}

function validateBulkStops(data) {
  const errors = [];
  if (!Array.isArray(data.stops) || data.stops.length === 0) {
    errors.push('stops array must not be empty');
  } else {
    data.stops.forEach((stop, index) => {
      if (!stop.stop_name || typeof stop.stop_name !== 'string' || !stop.stop_name.trim()) {
        errors.push(`Stop at index ${index} requires a stop_name`);
      }
    });
  }
  return { isValid: errors.length === 0, errors };
}

function validateStudentAllocation(data, isUpdate = false) {
  const errors = [];

  if (!isUpdate || data.student_id !== undefined) {
    const uuidErr = validateUUID(data.student_id, 'Student ID');
    if (uuidErr) errors.push(uuidErr);
  }

  if (!isUpdate || data.route_id !== undefined) {
    const uuidErr = validateUUID(data.route_id, 'Route ID');
    if (uuidErr) errors.push(uuidErr);
  }

  if (data.pickup_stop_id) {
    const uuidErr = validateUUID(data.pickup_stop_id, 'Pickup Stop ID');
    if (uuidErr) errors.push(uuidErr);
  }

  if (data.dropoff_stop_id) {
    const uuidErr = validateUUID(data.dropoff_stop_id, 'Dropoff Stop ID');
    if (uuidErr) errors.push(uuidErr);
  }

  if (data.assigned_vehicle_id) {
    const uuidErr = validateUUID(data.assigned_vehicle_id, 'Assigned Vehicle ID');
    if (uuidErr) errors.push(uuidErr);
  }

  if (data.trip_type && !['BOTH', 'PICKUP_ONLY', 'DROPOFF_ONLY'].includes(data.trip_type.toUpperCase())) {
    errors.push('Trip type must be BOTH, PICKUP_ONLY, or DROPOFF_ONLY');
  }

  if (data.status && !['ACTIVE', 'INACTIVE', 'SUSPENDED', 'CANCELLED'].includes(data.status.toUpperCase())) {
    errors.push('Status must be ACTIVE, INACTIVE, SUSPENDED, or CANCELLED');
  }

  return { isValid: errors.length === 0, errors };
}

function validateTrip(data, isUpdate = false) {
  const errors = [];

  if (!isUpdate || data.route_id !== undefined) {
    const uuidErr = validateUUID(data.route_id, 'Route ID');
    if (uuidErr) errors.push(uuidErr);
  }

  if (!isUpdate || data.vehicle_id !== undefined) {
    const uuidErr = validateUUID(data.vehicle_id, 'Vehicle ID');
    if (uuidErr) errors.push(uuidErr);
  }

  if (!isUpdate || data.driver_id !== undefined) {
    const uuidErr = validateUUID(data.driver_id, 'Driver ID');
    if (uuidErr) errors.push(uuidErr);
  }

  if (!isUpdate || data.trip_date !== undefined) {
    if (!data.trip_date) {
      errors.push('Trip date is required (YYYY-MM-DD)');
    }
  }

  if (data.trip_type && !['PICKUP', 'DROPOFF', 'SPECIAL'].includes(data.trip_type.toUpperCase())) {
    errors.push('Trip type must be PICKUP, DROPOFF, or SPECIAL');
  }

  if (data.status && !['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DELAYED'].includes(data.status.toUpperCase())) {
    errors.push('Status must be SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, or DELAYED');
  }

  return { isValid: errors.length === 0, errors };
}

function validateAttendanceBatch(data) {
  const errors = [];

  if (!data.trip_id) {
    errors.push('Trip ID is required');
  } else {
    const uuidErr = validateUUID(data.trip_id, 'Trip ID');
    if (uuidErr) errors.push(uuidErr);
  }

  if (!Array.isArray(data.records) || data.records.length === 0) {
    errors.push('Records array is required and must contain at least one attendance entry');
  } else {
    data.records.forEach((rec, idx) => {
      if (!rec.student_id) {
        errors.push(`Record ${idx}: student_id is required`);
      }
      if (rec.status && !['BOARDED', 'DROPPED_OFF', 'ABSENT', 'EXCUSED', 'SKIPPED'].includes(rec.status.toUpperCase())) {
        errors.push(`Record ${idx}: invalid status '${rec.status}'`);
      }
    });
  }

  return { isValid: errors.length === 0, errors };
}

function validateTransportSettings(data) {
  const errors = [];
  if (data.fare_currency && typeof data.fare_currency !== 'string') {
    errors.push('fare_currency must be a string (e.g. USD, EUR, ETB)');
  }
  return { isValid: errors.length === 0, errors };
}

module.exports = {
  validateVehicle,
  validateDriver,
  validateRoute,
  validateStop,
  validateBulkStops,
  validateStudentAllocation,
  validateTrip,
  validateAttendanceBatch,
  validateTransportSettings,
};
