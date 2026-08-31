# Smart SMS Backend - Quick Reference Cheat Sheet

## The 5-Layer Flow (Request → Response)

```
┌─ User Request (HTTP) ─┐
│  POST /api/v1/...     │
└───────────┬───────────┘
            ↓
┌─────────────────────────┐
│    ROUTES.JS            │  Define URL endpoints
│  router.post('/path',   │  Apply middleware
│    middleware, handler) │  Route to controller
└───────────┬─────────────┘
            ↓
┌─────────────────────────┐
│  CONTROLLER.JS          │  Handle HTTP request
│  - Parse req.body       │  Call validation
│  - Call service         │  Send response
│  - Handle errors        │
└───────────┬─────────────┘
            ↓
┌─────────────────────────┐
│  VALIDATION.JS          │  Validate input data
│  - Check types          │  Check format
│  - Check constraints    │  Return errors
└───────────┬─────────────┘
            ↓
┌─────────────────────────┐
│  SERVICE.JS             │  Business logic
│  - Process data         │  Transform data
│  - Call repository      │  Handle errors
│  - Orchestrate flow     │
└───────────┬─────────────┘
            ↓
┌─────────────────────────┐
│  REPOSITORY.JS          │  Database access
│  - Write SQL            │  Execute query
│  - Return results       │  Handle DB errors
└───────────┬─────────────┘
            ↓
        DATABASE
            ↓
   (Data flows back up)
```

---

## File Templates

### 1. ROUTES.JS Template
```javascript
const express = require('express');
const { getItem, createItem, updateItem, deleteItem } = require('./item.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware);

// Public routes (within authenticated users)
router.get('/', getItem);

// Role-specific routes
router.post('/', authorizeRoles('Admin'), createItem);
router.put('/:id', authorizeRoles('Admin'), updateItem);
router.delete('/:id', authorizeRoles('Admin'), deleteItem);

module.exports = router;
```

### 2. CONTROLLER.JS Template
```javascript
const ItemRepository = require('./item.repository');
const ItemService = require('./item.service');
const { validateItemId, validateCreateItemInput } = require('./item.validation');
const { db } = require('../../config/database');

const itemService = new ItemService(new ItemRepository(db));

async function getItem(req, res, next) {
  const { id, errors } = validateItemId(req.params.id);
  
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', data: errors });
  }

  try {
    const data = await itemService.getItemById(id);
    return res.status(200).json({ success: true, message: 'Item loaded', data });
  } catch (error) {
    return next(error);
  }
}

async function createItem(req, res, next) {
  const input = validateCreateItemInput(req.body);
  
  if (Object.keys(input.errors).length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', data: input.errors });
  }

  try {
    const data = await itemService.createItem(input);
    return res.status(201).json({ success: true, message: 'Item created', data });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getItem, createItem };
```

### 3. VALIDATION.JS Template
```javascript
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(value) {
  return typeof value === 'string' && UUID_REGEX.test(value.trim());
}

function validateItemId(id) {
  const errors = {};
  
  if (!id || !isValidUUID(id)) {
    errors.id = 'Valid item ID required';
  }

  return {
    id: id ? id.trim() : null,
    errors,
  };
}

function validateCreateItemInput(body = {}) {
  const errors = {};

  if (!body.name || body.name.trim().length === 0) {
    errors.name = 'Name is required';
  }

  if (!body.email || !body.email.includes('@')) {
    errors.email = 'Valid email is required';
  }

  return {
    name: body.name ? body.name.trim() : null,
    email: body.email ? body.email.trim() : null,
    errors,
  };
}

module.exports = { validateItemId, validateCreateItemInput };
```

### 4. SERVICE.JS Template
```javascript
class ItemNotFoundError extends Error {
  constructor(message = 'Item not found') {
    super(message);
    this.name = 'ItemNotFoundError';
    this.status = 404;
  }
}

class ItemService {
  constructor(repository) {
    this.repository = repository;
  }

  async getItemById(id) {
    const item = await this.repository.findById(id);
    
    if (!item) {
      throw new ItemNotFoundError();
    }

    return item;
  }

  async createItem(payload) {
    // Add business logic here
    const item = await this.repository.create(payload);
    return item;
  }

  async listItems({ limit = 20, offset = 0 } = {}) {
    const data = await this.repository.findAll({ limit, offset });
    return {
      page: Math.floor(offset / limit) + 1,
      limit,
      total: data.total,
      totalPages: Math.ceil(data.total / limit),
      items: data.items,
    };
  }
}

module.exports = ItemService;
```

