/**
 * Transport Repository
 * Data access layer for school transport module with multi-tenant scoping.
 */

class TransportRepository {
  constructor(database) {
    this.db = database;
  }

  // ==========================================
  // 1. SETTINGS & CONFIGURATION
  // ==========================================

  async getSettings(schoolId) {
    let query = `SELECT * FROM transport_settings`;
    const params = [];
    if (schoolId) {
      query += ` WHERE school_id = $1`;
      params.push(schoolId);
    }
    query += ` LIMIT 1`;
    const res = await this.db.query(query, params);
    if (res.rows.length > 0) return res.rows[0];

    // Create default settings if not exists
    const insertQuery = `
      INSERT INTO transport_settings (school_id, enforce_strict_capacity, notify_parents_on_boarding, fare_currency)
      VALUES ($1, true, true, 'USD')
      RETURNING *
    `;
    const inserted = await this.db.query(insertQuery, [schoolId || null]);
    return inserted.rows[0];
  }

  async updateSettings(schoolId, data) {
    const existing = await this.getSettings(schoolId);
    const query = `
      UPDATE transport_settings
      SET enforce_strict_capacity = COALESCE($1, enforce_strict_capacity),
          notify_parents_on_boarding = COALESCE($2, notify_parents_on_boarding),
          default_morning_departure = COALESCE($3, default_morning_departure),
          default_afternoon_departure = COALESCE($4, default_afternoon_departure),
          fare_currency = COALESCE($5, fare_currency),
          allow_qr_attendance = COALESCE($6, allow_qr_attendance),
          updated_at = current_timestamp
      WHERE id = $7
      RETURNING *
    `;
    const values = [
      data.enforce_strict_capacity !== undefined ? data.enforce_strict_capacity : null,
      data.notify_parents_on_boarding !== undefined ? data.notify_parents_on_boarding : null,
      data.default_morning_departure || null,
      data.default_afternoon_departure || null,
      data.fare_currency || null,
      data.allow_qr_attendance !== undefined ? data.allow_qr_attendance : null,
      existing.id,
    ];
    const res = await this.db.query(query, values);
    return res.rows[0];
  }

  // ==========================================
  // 2. VEHICLES (FLEET)
  // ==========================================

  async listVehicles({ schoolId, search, status, page = 1, limit = 50 }) {
    let query = `
      SELECT v.*,
        (
          SELECT COUNT(*)::int
          FROM transport_student_allocations sa
          WHERE sa.assigned_vehicle_id = v.id
            AND sa.status = 'ACTIVE'
            AND sa.deleted_at IS NULL
        ) AS current_allocated_students,
        (
          SELECT COUNT(*)::int
          FROM transport_routes r
          WHERE r.default_vehicle_id = v.id
            AND r.deleted_at IS NULL
        ) AS assigned_routes_count
      FROM transport_vehicles v
      WHERE v.deleted_at IS NULL
    `;
    const params = [];

    if (schoolId) {
      params.push(schoolId);
      query += ` AND v.school_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND v.status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (v.vehicle_number ILIKE $${params.length} OR v.vehicle_model ILIKE $${params.length} OR v.registration_number ILIKE $${params.length})`;
    }

    // Count query
    const countRes = await this.db.query(
      `SELECT COUNT(*)::int AS total FROM (${query}) AS counted_vehicles`,
      params
    );
    const total = countRes.rows[0]?.total || 0;

    query += ` ORDER BY v.created_at DESC`;

    if (limit > 0) {
      const offset = (page - 1) * limit;
      params.push(limit, offset);
      query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;
    }

    const res = await this.db.query(query, params);
    return { data: res.rows, total, page, limit };
  }

  async getVehicleById(id, schoolId = null) {
    let query = `
      SELECT v.*,
        (
          SELECT COUNT(*)::int
          FROM transport_student_allocations sa
          WHERE sa.assigned_vehicle_id = v.id
            AND sa.status = 'ACTIVE'
            AND sa.deleted_at IS NULL
        ) AS current_allocated_students
      FROM transport_vehicles v
      WHERE v.id = $1 AND v.deleted_at IS NULL
    `;
    const params = [id];
    if (schoolId) {
      params.push(schoolId);
      query += ` AND v.school_id = $2`;
    }
    const res = await this.db.query(query, params);
    return res.rows[0] || null;
  }

