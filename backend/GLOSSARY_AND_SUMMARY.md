# Backend Architecture - Glossary & Summary

## Key Terms Explained

### Architecture & Design Patterns

**Layered Architecture**
- Structure where code is organized into horizontal layers
- Each layer has specific responsibility
- Layers communicate with each other in order
- Example: Routes → Controller → Service → Repository

**MVC (Model-View-Controller)**
- Design pattern that separates concerns
- Model = Data and business logic
- View = User interface
- Controller = Handles user input
- Your API uses MVC adapted for REST

**Repository Pattern**
- All database access goes through a repository
- Repository is a "gateway" to the database
- Keeps database logic separate from business logic
- Makes it easy to switch databases later

**Dependency Injection (DI)**
- Providing dependencies to a class instead of creating them
- Example: `new Service(repository)` instead of `new Service()` creating its own repo
- Benefits: Testable, loosely coupled, flexible

**REST (Representational State Transfer)**
- Architecture for building APIs
- Uses HTTP methods: GET, POST, PUT, DELETE
- Resources identified by URLs
- Stateless communication

---

### HTTP Concepts

**HTTP Method**
- GET: Retrieve data (safe, idempotent)
- POST: Create new data
- PUT: Replace entire resource
- PATCH: Update part of resource
- DELETE: Remove data

**HTTP Status Code**
- 1xx: Information
- 2xx: Success (200, 201, 204)
- 3xx: Redirect
- 4xx: Client error (400, 401, 403, 404)
- 5xx: Server error (500)

**Middleware**
- Function that runs BEFORE controller
- Can modify request or block it
- Example: Authentication, authorization, logging
- Uses `next()` to pass control to next middleware/controller

**Request/Response Cycle**
```
Browser sends request
  ↓
Server receives request
  ↓
Middleware checks (auth, roles, validation)
  ↓
Controller processes
  ↓
Service does work
  ↓
Repository queries database
  ↓
Response flows back
  ↓
Browser receives response
```

---

### Database Concepts

**CRUD Operations**
- **C**reate: INSERT new record
- **R**ead: SELECT existing records
- **U**pdate: UPDATE existing record
- **D**elete: DELETE existing record

**Query**
- SQL command sent to database
- Example: `SELECT * FROM students WHERE id = 1`

**Parameterized Query**
- Uses placeholders ($1, $2) instead of string interpolation
- Prevents SQL injection attacks
- Safe: `SELECT * FROM students WHERE id = $1`
- Unsafe: `SELECT * FROM students WHERE id = '${id}'`

**Soft Delete**
- Mark record as deleted (set `deleted_at` timestamp)
- Don't actually remove from database
- Benefits: Can recover deleted data, audit trail
- Implementation: Check `WHERE deleted_at IS NULL`

**Transaction**
- Group of queries that must all succeed together
- If any fails, all are rolled back
- Example: Create student AND create parent record together
- `BEGIN` → run queries → `COMMIT` (success) or `ROLLBACK` (error)

**UPSERT**
- UPDATE if exists, INSERT if not
- SQL: `INSERT ... ON CONFLICT DO UPDATE`
- Efficient for updating multiple records

**N+1 Problem**
- Bad: Query 1 student, then query parent for each student (slow)
- Good: Query students with parents in single query (fast)
- Avoid loops with database queries

---

### Code Concepts

**Async/Await**
- `async` keyword makes function return a Promise
- `await` keyword waits for Promise to resolve
- Makes asynchronous code look synchronous
- Example:
  ```javascript
  async function getStudent(id) {
    const student = await db.query(...);  // Wait for result
    return student;
  }
  ```

**Error Handling**
- `try/catch`: Catch errors gracefully
- `throw`: Raise an error
- `next(error)`: Pass error to error handler middleware
- Custom errors: Create error classes with status codes

**Validation**
- Check data before using it
- Prevents bad data from entering database
- Should happen in validation layer only
- Always return errors instead of throwing

**Business Logic**
- The actual work your app does
- Independent of HTTP and database
- Lives in service layer
- Examples: Calculate attendance %, generate report, etc.

**Separation of Concerns**
- Each layer has one job
- Controller doesn't do service's job
- Repository doesn't do controller's job
- Makes code maintainable and testable

---

### Response Format

**Standard Response Structure**
```javascript
{
  success: true/false,           // Did it work?
  message: "Human readable text", // What happened?
  data: {...} or [...] or null   // The actual result
}
```

