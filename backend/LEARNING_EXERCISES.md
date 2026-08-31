# Hands-On Learning Exercises

## Getting Familiar with the Architecture

---

## Exercise 1: Tracing an Existing Request

**Goal**: Understand how a request flows through all 5 layers

**Task**: Follow the request `GET /api/v1/students/123/profile`

**Steps**:

1. **Find the Route**
   - Open `backend/src/modules/students/student.routes.js`
   - Find the line: `router.get('/:id/profile', getStudentProfile);`
   - Note: This calls `getStudentProfile` from the controller

2. **Find the Controller**
   - Open `backend/src/modules/students/student.controller.js`
   - Find function `getStudentProfile(req, res, next)`
   - Read what it does:
     - Validates the `id` parameter
     - Calls `studentService.getStudentProfile(id)`
     - Sends response

3. **Check the Validation**
   - Open `backend/src/modules/students/student.validation.js`
   - Find `validateStudentId()` function
   - See how it checks if the ID is a valid UUID

4. **Read the Service**
   - Open `backend/src/modules/students/student.service.js`
   - Find `getStudentProfile(id)` method
   - See how it:
     - Calls repository to get student
     - Calls repository to get guardian
     - Combines and returns data

5. **See the Repository**
   - Open `backend/src/modules/students/student.repository.js`
   - Find methods:
     - `findById(id)` - gets student data
     - `findGuardianByStudentId(studentId)` - gets guardian
   - See the actual SQL queries

**Reflection Questions**:
- What HTTP method is used? (GET, POST, etc.)
- How is the student ID validated?
- Where does the database query happen?
- What would happen if the student doesn't exist?

---

## Exercise 2: Creating a Simple Module from Scratch

**Goal**: Build a complete feature using all 5 layers

**Scenario**: Create a "Settings" module to store app configuration

**What you'll create**:
- `setting.routes.js` - Define endpoints
- `setting.controller.js` - Handle HTTP
- `setting.service.js` - Business logic
- `setting.repository.js` - Database queries
- `setting.validation.js` - Validate input

### Step 1: Create the Validation

File: `backend/src/modules/settings/setting.validation.js`

```javascript
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(value) {
  return typeof value === 'string' && UUID_REGEX.test(value.trim());
}

function validateSettingKey(key) {
  const errors = {};
  
  if (!key || key.trim().length === 0) {
    errors.key = 'Setting key is required';
  }
  
  if (key && key.length > 100) {
    errors.key = 'Key must be less than 100 characters';
  }

  return {
    key: key ? key.trim() : null,
    errors,
  };
}

function validateUpdateSettingInput(body = {}) {
  const errors = {};

  if (!body.key || body.key.trim().length === 0) {
    errors.key = 'Setting key is required';
  }

  if (!body.value) {
    errors.value = 'Setting value is required';
  }

  return {
    key: body.key ? body.key.trim() : null,
    value: body.value ? String(body.value).trim() : null,
    errors,
  };
}

module.exports = { validateSettingKey, validateUpdateSettingInput };
```

### Step 2: Create the Repository

File: `backend/src/modules/settings/setting.repository.js`

```javascript
class SettingRepository {
  constructor(database) {
    this.database = database;
  }

  async findByKey(key) {
    const result = await this.database.query(
      `SELECT * FROM settings WHERE key = $1 AND deleted_at IS NULL`,
      [key]
    );
    return result.rows[0];
  }

  async findAll() {
    const result = await this.database.query(
      `SELECT * FROM settings WHERE deleted_at IS NULL ORDER BY key ASC`
    );
    return result.rows;
  }

  async create(payload) {
    const result = await this.database.query(
      `INSERT INTO settings (key, value, created_at, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [payload.key, payload.value]
    );
    return result.rows[0];
  }

  async update(key, payload) {
    const result = await this.database.query(
      `UPDATE settings SET value = $2, updated_at = CURRENT_TIMESTAMP
       WHERE key = $1 RETURNING *`,
      [key, payload.value]
    );
    return result.rows[0];
  }

  async delete(key) {
    const result = await this.database.query(
      `UPDATE settings SET deleted_at = CURRENT_TIMESTAMP
       WHERE key = $1 RETURNING *`,
      [key]
    );
    return result.rows[0];
  }
}

module.exports = SettingRepository;
```

### Step 3: Create the Service

File: `backend/src/modules/settings/setting.service.js`

```javascript
class SettingNotFoundError extends Error {
  constructor(message = 'Setting not found') {
    super(message);
    this.name = 'SettingNotFoundError';
    this.status = 404;
  }
}

class SettingService {
  constructor(repository) {
    this.repository = repository;
  }

  async getSettingByKey(key) {
    const setting = await this.repository.findByKey(key);
    
    if (!setting) {
      throw new SettingNotFoundError(`Setting "${key}" not found`);
    }

    return setting;
  }

  async getAllSettings() {
    const settings = await this.repository.findAll();
    return settings;
  }

