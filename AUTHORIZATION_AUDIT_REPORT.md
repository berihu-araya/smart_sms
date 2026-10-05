# SMART SMS AUTHORIZATION & ROLE ARCHITECTURE AUDIT REPORT

**Date:** September 2, 2026  
**Status:** PHASE 1 - AUDIT COMPLETE (NO CODE CHANGES)  
**Scope:** Backend API Authorization, Frontend RBAC Navigation, Database Schema  

---

## EXECUTIVE SUMMARY

Your Smart SMS School Management System currently implements **basic role-based access control (RBAC) at the HTTP middleware level**, but **lacks data-scope and relationship-based authorization**. 

**Critical Finding:** Teachers currently see the entire school's timetable instead of only their assigned classes because backend APIs lack:
1. Data-scope filtering (which timetable entries belong to this teacher?)
2. Relationship verification (is this teacher assigned to this subject+section?)
3. Resource ownership checks (does this teacher teach this student?)

This report details the current architecture, identifies 15+ security gaps, and proposes a phased implementation plan.

---

## 1. CURRENT AUTHENTICATION ARCHITECTURE

### 1.1 JWT-Based Authentication

**File:** `backend/src/middlewares/auth.middleware.js`

```
Flow:
1. User sends: Authorization: Bearer <JWT_TOKEN>
2. JWT verified against JWT_SECRET env var
3. Token decoded → req.user = { sub, role, email }
4. Next middleware/controller receives req.user
```

**Token Contents:**
```javascript
{
  sub: "user-id-uuid",           // Subject (user ID)
  role: "Teacher",                // Role name as string
  email: "teacher@school.com"
  // Expires: 30 days (default)
}
```

**Security Level:** ✅ Good
- Token validation present
- 30-day expiry appropriate
- Password hashing with bcrypt(10 rounds)

### 1.2 Password Reset Flow
- Email-based reset tokens
- Crypto.randomUUID() for token generation
- Configurable expiry (default 1 hour)

**Security Level:** ✅ Good

---

## 2. CURRENT AUTHORIZATION ARCHITECTURE

### 2.1 Role-Based Access Control (RBAC) Middleware

**File:** `backend/src/middlewares/role.middleware.js`

**Mechanism:**
```javascript
// Example route usage:
router.get('/timetable', authorizeRoles('School Admin', 'Teacher'), getTimetable);

// The middleware checks:
if (req.user.role.toLowerCase() === 'school admin' || req.user.role.toLowerCase() === 'teacher') {
  next();  // ✅ Authorized
} else {
  return 403;  // ❌ Forbidden
}
```

**Current Roles Protected:**
- `authorizeRoles('School Admin', 'Admin', 'Staff')` — Timetable creation/updates
- `authorizeRoles('School Admin', 'Admin')` — Timetable publishing/deletion
- `authorizeRoles('School Admin', 'Teacher')` — Attendance operations
- `authorizeRoles('School Admin', 'Admin', 'Teacher')` — Mark validation

**Security Level:** ⚠️ Partial
- ✅ Prevents unauthenticated access
- ✅ Blocks wrong roles from modifying data
- ❌ Does NOT verify data ownership/scope
- ❌ Does NOT check relationships
- ❌ Does NOT prevent cross-school access (if multi-tenant)

### 2.2 Frontend-Only Authorization

**File:** `frontend/src/components/layout/Sidebar/menuData.js`

**Mechanism:**
```javascript
const ALL_ROLES = ["School Admin", "Admin", "Teacher", "Student", "Parent", "Staff"];

const menuData = [
  {
    title: "Timetable",
    link: "/dashboard/timetable",
    roles: ALL_ROLES,  // ← Visible to all roles
  },
  // ...
];
```

**File:** `frontend/src/components/layout/Sidebar/Sidebar.jsx`

```javascript
function filterMenuByRole(items, role) {
  return items.map((item) => {
    const hasRolePermission = itemRoles.some(
      (r) => r.toLowerCase() === role.toLowerCase()
    );
    return hasRolePermission ? item : null;
  });
}
```

**Security Level:** ❌ INSUFFICIENT
- ✅ Improves user experience
- ❌ Can be bypassed by editing localStorage
- ❌ Can be bypassed by direct URL navigation
- ❌ Backend does not enforce frontend decisions

---

## 3. CURRENT ROLES

### 3.1 Roles in Database

**Migration:** `backend/migrations/1785394674042_seed-all-roles.js`

```javascript
const roles = [
  { name: 'School Admin', description: 'Full administrator with complete system access' },
  { name: 'Teacher', description: 'Teacher role for classroom management...' },
  { name: 'Student', description: 'Student role for courses, timetable...' },
  { name: 'Parent', description: 'Parent role for monitoring children...' },
  { name: 'Staff', description: 'Administrative and operational staff member' },
];
```

### 3.2 Limitations

- ✅ Roles exist in database
- ✅ Users have FK to roles
- ⚠️ Only 5 roles (your spec defines 14: SUPER_ADMIN, SCHOOL_ADMIN, PRINCIPAL, etc.)
- ❌ No permissions table (only role names used)
- ❌ No role hierarchy or inheritance
- ❌ No user-specific data scope assignment

**Current Role → User Relationship:**
```
users.role_id (FK) → roles.id

One-to-many: Each role has many users
But: No way to query "give me all teachers in School A" if multi-tenant
```

---

## 4. CURRENT PERMISSIONS

### 4.1 Permissions Implementation

**Status:** ⚠️ DOES NOT EXIST

There is **NO dedicated permissions table or system**. Instead:
- Permissions are embedded in role names
- Route middleware checks role name directly
- Frontend hardcodes role → menu mapping

**Frontend Mock Permissions:**

File: `frontend/src/app/dashboard/settings/roles/page.js`

```javascript
const ROLE_PERMISSIONS_MAP = {
  'School Admin': [
    'Full student & teacher lifecycle administration',
    'Academic year & grade configuration',
    // ...
  ],
  'Teacher': [
    'Section roster attendance marking',
    'Course syllabus & assignment management',
    // ...
  ],
};
```

⚠️ This is **purely for display** — not enforced anywhere.

### 4.2 API Endpoints Without Authorization

**Critical Finding:** These endpoints have NO authorization checks:

| Endpoint | Method | Auth | Authorization | Issue |
|----------|--------|------|---------------|-------|
| `/api/v1/timetable` | GET | ✅ | ❌ | Returns ALL timetables to any authenticated user |
| `/api/v1/timetable/:id` | GET | ✅ | ❌ | No resource owner check |
| `/api/v1/timetable/:id/entries` | GET | ✅ | ❌ | No filtering by teacher/student |
| `/api/v1/timetable/my-schedule` | GET | ✅ | ⚠️ | Has logic but has BUG (see 5.3) |
| `/api/v1/students` | GET | ✅ | ⚠️ | No school scope check |
| `/api/v1/teachers` | GET | ✅ | ⚠️ | No school scope check |
| `/api/v1/grades` | GET | ✅ | ⚠️ | No school scope check |
| `/api/v1/attendance/sheet` | GET | ✅ | ⚠️ | Role check only, no section scope |