  async createVehicle(schoolId, data) {
    const query = `
      INSERT INTO transport_vehicles (
        school_id, vehicle_number, vehicle_model, seating_capacity,
        registration_number, chassis_number, manufacturing_year, fuel_type,
        insurance_policy_number, insurance_expiry_date, fitness_certificate_expiry,
        ownership_type, status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
    const values = [
      schoolId || null,
      data.vehicle_number.trim(),
      data.vehicle_model.trim(),
      parseInt(data.seating_capacity, 10) || 30,
      data.registration_number || null,
      data.chassis_number || null,
      data.manufacturing_year ? parseInt(data.manufacturing_year, 10) : null,
      data.fuel_type || 'Diesel',
      data.insurance_policy_number || null,
      data.insurance_expiry_date || null,
      data.fitness_certificate_expiry || null,
      data.ownership_type || 'OWNED',
      data.status || 'ACTIVE',
      data.notes || null,
    ];
    const res = await this.db.query(query, values);
    return res.rows[0];
  }

  async updateVehicle(id, schoolId, data) {
    const query = `
      UPDATE transport_vehicles
      SET vehicle_number = COALESCE($1, vehicle_number),
          vehicle_model = COALESCE($2, vehicle_model),
          seating_capacity = COALESCE($3, seating_capacity),
          registration_number = COALESCE($4, registration_number),
          chassis_number = COALESCE($5, chassis_number),
          manufacturing_year = COALESCE($6, manufacturing_year),
          fuel_type = COALESCE($7, fuel_type),
          insurance_policy_number = COALESCE($8, insurance_policy_number),
          insurance_expiry_date = COALESCE($9, insurance_expiry_date),
          fitness_certificate_expiry = COALESCE($10, fitness_certificate_expiry),
          ownership_type = COALESCE($11, ownership_type),
          status = COALESCE($12, status),
          notes = COALESCE($13, notes),
          updated_at = current_timestamp
      WHERE id = $14 AND (school_id = $15 OR $15 IS NULL) AND deleted_at IS NULL
      RETURNING *
    `;
    const values = [
      data.vehicle_number !== undefined ? data.vehicle_number.trim() : null,
      data.vehicle_model !== undefined ? data.vehicle_model.trim() : null,
      data.seating_capacity !== undefined ? parseInt(data.seating_capacity, 10) : null,
      data.registration_number !== undefined ? data.registration_number : null,
      data.chassis_number !== undefined ? data.chassis_number : null,
      data.manufacturing_year !== undefined ? (data.manufacturing_year ? parseInt(data.manufacturing_year, 10) : null) : null,
      data.fuel_type !== undefined ? data.fuel_type : null,
      data.insurance_policy_number !== undefined ? data.insurance_policy_number : null,
      data.insurance_expiry_date !== undefined ? (data.insurance_expiry_date || null) : null,
      data.fitness_certificate_expiry !== undefined ? (data.fitness_certificate_expiry || null) : null,
      data.ownership_type !== undefined ? data.ownership_type : null,
      data.status !== undefined ? data.status : null,
      data.notes !== undefined ? data.notes : null,
      id,
      schoolId || null,
    ];
    const res = await this.db.query(query, values);
    return res.rows[0] || null;
  }

  async deleteVehicle(id, schoolId = null) {
    let query = `
      UPDATE transport_vehicles
      SET deleted_at = current_timestamp
      WHERE id = $1 AND deleted_at IS NULL
    `;
    const params = [id];
    if (schoolId) {
      params.push(schoolId);
      query += ` AND school_id = $2`;
    }
    query += ` RETURNING *`;
    const res = await this.db.query(query, params);
    return res.rows[0] || null;
  }

  // ==========================================
  // 3. DRIVERS (REUSING EXISTING USERS)
  // ==========================================

  async listDrivers({ schoolId, search, status, page = 1, limit = 50 }) {
    let query = `
      SELECT d.*,
        u.first_name, u.last_name, u.email, u.phone AS user_phone, u.status AS user_status,
        (
          SELECT COUNT(*)::int
          FROM transport_routes r
          WHERE r.default_driver_id = d.id
            AND r.deleted_at IS NULL
        ) AS assigned_routes_count,
        (
          SELECT COUNT(*)::int
          FROM transport_trips t
          WHERE t.driver_id = d.id
            AND t.trip_date = current_date
            AND t.deleted_at IS NULL
        ) AS today_trips_count
      FROM transport_drivers d
      INNER JOIN users u ON u.id = d.user_id
      WHERE d.deleted_at IS NULL
    `;
    const params = [];

    if (schoolId) {
      params.push(schoolId);
      query += ` AND d.school_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND d.status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR d.license_number ILIKE $${params.length} OR d.emergency_contact ILIKE $${params.length})`;
    }

    const countRes = await this.db.query(
      `SELECT COUNT(*)::int AS total FROM (${query}) AS counted_drivers`,
      params
    );
    const total = countRes.rows[0]?.total || 0;

    query += ` ORDER BY d.created_at DESC`;

    if (limit > 0) {
      const offset = (page - 1) * limit;
      params.push(limit, offset);
      query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;
    }

    const res = await this.db.query(query, params);
    return { data: res.rows, total, page, limit };
  }

  async getDriverById(id, schoolId = null) {
    let query = `
      SELECT d.*,
        u.first_name, u.last_name, u.email, u.phone AS user_phone, u.status AS user_status
      FROM transport_drivers d
      INNER JOIN users u ON u.id = d.user_id
      WHERE d.id = $1 AND d.deleted_at IS NULL
    `;
    const params = [id];
    if (schoolId) {
      params.push(schoolId);
      query += ` AND d.school_id = $2`;
    }
    const res = await this.db.query(query, params);
    return res.rows[0] || null;
  }

  async getDriverByUserId(userId, schoolId = null) {
    let query = `
      SELECT d.*,
        u.first_name, u.last_name, u.email, u.phone AS user_phone
      FROM transport_drivers d
      INNER JOIN users u ON u.id = d.user_id
      WHERE d.user_id = $1 AND d.deleted_at IS NULL
    `;
    const params = [userId];
    if (schoolId) {
      params.push(schoolId);
      query += ` AND d.school_id = $2`;
    }
    const res = await this.db.query(query, params);
    return res.rows[0] || null;
  }

  async createDriver(schoolId, data) {
    const query = `
      INSERT INTO transport_drivers (
        school_id, user_id, license_number, license_type,
        license_expiry_date, emergency_contact, medical_fitness_expiry,
        status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const values = [
      schoolId || null,
      data.user_id,
      data.license_number.trim(),
      data.license_type || 'Commercial',
      data.license_expiry_date || null,
      data.emergency_contact || null,
      data.medical_fitness_expiry || null,
      data.status || 'ACTIVE',
      data.notes || null,
    ];
    const res = await this.db.query(query, values);
    return this.getDriverById(res.rows[0].id, schoolId);
  }

  async updateDriver(id, schoolId, data) {
    const query = `
      UPDATE transport_drivers
      SET license_number = COALESCE($1, license_number),
          license_type = COALESCE($2, license_type),
          license_expiry_date = COALESCE($3, license_expiry_date),
          emergency_contact = COALESCE($4, emergency_contact),
          medical_fitness_expiry = COALESCE($5, medical_fitness_expiry),
          status = COALESCE($6, status),
          notes = COALESCE($7, notes),
          updated_at = current_timestamp
      WHERE id = $8 AND (school_id = $9 OR $9 IS NULL) AND deleted_at IS NULL
      RETURNING *
    `;
    const values = [
      data.license_number !== undefined ? data.license_number.trim() : null,
      data.license_type !== undefined ? data.license_type : null,
      data.license_expiry_date !== undefined ? (data.license_expiry_date || null) : null,
      data.emergency_contact !== undefined ? data.emergency_contact : null,
      data.medical_fitness_expiry !== undefined ? (data.medical_fitness_expiry || null) : null,
      data.status !== undefined ? data.status : null,
      data.notes !== undefined ? data.notes : null,
      id,
      schoolId || null,
    ];
    const res = await this.db.query(query, values);
    if (!res.rows[0]) return null;
    return this.getDriverById(id, schoolId);
  }

  async deleteDriver(id, schoolId = null) {
    let query = `
      UPDATE transport_drivers
      SET deleted_at = current_timestamp
      WHERE id = $1 AND deleted_at IS NULL
    `;
    const params = [id];
    if (schoolId) {
      params.push(schoolId);
      query += ` AND school_id = $2`;
    }
    query += ` RETURNING *`;
    const res = await this.db.query(query, params);
    return res.rows[0] || null;
  }

  // ==========================================
  // 4. ROUTES & ORDERED STOPS
  // ==========================================

