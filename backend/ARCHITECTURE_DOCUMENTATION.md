# Smart SMS Backend Architecture Guide

## For Junior Developers Learning the Codebase

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [The Layered Architecture Pattern](#the-layered-architecture-pattern)
3. [File Types & Their Responsibilities](#file-types--their-responsibilities)
4. [Data Flow](#data-flow)
5. [Module Structure](#module-structure)
6. [Best Practices](#best-practices)
7. [Code Examples](#code-examples)

---

## Architecture Overview

Your backend uses a **Layered Architecture** (also called N-Tier Architecture), which separates concerns into distinct layers. Each layer has a single responsibility and communicates with other layers through well-defined interfaces.

### Why This Pattern?

- **Separation of Concerns**: Each layer focuses on one job
- **Testability**: Each layer can be tested independently
- **Maintainability**: Changes in one layer don't cascade to others
- **Scalability**: Easy to add new features without affecting existing code
- **Code Reusability**: Business logic is separated from HTTP concerns

### The 5-Layer Model Your Project Uses

```
┌─────────────────────────────┐
│    ROUTES (entry point)     │  - Defines URL endpoints
├─────────────────────────────┤
│   CONTROLLER                │  - Handles HTTP requests/responses
├─────────────────────────────┤
│   VALIDATION                │  - Validates input data
├─────────────────────────────┤
│   SERVICE (Business Logic)  │  - Core application logic
├─────────────────────────────┤
│   REPOSITORY (Data Access)  │  - Database queries
└─────────────────────────────┘
```

---

## The Layered Architecture Pattern

### Request Flow Example

When a user wants to mark attendance:

```
1. Browser sends: POST /api/v1/attendance/bulk
                    ↓
2. ROUTES receives the request
   attendance.routes.js → router.post('/bulk', ...)
                    ↓
3. CONTROLLER handles it
   attendance.controller.js → recordBulkAttendance(req, res)
                    ↓
4. VALIDATION checks the data
   attendance.validation.js → validateBulkAttendanceInput(req.body)
                    ↓
5. SERVICE processes business logic
   attendance.service.js → saveBulkAttendance({...})
                    ↓
6. REPOSITORY executes database query
   attendance.repository.js → bulkUpsertAttendance({...})
                    ↓
7. Database returns data
                    ↓
8. Response flows back up → Controller → Browser
```

---

## File Types & Their Responsibilities

### 1. **ROUTES.JS** - API Endpoint Definitions

**Purpose**: Define URL patterns and connect them to controller functions

**Responsibility**:
- Map HTTP methods (GET, POST, PUT, DELETE) to URLs
- Apply middleware (authentication, authorization)
- Specify which controller functions handle each endpoint

**Key Concepts**:
- Uses Express Router
- Middleware runs BEFORE controller actions
- Authorization happens here

**Example: `attendance.routes.js`**
```javascript
const express = require('express');
const { getRosterSheet, recordBulkAttendance } = require('./attendance.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');

const router = express.Router();

// Apply authentication to ALL routes
router.use(authMiddleware);

// Define endpoints
router.get('/sheet', authorizeRoles('School Admin', 'Teacher'), getRosterSheet);
//         ^^^^^^                      ^^^^^^^^^^^^^^^^^^^^^^      ^^^^^^^^^^^^
//         URL path                    Authorization check        Controller function
//
router.post('/bulk', authorizeRoles('School Admin', 'Teacher'), recordBulkAttendance);

module.exports = router;
```

**Request Journey**:
```
GET /api/v1/attendance/sheet
  ↓
Routes matches this pattern
  ↓
authMiddleware runs (checks if user is logged in)
  ↓
authorizeRoles runs (checks if user has permission)
  ↓
If all pass → getRosterSheet controller runs
If any fail → 401/403 error response
```

---

### 2. **CONTROLLER.JS** - HTTP Request Handler

**Purpose**: Handle incoming HTTP requests and send responses

**Responsibility**:
- Receive request data from the client
- Call validation functions
- Call service functions (business logic)
- Format and send response back to client
- Handle errors and send appropriate status codes

**Key Concepts**:
- Does NOT contain business logic
- Does NOT query the database directly
- Simply orchestrates the flow
- Every endpoint = one controller function

**Example: `attendance.controller.js` - Recording Attendance**
```javascript
// This is ONE controller function that handles ONE endpoint
async function recordBulkAttendance(req, res, next) {
  // Step 1: Validate input data
  const input = validateBulkAttendanceInput(req.body);
  //          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //          Call validation layer
  
  if (Object.keys(input.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: input.errors,  // Send validation errors to client
    });
  }

  try {
    // Step 2: Extract user info from request
    const recordedBy = req.user ? req.user.id : null;
    
    // Step 3: Call service layer (where real work happens)
    const data = await attendanceService.saveBulkAttendance({
      //                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      //                Call service layer
      sectionId: input.sectionId,
      date: input.date,
      academicYearId: input.academicYearId,
      recordedBy,
      records: input.records,
    });

    // Step 4: Send successful response
    return res.status(200).json({
      success: true,
      message: 'Attendance recorded successfully',
      data,  // Service returned this data
    });
  } catch (error) {
    // Step 5: Pass errors to error handler middleware
    return next(error);
  }
}
```

**Controller Responsibilities Checklist**:
- ✅ Parse incoming request data
- ✅ Validate input (or delegate to validation)
- ✅ Call service functions
- ✅ Format response
- ✅ Send response with correct HTTP status code
- ❌ Should NOT contain business logic
- ❌ Should NOT query database directly
- ❌ Should NOT have complex calculations

---

### 3. **VALIDATION.JS** - Data Validation

**Purpose**: Ensure incoming data is valid before processing

**Responsibility**:
- Check data type (is it a string? number? array?)
- Check data format (is date in YYYY-MM-DD format?)
- Check data constraints (is it between min/max values?)
- Reject invalid data early (before touching database)
- Return structured error messages

**Key Concepts**:
- Validation happens BEFORE service layer
- Invalid data never reaches the database
- Returns both valid data and errors object
- Helps prevent SQL injection, bad data, crashes

**Example: `attendance.validation.js`**
```javascript
// Pattern 1: Validation helper functions
function isValidUUID(value) {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return typeof value === 'string' && UUID_REGEX.test(value.trim());
}

function isValidDate(dateString) {
  if (!dateString || typeof dateString !== 'string') return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;  // Must be YYYY-MM-DD
  if (!regex.test(dateString)) return false;
  const d = new Date(dateString);
  return d instanceof Date && !isNaN(d.getTime());
}

// Pattern 2: Complex validation function
function validateBulkAttendanceInput(body = {}) {
  const errors = {};
  const ALLOWED_STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];

  // Validate sectionId
  if (!body.sectionId || !isValidUUID(body.sectionId)) {
    errors.sectionId = 'Valid sectionId is required.';
  }

  // Validate date
  if (!body.date || !isValidDate(body.date)) {
    errors.date = 'Valid date (YYYY-MM-DD) is required.';
  }

  // Validate records array
  if (!Array.isArray(body.records) || body.records.length === 0) {
    errors.records = 'Records array cannot be empty.';
  } else {
    // Validate each record in the array
    const recordErrors = [];
    body.records.forEach((rec, idx) => {
      const recErr = {};
      
      if (!rec.studentId || !isValidUUID(rec.studentId)) {
        recErr.studentId = 'Valid studentId is required';
      }
      
      const status = (rec.status || '').toUpperCase().trim();
      if (!ALLOWED_STATUSES.includes(status)) {
        recErr.status = `Status must be one of: ${ALLOWED_STATUSES.join(', ')}`;
      }
      
      if (Object.keys(recErr).length > 0) {
        recordErrors.push({ index: idx, ...recErr });
      }
    });
    
    if (recordErrors.length > 0) {
      errors.recordErrors = recordErrors;
    }
  }

  // Return cleaned data AND errors
  return {
    sectionId: body.sectionId ? body.sectionId.trim() : null,
    date: body.date ? body.date.trim() : null,
    records: body.records || [],
    errors,  // Controller checks this
  };
}
```

**Validation Flow**:
```
Raw Input Data
      ↓
validateBulkAttendanceInput()
      ↓
Validation Function Checks:
  - Is sectionId present? Yes ✓
  - Is sectionId a valid UUID? Yes ✓
  - Is date present? Yes ✓
  - Is date in YYYY-MM-DD format? Yes ✓
  - Is records an array? Yes ✓
  - Is each record's studentId valid? Check each...
  - Is each record's status one of allowed values? Check each...
      ↓
Return Object:
{
  sectionId: '123e4567-e89b-12d3-a456-426614174000',
  date: '2024-08-15',
  records: [...],
  errors: {}  // Empty if all valid, populated if errors found
}
```

---

### 4. **SERVICE.JS** - Business Logic

**Purpose**: Contain the core application logic

**Responsibility**:
- Orchestrate complex operations
- Call repository to fetch/save data
- Process and transform data
- Implement business rules
- Handle multi-step operations
- Throw meaningful errors

**Key Concepts**:
- Contains the "what" your app does
- Independent of HTTP/database specifics
- Can be reused (future mobile app, CLI tool, etc.)
- Receives validated data from controller
- Calls repository for data operations

**Example: `attendance.service.js` - Saving Bulk Attendance**
```javascript
class AttendanceService {
  // Constructor receives repository dependency
  constructor(repository) {
    this.repository = repository;
    // This pattern = Dependency Injection
    // Service doesn't create its own repository
  }

  async saveBulkAttendance({ sectionId, date, academicYearId, recordedBy, records }) {
    // This is business logic - the "work" your app does
    
    // Step 1: Save all attendance records to database
    const saved = await this.repository.bulkUpsertAttendance({
      sectionId,
      date,
      academicYearId,
      recordedBy,
      records,
    });
    
    // Step 2: Get summary statistics
    const summary = await this.repository.getAttendanceSummary({
      date,
      sectionId,
    });

    // Step 3: Format and return result
    return {
      sectionId,
      date,
      count: saved.length,  // How many records were saved
      summary: {
        present: Number(summary.present_count || 0),
        absent: Number(summary.absent_count || 0),
        late: Number(summary.late_count || 0),
        excused: Number(summary.excused_count || 0),
      },
    };
  }

  async getMonthlyMatrix({ sectionId, year, month }) {
    // Complex business logic example
    
    // Get raw data from repository
    const raw = await this.repository.findSectionMonthlyMatrix(sectionId, year, month);

    // Process and transform data
    const attendanceByStudent = {};
    for (const record of raw.attendanceRecords) {
      if (!attendanceByStudent[record.student_id]) {
        attendanceByStudent[record.student_id] = {};
      }
      attendanceByStudent[record.student_id][record.day_number] = {
        status: record.status,
        remark: record.remark,
      };
    }

    // Calculate statistics for each student
    const studentMatrix = raw.students.map((s) => {
      const studentDays = attendanceByStudent[s.student_id] || {};
      let presentCount = 0;
      let absentCount = 0;
      
      // Count each status type
      for (let day = 1; day <= raw.daysInMonth; day++) {
        const dayStatus = studentDays[day];
        if (dayStatus) {
          if (dayStatus.status === 'PRESENT') presentCount++;
          if (dayStatus.status === 'ABSENT') absentCount++;
        }
      }

      return {
        student_id: s.student_id,
        student_name: s.first_name + ' ' + s.last_name,
        present: presentCount,
        absent: absentCount,
        days_map: studentDays,
      };
    });

    return {
      sectionId,
      year,
      month,
      studentMatrix,
    };
  }
}
```

**Key Service Patterns**:

1. **Single Responsibility**: Each method does ONE thing
2. **Dependency Injection**: Repository passed in constructor, not created inside
3. **Error Handling**: Throw meaningful errors
4. **Data Transformation**: Process repository results before returning
5. **Orchestration**: Call multiple repository methods if needed

---

### 5. **REPOSITORY.JS** - Data Access Layer

**Purpose**: Handle all database operations

**Responsibility**:
- Execute database queries
- Map database results to application objects
- Provide query methods to service layer
- Abstract database complexity
- Handle database connections

**Key Concepts**:
- Repository = Gateway to database
- Only place that knows SQL queries
- Returns raw data or formatted objects
- Service never touches database directly

**Example: `attendance.repository.js` - Getting Roster**
```javascript
class AttendanceRepository {
  // Constructor receives database connection
  constructor(database) {
    this.database = database;
  }

  // Simple find operation
  async findSectionRosterWithAttendance(sectionId, date) {
    const result = await this.database.query(
      `
      SELECT
        s.id AS student_id,
        s.admission_number,
        s.first_name,
        s.last_name,
        s.gender,
        COALESCE(a.status, 'PRESENT') AS current_status,
        a.id AS attendance_id,
        a.remark,
        a.recorded_by,
        a.updated_at AS marked_at
      FROM students s
      LEFT JOIN attendance a
        ON a.student_id = s.id
        AND a.date = $2          -- Parameterized query (prevents SQL injection)
        AND a.deleted_at IS NULL
      WHERE s.section_id = $1    -- $1, $2 are placeholders
        AND s.deleted_at IS NULL
        AND s.status = 'ACTIVE'
      ORDER BY s.first_name ASC, s.last_name ASC
      `,
      [sectionId, date]  -- Parameters replace $1, $2
    );

    return result.rows;  // Array of students with attendance
  }

  // Complex bulk operation
  async bulkUpsertAttendance({ sectionId, date, academicYearId, recordedBy, records }) {
    if (!records || records.length === 0) return [];

    // Build dynamic SQL for all records at once
    const valueTuples = [];
    const params = [];
    let paramIndex = 1;

    // Create parameter placeholders for each record
    for (const rec of records) {
      valueTuples.push(
        `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      );
      params.push(
        rec.studentId,
        sectionId,
        academicYearId || null,
        date,
        rec.status,
        rec.remark || null,
        recordedBy || null
      );
      paramIndex += 7;
    }

    // Execute single query instead of looping N times
    const query = `
      INSERT INTO attendance (
        student_id,
        section_id,
        academic_year_id,
        date,
        status,
        remark,
        recorded_by,
        created_at,
        updated_at
      )
      VALUES ${valueTuples.join(', ')}
      ON CONFLICT (student_id, date)  -- If record exists
      DO UPDATE SET                    -- Update instead of insert
        status = EXCLUDED.status,
        remark = EXCLUDED.remark,
        section_id = EXCLUDED.section_id,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    const result = await this.database.query(query, params);
    return result.rows;
  }

  async getAttendanceSummary({ date, sectionId }) {
    const result = await this.database.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE status = 'PRESENT') AS present_count,
        COUNT(*) FILTER (WHERE status = 'ABSENT') AS absent_count,
        COUNT(*) FILTER (WHERE status = 'LATE') AS late_count,
        COUNT(*) FILTER (WHERE status = 'EXCUSED') AS excused_count
      FROM attendance
      WHERE date = $1 AND section_id = $2 AND deleted_at IS NULL
      `,
      [date, sectionId]
    );

    return result.rows[0] || {
      present_count: 0,
      absent_count: 0,
      late_count: 0,
      excused_count: 0,
    };
  }
}

module.exports = AttendanceRepository;
```

**Repository Best Practices**:

1. **Parameterized Queries**: Always use $1, $2 instead of string interpolation (prevents SQL injection)
   ```javascript
   // ✓ SAFE
   this.database.query('SELECT * FROM students WHERE id = $1', [studentId])
   
   // ✗ DANGEROUS
   this.database.query(`SELECT * FROM students WHERE id = '${studentId}'`)
   ```

2. **Bulk Operations**: Insert/update multiple records in ONE query, not a loop
   ```javascript
   // ✓ Fast (O(1) database round trips)
   bulkUpsertAttendance([...100 records...])
   
   // ✗ Slow (O(n) database round trips)
   for (const record of records) {
     await this.database.query(insert_query, record)
   }
   ```

3. **Method Naming**: Use clear names indicating what the query does
   ```
   find...() - GET operations
   create...() - INSERT operations
   update...() - UPDATE operations
   delete...() - DELETE operations (usually soft deletes)
   ```

---

## Data Flow

### Complete Request-Response Cycle

Let's trace a request through all layers:

**Request: POST /api/v1/attendance/bulk**
```json
{
  "sectionId": "123e4567-e89b-12d3-a456-426614174000",
  "date": "2024-08-15",
  "records": [
    { "studentId": "aaa-bbb-ccc", "status": "PRESENT" },
    { "studentId": "ddd-eee-fff", "status": "ABSENT" }
  ]
}
```

**Step 1: ROUTES - Accept Request**
```javascript
// attendance.routes.js
router.post('/bulk', authorizeRoles('Teacher'), recordBulkAttendance);
// Middleware checks: Is user logged in? Is user a Teacher?
```

**Step 2: CONTROLLER - Validate Input**
```javascript
// attendance.controller.js
async function recordBulkAttendance(req, res, next) {
  const input = validateBulkAttendanceInput(req.body);
  // Validation layer checks all data
  
  if (Object.keys(input.errors).length > 0) {
    return res.status(400).json({ errors: input.errors });
    // Invalid data → Stop here, send error
  }
  
  // Data is valid, continue...
```

**Step 3: SERVICE - Business Logic**
```javascript
// attendance.service.js
const data = await attendanceService.saveBulkAttendance({
  sectionId: input.sectionId,
  records: input.records,
  recordedBy: req.user.id,
  // Service knows WHAT to do with the data
});
```

**Step 4: REPOSITORY - Database Query**
```javascript
// attendance.repository.js
async bulkUpsertAttendance({ sectionId, records, recordedBy }) {
  // Build SQL with multiple records
  const query = `
    INSERT INTO attendance (...) VALUES (...)
    ON CONFLICT DO UPDATE ...
  `;
  const result = await this.database.query(query, params);
  return result.rows;  // Return database result
}
```

**Step 5: Response Flows Back Up**
```
Repository returns rows
  ↓
Service transforms data into response format
  ↓
Controller receives result
  ↓
Controller sends HTTP response
  ↓
Browser receives: { success: true, data: {...} }
```

---

## Module Structure

### Recommended File Organization

```
backend/
├── src/
│   ├── modules/              ← Organized by feature/domain
│   │   ├── attendance/
│   │   │   ├── attendance.routes.js      ← Define URL endpoints
│   │   │   ├── attendance.controller.js  ← Handle HTTP requests
│   │   │   ├── attendance.service.js     ← Business logic
│   │   │   ├── attendance.repository.js  ← Database queries
│   │   │   ├── attendance.validation.js  ← Input validation
│   │   │   └── attendance.model.js       ← Data structure definitions
│   │   │
│   │   ├── students/
│   │   │   ├── student.routes.js
│   │   │   ├── student.controller.js
│   │   │   ├── student.service.js
│   │   │   ├── student.repository.js
│   │   │   ├── student.validation.js
│   │   │   └── student.model.js
│   │   │
│   │   └── [...other modules]
│   │
│   ├── middlewares/          ← Shared middleware
│   │   ├── auth.middleware.js
│   │   └── role.middleware.js
│   │
│   ├── config/               ← Configuration
│   │   ├── database.js
│   │   └── env.js
│   │
│   ├── utils/                ← Utility functions
│   ├── validations/          ← Shared validations
│   ├── models/               ← Shared models
│   ├── app.js                ← Express app setup
│   └── server.js             ← Start server
│
└── tests/                    ← Unit & integration tests
    ├── attendance.test.js
    ├── student.test.js
    └── [...test files]
```

### Module Naming Conventions

**File Naming**:
- `singular.routes.js` (not `singulars`)
- `singular.controller.js`
- `singular.service.js`
- `singular.repository.js`
- `singular.validation.js`

**Example**:
- ✓ `student.controller.js`
- ✓ `attendance.service.js`
- ✗ `students.controller.js` (use singular)

**Class Naming**:
```javascript
// Singular + clear suffix
class AttendanceRepository {}
class StudentService {}
class StudentNotFoundError extends Error {}

// NOT
class AttendancesRepository {}  // Wrong: plural
class StudentBusiness {}        // Wrong: unclear
```

---

## Best Practices

### 1. **One Responsibility Per Function**

```javascript
// ✓ GOOD - Each function does ONE thing
async function createStudent(req, res, next) {
  const input = validateCreateStudentInput(req.body);
  if (errors) return res.status(400).json({ errors });
  
  try {
    const student = await studentService.createStudent(input);
    return res.status(201).json({ data: student });
  } catch (error) {
    return next(error);
  }
}

// ✗ BAD - Does multiple things
async function createStudentAndNotifyParent(req, res) {
  const input = validateCreateStudentInput(req.body);
  const student = await studentService.createStudent(input);
  await sendEmail(student.parentEmail, ...);  // Too many concerns
  const log = await database.query('INSERT INTO logs...');
  res.json({ data: student });
}
```

### 2. **Validate Early, Validate Often**

```javascript
// In CONTROLLER - validate immediately
const input = validateCreateStudentInput(req.body);
if (Object.keys(input.errors).length > 0) {
  return res.status(400).json({ errors: input.errors });
}

// Never pass invalid data to service
```

### 3. **Use Dependency Injection**

```javascript
// ✓ GOOD - Dependencies passed in constructor
class StudentService {
  constructor(repository, parentRepository) {
    this.repository = repository;
    this.parentRepository = parentRepository;
  }
}

// ✗ BAD - Creates own dependencies
class StudentService {
  constructor() {
    this.repository = new StudentRepository();  // Tightly coupled
  }
}
```

### 4. **Return Consistent Response Format**

```javascript
// Always return: { success, message, data }
res.status(200).json({
  success: true,
  message: 'Student created successfully',
  data: { id: '...', name: '...' }
});

res.status(400).json({
  success: false,
  message: 'Validation failed',
  data: { errors: {...} }
});
```

### 5. **Handle Errors Properly**

```javascript
// Define custom errors in Service
class StudentNotFoundError extends Error {
  constructor(message = 'Student not found') {
    super(message);
    this.name = 'StudentNotFoundError';
    this.status = 404;  // HTTP status
  }
}

// Throw from service
async getStudentById(id) {
  const student = await this.repository.findById(id);
  if (!student) {
    throw new StudentNotFoundError();  // Clear error
  }
  return student;
}

// Handle in controller
try {
  const student = await studentService.getStudentById(id);
  return res.json({ data: student });
} catch (error) {
  return next(error);  // Pass to error handler middleware
}
```

### 6. **Use Async/Await (Not Callbacks)**

```javascript
// ✓ GOOD - Modern, readable
async function getStudent(req, res, next) {
  try {
    const student = await studentService.getStudentById(req.params.id);
    return res.json({ data: student });
  } catch (error) {
    return next(error);
  }
}

// ✗ BAD - Old callback style
function getStudent(req, res) {
  studentService.getStudentById(req.params.id, function(err, student) {
    if (err) return res.status(500).json({ error: err });
    return res.json({ data: student });
  });
}
```

---

## Code Examples

### Example 1: Creating a Student

**Request:**
```
POST /api/v1/students
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "gender": "M",
  "dateOfBirth": "2010-05-15",
  "sectionId": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Flow Through Layers:**

**1. Routes** - Accept the request
```javascript
// student.routes.js
router.post('/', createStudent);
```

**2. Controller** - Handle HTTP request
```javascript
// student.controller.js
async function createStudent(req, res, next) {
  const input = validateCreateStudentInput(req.body);
  
  if (Object.keys(input.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: input.errors,
    });
  }

  try {
    const student = await studentService.createStudent(input);
    return res.status(201).json({
      success: true,
      message: 'Student created successfully',
      data: student,
    });
  } catch (error) {
    return next(error);
  }
}
```

**3. Validation** - Check input
```javascript
// student.validation.js
function validateCreateStudentInput(body = {}) {
  const errors = {};

  if (!body.firstName || body.firstName.trim().length === 0) {
    errors.firstName = 'First name is required';
  }

  if (!body.lastName || body.lastName.trim().length === 0) {
    errors.lastName = 'Last name is required';
  }

  if (!['M', 'F'].includes(body.gender)) {
    errors.gender = 'Gender must be M or F';
  }

  if (!isValidDate(body.dateOfBirth)) {
    errors.dateOfBirth = 'Valid date of birth is required';
  }

  if (!isValidUUID(body.sectionId)) {
    errors.sectionId = 'Valid section ID is required';
  }

  return {
    firstName: body.firstName ? body.firstName.trim() : null,
    lastName: body.lastName ? body.lastName.trim() : null,
    gender: body.gender,
    dateOfBirth: body.dateOfBirth,
    sectionId: body.sectionId,
    errors,
  };
}
```

**4. Service** - Business logic
```javascript
// student.service.js
async createStudent(payload) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');  // Start transaction

    // Generate admission number
    const admissionNumber = await this.repository.generateAdmissionNumber(client);

    // Create student record
    const student = await this.repository.create({
      ...payload,
      admissionNumber,
    }, client);

    await client.query('COMMIT');  // Save changes
    return student;

  } catch (error) {
    await client.query('ROLLBACK');  // Undo changes on error
    throw error;
  } finally {
    client.release();  // Return connection to pool
  }
}
```

**5. Repository** - Database query
```javascript
// student.repository.js
async create(payload, client) {
  const result = await client.query(
    `
    INSERT INTO students (
      admission_number,
      first_name,
      last_name,
      gender,
      date_of_birth,
      section_id,
      status,
      created_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING *
    `,
    [
      payload.admissionNumber,
      payload.firstName,
      payload.lastName,
      payload.gender,
      payload.dateOfBirth,
      payload.sectionId,
      'ACTIVE',
    ]
  );

  return result.rows[0];
}
```

**Response:**
```json
{
  "success": true,
  "message": "Student created successfully",
  "data": {
    "id": "aaa-bbb-ccc-ddd",
    "admissionNumber": "STU-2024-001",
    "firstName": "John",
    "lastName": "Doe",
    "gender": "M",
    "dateOfBirth": "2010-05-15",
    "sectionId": "123e4567-e89b-12d3-a456-426614174000",
    "status": "ACTIVE",
    "createdAt": "2024-08-15T10:30:00Z"
  }
}
```

---

### Example 2: Getting Monthly Attendance Matrix

**Request:**
```
GET /api/v1/attendance/matrix?sectionId=123e4567&year=2024&month=8
```

**Flow:**

**1. Routes** - Match endpoint
```javascript
router.get('/matrix', authorizeRoles('Teacher'), getMonthlyMatrix);
```

**2. Controller** - Extract parameters
```javascript
async function getMonthlyMatrix(req, res, next) {
  const sectionId = req.query.sectionId;
  const year = Number(req.query.year || new Date().getFullYear());
  const month = Number(req.query.month || new Date().getMonth() + 1);

  // Quick validation
  if (!isValidUUID(sectionId)) {
    return res.status(400).json({
      success: false,
      message: 'Valid sectionId is required',
    });
  }

  if (year < 2000 || year > 2100 || month < 1 || month > 12) {
    return res.status(400).json({
      success: false,
      message: 'Valid year and month required',
    });
  }

  try {
    const data = await attendanceService.getMonthlyMatrix({
      sectionId,
      year,
      month,
    });
    return res.json({
      success: true,
      message: 'Monthly attendance matrix loaded',
      data,
    });
  } catch (error) {
    return next(error);
  }
}
```

**3. Service** - Transform data
```javascript
async getMonthlyMatrix({ sectionId, year, month }) {
  // Fetch raw data
  const raw = await this.repository.findSectionMonthlyMatrix(
    sectionId,
    year,
    month
  );

  // Transform into matrix
  const attendanceByStudent = {};
  for (const record of raw.attendanceRecords) {
    if (!attendanceByStudent[record.student_id]) {
      attendanceByStudent[record.student_id] = {};
    }
    attendanceByStudent[record.student_id][record.day_number] = {
      status: record.status,
      remark: record.remark,
    };
  }

  // Calculate per-student stats
  const studentMatrix = raw.students.map((s) => {
    const studentDays = attendanceByStudent[s.student_id] || {};
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;

    for (let day = 1; day <= raw.daysInMonth; day++) {
      const status = studentDays[day]?.status;
      if (status === 'PRESENT') presentCount++;
      else if (status === 'ABSENT') absentCount++;
      else if (status === 'LATE') lateCount++;
      else if (status === 'EXCUSED') excusedCount++;
    }

    return {
      studentId: s.student_id,
      studentName: `${s.first_name} ${s.last_name}`,
      present: presentCount,
      absent: absentCount,
      late: lateCount,
      excused: excusedCount,
      attendancePercentage: Math.round(
        (presentCount / raw.daysInMonth) * 100
      ),
      daysMap: studentDays,
    };
  });

  return {
    sectionId,
    year,
    month,
    daysInMonth: raw.daysInMonth,
    students: studentMatrix,
  };
}
```

**4. Repository** - Query database
```javascript
async findSectionMonthlyMatrix(sectionId, year, month) {
  // Get all students in section
  const studentsResult = await this.database.query(
    `
    SELECT id as student_id, first_name, last_name
    FROM students
    WHERE section_id = $1 AND deleted_at IS NULL
    ORDER BY first_name, last_name
    `,
    [sectionId]
  );

  // Get all attendance records for month
  const attendanceResult = await this.database.query(
    `
    SELECT
      student_id,
      status,
      remark,
      EXTRACT(DAY FROM date) as day_number
    FROM attendance
    WHERE
      section_id = $1
      AND EXTRACT(YEAR FROM date) = $2
      AND EXTRACT(MONTH FROM date) = $3
      AND deleted_at IS NULL
    ORDER BY date, student_id
    `,
    [sectionId, year, month]
  );

  // Calculate days in month
  const daysInMonth = new Date(year, month, 0).getDate();

  return {
    students: studentsResult.rows,
    attendanceRecords: attendanceResult.rows,
    daysInMonth,
  };
}
```

**Response:**
```json
{
  "success": true,
  "message": "Monthly attendance matrix loaded",
  "data": {
    "sectionId": "123e4567-e89b-12d3-a456-426614174000",
    "year": 2024,
    "month": 8,
    "daysInMonth": 31,
    "students": [
      {
        "studentId": "aaa-bbb-ccc",
        "studentName": "John Doe",
        "present": 20,
        "absent": 5,
        "late": 3,
        "excused": 2,
        "attendancePercentage": 65,
        "daysMap": {
          "1": { "status": "PRESENT" },
          "2": { "status": "ABSENT", "remark": "Sick" },
          ...
        }
      },
      ...
    ]
  }
}
```

---

## Quick Reference

### Creating a New Module (Checklist)

When adding a new feature (e.g., Grades):

**1. Create the routes file**
```javascript
// grade.routes.js
const express = require('express');
const { getGrade, createGrade } = require('./grade.controller');
const router = express.Router();

router.get('/:id', getGrade);
router.post('/', createGrade);

module.exports = router;
```

**2. Create the controller**
```javascript
// grade.controller.js
async function getGrade(req, res, next) {
  const input = validateGradeId(req.params.id);
  if (input.errors) return res.status(400).json({ errors: input.errors });
  
  try {
    const data = await gradeService.getGradeById(input.id);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getGrade, createGrade };
```

**3. Create the service**
```javascript
// grade.service.js
class GradeService {
  constructor(repository) {
    this.repository = repository;
  }

  async getGradeById(id) {
    const grade = await this.repository.findById(id);
    if (!grade) throw new GradeNotFoundError();
    return grade;
  }
}

module.exports = GradeService;
```

**4. Create the repository**
```javascript
// grade.repository.js
class GradeRepository {
  constructor(database) {
    this.database = database;
  }

  async findById(id) {
    const result = await this.database.query(
      'SELECT * FROM grades WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }
}

module.exports = GradeRepository;
```

**5. Create the validation**
```javascript
// grade.validation.js
function validateGradeId(id) {
  return {
    id: id && isValidUUID(id) ? id : null,
    errors: !isValidUUID(id) ? { id: 'Valid grade ID required' } : {}
  };
}

module.exports = { validateGradeId };
```

**6. Register in app.js**
```javascript
// app.js
const gradeRoutes = require('./modules/grades/grade.routes');
app.use('/api/v1/grades', gradeRoutes);
```

---

## Summary

| File | Purpose | Does | Doesn't |
|------|---------|------|---------|
| **routes.js** | Define endpoints | Maps URLs to functions | Execute business logic |
| **controller.js** | Handle HTTP | Parse requests, call service, send response | Query database, contain logic |
| **validation.js** | Validate input | Check data type/format/constraints | Throw errors (returns errors object) |
| **service.js** | Business logic | Orchestrate operations, transform data | Touch HTTP, query database directly |
| **repository.js** | Data access | Execute SQL, return results | Contain business logic, HTTP concerns |

---

## Learning Resources

- **MVC Pattern**: Model-View-Controller, adapted for REST APIs
- **Layered Architecture**: Also called N-Tier Architecture
- **Repository Pattern**: Data access abstraction
- **Dependency Injection**: Pass dependencies, don't create them
- **SOLID Principles**: Single Responsibility, Open/Closed, etc.

Your codebase is a great example of clean, maintainable backend architecture!