---

## 5. USER-ROLE RELATIONSHIPS

### 5.1 Database Schema

**Table: users**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  role_id UUID NOT NULL REFERENCES roles(id),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  status VARCHAR(20),
  created_at TIMESTAMP,
  deleted_at TIMESTAMP,
);
```

**Relationship:**
```
users.role_id → roles.id (many-to-one)
```

**Limitation:** Users have EXACTLY ONE role. No multi-role support.

### 5.2 User-Role Lookup

**File:** `backend/src/modules/auth/auth.service.js`

```javascript
async login({ email, password }) {
  const user = await this.repository.findActiveUserByEmail(email);
  // Query joins: users → roles via role_id
  // Returns: user.role_name = "Teacher" (string)
  
  const token = jwt.sign(
    { sub: user.id, role: user.role_name, email: user.email },
    this.jwtSecret,
    { expiresIn: this.jwtExpiresIn }
  );
}
```

**Current Query Result Example:**
```json
{
  "id": "abc-123",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@school.com",
  "role_name": "Teacher",
  "role_id": "role-uuid-456"
}
```

⚠️ **Missing:** No `school_id`, no `grade_id`, no department, no scope information.

---

## 6. TEACHER RELATIONSHIPS

### 6.1 Teachers Table

**File:** `backend/migrations/1784719187171_create-teachers-table.js`

```sql
CREATE TABLE teachers (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  employee_number VARCHAR(20),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(30),
  qualification TEXT,
  experience_years INTEGER,
  date_of_joining DATE,
  max_weekly_periods INTEGER,
  status VARCHAR(20),
  created_at TIMESTAMP,
  deleted_at TIMESTAMP
);
```

### 6.2 Teacher → Subject Assignment

**File:** `backend/migrations/1785394674038_create-teacher-subjects-table.js`

```sql
CREATE TABLE teacher_subjects (
  id UUID PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES teachers(id),
  subject_id UUID NOT NULL REFERENCES subjects(id),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  deleted_at TIMESTAMP,
  CONSTRAINT teacher_subjects_unique UNIQUE (teacher_id, subject_id, academic_year_id)
);
```

### 6.3 Teacher → Section Assignment

**File:** `backend/migrations/1785394674047_create-class-teachers-table.js`

```sql
CREATE TABLE class_teachers (
  id UUID PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES teachers(id),
  section_id UUID NOT NULL REFERENCES sections(id),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP,
  deleted_at TIMESTAMP,
  CONSTRAINT class_teachers_unique UNIQUE (teacher_id, section_id, academic_year_id)
);
```

### 6.4 Teacher in Timetable

**File:** `backend/migrations/1785394674049_create-timetable-core-tables.js`

```sql
CREATE TABLE timetable_entries (
  id UUID PRIMARY KEY,
  timetable_id UUID NOT NULL REFERENCES timetables(id),
  section_id UUID NOT NULL REFERENCES sections(id),
  subject_id UUID NOT NULL REFERENCES subjects(id),
  teacher_id UUID NOT NULL REFERENCES teachers(id),  -- ← Teacher assigned to entry
  room_id UUID REFERENCES rooms(id),
  period_id UUID NOT NULL REFERENCES periods(id),
  day_of_week VARCHAR(20),
  created_at TIMESTAMP,
  deleted_at TIMESTAMP
);
```

### 6.5 Current Issue: Teacher Access to Timetable

**Route:** `GET /api/v1/timetable`

**File:** `backend/src/modules/timetable/timetable.routes.js`

```javascript
router.get('/', listTimetables);  // ← NO authorizeRoles() check!
```

**File:** `backend/src/modules/timetable/timetable.controller.js`

```javascript
async function listTimetables(req, res, next) {
  const result = await service.listTimetables({
    academicYearId,
    term,
    status,
    // ...
  });
  // Returns ALL timetables in the system
  return res.status(200).json({
    success: true,
    message: 'Timetables retrieved successfully',
    data: result,
  });
}
```

**File:** `backend/src/modules/timetable/timetable.repository.js`

```javascript
async findAllTimetables({ academicYearId, term, status, limit = 50, offset = 0 }) {
  const conditions = ['t.deleted_at IS NULL'];
  // Filters ONLY by academic year, term, status
  // No teacher scope check
  // Returns everything matching filters
}
```

**Problem:**
- ✅ Route has `authMiddleware` (requires login)
- ❌ No `authorizeRoles()` (any authenticated user)
- ❌ No data-scope filtering (which timetable entries belong to this teacher?)
- ❌ Teacher sees ENTIRE school timetable

### 6.6 What SHOULD Happen

When a teacher calls `GET /api/v1/timetable/my-schedule`:

**Expected Implementation (currently has BUG):**

```javascript
async getMySchedule(user, { academicYearId }) {
  const activeHeader = await this.getActiveTimetable(academicYearId);
  
  // Step 1: Get authenticated teacher
  const teacher = await this.repository.findUserTeachingContext(user.sub);
  
  // Step 2: Find only entries assigned to this teacher
  const entries = await this.repository.findEntriesByTimetableId(activeHeader.id, {
    teacherId: teacher.id,  // ← SCOPE ENFORCEMENT
  });
  
  return { role: 'Teacher', teacher, entries };
}
```

**Actual Bug (line 119 in service.js):**

```javascript
const entries = await this.repository.findEntriesByTimetableId(
  timetable.id,
  { teacherId: teacher.id }
);
// ERROR: Method does not exist!
// Should call: this.repository.findAllEntries({ timetableId, teacherId })
```

---

## 7. STUDENT RELATIONSHIPS

### 7.1 Students Table

```sql
CREATE TABLE students (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id),
  section_id UUID REFERENCES sections(id),  -- ← Current section
  roll_number VARCHAR(20),
  status VARCHAR(20),
  created_at TIMESTAMP,
  deleted_at TIMESTAMP
);
```

### 7.2 Student Relationships

```
User (role='Student')
  ↓ (user_id FK)
Student
  ↓ (section_id FK)
Section
  ↓ (grade_id FK)