### 5. REPOSITORY.JS Template
```javascript
class ItemRepository {
  constructor(database) {
    this.database = database;
  }

  async findById(id) {
    const result = await this.database.query(
      'SELECT * FROM items WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return result.rows[0];
  }

  async findAll({ limit = 20, offset = 0 }) {
    const countResult = await this.database.query(
      'SELECT COUNT(*) as count FROM items WHERE deleted_at IS NULL'
    );

    const dataResult = await this.database.query(
      `SELECT * FROM items WHERE deleted_at IS NULL 
       ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return {
      total: Number(countResult.rows[0].count),
      items: dataResult.rows,
    };
  }

  async create(payload) {
    const result = await this.database.query(
      `INSERT INTO items (name, email, created_at, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [payload.name, payload.email]
    );
    return result.rows[0];
  }

  async update(id, payload) {
    const result = await this.database.query(
      `UPDATE items SET name = $2, email = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [id, payload.name, payload.email]
    );
    return result.rows[0];
  }

  async delete(id) {
    const result = await this.database.query(
      `UPDATE items SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  }
}

module.exports = ItemRepository;
```

---

## Common Patterns

### Pattern 1: List with Pagination
```javascript
// CONTROLLER
async function listItems(req, res, next) {
  try {
    const data = await itemService.listItems({
      limit: Number(req.query.limit || 20),
      offset: Number(req.query.offset || 0),
    });
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

// SERVICE
async listItems({ limit = 20, offset = 0 } = {}) {
  const data = await this.repository.findAll({ limit, offset });
  return {
    page: Math.floor(offset / limit) + 1,
    limit,
    total: data.total,
    totalPages: Math.ceil(data.total / limit),
    items: data.items,
  };
}

// REPOSITORY
async findAll({ limit = 20, offset = 0 }) {
  const countResult = await this.database.query(
    'SELECT COUNT(*) as count FROM items WHERE deleted_at IS NULL'
  );
  
  const dataResult = await this.database.query(
    'SELECT * FROM items WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  );

  return {
    total: Number(countResult.rows[0].count),
    items: dataResult.rows,
  };
}
```

### Pattern 2: Bulk Insert/Update
```javascript
// REPOSITORY
async bulkUpsert(records) {
  if (!records || records.length === 0) return [];

  const valueTuples = [];
  const params = [];
  let paramIndex = 1;

  for (const rec of records) {
    valueTuples.push(`($${paramIndex}, $${paramIndex + 1}, CURRENT_TIMESTAMP)`);
    params.push(rec.name, rec.email);
    paramIndex += 2;
  }

  const query = `
    INSERT INTO items (name, email, created_at)
    VALUES ${valueTuples.join(', ')}
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
    RETURNING *
  `;

  const result = await this.database.query(query, params);
  return result.rows;
}
```

### Pattern 3: Soft Delete
```javascript
// REPOSITORY
async delete(id) {
  const result = await this.database.query(
    'UPDATE items SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
    [id]
  );
  return result.rows[0];
}

// REPOSITORY - Always filter soft-deleted
async findById(id) {
  const result = await this.database.query(
    'SELECT * FROM items WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
  return result.rows[0];
}
```

### Pattern 4: Transactions
```javascript
// SERVICE
async createItemWithDetails(payload) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Multiple operations in transaction
    const item = await this.repository.create(payload, client);
    const details = await this.repository.addDetails(item.id, payload.details, client);

    await client.query('COMMIT');
    return { item, details };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

### Pattern 5: Custom Errors
```javascript
// SERVICE
class ItemNotFoundError extends Error {
  constructor(message = 'Item not found') {
    super(message);
    this.name = 'ItemNotFoundError';
    this.status = 404;
  }
}

class ItemConflictError extends Error {
  constructor(message = 'Item already exists') {
    super(message);
    this.name = 'ItemConflictError';
    this.status = 409;
  }
}

async getItemById(id) {
  const item = await this.repository.findById(id);
  if (!item) {
    throw new ItemNotFoundError(`Item with ID ${id} not found`);
  }
  return item;
}
```

---

## Common Mistakes to Avoid

| ❌ WRONG | ✅ CORRECT |
|---------|-----------|
| `router.post('/', (req, res) => { ... })` | Import controller, pass function reference |
| `new StudentRepository()` in service | Pass repository in constructor (DI) |
| `SELECT * FROM students WHERE id = '${id}'` | Use `$1` parameterized query |
| Looping inserts: `for (const r of records) db.query(...)` | Bulk insert with single query |
| Throwing errors in validation | Return `{ errors: {...} }` object |
| Querying DB in controller | Always use service layer |
| Not checking if data exists before returning | Check and throw `NotFoundError` |
| `res.json(student)` (no status) | `res.status(200).json({success: true, data: student})` |
| Handling errors in controller catch | Pass to next() for middleware handling |
| Not validating user input | Always validate in validation layer |

---

## HTTP Status Codes

```javascript
// Success
res.status(200).json({...})  // OK - GET, PUT
res.status(201).json({...})  // Created - POST
res.status(204)              // No Content - DELETE

// Client Errors
res.status(400).json({...})  // Bad Request - validation failed
res.status(401).json({...})  // Unauthorized - not logged in
res.status(403).json({...})  // Forbidden - no permission
res.status(404).json({...})  // Not Found - resource doesn't exist
res.status(409).json({...})  // Conflict - duplicate record

// Server Errors
res.status(500).json({...})  // Internal Server Error
```

---

## Debugging Tips

1. **Validation Issues**: Check validation.js first
2. **Wrong Data**: Add `console.log()` in service before calling repository
3. **Database Errors**: Check SQL syntax in repository.js
4. **400 Errors**: Look at validation results
5. **404 Errors**: Check if record exists in database
6. **500 Errors**: Check error middleware logs

---

## Key Takeaways

1. **Routes** = Entrance door for HTTP requests
2. **Controller** = Bouncer checking validation, calls service
3. **Validation** = Guard checking if data is good
4. **Service** = Brain doing the actual work
5. **Repository** = Library looking up data in database

Each layer has ONE job. Don't mix responsibilities!

---

## What to Study Next

1. Read [ARCHITECTURE_DOCUMENTATION.md](./ARCHITECTURE_DOCUMENTATION.md) fully
2. Trace through an existing module (attendance or student)
3. Try creating a simple module (e.g., Settings)
4. Write tests for validation functions
5. Optimize slow queries in repository layer

Happy coding! 🚀