  async listRoutes({ schoolId, search, status, page = 1, limit = 50 }) {
    let query = `
      SELECT r.*,
        v.vehicle_number, v.vehicle_model, v.seating_capacity,
        du.first_name AS driver_first_name, du.last_name AS driver_last_name, du.phone AS driver_phone,
        (
          SELECT COUNT(*)::int
          FROM transport_stops s
          WHERE s.route_id = r.id
            AND s.deleted_at IS NULL
        ) AS stops_count,
        (
          SELECT COUNT(*)::int
          FROM transport_student_allocations sa
          WHERE sa.route_id = r.id
            AND sa.status = 'ACTIVE'
            AND sa.deleted_at IS NULL
        ) AS allocated_students_count
      FROM transport_routes r
      LEFT JOIN transport_vehicles v ON v.id = r.default_vehicle_id AND v.deleted_at IS NULL
      LEFT JOIN transport_drivers d ON d.id = r.default_driver_id AND d.deleted_at IS NULL
      LEFT JOIN users du ON du.id = d.user_id
      WHERE r.deleted_at IS NULL
    `;
    const params = [];

    if (schoolId) {
      params.push(schoolId);
      query += ` AND r.school_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND r.status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (r.route_name ILIKE $${params.length} OR r.route_code ILIKE $${params.length} OR r.start_location ILIKE $${params.length} OR r.end_location ILIKE $${params.length})`;
    }

    const countRes = await this.db.query(
      `SELECT COUNT(*)::int AS total FROM (${query}) AS counted_routes`,
      params
    );
    const total = countRes.rows[0]?.total || 0;

    query += ` ORDER BY r.created_at DESC`;

    if (limit > 0) {
      const offset = (page - 1) * limit;
      params.push(limit, offset);
      query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;
    }

    const res = await this.db.query(query, params);
    return { data: res.rows, total, page, limit };
  }

  async getRouteById(id, schoolId = null) {
    let query = `
      SELECT r.*,
        v.vehicle_number, v.vehicle_model, v.seating_capacity,
        du.first_name AS driver_first_name, du.last_name AS driver_last_name, du.phone AS driver_phone,
        (
          SELECT COUNT(*)::int
          FROM transport_student_allocations sa
          WHERE sa.route_id = r.id
            AND sa.status = 'ACTIVE'
            AND sa.deleted_at IS NULL
        ) AS allocated_students_count
      FROM transport_routes r
      LEFT JOIN transport_vehicles v ON v.id = r.default_vehicle_id AND v.deleted_at IS NULL
      LEFT JOIN transport_drivers d ON d.id = r.default_driver_id AND d.deleted_at IS NULL
      LEFT JOIN users du ON du.id = d.user_id
      WHERE r.id = $1 AND r.deleted_at IS NULL
    `;
    const params = [id];
    if (schoolId) {
      params.push(schoolId);
      query += ` AND r.school_id = $2`;
    }
    const res = await this.db.query(query, params);
    const route = res.rows[0];
    if (!route) return null;

    // Fetch ordered stops
    const stops = await this.listStopsByRoute(id);
    route.stops = stops;
    return route;
  }