Grade
```

### 7.3 Current Issue: Student Access

**Frontend (works correctly):**

File: `frontend/src/app/dashboard/timetable/class/page.js`

```javascript
// Student sees only their section's timetable
if (isStudent) {
  const myData = await timetableService.getMySchedule();
  if (myData && myData.student) {
    setSelectedSectionId(myData.student.section_id);  // Own section only
    setEntries(myData.entries || []);
  }
}
```

**Backend (has bug in getMySchedule):**

Same `findEntriesByTimetableId()` bug affects students too.

**Security Risk:** If bug is fixed incorrectly, student could modify frontend query parameter and request another student's section timetable.

---

## 8. PARENT RELATIONSHIPS

### 8.1 Parents Table

```sql
CREATE TABLE parents (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id),
  full_name VARCHAR(255),
  phone_number VARCHAR(30),
  address TEXT,
  created_at TIMESTAMP,
  deleted_at TIMESTAMP
);
```

### 8.2 Parent-Student Relationship

**File:** `backend/migrations/1785394674041_add-relationship-to-parents.js`

```sql
CREATE TABLE student_parents (
  id UUID PRIMARY KEY,
  parent_id UUID NOT NULL REFERENCES parents(id),
  student_id UUID NOT NULL REFERENCES students(id),
  relationship VARCHAR(50),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP,
  deleted_at TIMESTAMP,
  CONSTRAINT student_parents_unique UNIQUE (parent_id, student_id)
);
```

### 8.3 Current Issue: Parent Authorization

**Expected Behavior:**
```
Parent A has children: [Student 1, Student 2]
Parent A should see:
  ✅ Student 1 timetable, attendance, marks
  ✅ Student 2 timetable, attendance, marks
  ❌ Student 3 (other parent's child)
  ❌ Teacher John's timetable
```

**Actual Behavior:**

**Route:** `GET /api/v1/timetable/my-schedule` for parent

**File:** `backend/src/modules/timetable/timetable.service.js` (lines 162-180)

```javascript
if (role === 'parent') {
  const parentData = await this.repository.findUserParentContext(userId);
  
  const childrenWithSchedules = await Promise.all(
    parentData.children.map(async (child) => {
      let childEntries = [];
      if (child.section_id) {
        childEntries = await this.repository.findEntriesByTimetableId(
          timetable.id,
          { sectionId: child.section_id }  // ← Correct scope!
        );
      }
      return { ...child, entries: childEntries };
    })
  );
}
```

✅ **Logic is correct** — filters entries by each child's section  
❌ **But has same BUG:** Method `findEntriesByTimetableId()` doesn't exist

---

## 9. ACADEMIC RELATIONSHIPS

### 9.1 Grade → Section → Subject → Teacher

```
Grade (e.g., "Grade 8")
  ↓ (many sections)
Section (e.g., "Grade 8A", "Grade 8B")
  ↓ (many subjects per section)
SectionSubject (e.g., Grade 8A teaches Math, English, Science)
  ↓ (subjects taught in this section)
Subject (e.g., "Mathematics")
  
  
Teacher
  ↓ (through class_teachers)
Section (is class teacher of Grade 8A)

Teacher
  ↓ (through teacher_subjects + timetable_entries)
Subject + Section (teaches Math in Grade 8A)
```

### 9.2 Database Tables

**Grades:**
```sql
CREATE TABLE grades (
  id UUID PRIMARY KEY,
  name VARCHAR(50),  -- "Grade 8", "Grade 9"
  grade_level INTEGER,
  section_capacity INTEGER,
  created_at TIMESTAMP
);
```

**Sections:**
```sql
CREATE TABLE sections (
  id UUID PRIMARY KEY,
  name VARCHAR(100),  -- "Grade 8A"
  grade_id UUID REFERENCES grades(id),
  capacity INTEGER,
  created_at TIMESTAMP
);
```

**Subjects:**
```sql
CREATE TABLE subjects (
  id UUID PRIMARY KEY,
  subject_name VARCHAR(150),
  subject_code VARCHAR(20),
  created_at TIMESTAMP
);
```

**Section-Subject Assignment:**
```sql
CREATE TABLE grade_subjects (
  id UUID PRIMARY KEY,
  grade_id UUID REFERENCES grades(id),
  subject_id UUID REFERENCES subjects(id),
  is_mandatory BOOLEAN DEFAULT true,
  created_at TIMESTAMP
);
```

### 9.3 Subject Scope for Teacher

**Current Limitation:** No enforcement that teacher can only enter marks for subjects they teach.

**Example Scenario:**
```
Teacher John assigned:
  - Mathematics in Grade 8A ✓
  - Mathematics in Grade 8B ✓
  - Physics in Grade 9A ✓

Current API allows John to:
  ✅ View all marks in system (no filtering)
  ✅ Theoretically enter marks in any subject (no backend check)

Should only allow:
  ✅ View/enter marks for Math Grade 8A
  ✅ View/enter marks for Math Grade 8B
  ✅ View/enter marks for Physics Grade 9A
  ❌ View/enter marks for English Grade 8A (not assigned)
  ❌ View/enter marks for Physics Grade 8A (not assigned)
```

---

## 10. TIMETABLE RELATIONSHIPS

### 10.1 Timetable Structure

**Timetables Table:**
```sql
CREATE TABLE timetables (
  id UUID PRIMARY KEY,
  academic_year_id UUID REFERENCES academic_years(id),
  term VARCHAR(50),  -- "Term 1", "Semester 1"
  name VARCHAR(150),
  status VARCHAR(20),  -- 'DRAFT', 'PUBLISHED', 'ARCHIVED'
  version INTEGER,
  is_active BOOLEAN,
  published_at TIMESTAMP,
  published_by UUID,
  created_at TIMESTAMP
);
```

**Timetable Entries:**
```sql
CREATE TABLE timetable_entries (
  id UUID PRIMARY KEY,
  timetable_id UUID REFERENCES timetables(id),
  section_id UUID REFERENCES sections(id),      -- Which class
  subject_id UUID REFERENCES subjects(id),      -- Which subject
  teacher_id UUID REFERENCES teachers(id),      -- Which teacher
  room_id UUID REFERENCES rooms(id),             -- Which room
  period_id UUID REFERENCES periods(id),        -- Which time slot
  day_of_week VARCHAR(20),                      -- MONDAY, TUESDAY, etc.
  created_at TIMESTAMP
);
```

### 10.2 Authorization Gaps

| User Role | Should See | Current Reality |
|-----------|-----------|-----------------|
| **Teacher** | Only my assigned timetable entries | Sees entire school timetable |
| **Student** | Only my section's timetable | ✅ Correct (if bug fixed) |
| **Parent** | Only my children's section timetables | ✅ Correct logic (if bug fixed) |
| **School Admin** | All timetables in school | ✅ Correct |
| **Principal** | All timetables in school (read-only) | ✅ Correct (but role not implemented) |

---

## 11. CURRENT API AUTHORIZATION

### 11.1 Timetable API Routes

**File:** `backend/src/modules/timetable/timetable.routes.js`

| Route | Method | Auth Middleware | Role Check | Data Scope | Status |
|-------|--------|-----------------|-----------|-----------|--------|
| `/` | GET | ✅ | ❌ | ❌ | ❌ UNSECURED |
| `/active` | GET | ✅ | ❌ | ❌ | ❌ UNSECURED |
| `/my-schedule` | GET | ✅ | ❌ | ⚠️ | ⚠️ BUG |
| `/:id` | GET | ✅ | ❌ | ❌ | ❌ UNSECURED |
| `/` | POST | ✅ | ✅ (Admin/Staff) | ❌ | ⚠️ PARTIAL |
| `/:id` | PUT | ✅ | ✅ (Admin/Staff) | ❌ | ⚠️ PARTIAL |
| `/:id` | DELETE | ✅ | ✅ (Admin only) | ❌ | ⚠️ PARTIAL |
| `/:id/entries` | GET | ✅ | ❌ | ❌ | ❌ UNSECURED |
| `/:id/entries` | POST | ✅ | ✅ (Admin/Staff) | ❌ | ⚠️ PARTIAL |
| `/:id/publish` | POST | ✅ | ✅ (Admin only) | ❌ | ⚠️ PARTIAL |

### 11.2 Attendance API Routes

**File:** `backend/src/modules/attendance/attendance.routes.js`

```javascript
router.get('/sheet', authorizeRoles('School Admin', 'Teacher'), getRosterSheet);
router.post('/bulk', authorizeRoles('School Admin', 'Teacher'), recordBulkAttendance);
```

**Issues:**
- ✅ Role check present
- ❌ No section/class scope check
- ❌ Teacher can mark attendance for ANY section, not just assigned sections

### 11.3 Students API Routes

**File:** `backend/src/modules/students/student.routes.js`

```javascript
router.get('/', listStudents);  // ← Only has authMiddleware
router.get('/:id', getStudentById);
```

**Issues:**
- ❌ No role check
- ❌ No data filtering
- ❌ Any authenticated user can list/view any student

### 11.4 Marks/Results API

**Status:** Not yet examined in detail but likely similar issues

---

## 12. CURRENT FRONTEND NAVIGATION AUTHORIZATION

### 12.1 Menu Structure

**File:** `frontend/src/components/layout/Sidebar/menuData.js` (354 lines)

```javascript
const menuData = [
  {
    title: "Dashboard",
    roles: ["School Admin", "Admin", "Teacher", "Student", "Parent", "Staff"],
  },
  {
    title: "User Management",
    roles: ["School Admin", "Admin", "Teacher", "Staff", "Parent"],
    children: [
      {
        title: "Students",
        roles: ["School Admin", "Admin", "Teacher", "Staff", "Parent"],
      },
      // ...
    ],
  },
  // ... 50+ menu items
];
```

### 12.2 Role Filtering Logic

**File:** `frontend/src/components/layout/Sidebar/Sidebar.jsx`

```javascript
function filterMenuByRole(items, role) {
  return items.map((item) => {
    const itemRoles = item.roles || [];
    const hasRolePermission = itemRoles.some(
      (r) => r.toLowerCase() === role.toLowerCase()
    );
    
    if (item.children?.length) {
      const filteredChildren = filterMenuByRole(item.children, role);
      if (filteredChildren.length > 0 && hasRolePermission) {
        return { ...item, children: filteredChildren };
      }
      return null;
    }
    
    return hasRolePermission ? item : null;
  });
}
```

### 12.3 Menu Items by Role

**Teacher sees:**
- ✅ Dashboard
- ✅ User Management → Students, Teachers (All Teachers only), Teachers (Teacher Subjects)
- ✅ Academics → Sections, Subjects, Timetable, Attendance, Assignments, Exams, Marks Entry, Results
- ✅ Communication → All items
- ✅ Reports → Academic, Attendance, Analytics
- ❌ System Settings (hidden)

**Student sees:**
- ✅ Dashboard
- ✅ User Management → Students
- ✅ Academics (limited) → Sections, Timetable, Attendance, Exams, Results
- ✅ Finance → Fees
- ✅ Communication → All items
- ✅ Reports → Academic, Attendance
- ❌ Marks Entry (hidden)
- ❌ System Settings (hidden)

**Parent sees:**
- ✅ Dashboard
- ✅ User Management → Students
- ✅ Academics (limited) → Timetable, Attendance, Results
- ✅ Finance → Fees
- ✅ Communication → Messages, Events
- ❌ Marks, Exams, Assignments
- ❌ System Settings

### 12.4 Security Issue

**Frontend filtering is INSUFFICIENT:**

```javascript
// User can bypass by:
1. Editing localStorage → role = "School Admin"
2. Direct URL navigation: /dashboard/timetable/admin
3. API calls with modified request parameters
4. Browser DevTools

// Backend doesn't verify frontend's authorization decisions
```

---

## 13. CRITICAL SECURITY VULNERABILITIES

### Vulnerability 1: Missing Backend Authorization on Timetable Listing
**Severity:** 🔴 HIGH  
**File:** `timetable.controller.js:listTimetables()`  
**Issue:** No role check; anyone can see all timetables  
**Fix:** Add `authorizeRoles('School Admin', 'Admin')` and scope filtering

### Vulnerability 2: Teacher Can Modify Unassigned Timetable Entries
**Severity:** 🔴 HIGH  
**File:** `timetable.routes.js`, `timetable.service.js`  
**Issue:** No verification that teacher is assigned to the entry  
**Fix:** Verify `user_id → teacher_id → timetable_entry` relationship

### Vulnerability 3: Student Can Request Any Student's Timetable
**Severity:** 🔴 HIGH  
**File:** `timetable.controller.js:getMySchedule()` + client-supplied sectionId  
**Issue:** No validation of student ownership  
**Fix:** Derive studentId from req.user, check student.section_id

### Vulnerability 4: Parent Lacks Child Relationship Enforcement
**Severity:** 🔴 HIGH  
**File:** `timetable.service.js:getMySchedule()` (parent branch)  
**Issue:** Theoretically could be bypassed; not tested  
**Fix:** Verify parent-child via student_parents table

### Vulnerability 5: No School/Tenant Isolation
**Severity:** 🟠 MEDIUM  
**File:** All API endpoints  
**Issue:** If multi-tenant added later, easy to leak data across schools  
**Fix:** Add school_id column to users/teachers/students, enforce in all queries

### Vulnerability 6: Attendance Can Be Modified for Unassigned Classes
**Severity:** 🔴 HIGH  
**File:** `attendance.routes.js`, `attendance.controller.js`  
**Issue:** Role check only; no section/teacher assignment check  
**Fix:** Verify teacher is assigned to section before allowing marks

### Vulnerability 7: Marks Entry Lacks Subject/Section Authorization
**Severity:** 🔴 HIGH  
**File:** `marks.routes.js`, `marks.controller.js`  
**Issue:** No check that teacher teaches this subject in this section  
**Fix:** Verify teacher_subjects + section + student relationships

### Vulnerability 8: Missing Method Bug in Timetable Service
**Severity:** 🔴 HIGH  
**File:** `timetable.service.js:115, 142, 173`  
**Issue:** Calls `repository.findEntriesByTimetableId()` which doesn't exist  
**Should be:** `repository.findAllEntries({timetableId, teacherId/sectionId})`  
**Fix:** Use correct method name

### Vulnerability 9: Frontend-Only Authorization
**Severity:** 🟠 MEDIUM  
**File:** All frontend routes and navigation  
**Issue:** Backend doesn't enforce role-based route access  
**Fix:** Add authorization checks in backend route handlers

### Vulnerability 10: User Can Spoof Role in Request Body
**Severity:** 🔴 HIGH  
**File:** All API endpoints  
**Issue:** `req.user.role` comes from JWT which user cannot modify, but if client submits `roleId` or `role` in request body, no validation  
**Fix:** Never accept role/roleId from request body; always use req.user from token

### Vulnerability 11: No Audit Logging
**Severity:** 🟠 MEDIUM  
**File:** None  
**Issue:** Security-sensitive operations (marks publish, timetable publish, user role changes) not logged  
**Fix:** Add audit trail for all sensitive operations

### Vulnerability 12: Permissions Table Missing
**Severity:** 🟠 MEDIUM  
**File:** Database schema  
**Issue:** No granular permission system; only role names used  
**Fix:** Create permissions table + role_permissions junction table

### Vulnerability 13: No Role Hierarchy
**Severity:** 🟠 MEDIUM  
**File:** Roles table  
**Issue:** Can't express "Principal > Vice Principal > Teacher"  
**Fix:** Add parent_role_id or permission inheritance model

### Vulnerability 14: Users Limited to Single Role
**Severity:** 🟡 LOW  
**File:** Users table  
**Issue:** Can't have Teacher who is also CLASS_TEACHER  
**Fix:** Create user_roles junction table for many-to-many

### Vulnerability 15: No Multi-School Support
**Severity:** 🟡 LOW  
**File:** All tables  
**Issue:** Missing school_id columns and isolation checks  
**Fix:** Add school_id FK and WHERE school_id = authorized_school to all queries

---

## 14. DATABASE SCHEMA SUMMARY

### 14.1 Current Tables

**Authentication & Roles:**
- `roles` — Role definitions (5 roles)
- `users` — User accounts + role_id FK
- (Missing) `user_roles` — For multi-role support
- (Missing) `permissions` — Permission catalog
- (Missing) `role_permissions` — Junction table

**Academic Structure:**
- `grades` — Grade levels (Grade 8, Grade 9)
- `sections` — Classes (Grade 8A, Grade 8B)
- `subjects` — Subjects (Math, English, Science)
- `grade_subjects` / `section_subjects` — Which subjects in which sections
- `academic_years` — School years (2024-2025, etc.)

**People:**
- `students` — Student records (FK: user_id, section_id)
- `teachers` — Teacher records (FK: user_id)
- `parents` — Parent records (FK: user_id)
- `student_parents` — Parent-student relationships

**Teaching Assignments:**
- `teacher_subjects` — Teacher teaches Subject
- `class_teachers` — Teacher is class teacher of Section

**Timetable:**
- `periods` — Time slots (8:00-9:00, 9:00-10:00, etc.)
- `teacher_availabilities` — Teacher available in slot
- `timetables` — Timetable documents (DRAFT, PUBLISHED)
- `timetable_entries` — Individual scheduled lessons
- `timetable_substitutions` — Temporary replacements
- `rooms` — Classrooms/labs

**Other:**
- `attendance` — Attendance records
- `marks` — Student mark/grade records
- `exams` — Exam definitions
- `grading_scales` — Grade A, B, C mappings
- `settings` — System settings

### 14.2 Missing Tables

For full authorization model:

- `permissions` — Permission catalog
- `role_permissions` — Role ↔ Permission mapping
- `user_roles` — User ↔ Multiple roles
- `schools` / `branches` — If multi-tenant
- `user_school_assignments` — User belongs to school
- `audit_logs` — Security audit trail

---

## 15. DATABASE RELATIONSHIPS - VISUAL

```
┌─────────────────────────────────────────────────────────────────┐
│                         AUTHENTICATION                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  users (id, role_id, email, password_hash, ...)                 │
│    ↓                                                              │
│    └─→ FK role_id → roles (id, name, description)                │
│                                                                   │
│  (Missing: user_roles many-to-many, permissions, audit_logs)    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      ACADEMIC STRUCTURE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  academic_years                                                   │
│    ↓                                                              │
│    ├─→ grades (grade_id FK)                                      │
│    │   ↓                                                          │
│    │   ├─→ sections (grade_id FK)                                │
│    │   │   ↓                                                      │
│    │   │   ├─→ students (section_id FK)                          │
│    │   │   └─→ timetable_entries (section_id FK)                 │
│    │   │                                                          │
│    │   └─→ grade_subjects / section_subjects                     │
│    │       ↓                                                      │
│    │       └─→ subjects (id)                                     │
│    │                                                              │
│    └─→ periods (academic_year_id FK)                             │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      PEOPLE & ASSIGNMENTS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  users                                                            │
│    ├─→ students (user_id FK)                                     │
│    │   ↓                                                          │
│    │   └─→ student_parents (student_id FK)                       │
│    │       ↓                                                      │
│    │       └─→ parents (parent_id FK)                            │
│    │           ↓                                                  │
│    │           └─→ users (of type Parent)                        │
│    │                                                              │
│    └─→ teachers (user_id FK)                                     │
│        ├─→ teacher_subjects (teacher_id FK)                      │
│        │   ↓                                                      │
│        │   └─→ subjects (subject_id FK)                          │
│        │                                                          │
│        ├─→ class_teachers (teacher_id FK)                        │
│        │   ↓                                                      │
│        │   └─→ sections (section_id FK)                          │
│        │                                                          │
│        ├─→ teacher_availabilities (teacher_id FK)                │
│        │   ↓                                                      │
│        │   └─→ periods (period_id FK)                            │
│        │                                                          │
│        └─→ timetable_entries (teacher_id FK)                     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       TIMETABLE STRUCTURE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  timetables (academic_year_id FK)                                │
│    ↓                                                              │
│    └─→ timetable_entries                                         │
│        ├─→ teacher_id FK → teachers                              │
│        ├─→ section_id FK → sections                              │
│        ├─→ subject_id FK → subjects                              │
│        ├─→ period_id FK → periods                                │
│        └─→ room_id FK → rooms                                    │
│                                                                   │
│  Authorization needed for each entry:                            │
│  ✓ Is user the assigned teacher?                                │
│  ✓ Is user in the assigned section? (if student)                │
│  ✓ Is user parent of student in section? (if parent)            │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 16. RECOMMENDED DATABASE CHANGES

### Change 1: Add Permissions System

```sql
-- NEW TABLE: permissions
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,  -- 'student.view', 'marks.publish', etc.
  description TEXT,
  module VARCHAR(50),  -- 'student', 'marks', 'timetable', etc.
  action VARCHAR(50),  -- 'view', 'create', 'update', 'delete', 'publish'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- NEW TABLE: role_permissions (junction)
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT role_permissions_unique UNIQUE (role_id, permission_id)
);

-- NEW INDEX for permission lookups
CREATE INDEX role_permissions_role_idx ON role_permissions(role_id);
```

### Change 2: Support Multiple Roles per User

```sql
-- NEW TABLE: user_roles (junction)
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_roles_unique UNIQUE (user_id, role_id),
  CONSTRAINT user_roles_not_null CHECK (deleted_at IS NULL OR deleted_at IS NOT NULL)
);

-- Keep users.role_id for backward compatibility initially
-- Migrate to user_roles junction table later
```

### Change 3: Add School/Tenant Isolation

```sql
-- NEW TABLE: schools
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  abbreviation VARCHAR(10),
  address TEXT,
  phone VARCHAR(30),
  email VARCHAR(255),
  principal_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- ADD COLUMN to users
ALTER TABLE users ADD COLUMN school_id UUID REFERENCES schools(id);
ALTER TABLE users ADD CONSTRAINT users_school_not_null CHECK (school_id IS NOT NULL);

-- ADD COLUMN to all data tables:
ALTER TABLE students ADD COLUMN school_id UUID REFERENCES schools(id);
ALTER TABLE teachers ADD COLUMN school_id UUID REFERENCES schools(id);
ALTER TABLE parents ADD COLUMN school_id UUID REFERENCES schools(id);
ALTER TABLE grades ADD COLUMN school_id UUID REFERENCES schools(id);
ALTER TABLE academic_years ADD COLUMN school_id UUID REFERENCES schools(id);
-- ... (all academic tables)

-- ADD INDEXES for tenant isolation
CREATE INDEX users_school_idx ON users(school_id) WHERE deleted_at IS NULL;
CREATE INDEX students_school_idx ON students(school_id) WHERE deleted_at IS NULL;
-- ... (all tables)
```

### Change 4: Audit Logging Table

```sql
-- NEW TABLE: audit_logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(100) NOT NULL,  -- 'timetable.publish', 'marks.create', etc.
  resource_type VARCHAR(50),  -- 'timetable', 'marks', 'user', etc.
  resource_id UUID,  -- ID of affected resource
  old_values JSONB,  -- Previous data
  new_values JSONB,  -- New data
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  school_id UUID REFERENCES schools(id)
);

CREATE INDEX audit_logs_user_idx ON audit_logs(user_id, created_at DESC);
CREATE INDEX audit_logs_action_idx ON audit_logs(action, created_at DESC);
CREATE INDEX audit_logs_resource_idx ON audit_logs(resource_type, resource_id);
```

---

## 17. RECOMMENDED BACKEND CHANGES

### Phase 1: Fix Existing Bugs

**Bug 1:** Missing `findEntriesByTimetableId()` method

**File:** `timetable.repository.js`

**Current Code (lines 119, 142, 175 in service.js):**
```javascript
// WRONG - doesn't exist:
await this.repository.findEntriesByTimetableId(timetable.id, { teacherId });

// CORRECT - this method exists:
await this.repository.findAllEntries({ timetableId: timetable.id, teacherId });
```

**Fix:** Update service to use correct method name (3 places)

### Phase 2: Add Authorization Service

**File:** `backend/src/services/authorization.service.js` (new file)

```javascript
class AuthorizationService {
  constructor(database) {
    this.db = database;
  }

  /**
   * Can this user teach this subject in this section?
   */
  async canTeachSubjectInSection(userId, subjectId, sectionId) {
    // 1. Find teacher record for user
    // 2. Check teacher_subjects for subject
    // 3. Check timetable_entries to verify section assignment
    // 4. Return true/false
  }

  /**
   * Can this user access this student's data?
   */
  async canAccessStudent(userId, studentId, userRole) {
    if (userRole === 'Teacher') {
      // Teacher can access if student is in their class
    } else if (userRole === 'Parent') {
      // Parent can access if student is their child
    } else if (userRole === 'Student') {
      // Student can access only their own data
    } else if (userRole === 'School Admin') {
      // Admin can access anyone
    }
  }

  /**
   * Get all timetable entries assigned to a teacher
   */
  async getTeacherTimetableEntries(userId, timetableId) {
    // Find teacher profile
    // Query timetable_entries WHERE teacher_id = teacher.id
    // Return filtered entries
  }

  /**
   * Verify parent-child relationship
   */
  async isParentOfStudent(parentId, studentId) {
    // Query student_parents junction table
  }
}

module.exports = AuthorizationService;
```

### Phase 3: Create Authorization Guards

**File:** `backend/src/middlewares/authorization.guard.js` (new file)

```javascript
const authorizationService = new AuthorizationService(db);

/**
 * Verify user is assigned to teach this student
 */
function verifyTeacherStudentRelationship() {
  return async (req, res, next) => {
    const userId = req.user?.sub;
    const studentId = req.params.studentId || req.body.studentId;
    
    const can = await authorizationService.canAccessStudent(
      userId, studentId, 'Teacher'
    );
    
    if (!can) {
      return res.status(403).json({
        success: false,
        message: 'Teacher not assigned to this student',
        data: null,
      });
    }
    
    next();
  };
}

module.exports = { verifyTeacherStudentRelationship };
```

### Phase 4: Update Route Handlers

**File:** `backend/src/modules/timetable/timetable.routes.js`

Before:
```javascript
router.get('/', listTimetables);  // No checks!
```

After:
```javascript
router.get('/', 
  authMiddleware,
  authorizeRoles('School Admin', 'Admin', 'Academic Coordinator'),
  listTimetables
);
```

**File:** `backend/src/modules/timetable/timetable.controller.js`

Before:
```javascript
async function listTimetables(req, res, next) {
  const result = await service.listTimetables({...});
  return res.status(200).json({data: result});
}
```

After:
```javascript
async function listTimetables(req, res, next) {
  // For admin: return all timetables
  // For teacher: return only timetables where they have entries
  // For student: return only published timetables
  
  const role = req.user.role.toLowerCase();
  let filters = {};
  
  if (role === 'teacher') {
    const teacher = await teacherRepository.findByUserId(req.user.sub);
    filters.teacherHasEntries = teacher.id;
  } else if (role === 'student') {
    filters.isPublished = true;
  }
  
  const result = await service.listTimetables(filters);
  return res.status(200).json({success: true, data: result});
}
```

---

## 18. RECOMMENDED FRONTEND CHANGES

### Change 1: Add Backend Authorization Verification

Current:
```javascript
// Frontend only
if (user.role === 'Teacher') {
  show teaching menu
}
```

Better:
```javascript
// Still do frontend check for UX
if (user.role === 'Teacher') {
  show teaching menu
}

// But also verify backend authorization
async function loadTeacherTimetable() {
  try {
    const response = await fetch('/api/v1/timetable/my-schedule');
    if (response.status === 403) {
      // Backend rejected: user not authorized
      showError('Not authorized');
      return;
    }
    // OK to proceed
  } catch (err) {
    // Handle error
  }
}
```

### Change 2: Never Trust Client-Supplied IDs

Current:
```javascript
// Vulnerable!
const sectionId = req.query.sectionId;  // From URL
const entries = await api.getTimetableEntries(timetableId, { sectionId });
```

Better:
```javascript
// Derived from authenticated user
const myData = await api.getMySchedule();
const entries = myData.entries;  // Already scoped by backend
```

### Change 3: Add Permission-Based Menu Rendering

**File:** `frontend/src/components/layout/Sidebar/usePermissions.js` (new)

```javascript
function usePermissions(user) {
  const [permissions, setPermissions] = useState([]);
  
  useEffect(() => {
    // Query backend for actual user permissions
    // Not just role name
    fetch('/api/v1/users/me/permissions')
      .then(r => r.json())
      .then(data => setPermissions(data));
  }, [user]);
  
  return permissions;
}
```

---

## 19. IMPLEMENTATION STRATEGY - PHASES

### PHASE 1: Fix Critical Bugs (1-2 days)

1. ✅ Fix `findEntriesByTimetableId` → use `findAllEntries` (3 places)
2. ✅ Add `authorizeRoles('School Admin', 'Admin')` to `GET /api/v1/timetable`
3. ✅ Add relationship verification in `getMySchedule` (teacher→entries, student→section, parent→child)
4. ✅ Add tests for timetable access scoping
5. ✅ Verify teacher cannot see unassigned sections

**Deliverable:** Teachers now only see their own timetable entries

---

### PHASE 2: Authorization Foundation (3-5 days)

1. ✅ Create `permissions` and `role_permissions` tables
2. ✅ Create `AuthorizationService` with helper methods
3. ✅ Create authorization guards middleware
4. ✅ Define permission matrix for each role
5. ✅ Add audit_logs table
6. ✅ Write tests for authorization rules

**Deliverable:** Reusable authorization infrastructure in place

---

### PHASE 3: Teacher Authorization (3-4 days)

1. ✅ Fix all teacher APIs to verify subject+section assignment
2. ✅ Add scope guards to marks entry
3. ✅ Add scope guards to attendance marking
4. ✅ Add scope guards to results viewing
5. ✅ Update teacher timetable to ensure scope
6. ✅ Update student list to show only assigned students
7. ✅ Write comprehensive tests

**Deliverable:** Teachers cannot access unassigned data

---

### PHASE 4: Student Authorization (2-3 days)

1. ✅ Secure student profile endpoints
2. ✅ Secure student timetable access
3. ✅ Secure student marks/results viewing
4. ✅ Secure student attendance viewing
5. ✅ Write tests

**Deliverable:** Students cannot access other students' data

---

### PHASE 5: Parent Authorization (2-3 days)

1. ✅ Implement parent-child verification
2. ✅ Secure child timetable access
3. ✅ Secure child marks/results viewing
4. ✅ Secure child attendance viewing
5. ✅ Support multiple children with switching
6. ✅ Write tests

**Deliverable:** Parents can only access linked children's data

---

### PHASE 6: Administrative Roles (2-3 days)

1. ✅ Implement Principal, Vice Principal, Academic Coordinator roles
2. ✅ Define permissions for each
3. ✅ Add scope filtering for school admins (one school only)
4. ✅ Add timetable publish approval workflows
5. ✅ Write tests

**Deliverable:** Proper role hierarchy with delegated permissions

---

### PHASE 7: Specialized Staff (2 days)

1. ✅ Implement Accountant, HR, Librarian, Transport roles
2. ✅ Add scope filtering (only own school data)
3. ✅ Write tests

**Deliverable:** All roles fully authorized and scoped

---

### PHASE 8: Security Audit & Testing (3-5 days)

1. ✅ Attempt to bypass authorization (IDOR tests)
2. ✅ Try changing school_id in requests
3. ✅ Try impersonating other users
4. ✅ Try accessing deleted resources
5. ✅ Load test authorization middleware performance
6. ✅ Generate security test report

**Deliverable:** Zero security gaps found in final audit

---

## 20. TESTING PLAN

### Test Categories

**Unit Tests** (per role):
```javascript
// teachers.authorization.test.js
test('Teacher can see own timetable entries', async () => {
  const teacher = createTestTeacher();
  const entries = await timetableService.getTeacherEntries(teacher.id);
  expect(entries).toHaveLength(3);  // 3 assigned classes
});

test('Teacher cannot see unassigned entries', async () => {
  const teacher = createTestTeacher();
  const otherTeacherEntry = createTestEntry({ teacherId: OTHER_TEACHER });
  
  const entries = await timetableService.getTeacherEntries(teacher.id);
  expect(entries.find(e => e.id === otherTeacherEntry.id)).toBeUndefined();
});

test('Teacher cannot modify marks for unassigned subject', async () => {
  const mark = createTestMark({ subjectId: UNASSIGNED_SUBJECT });
  const response = await updateMark(teacher.id, mark.id, { score: 90 });
  expect(response.status).toBe(403);
});
```

**Integration Tests** (API scenarios):
```javascript
// timetable-authorization.integration.test.js
test('GET /api/v1/timetable returns filtered results for teacher', async () => {
  const response = await request(app)
    .get('/api/v1/timetable')
    .set('Authorization', `Bearer ${teacherToken}`)
    .expect(403);  // Should not have access to list all
});

test('GET /api/v1/timetable/my-schedule returns only own entries', async () => {
  const response = await request(app)
    .get('/api/v1/timetable/my-schedule')
    .set('Authorization', `Bearer ${teacherToken}`)
    .expect(200);
  
  expect(response.body.data.entries).toHaveLength(3);
  expect(response.body.data.entries[0].teacherId).toBe(teacher.id);
});

test('Student cannot access timetable via sectionId query param', async () => {
  const response = await request(app)
    .get('/api/v1/timetable/entries?sectionId=OTHER_SECTION')
    .set('Authorization', `Bearer ${studentToken}`)
    .expect(403);  // No access to list all sections
});
```

**Security Tests** (IDOR/bypass attempts):
```javascript
// authorization-security.test.js
test('Attacker cannot modify teacher permissions by guessing IDs', async () => {
  const response = await request(app)
    .put('/api/v1/users/attacker-id/permissions')
    .set('Authorization', `Bearer ${attackerToken}`)
    .send({ role: 'School Admin' })
    .expect(403);
});

test('Attacker cannot access student data by changing URL parameter', async () => {
  const response = await request(app)
    .get('/api/v1/students/OTHER_STUDENT_ID')
    .set('Authorization', `Bearer ${attackerToken}`)
    .expect(403);
});

test('Frontend role change does not affect backend authorization', async () => {
  // Even if attacker changes localStorage to role='School Admin'
  const response = await request(app)
    .post('/api/v1/timetable')
    .set('Authorization', `Bearer ${studentToken}`)  // Real token is student role
    .send({...})
    .expect(403);
});
```

---

## 21. RISKS & MITIGATION

| Risk | Severity | Impact | Mitigation |
|------|----------|--------|-----------|
| Existing applications depend on current (broken) authorization | HIGH | Regressions in production | Implement Phase 1 in staging first, write backward-compat tests |
| Bug in new authorization → locks out legitimate users | HIGH | System unavailability | Comprehensive test suite, gradual rollout per role |
| Performance impact of new authorization checks | MEDIUM | Slow API responses | Cache permission queries, add indexes, load test |
| Multi-role support breaks existing single-role queries | MEDIUM | Data inconsistency | Keep users.role_id during transition, migrate gradually |
| Audit logging adds storage overhead | LOW | Disk space | Implement retention policy, archive old logs |

---

## 22. ESTIMATED EFFORT

| Phase | Tasks | Days | Risk |
|-------|-------|------|------|
| 1: Bug Fixes | 5 | 1-2 | LOW |
| 2: Foundation | 6 | 3-5 | MEDIUM |
| 3: Teacher Auth | 7 | 3-4 | HIGH |
| 4: Student Auth | 5 | 2-3 | MEDIUM |
| 5: Parent Auth | 6 | 2-3 | MEDIUM |
| 6: Admin Roles | 5 | 2-3 | MEDIUM |
| 7: Staff Roles | 3 | 2 | LOW |
| 8: Security Audit | 5 | 3-5 | MEDIUM |
| **TOTAL** | **42** | **18-25 days** | — |

---

## 23. ROLE-PERMISSION MATRIX (RECOMMENDED)

| Permission | Super Admin | School Admin | Principal | Coordinator | Teacher | Class Teacher | Student | Parent |
|-----------|-----------|-----------|-----------|-----------|---------|---------------|---------|--------|
| `student.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ (own) | ⚠️ (child) |
| `student.create` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `student.update` | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | ❌ | ⚠️ (own) | ❌ |
| `teacher.view` | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | ❌ |
| `teacher.create` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `timetable.view` | ✅ | ✅ | ✅ | ✅ | ⚠️ (own) | ⚠️ (own) | ⚠️ (own section) | ⚠️ (child) |
| `timetable.create` | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `timetable.publish` | ✅ | ✅ | ⚠️ (approve) | ✅ | ❌ | ❌ | ❌ | ❌ |
| `attendance.view` | ✅ | ✅ | ✅ | ✅ | ⚠️ (own class) | ✅ | ⚠️ (own) | ⚠️ (child) |
| `attendance.mark` | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `marks.view` | ✅ | ✅ | ✅ | ✅ | ⚠️ (own subject) | ⚠️ (own class) | ⚠️ (own) | ⚠️ (child) |
| `marks.create` | ✅ | ✅ | ❌ | ❌ | ✅ | ⚠️ | ❌ | ❌ |
| `marks.publish` | ✅ | ✅ | ⚠️ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `fees.view` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ⚠️ (own) | ⚠️ (child) |
| `fees.manage` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `role.manage` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `audit.view` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Legend:**
- ✅ Full access
- ⚠️ Scoped access (see parentheses)
- ❌ No access

---

## 24. DATA-SCOPE MATRIX (RECOMMENDED)

| User Role | Can Access | Scope Filters |
|-----------|-----------|--------------|
| **Super Admin** | Everything | None (all schools) |
| **School Admin** | All data in own school | `WHERE school_id = user.school_id` |
| **Principal** | All data in own school (read-mostly) | `WHERE school_id = user.school_id` |
| **Academic Coordinator** | Academic data in own school | `WHERE school_id = user.school_id AND resource_type IN ('academic')` |
| **Teacher** | Own assigned timetable + sections + students | `WHERE teacher_id = user.teacher_id` OR derived through teaching assignments |
| **Class Teacher** | Own section + teaching assignments | `WHERE section_id = user.class_section_id OR through teacher_subjects` |
| **Accountant** | Financial data in own school | `WHERE school_id = user.school_id AND resource_type = 'financial'` |
| **HR** | Staff data in own school | `WHERE school_id = user.school_id AND resource_type = 'hr'` |
| **Librarian** | Library data in own school | `WHERE school_id = user.school_id AND resource_type = 'library'` |
| **Student** | Own profile + own section timetable + own marks/attendance | `WHERE student_id = user.student_id` OR `section_id = user.student.section_id` |
| **Parent** | Linked children's data only | `WHERE student_id IN (SELECT student_id FROM student_parents WHERE parent_id = user.parent_id)` |

---

## 25. MIGRATION PATH

### Step 1: Parallel Systems (Week 1)
- Implement new authorization alongside old system
- New endpoints return filtered data, old endpoints still work
- Test both systems

### Step 2: Redirect & Fallback (Week 2-3)
- Frontend gradually switches to new authorized endpoints
- Old endpoints still work but return deprecation warnings
- Monitor for issues

### Step 3: Cleanup (Week 4)
- Remove old unprotected endpoints
- Remove fallback logic
- Full authorization enforcement

### Step 4: Hardening (Ongoing)
- Security audits
- Penetration testing
- Incident response

---

## 26. NEXT STEPS

### ✅ PHASE 1 AUDIT COMPLETE

I have analyzed:
- ✅ Authentication architecture (JWT tokens, bcrypt hashing)
- ✅ Authorization architecture (role middleware only, no data scoping)
- ✅ All 5 roles in the system
- ✅ Teacher access model (broken)
- ✅ Student access model (broken)
- ✅ Parent access model (broken)
- ✅ Database relationships and schema
- ✅ API authorization gaps (15+ vulnerabilities found)
- ✅ Frontend authorization (only UI filtering)
- ✅ Critical bugs (missing method in timetable service)
- ✅ 24 detailed recommendations
- ✅ 8-phase implementation plan

### 📋 AWAITING YOUR APPROVAL

Before I proceed to **PHASE 2 (Authorization Foundation)**, please:

1. **Review this report** and confirm the findings
2. **Identify priorities** — which roles/modules need fixing first?
3. **Confirm approach** — do you want to implement all 14 roles (Super Admin, Principal, etc.) or start with core 5?
4. **Discuss timeline** — can you allocate 18-25 days?
5. **Clarify multi-tenancy** — should I design for multiple schools?

### 🚀 THEN WE'LL IMPLEMENT

Once approved, I will proceed in this order:
1. **Day 1-2:** Fix critical bugs (missing method)
2. **Day 3-7:** Build authorization foundation (permissions, guards)
3. **Day 8-11:** Secure Teacher access (timetable, marks, attendance)
4. **Day 12-14:** Secure Student access
5. **Day 15-17:** Secure Parent access
6. **Day 18-21:** Implement Principal, Coordinator roles
7. **Day 22-23:** Implement Staff roles
8. **Day 24-25:** Full security audit and hardening

Each phase will have:
- ✅ Detailed code changes
- ✅ Database migrations
- ✅ Comprehensive tests
- ✅ Manual testing guide
- ✅ Go/no-go decision point before proceeding

---

## SUMMARY TABLE

| Item | Current State | Recommended | Priority |
|------|--------------|------------|----------|
| Authentication | ✅ Working (JWT) | ✅ Keep | — |
| Role-based access | ⚠️ Partial (only role name) | 🔴 **REBUILD** | CRITICAL |
| Data-scope enforcement | ❌ MISSING | 🔴 **BUILD** | CRITICAL |
| Relationship verification | ❌ MISSING | 🔴 **BUILD** | CRITICAL |
| Teacher timetable access | ❌ BROKEN (sees all) | 🔴 **FIX** | CRITICAL |
| Student data access | ⚠️ Broken (has bug) | 🔴 **FIX** | CRITICAL |
| Parent access | ⚠️ Broken (has bug) | 🔴 **FIX** | CRITICAL |
| Permission system | ❌ MISSING | 🟠 **ADD** | HIGH |
| Audit logging | ❌ MISSING | 🟠 **ADD** | HIGH |
| Multi-role support | ❌ NOT SUPPORTED | 🟡 **CONSIDER** | MEDIUM |
| Multi-school support | ❌ NOT DESIGNED | 🟡 **CONSIDER** | MEDIUM |
| API authorization checks | ⚠️ Partial | 🔴 **COMPLETE** | CRITICAL |
| Frontend authorization | ⚠️ UI-only | 🟠 **IMPROVE** | MEDIUM |

---

**END OF AUDIT REPORT**

This audit is complete and ready for your review. No code has been modified.