**Success Example**:
```json
{
  "success": true,
  "message": "Student created successfully",
  "data": {
    "id": "123",
    "name": "John",
    "email": "john@school.com"
  }
}
```

**Error Example**:
```json
{
  "success": false,
  "message": "Validation failed",
  "data": {
    "name": "Name is required",
    "email": "Valid email is required"
  }
}
```

---

## Quick Comparison Table

### When to Use Each Layer

| Question | Layer | Answer |
|----------|-------|--------|
| Where do I define the URL? | Routes | `/api/v1/students` |
| Where do I validate input? | Validation | Check if email is valid |
| Where do I handle HTTP? | Controller | Send res.json() |
| Where do I do calculations? | Service | Calculate attendance % |
| Where do I query database? | Repository | SELECT * FROM... |

### What Each Layer Knows About

| Layer | Knows About HTTP | Knows About DB | Has Business Logic |
|-------|------------------|-----------------|-------------------|
| Routes | ✓ | ✗ | ✗ |
| Controller | ✓ | ✗ | ✗ |
| Service | ✗ | ✗ | ✓ |
| Repository | ✗ | ✓ | ✗ |
| Validation | ✗ | ✗ | ✗ |

---

## Common Workflows

### Adding a New Feature

1. **Plan the endpoint**
   - HTTP method (GET, POST, PUT, DELETE)
   - URL path
   - Expected input and output

2. **Create validation** (validation.js)
   - Define validation rules
   - Test with invalid data

3. **Create repository** (repository.js)
   - Write SQL queries
   - Test queries in database

4. **Create service** (service.js)
   - Call repository methods
   - Implement business logic
   - Handle errors

5. **Create controller** (controller.js)
   - Call validation
   - Call service
   - Send response

6. **Create routes** (routes.js)
   - Map HTTP method + URL to controller
   - Add middleware (auth, roles)

7. **Register in app.js**
   - Import routes
   - Use app.use()

8. **Test with curl/Postman**
   - Test happy path
   - Test error cases
   - Test edge cases

### Debugging a Bug

1. Check HTTP status code
   - 400? = Validation issue
   - 404? = Resource not found
   - 500? = Server error

2. Look at error message
   - Points you to which layer has issue

3. Trace backward from error
   - Start at controller
   - Check what it called in service
   - Check what service called in repository
   - Check database query

4. Add console.log() at each layer
   - See what data flows through

5. Check database directly
   - Run SQL in database client
   - Does data exist?
   - Is query correct?

---

## Code Smell Checklist

**Bad Signs** (Fix These):

- ❌ Database queries in controller
- ❌ HTTP code in service
- ❌ Business logic in repository
- ❌ Validation that throws errors (should return errors)
- ❌ No error handling (try/catch)
- ❌ String interpolation in SQL ($1, not $id)
- ❌ Loops querying database (use bulk operations)
- ❌ No input validation
- ❌ Inconsistent response format
- ❌ Magic numbers with no explanation

---

## Performance Checklist

**For Faster Code**:

- ✓ Use bulk operations (not loops)
- ✓ Use database indexes on frequently searched columns
- ✓ Avoid N+1 queries (fetch all data in one query)
- ✓ Use pagination for large datasets
- ✓ Cache data that doesn't change often
- ✓ Optimize SQL queries (EXPLAIN ANALYZE)
- ✓ Use connection pooling
- ✓ Avoid unnecessary database calls
- ✓ Use database transactions for atomic operations
- ✓ Monitor slow queries

---

## Testing Checklist

**Test These**:

- ✓ Validation (with valid and invalid data)
- ✓ Success cases (happy path)
- ✓ Error cases (resource not found, unauthorized)
- ✓ Edge cases (empty arrays, null values)
- ✓ Database operations (insert, update, delete)
- ✓ Business logic (calculations, transformations)
- ✓ Authorization (can user do this?)

**Don't Forget**:
- ✓ Test with database
- ✓ Test error handling
- ✓ Test with invalid input
- ✓ Test with edge cases

---

## Real-World Example: Student Registration