  async createRoute(schoolId, data) {
    const query = `
      INSERT INTO transport_routes (
        school_id, route_name, route_code, start_location, end_location,
        default_vehicle_id, default_driver_id, distance_km,
        estimated_duration_minutes, fare_amount, status, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    const values = [
      schoolId || null,
      data.route_name.trim(),
      data.route_code.trim(),
      data.start_location.trim(),
      data.end_location.trim(),
      data.default_vehicle_id || null,
      data.default_driver_id || null,
      data.distance_km ? parseFloat(data.distance_km) : 0,
      data.estimated_duration_minutes ? parseInt(data.estimated_duration_minutes, 10) : 45,
      data.fare_amount ? parseFloat(data.fare_amount) : 0,
      data.status || 'ACTIVE',
      data.description || null,
    ];
    const res = await this.db.query(query, values);
    return this.getRouteById(res.rows[0].id, schoolId);
  }

  async updateRoute(id, schoolId, data) {
    const query = `
      UPDATE transport_routes
      SET route_name = COALESCE($1, route_name),
          route_code = COALESCE($2, route_code),
          start_location = COALESCE($3, start_location),
          end_location = COALESCE($4, end_location),
          default_vehicle_id = CASE WHEN $5::text = 'NULL' THEN NULL WHEN $5 IS NOT NULL THEN $5::uuid ELSE default_vehicle_id END,
          default_driver_id = CASE WHEN $6::text = 'NULL' THEN NULL WHEN $6 IS NOT NULL THEN $6::uuid ELSE default_driver_id END,
          distance_km = COALESCE($7, distance_km),
          estimated_duration_minutes = COALESCE($8, estimated_duration_minutes),
          fare_amount = COALESCE($9, fare_amount),
          status = COALESCE($10, status),
          description = COALESCE($11, description),
          updated_at = current_timestamp
      WHERE id = $12 AND (school_id = $13 OR $13 IS NULL) AND deleted_at IS NULL
      RETURNING *
    `;
    const values = [
      data.route_name !== undefined ? data.route_name.trim() : null,
      data.route_code !== undefined ? data.route_code.trim() : null,
      data.start_location !== undefined ? data.start_location.trim() : null,
      data.end_location !== undefined ? data.end_location.trim() : null,
      data.default_vehicle_id !== undefined ? (data.default_vehicle_id || 'NULL') : null,
      data.default_driver_id !== undefined ? (data.default_driver_id || 'NULL') : null,
      data.distance_km !== undefined ? (data.distance_km !== '' ? parseFloat(data.distance_km) : 0) : null,
      data.estimated_duration_minutes !== undefined ? (data.estimated_duration_minutes !== '' ? parseInt(data.estimated_duration_minutes, 10) : 45) : null,
      data.fare_amount !== undefined ? (data.fare_amount !== '' ? parseFloat(data.fare_amount) : 0) : null,
      data.status !== undefined ? data.status : null,
      data.description !== undefined ? data.description : null,
      id,
      schoolId || null,
    ];
    const res = await this.db.query(query, values);
    if (!res.rows[0]) return null;
    return this.getRouteById(id, schoolId);
  }

  async deleteRoute(id, schoolId = null) {
    let query = `
      UPDATE transport_routes
      SET deleted_at = current_timestamp
      WHERE id = $1 AND deleted_at IS NULL
    `;
    const params = [id];
    if (schoolId) {
      params.push(schoolId);
      query += ` AND school_id = $2`;
    }
    query += ` RETURNING *`;
    const res = await this.db.query(query, params);
    return res.rows[0] || null;
  }

  // ==========================================
  // 5. ORDERED STOPS
  // ==========================================

  async listStopsByRoute(routeId) {
    const query = `
      SELECT s.*,
        (
          SELECT COUNT(*)::int
          FROM transport_student_allocations sa
          WHERE (sa.pickup_stop_id = s.id OR sa.dropoff_stop_id = s.id)
            AND sa.status = 'ACTIVE'
            AND sa.deleted_at IS NULL
        ) AS student_count
      FROM transport_stops s
      WHERE s.route_id = $1 AND s.deleted_at IS NULL
      ORDER BY s.stop_order ASC, s.created_at ASC
    `;
    const res = await this.db.query(query, [routeId]);
    return res.rows;
  }

  async createStop(schoolId, data) {
    // If stop_order not given, get max order + 1
    let order = data.stop_order;
    if (!order) {
      const maxRes = await this.db.query(
        `SELECT COALESCE(MAX(stop_order), 0) + 1 AS next_order FROM transport_stops WHERE route_id = $1 AND deleted_at IS NULL`,
        [data.route_id]
      );
      order = maxRes.rows[0].next_order;
    }

    const query = `
      INSERT INTO transport_stops (
        school_id, route_id, stop_name, stop_order,
        pickup_time, dropoff_time, landmark, latitude, longitude,
        fare_amount, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const values = [
      schoolId || null,
      data.route_id,
      data.stop_name.trim(),
      parseInt(order, 10),
      data.pickup_time || null,
      data.dropoff_time || null,
      data.landmark || null,
      data.latitude ? parseFloat(data.latitude) : null,
      data.longitude ? parseFloat(data.longitude) : null,
      data.fare_amount ? parseFloat(data.fare_amount) : 0,
      data.status || 'ACTIVE',
    ];
    const res = await this.db.query(query, values);
    return res.rows[0];
  }

  async updateStop(id, schoolId, data) {
    const query = `
      UPDATE transport_stops
      SET stop_name = COALESCE($1, stop_name),
          stop_order = COALESCE($2, stop_order),
          pickup_time = COALESCE($3, pickup_time),
          dropoff_time = COALESCE($4, dropoff_time),
          landmark = COALESCE($5, landmark),
          latitude = COALESCE($6, latitude),
          longitude = COALESCE($7, longitude),
          fare_amount = COALESCE($8, fare_amount),
          status = COALESCE($9, status),
          updated_at = current_timestamp
      WHERE id = $10 AND (school_id = $11 OR $11 IS NULL) AND deleted_at IS NULL
      RETURNING *
    `;
    const values = [
      data.stop_name !== undefined ? data.stop_name.trim() : null,
      data.stop_order !== undefined ? parseInt(data.stop_order, 10) : null,
      data.pickup_time !== undefined ? data.pickup_time : null,
      data.dropoff_time !== undefined ? data.dropoff_time : null,
      data.landmark !== undefined ? data.landmark : null,
      data.latitude !== undefined ? (data.latitude ? parseFloat(data.latitude) : null) : null,
      data.longitude !== undefined ? (data.longitude ? parseFloat(data.longitude) : null) : null,
      data.fare_amount !== undefined ? (data.fare_amount !== '' ? parseFloat(data.fare_amount) : 0) : null,
      data.status !== undefined ? data.status : null,
      id,
      schoolId || null,
    ];
    const res = await this.db.query(query, values);
    return res.rows[0] || null;
  }

  async deleteStop(id, schoolId = null) {
    let query = `
      UPDATE transport_stops
      SET deleted_at = current_timestamp
      WHERE id = $1 AND deleted_at IS NULL
    `;
    const params = [id];
    if (schoolId) {
      params.push(schoolId);
      query += ` AND school_id = $2`;
    }
    query += ` RETURNING *`;
    const res = await this.db.query(query, params);
    return res.rows[0] || null;
  }

  // ==========================================
  // 6. STUDENT TRANSPORT ALLOCATIONS
  // ==========================================

  async countActiveAllocationsByVehicle(vehicleId) {
    if (!vehicleId) return 0;
    const res = await this.db.query(
      `SELECT COUNT(*)::int AS count FROM transport_student_allocations WHERE assigned_vehicle_id = $1 AND status = 'ACTIVE' AND deleted_at IS NULL`,
      [vehicleId]
    );
    return res.rows[0]?.count || 0;
  }

  async listStudentAllocations({ schoolId, search, routeId, vehicleId, status, gradeId, page = 1, limit = 50 }) {
    let query = `
      SELECT sa.*,
        st.first_name AS student_first_name, st.last_name AS student_last_name,
        st.admission_number, st.gender, st.phone AS student_phone,
        sec.name AS section_name,
        gr.id AS grade_id, gr.name AS grade_name,
        r.route_name, r.route_code,
        ps.stop_name AS pickup_stop_name, ps.pickup_time AS pickup_stop_time,
        ds.stop_name AS dropoff_stop_name, ds.dropoff_time AS dropoff_stop_time,
        v.vehicle_number, v.vehicle_model, v.seating_capacity,
        p.full_name AS parent_name, p.phone AS parent_phone
      FROM transport_student_allocations sa
      INNER JOIN students st ON st.id = sa.student_id
      LEFT JOIN parents p ON p.id = st.parent_id
      LEFT JOIN sections sec ON sec.id = st.section_id
      LEFT JOIN grades gr ON gr.id = sec.grade_id
      INNER JOIN transport_routes r ON r.id = sa.route_id
      LEFT JOIN transport_stops ps ON ps.id = sa.pickup_stop_id
      LEFT JOIN transport_stops ds ON ds.id = sa.dropoff_stop_id
      LEFT JOIN transport_vehicles v ON v.id = sa.assigned_vehicle_id
      WHERE sa.deleted_at IS NULL
    `;
    const params = [];

    if (schoolId) {
      params.push(schoolId);
      query += ` AND sa.school_id = $${params.length}`;
    }

    if (routeId) {
      params.push(routeId);
      query += ` AND sa.route_id = $${params.length}`;
    }

    if (vehicleId) {
      params.push(vehicleId);
      query += ` AND sa.assigned_vehicle_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND sa.status = $${params.length}`;
    }

    if (gradeId) {
      params.push(gradeId);
      query += ` AND gr.id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (st.first_name ILIKE $${params.length} OR st.last_name ILIKE $${params.length} OR st.admission_number ILIKE $${params.length} OR r.route_name ILIKE $${params.length} OR ps.stop_name ILIKE $${params.length} OR ds.stop_name ILIKE $${params.length})`;
    }

    const countRes = await this.db.query(
      `SELECT COUNT(*)::int AS total FROM (${query}) AS counted_allocations`,
      params
    );
    const total = countRes.rows[0]?.total || 0;

    query += ` ORDER BY sa.created_at DESC`;

    if (limit > 0) {
      const offset = (page - 1) * limit;
      params.push(limit, offset);
      query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;
    }

    const res = await this.db.query(query, params);
    return { data: res.rows, total, page, limit };
  }

  async getAllocationById(id, schoolId = null) {
    let query = `
      SELECT sa.*,
        st.first_name AS student_first_name, st.last_name AS student_last_name,
        st.admission_number, st.gender, st.phone AS student_phone,
        sec.name AS section_name,
        gr.id AS grade_id, gr.name AS grade_name,
        r.route_name, r.route_code,
        ps.stop_name AS pickup_stop_name, ps.pickup_time AS pickup_stop_time,
        ds.stop_name AS dropoff_stop_name, ds.dropoff_time AS dropoff_stop_time,
        v.vehicle_number, v.vehicle_model, v.seating_capacity,
        p.full_name AS parent_name, p.phone AS parent_phone
      FROM transport_student_allocations sa
      INNER JOIN students st ON st.id = sa.student_id
      LEFT JOIN parents p ON p.id = st.parent_id
      LEFT JOIN sections sec ON sec.id = st.section_id
      LEFT JOIN grades gr ON gr.id = sec.grade_id
      INNER JOIN transport_routes r ON r.id = sa.route_id
      LEFT JOIN transport_stops ps ON ps.id = sa.pickup_stop_id
      LEFT JOIN transport_stops ds ON ds.id = sa.dropoff_stop_id
      LEFT JOIN transport_vehicles v ON v.id = sa.assigned_vehicle_id
      WHERE sa.id = $1 AND sa.deleted_at IS NULL
    `;
    const params = [id];
    if (schoolId) {
      params.push(schoolId);
      query += ` AND sa.school_id = $2`;
    }
    const res = await this.db.query(query, params);
    return res.rows[0] || null;
  }

  async getAllocationByStudentId(studentId, schoolId = null) {
    let query = `
      SELECT sa.*,
        st.first_name AS student_first_name, st.last_name AS student_last_name,
        st.admission_number,
        r.route_name, r.route_code,
        ps.stop_name AS pickup_stop_name, ps.pickup_time AS pickup_stop_time,
        ds.stop_name AS dropoff_stop_name, ds.dropoff_time AS dropoff_stop_time,
        v.vehicle_number, v.vehicle_model,
        du.first_name AS driver_first_name, du.last_name AS driver_last_name, du.phone AS driver_phone
      FROM transport_student_allocations sa
      INNER JOIN students st ON st.id = sa.student_id
      INNER JOIN transport_routes r ON r.id = sa.route_id
      LEFT JOIN transport_stops ps ON ps.id = sa.pickup_stop_id
      LEFT JOIN transport_stops ds ON ds.id = sa.dropoff_stop_id
      LEFT JOIN transport_vehicles v ON v.id = sa.assigned_vehicle_id
      LEFT JOIN transport_drivers d ON d.id = r.default_driver_id
      LEFT JOIN users du ON du.id = d.user_id
      WHERE sa.student_id = $1 AND sa.status = 'ACTIVE' AND sa.deleted_at IS NULL
    `;
    const params = [studentId];
    if (schoolId) {
      params.push(schoolId);
      query += ` AND sa.school_id = $2`;
    }
    query += ` LIMIT 1`;
    const res = await this.db.query(query, params);
    return res.rows[0] || null;
  }

  async createStudentAllocation(schoolId, data) {
    const query = `
      INSERT INTO transport_student_allocations (
        school_id, student_id, route_id, pickup_stop_id, dropoff_stop_id,
        assigned_vehicle_id, trip_type, seat_number, start_date, end_date,
        status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    const values = [
      schoolId || null,
      data.student_id,
      data.route_id,
      data.pickup_stop_id || null,
      data.dropoff_stop_id || null,
      data.assigned_vehicle_id || null,
      data.trip_type || 'BOTH',
      data.seat_number || null,
      data.start_date || new Date().toISOString().split('T')[0],
      data.end_date || null,
      data.status || 'ACTIVE',
      data.notes || null,
    ];
    const res = await this.db.query(query, values);
    return this.getAllocationById(res.rows[0].id, schoolId);
  }

  async updateStudentAllocation(id, schoolId, data) {
    const query = `
      UPDATE transport_student_allocations
      SET route_id = COALESCE($1, route_id),
          pickup_stop_id = CASE WHEN $2::text = 'NULL' THEN NULL WHEN $2 IS NOT NULL THEN $2::uuid ELSE pickup_stop_id END,
          dropoff_stop_id = CASE WHEN $3::text = 'NULL' THEN NULL WHEN $3 IS NOT NULL THEN $3::uuid ELSE dropoff_stop_id END,
          assigned_vehicle_id = CASE WHEN $4::text = 'NULL' THEN NULL WHEN $4 IS NOT NULL THEN $4::uuid ELSE assigned_vehicle_id END,
          trip_type = COALESCE($5, trip_type),
          seat_number = COALESCE($6, seat_number),
          start_date = COALESCE($7, start_date),
          end_date = COALESCE($8, end_date),
          status = COALESCE($9, status),
          notes = COALESCE($10, notes),
          updated_at = current_timestamp
      WHERE id = $11 AND (school_id = $12 OR $12 IS NULL) AND deleted_at IS NULL
      RETURNING *
    `;
    const values = [
      data.route_id || null,
      data.pickup_stop_id !== undefined ? (data.pickup_stop_id || 'NULL') : null,
      data.dropoff_stop_id !== undefined ? (data.dropoff_stop_id || 'NULL') : null,
      data.assigned_vehicle_id !== undefined ? (data.assigned_vehicle_id || 'NULL') : null,
      data.trip_type || null,
      data.seat_number !== undefined ? data.seat_number : null,
      data.start_date || null,
      data.end_date !== undefined ? (data.end_date || null) : null,
      data.status || null,
      data.notes !== undefined ? data.notes : null,
      id,
      schoolId || null,
    ];
    const res = await this.db.query(query, values);
    if (!res.rows[0]) return null;
    return this.getAllocationById(id, schoolId);
  }

  async deleteStudentAllocation(id, schoolId = null) {
    let query = `
      UPDATE transport_student_allocations
      SET deleted_at = current_timestamp
      WHERE id = $1 AND deleted_at IS NULL
    `;
    const params = [id];
    if (schoolId) {
      params.push(schoolId);
      query += ` AND school_id = $2`;
    }
    query += ` RETURNING *`;
    const res = await this.db.query(query, params);
    return res.rows[0] || null;
  }

  // ==========================================
  // 7. DAILY TRANSPORT TRIPS
  // ==========================================

  async listTrips({ schoolId, search, date, routeId, vehicleId, driverId, status, page = 1, limit = 50 }) {
    let query = `
      SELECT t.*,
        r.route_name, r.route_code, r.start_location, r.end_location,
        v.vehicle_number, v.vehicle_model, v.seating_capacity,
        du.first_name AS driver_first_name, du.last_name AS driver_last_name, du.phone AS driver_phone,
        (
          SELECT COUNT(*)::int
          FROM transport_attendance a
          WHERE a.trip_id = t.id
        ) AS attendance_recorded_count,
        (
          SELECT COUNT(*)::int
          FROM transport_attendance a
          WHERE a.trip_id = t.id AND a.status IN ('BOARDED', 'DROPPED_OFF')
        ) AS boarded_count,
        (
          SELECT COUNT(*)::int
          FROM transport_student_allocations sa
          WHERE sa.route_id = t.route_id
            AND sa.status = 'ACTIVE'
            AND sa.deleted_at IS NULL
        ) AS expected_passengers_count
      FROM transport_trips t
      INNER JOIN transport_routes r ON r.id = t.route_id
      INNER JOIN transport_vehicles v ON v.id = t.vehicle_id
      INNER JOIN transport_drivers d ON d.id = t.driver_id
      INNER JOIN users du ON du.id = d.user_id
      WHERE t.deleted_at IS NULL
    `;
    const params = [];

    if (schoolId) {
      params.push(schoolId);
      query += ` AND t.school_id = $${params.length}`;
    }

    if (date) {
      params.push(date);
      query += ` AND t.trip_date = $${params.length}`;
    }

    if (routeId) {
      params.push(routeId);
      query += ` AND t.route_id = $${params.length}`;
    }

    if (vehicleId) {
      params.push(vehicleId);
      query += ` AND t.vehicle_id = $${params.length}`;
    }

    if (driverId) {
      params.push(driverId);
      query += ` AND t.driver_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND t.status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (r.route_name ILIKE $${params.length} OR v.vehicle_number ILIKE $${params.length} OR du.first_name ILIKE $${params.length} OR du.last_name ILIKE $${params.length})`;
    }

    const countRes = await this.db.query(
      `SELECT COUNT(*)::int AS total FROM (${query}) AS counted_trips`,
      params
    );
    const total = countRes.rows[0]?.total || 0;

    query += ` ORDER BY t.trip_date DESC, t.scheduled_start_time ASC, t.created_at DESC`;

    if (limit > 0) {
      const offset = (page - 1) * limit;
      params.push(limit, offset);
      query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;
    }

    const res = await this.db.query(query, params);
    return { data: res.rows, total, page, limit };
  }

  async getTripById(id, schoolId = null) {
    let query = `
      SELECT t.*,
        r.route_name, r.route_code, r.start_location, r.end_location,
        v.vehicle_number, v.vehicle_model, v.seating_capacity,
        du.first_name AS driver_first_name, du.last_name AS driver_last_name, du.phone AS driver_phone,
        (
          SELECT COUNT(*)::int
          FROM transport_attendance a
          WHERE a.trip_id = t.id
        ) AS attendance_recorded_count,
        (
          SELECT COUNT(*)::int
          FROM transport_attendance a
          WHERE a.trip_id = t.id AND a.status IN ('BOARDED', 'DROPPED_OFF')
        ) AS boarded_count
      FROM transport_trips t
      INNER JOIN transport_routes r ON r.id = t.route_id
      INNER JOIN transport_vehicles v ON v.id = t.vehicle_id
      INNER JOIN transport_drivers d ON d.id = t.driver_id
      INNER JOIN users du ON du.id = d.user_id
      WHERE t.id = $1 AND t.deleted_at IS NULL
    `;
    const params = [id];
    if (schoolId) {
      params.push(schoolId);
      query += ` AND t.school_id = $2`;
    }
    const res = await this.db.query(query, params);
    return res.rows[0] || null;
  }

  async createTrip(schoolId, data) {
    const query = `
      INSERT INTO transport_trips (
        school_id, route_id, vehicle_id, driver_id, trip_date,
        trip_type, scheduled_start_time, scheduled_end_time,
        actual_start_time, actual_end_time, odometer_start, odometer_end,
        status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
    const values = [
      schoolId || null,
      data.route_id,
      data.vehicle_id,
      data.driver_id,
      data.trip_date || new Date().toISOString().split('T')[0],
      data.trip_type || 'PICKUP',
      data.scheduled_start_time || '07:00',
      data.scheduled_end_time || '08:00',
      data.actual_start_time || null,
      data.actual_end_time || null,
      data.odometer_start ? parseFloat(data.odometer_start) : null,
      data.odometer_end ? parseFloat(data.odometer_end) : null,
      data.status || 'SCHEDULED',
      data.notes || null,
    ];
    const res = await this.db.query(query, values);
    return this.getTripById(res.rows[0].id, schoolId);
  }

  async updateTrip(id, schoolId, data) {
    const query = `
      UPDATE transport_trips
      SET route_id = COALESCE($1, route_id),
          vehicle_id = COALESCE($2, vehicle_id),
          driver_id = COALESCE($3, driver_id),
          trip_date = COALESCE($4, trip_date),
          trip_type = COALESCE($5, trip_type),
          scheduled_start_time = COALESCE($6, scheduled_start_time),
          scheduled_end_time = COALESCE($7, scheduled_end_time),
          actual_start_time = COALESCE($8, actual_start_time),
          actual_end_time = COALESCE($9, actual_end_time),
          odometer_start = COALESCE($10, odometer_start),
          odometer_end = COALESCE($11, odometer_end),
          status = COALESCE($12, status),
          notes = COALESCE($13, notes),
          updated_at = current_timestamp
      WHERE id = $14 AND (school_id = $15 OR $15 IS NULL) AND deleted_at IS NULL
      RETURNING *
    `;
    const values = [
      data.route_id || null,
      data.vehicle_id || null,
      data.driver_id || null,
      data.trip_date || null,
      data.trip_type || null,
      data.scheduled_start_time !== undefined ? data.scheduled_start_time : null,
      data.scheduled_end_time !== undefined ? data.scheduled_end_time : null,
      data.actual_start_time !== undefined ? data.actual_start_time : null,
      data.actual_end_time !== undefined ? data.actual_end_time : null,
      data.odometer_start !== undefined ? (data.odometer_start ? parseFloat(data.odometer_start) : null) : null,
      data.odometer_end !== undefined ? (data.odometer_end ? parseFloat(data.odometer_end) : null) : null,
      data.status || null,
      data.notes !== undefined ? data.notes : null,
      id,
      schoolId || null,
    ];
    const res = await this.db.query(query, values);
    if (!res.rows[0]) return null;
    return this.getTripById(id, schoolId);
  }

  async deleteTrip(id, schoolId = null) {
    let query = `
      UPDATE transport_trips
      SET deleted_at = current_timestamp
      WHERE id = $1 AND deleted_at IS NULL
    `;
    const params = [id];
    if (schoolId) {
      params.push(schoolId);
      query += ` AND school_id = $2`;
    }
    query += ` RETURNING *`;
    const res = await this.db.query(query, params);
    return res.rows[0] || null;
  }

  // ==========================================
  // 8. STUDENT BOARDING ATTENDANCE
  // ==========================================

  async getTripPassengerRoster(tripId, schoolId = null) {
    const trip = await this.getTripById(tripId, schoolId);
    if (!trip) return null;

    // Determine relevant allocations based on trip_type (PICKUP -> BOTH, PICKUP_ONLY; DROPOFF -> BOTH, DROPOFF_ONLY)
    let tripTypeFilter = `sa.trip_type IN ('BOTH', 'PICKUP_ONLY')`;
    if (trip.trip_type === 'DROPOFF') {
      tripTypeFilter = `sa.trip_type IN ('BOTH', 'DROPOFF_ONLY')`;
    } else if (trip.trip_type === 'SPECIAL') {
      tripTypeFilter = `1=1`;
    }

    const query = `
      SELECT sa.id AS allocation_id, sa.student_id, sa.seat_number, sa.trip_type,
        st.first_name AS student_first_name, st.last_name AS student_last_name,
        st.admission_number, st.gender,
        sec.name AS section_name, gr.name AS grade_name,
        p.full_name AS parent_name, p.phone AS parent_phone,
        ps.id AS pickup_stop_id, ps.stop_name AS pickup_stop_name, ps.pickup_time AS pickup_stop_time, ps.stop_order AS pickup_stop_order,
        ds.id AS dropoff_stop_id, ds.stop_name AS dropoff_stop_name, ds.dropoff_time AS dropoff_stop_time, ds.stop_order AS dropoff_stop_order,
        att.id AS attendance_id, att.status AS attendance_status, att.recorded_at, att.remarks,
        ru.first_name AS recorded_by_first_name, ru.last_name AS recorded_by_last_name
      FROM transport_student_allocations sa
      INNER JOIN students st ON st.id = sa.student_id
      LEFT JOIN parents p ON p.id = st.parent_id
      LEFT JOIN sections sec ON sec.id = st.section_id
      LEFT JOIN grades gr ON gr.id = sec.grade_id
      LEFT JOIN transport_stops ps ON ps.id = sa.pickup_stop_id
      LEFT JOIN transport_stops ds ON ds.id = sa.dropoff_stop_id
      LEFT JOIN transport_attendance att ON att.trip_id = $1 AND att.student_id = sa.student_id
      LEFT JOIN users ru ON ru.id = att.recorded_by
      WHERE sa.route_id = $2
        AND sa.status = 'ACTIVE'
        AND sa.deleted_at IS NULL
        AND ${tripTypeFilter}
      ORDER BY
        CASE WHEN $3 = 'DROPOFF' THEN ds.stop_order ELSE ps.stop_order END ASC NULLS LAST,
        st.first_name ASC
    `;
    const res = await this.db.query(query, [tripId, trip.route_id, trip.trip_type]);
    return { trip, passengers: res.rows };
  }

  async recordAttendanceBatch(tripId, schoolId, userId, records) {
    const results = [];
    for (const record of records) {
      const query = `
        INSERT INTO transport_attendance (
          school_id, trip_id, student_id, stop_id, status,
          recorded_at, recorded_by, remarks
        ) VALUES ($1, $2, $3, $4, $5, current_timestamp, $6, $7)
        ON CONFLICT (trip_id, student_id)
        DO UPDATE SET
          stop_id = EXCLUDED.stop_id,
          status = EXCLUDED.status,
          recorded_at = current_timestamp,
          recorded_by = EXCLUDED.recorded_by,
          remarks = EXCLUDED.remarks,
          updated_at = current_timestamp
        RETURNING *
      `;
      const values = [
        schoolId || null,
        tripId,
        record.student_id,
        record.stop_id || null,
        record.status || 'BOARDED',
        userId || null,
        record.remarks || null,
      ];
      const res = await this.db.query(query, values);
      results.push(res.rows[0]);
    }
    return results;
  }

  // ==========================================
  // 9. DASHBOARD STATS & KPI METRICS
  // ==========================================

  async getDashboardMetrics(schoolId = null) {
    const params = schoolId ? [schoolId] : [];
    const schoolFilter = schoolId ? `AND school_id = $1` : ``;

    const metricsQuery = `
      SELECT
        -- Vehicles summary
        (SELECT COUNT(*)::int FROM transport_vehicles WHERE deleted_at IS NULL ${schoolFilter}) AS total_vehicles,
        (SELECT COUNT(*)::int FROM transport_vehicles WHERE status = 'ACTIVE' AND deleted_at IS NULL ${schoolFilter}) AS active_vehicles,
        (SELECT COUNT(*)::int FROM transport_vehicles WHERE status = 'MAINTENANCE' AND deleted_at IS NULL ${schoolFilter}) AS maintenance_vehicles,
        (SELECT COALESCE(SUM(seating_capacity), 0)::int FROM transport_vehicles WHERE status = 'ACTIVE' AND deleted_at IS NULL ${schoolFilter}) AS total_fleet_capacity,

        -- Drivers summary
        (SELECT COUNT(*)::int FROM transport_drivers WHERE deleted_at IS NULL ${schoolFilter}) AS total_drivers,
        (SELECT COUNT(*)::int FROM transport_drivers WHERE status IN ('ACTIVE', 'ON_DUTY') AND deleted_at IS NULL ${schoolFilter}) AS active_drivers,

        -- Routes & stops
        (SELECT COUNT(*)::int FROM transport_routes WHERE deleted_at IS NULL ${schoolFilter}) AS total_routes,
        (SELECT COUNT(*)::int FROM transport_routes WHERE status = 'ACTIVE' AND deleted_at IS NULL ${schoolFilter}) AS active_routes,
        (SELECT COUNT(*)::int FROM transport_stops WHERE deleted_at IS NULL ${schoolFilter}) AS total_stops,

        -- Student allocations
        (SELECT COUNT(*)::int FROM transport_student_allocations WHERE status = 'ACTIVE' AND deleted_at IS NULL ${schoolFilter}) AS allocated_students,

        -- Today's trips
        (SELECT COUNT(*)::int FROM transport_trips WHERE trip_date = current_date AND deleted_at IS NULL ${schoolFilter}) AS today_total_trips,
        (SELECT COUNT(*)::int FROM transport_trips WHERE trip_date = current_date AND status = 'COMPLETED' AND deleted_at IS NULL ${schoolFilter}) AS today_completed_trips,
        (SELECT COUNT(*)::int FROM transport_trips WHERE trip_date = current_date AND status = 'IN_PROGRESS' AND deleted_at IS NULL ${schoolFilter}) AS today_in_progress_trips,
        (SELECT COUNT(*)::int FROM transport_trips WHERE trip_date = current_date AND status = 'SCHEDULED' AND deleted_at IS NULL ${schoolFilter}) AS today_scheduled_trips,

        -- Today's boarding attendance
        (
          SELECT COUNT(*)::int
          FROM transport_attendance a
          INNER JOIN transport_trips t ON t.id = a.trip_id
          WHERE t.trip_date = current_date AND a.status IN ('BOARDED', 'DROPPED_OFF')
          ${schoolFilter ? `AND a.school_id = $1` : ''}
        ) AS today_boarded_count,
        (
          SELECT COUNT(*)::int
          FROM transport_attendance a
          INNER JOIN transport_trips t ON t.id = a.trip_id
          WHERE t.trip_date = current_date AND a.status = 'ABSENT'
          ${schoolFilter ? `AND a.school_id = $1` : ''}
        ) AS today_absent_count
    `;

    const res = await this.db.query(metricsQuery, params);
    const summary = res.rows[0] || {};

    // Capacity utilization calculation
    const totalCapacity = summary.total_fleet_capacity || 0;
    const allocated = summary.allocated_students || 0;
    summary.capacity_utilization_rate = totalCapacity > 0
      ? Math.round((allocated / totalCapacity) * 100)
      : 0;

    // Today's boarding rate
    const totalTodayAttendance = (summary.today_boarded_count || 0) + (summary.today_absent_count || 0);
    summary.today_boarding_rate = totalTodayAttendance > 0
      ? Math.round(((summary.today_boarded_count || 0) / totalTodayAttendance) * 100)
      : 0;

    return summary;
  }

  // ==========================================
  // 10. REPORTS
  // ==========================================

  async getRouteRosterReport(routeId, schoolId = null) {
    let query = `
      SELECT
        r.id AS route_id, r.route_name, r.route_code, r.start_location, r.end_location,
        v.vehicle_number, v.vehicle_model, v.seating_capacity,
        du.first_name AS driver_first_name, du.last_name AS driver_last_name, du.phone AS driver_phone,
        sa.id AS allocation_id, sa.seat_number, sa.trip_type, sa.status AS allocation_status,
        st.id AS student_id, st.admission_number, st.first_name AS student_first_name, st.last_name AS student_last_name,
        sec.name AS section_name, gr.name AS grade_name,
        p.full_name AS parent_name, p.phone AS parent_phone, p.email AS parent_email,
        ps.stop_name AS pickup_stop_name, ps.pickup_time AS pickup_stop_time, ps.stop_order AS pickup_stop_order,
        ds.stop_name AS dropoff_stop_name, ds.dropoff_time AS dropoff_stop_time, ds.stop_order AS dropoff_stop_order
      FROM transport_routes r
      LEFT JOIN transport_vehicles v ON v.id = r.default_vehicle_id
      LEFT JOIN transport_drivers d ON d.id = r.default_driver_id
      LEFT JOIN users du ON du.id = d.user_id
      LEFT JOIN transport_student_allocations sa ON sa.route_id = r.id AND sa.status = 'ACTIVE' AND sa.deleted_at IS NULL
      LEFT JOIN students st ON st.id = sa.student_id
      LEFT JOIN parents p ON p.id = st.parent_id
      LEFT JOIN sections sec ON sec.id = st.section_id
      LEFT JOIN grades gr ON gr.id = sec.grade_id
      LEFT JOIN transport_stops ps ON ps.id = sa.pickup_stop_id
      LEFT JOIN transport_stops ds ON ds.id = sa.dropoff_stop_id
      WHERE r.id = $1 AND r.deleted_at IS NULL
    `;
    const params = [routeId];
    if (schoolId) {
      params.push(schoolId);
      query += ` AND r.school_id = $2`;
    }
    query += ` ORDER BY ps.stop_order ASC NULLS LAST, st.first_name ASC`;
    const res = await this.db.query(query, params);
    return res.rows;
  }

  async getFleetUtilizationReport(schoolId = null) {
    let query = `
      SELECT
        v.id, v.vehicle_number, v.vehicle_model, v.seating_capacity, v.fuel_type, v.status,
        v.insurance_expiry_date, v.fitness_certificate_expiry,
        (
          SELECT COUNT(*)::int
          FROM transport_student_allocations sa
          WHERE sa.assigned_vehicle_id = v.id
            AND sa.status = 'ACTIVE'
            AND sa.deleted_at IS NULL
        ) AS allocated_students,
        (
          SELECT COUNT(*)::int
          FROM transport_routes r
          WHERE r.default_vehicle_id = v.id
            AND r.deleted_at IS NULL
        ) AS assigned_routes_count,
        (
          SELECT COUNT(*)::int
          FROM transport_trips t
          WHERE t.vehicle_id = v.id
            AND t.deleted_at IS NULL
        ) AS total_trips_completed
      FROM transport_vehicles v
      WHERE v.deleted_at IS NULL
    `;
    const params = [];
    if (schoolId) {
      params.push(schoolId);
      query += ` AND v.school_id = $1`;
    }
    query += ` ORDER BY v.vehicle_number ASC`;
    const res = await this.db.query(query, params);

    return res.rows.map((row) => ({
      ...row,
      utilization_percentage: row.seating_capacity > 0
        ? Math.round((row.allocated_students / row.seating_capacity) * 100)
        : 0,
      is_over_capacity: row.allocated_students > row.seating_capacity,
    }));
  }

  async getDailyAttendanceReport({ schoolId, date, routeId }) {
    let query = `
      SELECT
        t.id AS trip_id, t.trip_date, t.trip_type, t.scheduled_start_time, t.status AS trip_status,
        r.route_name, r.route_code,
        v.vehicle_number,
        du.first_name AS driver_first_name, du.last_name AS driver_last_name,
        st.id AS student_id, st.admission_number, st.first_name AS student_first_name, st.last_name AS student_last_name,
        sec.name AS section_name, gr.name AS grade_name,
        stop.stop_name,
        att.status AS attendance_status, att.recorded_at, att.remarks
      FROM transport_trips t
      INNER JOIN transport_routes r ON r.id = t.route_id
      INNER JOIN transport_vehicles v ON v.id = t.vehicle_id
      INNER JOIN transport_drivers d ON d.id = t.driver_id
      INNER JOIN users du ON du.id = d.user_id
      LEFT JOIN transport_attendance att ON att.trip_id = t.id
      LEFT JOIN students st ON st.id = att.student_id
      LEFT JOIN sections sec ON sec.id = st.section_id
      LEFT JOIN grades gr ON gr.id = sec.grade_id
      LEFT JOIN transport_stops stop ON stop.id = att.stop_id
      WHERE t.deleted_at IS NULL
    `;
    const params = [];

    if (schoolId) {
      params.push(schoolId);
      query += ` AND t.school_id = $${params.length}`;
    }

    if (date) {
      params.push(date);
      query += ` AND t.trip_date = $${params.length}`;
    } else {
      query += ` AND t.trip_date = current_date`;
    }

    if (routeId) {
      params.push(routeId);
      query += ` AND t.route_id = $${params.length}`;
    }

    query += ` ORDER BY t.scheduled_start_time ASC, r.route_name ASC, st.first_name ASC`;
    const res = await this.db.query(query, params);
    return res.rows;
  }
}

module.exports = TransportRepository;