  async updateSetting(key, payload) {
    // Check if setting exists
    const existing = await this.repository.findByKey(key);
    
    if (!existing) {
      throw new SettingNotFoundError(`Setting "${key}" not found`);
    }

    // Update it
    const updated = await this.repository.update(key, payload);
    return updated;
  }

  async createSetting(payload) {
    // Check if already exists
    const existing = await this.repository.findByKey(payload.key);
    
    if (existing) {
      throw new Error(`Setting "${payload.key}" already exists`);
    }

    const created = await this.repository.create(payload);
    return created;
  }

  async deleteSetting(key) {
    const setting = await this.repository.findByKey(key);
    
    if (!setting) {
      throw new SettingNotFoundError(`Setting "${key}" not found`);
    }

    const deleted = await this.repository.delete(key);
    return deleted;
  }
}

module.exports = SettingService;
```

### Step 4: Create the Controller

File: `backend/src/modules/settings/setting.controller.js`

```javascript
const SettingRepository = require('./setting.repository');
const SettingService = require('./setting.service');
const { validateSettingKey, validateUpdateSettingInput } = require('./setting.validation');
const { db } = require('../../config/database');

const settingService = new SettingService(new SettingRepository(db));

async function getSetting(req, res, next) {
  const { key, errors } = validateSettingKey(req.params.key);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: errors,
    });
  }

  try {
    const data = await settingService.getSettingByKey(key);
    return res.status(200).json({
      success: true,
      message: 'Setting retrieved successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function getAllSettings(req, res, next) {
  try {
    const data = await settingService.getAllSettings();
    return res.status(200).json({
      success: true,
      message: 'All settings retrieved successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateSetting(req, res, next) {
  const { key, errors: keyErrors } = validateSettingKey(req.params.key);

  if (Object.keys(keyErrors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: keyErrors,
    });
  }

  const input = validateUpdateSettingInput(req.body);

  if (Object.keys(input.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: input.errors,
    });
  }

  try {
    const data = await settingService.updateSetting(key, input);
    return res.status(200).json({
      success: true,
      message: 'Setting updated successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function createSetting(req, res, next) {
  const input = validateUpdateSettingInput(req.body);

  if (Object.keys(input.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: input.errors,
    });
  }

  try {
    const data = await settingService.createSetting(input);
    return res.status(201).json({
      success: true,
      message: 'Setting created successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteSetting(req, res, next) {
  const { key, errors } = validateSettingKey(req.params.key);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: errors,
    });
  }

  try {
    const data = await settingService.deleteSetting(key);
    return res.status(200).json({
      success: true,
      message: 'Setting deleted successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getSetting,
  getAllSettings,
  updateSetting,
  createSetting,
  deleteSetting,
};
```

### Step 5: Create the Routes

File: `backend/src/modules/settings/setting.routes.js`

```javascript
const express = require('express');
const {
  getSetting,
  getAllSettings,
  updateSetting,
  createSetting,
  deleteSetting,
} = require('./setting.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');

const router = express.Router();

// Apply authentication
router.use(authMiddleware);

// Endpoints
router.get('/', getAllSettings);
router.get('/:key', getSetting);
router.post('/', authorizeRoles('Admin'), createSetting);
router.put('/:key', authorizeRoles('Admin'), updateSetting);
router.delete('/:key', authorizeRoles('Admin'), deleteSetting);

module.exports = router;
```

### Step 6: Register in app.js

File: `backend/src/app.js` (add this line with other imports)

```javascript
const settingRoutes = require('./modules/settings/setting.routes');

// ... other middleware ...

app.use('/api/v1/settings', settingRoutes);
```

### Step 7: Test Your Module

**Test Creating a Setting**:
```bash
curl -X POST http://localhost:3000/api/v1/settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "key": "school_name",
    "value": "My School"
  }'
```

**Test Getting All Settings**:
```bash
curl http://localhost:3000/api/v1/settings \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Test Getting One Setting**:
```bash
curl http://localhost:3000/api/v1/settings/school_name \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Test Updating a Setting**:
```bash
curl -X PUT http://localhost:3000/api/v1/settings/school_name \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "value": "My Updated School"
  }'
```

---

## Exercise 3: Understanding Validation

**Goal**: Understand how validation protects your application

**Task**: Look at `attendance.validation.js` and answer:

1. What happens if `sectionId` is missing?
2. What happens if `date` is in wrong format?
3. How are records in the array validated?
4. What gets returned if validation passes?
5. What gets returned if validation fails?

**Try This**:
- Add a new validation rule (e.g., max date can't be in future)
- Add error message for each rule
- Test with invalid data

---

## Exercise 4: Spotting Architecture Issues

**Goal**: Learn what WRONG code looks like

**Challenge**: Read this code and identify the problems:

```javascript
// ❌ WRONG - All in one place
app.post('/students', (req, res) => {
  const id = req.body.id;
  
  // Direct query - no validation
  db.query(
    `INSERT INTO students (id, name, email) VALUES ('${id}', '${req.body.name}', '${req.body.email}')`
  ).then(result => {
    // Business logic mixed with HTTP
    if (result.rows[0].age < 18) {
      req.body.requiresParent = true;
    }
    
    // Everything in controller
    res.send({
      result: result.rows[0],
      processed: true,
      extra: 'stuff'
    });
  }).catch(err => {
    console.error(err);
    res.status(500).send('Error');
  });
});
```

**Problems**:
1. ❌ No validation
2. ❌ SQL injection vulnerability (`'${id}'`)
3. ❌ Business logic in controller
4. ❌ Direct database query in controller
5. ❌ Inconsistent response format
6. ❌ Poor error handling
7. ❌ Uses callbacks, not async/await

**✅ Correct Version**:
See Exercise 2 above for the proper way to structure this!

---

## Exercise 5: Debugging a Bug

**Scenario**: User reports: "I can't create a student"

**Investigation Checklist**:

1. **Check the Route**
   - Is the route defined?
   - Is the correct controller called?

2. **Check the Controller**
   - Does it validate input?
   - Does it call the service?
   - Does it send proper response?

3. **Check the Validation**
   - Are validation rules correct?
   - Are error messages clear?
   - Try testing validation function directly

4. **Check the Service**
   - Does it call repository correctly?
   - Does it throw errors when needed?
   - Does it transform data properly?

5. **Check the Repository**
   - Is the SQL query correct?
   - Are parameters in right order?
   - Does database table exist?
   - Do all columns exist?

6. **Check Middleware**
   - Is user authenticated?
   - Does user have permission?

**Example Bug Hunt**:
```javascript
// Controller tries to call:
await studentService.createStudent(input);

// But service expects different parameter:
async createStudent(firstName, lastName, email) {
  // Won't match!
}

// Solution: Make sure parameter names and types match!
```

---

## Exercise 6: Understanding Error Flow

**Goal**: See how errors propagate through layers

**Task**: Trace what happens when:

1. **User sends invalid data**
   ```
   Controller receives validation errors
   → Returns 400 status with error details
   → Request ends here, service is never called
   ```

2. **Repository query fails**
   ```
   Repository throws error
   → Service catches error? (Usually no)
   → Controller catches error → next(error)
   → Error middleware handles it → 500 response
   ```

3. **Resource not found**
   ```
   Repository returns nothing
   → Service throws NotFoundError
   → Controller catches error → next(error)
   → Error middleware checks error.status = 404
   → Sends 404 response
   ```

---

## Exercise 7: Code Review Practice

**Goal**: Learn to review code like a senior developer

**Task**: Review this controller function:

```javascript
async function updateStudent(req, res, next) {
  try {
    const { id } = req.params;
    const student = await studentService.updateStudent(id, req.body);
    res.json(student);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
```

**Review Questions**:
1. ❓ Is input validated? (No! Should validate before calling service)
2. ❓ What if student not found? (Returns 500, should be 404)
3. ❓ Is response format consistent? (No success, message fields)
4. ❓ Should status be 200 or 204? (200 for data, 204 for no content)

**Suggested Fix**:
```javascript
async function updateStudent(req, res, next) {
  const input = validateUpdateStudentInput(req.body);
  
  if (Object.keys(input.errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: input.errors,
    });
  }

  try {
    const student = await studentService.updateStudent(req.params.id, input);
    return res.status(200).json({
      success: true,
      message: 'Student updated successfully',
      data: student,
    });
  } catch (error) {
    return next(error);  // Error middleware will handle
  }
}
```

---

## Exercise 8: Performance Optimization

**Goal**: Learn to spot performance issues

**Bad Code**:
```javascript
async saveBulkAttendance(records) {
  for (const record of records) {
    // This queries database 100 times for 100 records!
    await this.repository.saveAttendance(record);
  }
}
```

**Good Code**:
```javascript
async saveBulkAttendance(records) {
  // Single database query for all records
  await this.repository.bulkUpsertAttendance(records);
}
```

**Why?**:
- Bad = 100 database round trips (100ms × 100 = 10 seconds!)
- Good = 1 database round trip (10ms total)
- Your app will be 100x faster!

---

## Self-Assessment

Rate yourself 1-5 on each:

- [ ] I understand what routes do
- [ ] I understand what controllers do
- [ ] I understand validation layer
- [ ] I understand services
- [ ] I understand repositories
- [ ] I can trace a request through all 5 layers
- [ ] I can create a new module from scratch
- [ ] I know when to use each layer
- [ ] I understand error handling flow
- [ ] I can spot architecture issues in code

**Score**:
- 40-50: Expert! Ready to mentor others
- 30-39: Advanced! Can build complex features
- 20-29: Intermediate! Can handle most tasks
- 10-19: Beginner! Keep practicing
- <10: Don't worry! Review the documentation again

---

## Next Steps

1. **Complete Exercise 2** fully - Create the Settings module
2. **Do a Code Review** - Review the Students module using the rubric
3. **Trace a Request** - Pick any endpoint and trace through all 5 layers
4. **Create Another Module** - Maybe a "Notifications" module
5. **Write Tests** - Write unit tests for validation functions

Good luck! You've got this! 🚀