```
Client submits form:
  - firstName: "John"
  - lastName: "Doe"
  - email: "john@example.com"
  - sectionId: "123"

    ↓ POST /api/v1/students

Routes recognizes POST /api/v1/students → calls createStudent controller

Controller:
  1. Calls validateCreateStudentInput()
  2. Checks for errors
  3. If errors → return 400
  4. If valid → call studentService.createStudent()

Validation:
  1. Check firstName not empty
  2. Check lastName not empty
  3. Check email format
  4. Check sectionId is valid UUID
  5. Return { valid_data, errors }

Service:
  1. Start database transaction
  2. Call repository.generateAdmissionNumber()
  3. Call repository.create(student)
  4. If parent data exists → call parentRepository.create()
  5. Link student to parent
  6. Commit transaction
  7. Return created student

Repository:
  1. Execute INSERT query
  2. Handle conflicts (duplicate email)
  3. Return created row from database

Response:
  {
    "success": true,
    "message": "Student created successfully",
    "data": {
      "id": "...",
      "admissionNumber": "STU-2024-001",
      "firstName": "John",
      ...
    }
  }
```

---

## Summary: Architecture Benefits

**Why We Use This Pattern?**

1. **Maintainability**
   - Easy to find where things happen
   - Each layer has clear responsibility
   - Easy to understand code

2. **Testability**
   - Can test each layer independently
   - Can mock dependencies
   - Easy to write unit tests

3. **Reusability**
   - Service can be used by HTTP API, CLI, scheduled jobs
   - Repository can be switched out
   - Validation can be reused

4. **Scalability**
   - Easy to add new features
   - Won't accidentally break existing code
   - Clear extension points

5. **Debuggability**
   - Problems isolated to specific layer
   - Easy to add logging/debugging
   - Can trace issues quickly

---

## Key Takeaways for Junior Developers

1. **One Layer = One Job**
   - Don't mix responsibilities
   - Don't query database in controller
   - Don't send HTTP responses in service

2. **Validation First**
   - Always validate before processing
   - Prevents bad data from entering system
   - Makes debugging easier

3. **Read the Error Message**
   - 400 = Input problem (validation)
   - 404 = Not found (check database)
   - 500 = Server problem (check code)

4. **Follow the Pattern**
   - Look at existing modules
   - Copy structure
   - Fill in your logic

5. **Test Thoroughly**
   - Test with valid data
   - Test with invalid data
   - Test error cases

6. **Ask Questions**
   - If unsure about a pattern, look for examples
   - Read other modules
   - Ask senior developers

7. **Write Readable Code**
   - Use clear variable names
   - Add comments for complex logic
   - Keep functions small and focused

8. **Use Consistent Format**
   - Follow the response format
   - Use same error handling
   - Keep naming conventions

---

## Resources for Learning

📚 **Documents in This Repo**:
- `ARCHITECTURE_DOCUMENTATION.md` - Deep dive into architecture
- `QUICK_REFERENCE.md` - Quick lookup guide
- `LEARNING_EXERCISES.md` - Hands-on exercises

💻 **Study Existing Code**:
- `backend/src/modules/attendance/` - Good reference
- `backend/src/modules/students/` - Complete example
- Look at multiple modules - notice patterns

🎓 **External Resources**:
- REST API best practices
- Node.js async/await
- PostgreSQL query optimization
- Express.js middleware

---

## Progress Checklist

Track your learning:

### Week 1: Foundations
- [ ] Read ARCHITECTURE_DOCUMENTATION.md
- [ ] Understand 5 layers
- [ ] Trace existing endpoint
- [ ] Review QUICK_REFERENCE.md

### Week 2: Practice
- [ ] Complete Exercise 2 (Settings module)
- [ ] Create another simple module
- [ ] Practice tracing requests
- [ ] Write validation tests

### Week 3: Mastery
- [ ] Code review 2 existing modules
- [ ] Optimize a slow query
- [ ] Fix bugs in existing code
- [ ] Help junior developer understand

### Week 4: Advanced
- [ ] Build complex feature
- [ ] Implement transactions
- [ ] Optimize N+1 queries
- [ ] Write comprehensive tests

---

## Final Tips

**Don't**:
- ❌ Skip validation
- ❌ Put business logic in controller
- ❌ Query database in service (directly)
- ❌ Ignore error handling
- ❌ Copy-paste without understanding

**Do**:
- ✓ Read the error message carefully
- ✓ Check existing code for examples
- ✓ Follow the established patterns
- ✓ Validate early, validate often
- ✓ Keep layers separated
- ✓ Test your code
- ✓ Ask for code reviews
- ✓ Document complex logic

---

## You're Ready! 🚀

You now have:
- ✓ Understanding of architecture
- ✓ Quick reference guides
- ✓ Hands-on exercises
- ✓ Real examples from codebase
- ✓ Glossary of terms

Go build amazing features!

Remember: **Every expert was once a beginner.**

Keep learning, keep coding, and don't hesitate to ask questions! 🎓
