# SMART SMS: Production Architecture, Engineering Standards & End-to-End Roadmap
**Version:** 1.0.0-PROD  
**Target Environment:** Production Ready / Scalable Educational SaaS  
**Last Updated:** August 2026  

---

## 1. System Overview & Architectural Topology

SMART SMS is a multi-tier, modular School Management System designed for scalable school operations, student lifecycle tracking, continuous assessment/examination, ranking, attendance, and administrative oversight.

```
+-------------------------------------------------------------------------+
|                              CLIENT TIER                                |
|   Next.js 16 (React 19, App Router, CSS Modules, Axios/Fetch Service)   |
+------------------------------------+------------------------------------+
                                     | HTTPS (Port 443/80)
                                     v
+------------------------------------+------------------------------------+
|                         REVERSE PROXY & GATEWAY                         |
|   Nginx (SSL Termination, Rate Limiting, Gzip Compression, Security)    |
+------------------+----------------------------------+-------------------+
                   | /api/*                           | /*
                   v                                  v
+------------------+------------------+   +-----------+-------------------+
|               API TIER              |   |       FRONTEND CONTAINER      |
|    Express.js (Node.js 20 LTS)      |   |   Next.js Standalone Runner   |
|  - Route & Validation Middleware     |   |   Port 3000                   |
|  - Controller Layer                 |   +-------------------------------+
|  - Service Layer (Transactions)     |
|  - Repository Layer (pg Pool)       |
+---------+--------------------+------+
          |                    |
          v                    v
+---------+----------+  +------+------+
|     PRIMARY DB     |  |    CACHE    |
|   PostgreSQL 17    |  |   Redis 7   |
|   (ACID, Relational|  | (Sessions,  |
|    UUIDs, Migrates)|  |  Dashboard) |
+--------------------+  +-------------+
```

---

## 2. Technology Stack & Component Specifications

| Layer | Technology | Version / Tooling | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | Next.js / React | `Next.js 16.2+`, `React 19` | App Router, SSR/CSR, Responsive Dashboard |
| **Styling** | CSS Modules + Vanilla CSS | Modern CSS Variables | Fast, zero-overhead tailored design system |
| **Icons** | React Icons | `react-icons (Hi2, Fa)` | UI iconography |
| **HTTP Client** | Fetch API / Axios | `src/services/apiClient.js` | Centralized token injection & error interceptor |
| **Backend Runtime** | Node.js / Express | `Node 20+`, `Express 5` | RESTful API server with modular layered design |
| **Database** | PostgreSQL | `PostgreSQL 17` | Relational data, foreign keys, UUIDs, indexes |
| **DB Driver / Migrations**| `pg` + `node-pg-migrate`| `pg 8.22+`, `node-pg-migrate 9+` | Connection pooling & version-controlled DDL |
| **Cache & Key-Value** | Redis | `Redis 7` | Query caching, rate limiting, session storage |
| **Security** | Helmet, bcrypt, JWT | `helmet`, `bcrypt 6`, `jsonwebtoken 9` | HTTP security headers, password hashing, stateless auth |
| **DevOps & Containers** | Docker & Compose | Docker Engine, Compose v2 | Multi-container reproducible production stack |
| **Reverse Proxy** | Nginx Alpine | Nginx with Certbot SSL | TLS termination, static proxy, reverse routing |

---

## 3. Database Schema & Relational Specifications

### 3.1 Entity Relationship Diagram

```
+-------------+         +------------------+         +---------------+
|   schools   | 1 --- N |  academic_years  | 1 --- N |   semesters   |
+-------------+         +--------+---------+         +-------+-------+
                                 |                           |
                                 | 1                         | 1
                                 |                           |
                                 | N                         | N
+-------------+         +--------+---------+         +-------+-------+
|   grades    | 1 --- N | student_enrollments        |     exams     |
+------+------+         +--------+---------+         +-------+-------+
       |                         |                           |
       | 1                       | N                         | 1
       |                         |                           |
       | N                       | 1                         | N
+------+------+         +--------+---------+         +-------+-------+
|  sections   | 1 --- N |     students     | 1 --- N |     marks     |
+------+------+         +--------+---------+         +---------------+
       |                         |
       | 1                       | N
       |                         |
       | N                       | 1
+------+------+         +--------+---------+
| attendance  |         |     parents      |
+-------------+         +------------------+

+-------------+         +------------------+         +---------------+
|    users    | 1 --- 1 |     teachers     | 1 --- N |teacher_subjects
+-------------+         +------------------+         +---------------+
```

### 3.2 Core Table Specifications

#### A. Academic & Organization
- `schools`: `id (UUID PK)`, `name`, `code`, `email`, `phone`, `address`, `logo`, `motto`, `grading_system (JSONB)`, `created_at`, `updated_at`, `deleted_at`.
- `academic_years`: `id (UUID PK)`, `name`, `start_date`, `end_date`, `is_active (BOOLEAN)`, `created_at`, `updated_at`, `deleted_at`.
- `semesters`: `id (UUID PK)`, `academic_year_id (FK)`, `name`, `start_date`, `end_date`, `is_active (BOOLEAN)`, `created_at`, `updated_at`, `deleted_at`.
- `grades`: `id (UUID PK)`, `name`, `description`, `created_at`, `updated_at`, `deleted_at`.
- `sections`: `id (UUID PK)`, `grade_id (FK)`, `name`, `capacity`, `room_number`, `created_at`, `updated_at`, `deleted_at`.
- `subjects`: `id (UUID PK)`, `group_id (FK)`, `code`, `name`, `description`, `created_at`, `updated_at`, `deleted_at`.
- `grade_subjects`: `id (UUID PK)`, `grade_id (FK)`, `subject_id (FK)`, `credits/hours`, `created_at`, `updated_at`.

#### B. People & Staff
- `roles`: `id (UUID PK)`, `name (SUPER_ADMIN, SCHOOL_ADMIN, REGISTRAR, TEACHER, PARENT, STUDENT)`, `description`, `created_at`, `updated_at`.
- `users`: `id (UUID PK)`, `role_id (FK)`, `first_name`, `last_name`, `email`, `phone`, `password`, `profile_image`, `status (ACTIVE, INACTIVE, SUSPENDED)`, `last_login`, `created_at`, `updated_at`, `deleted_at`.
- `teachers`: `id (UUID PK)`, `user_id (FK)`, `employee_number`, `qualification`, `hire_date`, `gender`, `date_of_birth`, `phone`, `email`, `created_at`, `updated_at`, `deleted_at`.
- `teacher_subjects`: `id (UUID PK)`, `teacher_id (FK)`, `subject_id (FK)`, `grade_id (FK)`, `section_id (FK)`, `academic_year_id (FK)`, `status`, `created_at`, `updated_at`, `deleted_at`.
- `parents`: `id (UUID PK)`, `user_id (FK nullable)`, `full_name`, `phone`, `email`, `occupation`, `address`, `relationship_type`, `created_at`, `updated_at`, `deleted_at`.

#### C. Student Lifecycle & Academic Records
- `students`: `id (UUID PK)`, `user_id (FK nullable)`, `parent_id (FK nullable)`, `section_id (FK nullable)`, `admission_number (UNIQUE)`, `first_name`, `last_name`, `gender`, `date_of_birth`, `admission_date`, `address`, `email`, `phone`, `photo`, `status (ACTIVE, TRANSFERRED, GRADUATED, WITHDRAWN, SUSPENDED)`, `created_at`, `updated_at`, `deleted_at`.
- `student_enrollments`: `id (UUID PK)`, `student_id (FK)`, `academic_year_id (FK)`, `grade_id (FK)`, `section_id (FK)`, `roll_number`, `enrollment_date`, `status (ENROLLED, PROMOTED, REPEATED, TRANSFERRED, DROPPED)`, `remarks`, `created_at`, `updated_at`.
- `attendance`: `id (UUID PK)`, `student_id (FK)`, `section_id (FK)`, `academic_year_id (FK)`, `date (DATE)`, `status (PRESENT, ABSENT, LATE, EXCUSED)`, `remark`, `recorded_by (FK users)`, `created_at`, `updated_at`.

#### D. Examinations, Continuous Assessment & Marks
- `exams`: `id (UUID PK)`, `semester_id (FK)`, `academic_year_id (FK)`, `title`, `exam_type (MIDTERM, FINAL, QUIZ, ASSIGNMENT, PRACTICAL)`, `weight_percentage`, `max_marks`, `start_date`, `end_date`, `is_published (BOOLEAN)`, `created_at`, `updated_at`, `deleted_at`.
- `marks`: `id (UUID PK)`, `exam_id (FK)`, `student_id (FK)`, `subject_id (FK)`, `teacher_id (FK)`, `section_id (FK)`, `score (DECIMAL)`, `is_absent (BOOLEAN)`, `remarks`, `submitted_at`, `approved_at`, `created_at`, `updated_at`.
- `grading_scales`: `id (UUID PK)`, `school_id (FK)`, `grade_letter (A+, A, B, C, D, F)`, `min_score`, `max_score`, `grade_point (4.0, 3.0, etc.)`, `description`, `created_at`.

---

## 4. Backend Engineering & Coding Standards

### 4.1 Layered Architecture Pattern
Each feature module in `backend/src/modules/<module-name>/` must contain:
1. `*.routes.js`: Defines REST routes, mounts auth middleware, role guards, and request body validators.
2. `*.validation.js`: Pure validation routines checking types, regex, presence, and formats.
3. `*.controller.js`: Unpacks HTTP requests (`req.params`, `req.query`, `req.body`), passes data to Service, handles HTTP status codes.
4. `*.service.js`: Houses business rules, cross-module orchestration, data calculations, and multi-query DB transactions (`BEGIN...COMMIT...ROLLBACK`).
5. `*.repository.js`: Isolated SQL execution layer using parameterized queries `$1, $2` via `Pool`.

### 4.2 Standard API Response Protocol
All responses must strictly adhere to the following payload structure:
```json
// Success Response
{
  "success": true,
  "message": "Students retrieved successfully",
  "data": [ ... ],
  "meta": {
    "total": 240,
    "page": 1,
    "limit": 20,
    "totalPages": 12
  }
}

// Error Response
{
  "success": false,
  "message": "Validation failed / Unauthorized / Resource not found",
  "data": null,
  "errors": [ ... ]
}
```

### 4.3 Transaction Safety Pattern
```javascript
const { db } = require('../../config/database');

class StudentEnrollmentService {
  async transferSection(studentId, newSectionId, reason) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // 1. Check section capacity
      const sectionRes = await client.query(
        'SELECT capacity, (SELECT COUNT(*) FROM students WHERE section_id = $1 AND deleted_at IS NULL) as current_count FROM sections WHERE id = $1',
        [newSectionId]
      );
      if (Number(sectionRes.rows[0].current_count) >= sectionRes.rows[0].capacity) {
        throw new Error('Target section is at maximum capacity');
      }

      // 2. Update student current section
      await client.query(
        'UPDATE students SET section_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newSectionId, studentId]
      );

      // 3. Insert audit/enrollment history record
      await client.query(
        'INSERT INTO student_enrollments (student_id, section_id, remarks, status) VALUES ($1, $2, $3, $4)',
        [studentId, newSectionId, reason, 'TRANSFERRED']
      );

      await client.query('COMMIT');
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
```

---

## 5. Frontend Engineering & Design Standards

### 5.1 Architecture & Flow
```
Page Component (app/dashboard/...) 
   └── Calls Domain Service (services/studentService.js)
         └── Uses Central Client (services/apiClient.js)
               └── Injects JWT Token & Handles 401 Expirations
```

### 5.2 Frontend Folder Layout
```
frontend/src/
├── app/
│   ├── layout.js              # Root HTML & Global Font / Metadata
│   ├── globals.css            # CSS variables, resets, theme tokens
│   ├── login/                 # Public Auth / Login page
│   └── dashboard/             # Authenticated Layout & Protected Routes
│       ├── layout.js          # Sidebar + Topbar Header wrapper
│       ├── page.js            # Analytical KPI dashboard
│       ├── students/          # List, Create, 360 View, Edit, Enroll
│       ├── teachers/          # List, Create, Teacher Details, Subjects
│       ├── parents/           # Guardian management & linked wards
│       ├── grades/            # Grade levels & Grade-Subject mappings
│       ├── sections/          # Section list & grade allocations
│       ├── subjects/          # Subject catalog & subject groups
│       ├── attendance/        # Daily section roster & attendance entry
│       ├── exams/             # Exam definitions & scheduling
│       ├── marks/             # Batch tabular marks entry
│       ├── results/           # Ranks, averages & Report Card PDF export
│       └── settings/          # Academic Years, Users, Roles, School Info
├── components/
│   ├── layout/ (Sidebar, Header, Breadcrumbs)
│   ├── ui/ (Button, Modal, Table, Badge, FormInputs, Alert, Spinner)
│   └── modules/ (StudentCard, AttendanceGrid, MarksTable, ReportCard)
├── services/                  # Pure API client calls
├── context/                   # AuthContext, ThemeContext, NotificationContext
└── utils/                     # Formatters, Date helpers, Export helpers
```

---

## 6. End-to-End Execution Roadmap (Phases 1 to 6)

### Phase 1: Parent/Guardian Management & Student 360° Profile
- **Deliverables:**
  1. Backend `parents` module (Repository, Service, Controller, Routes, Validation).
  2. Migration `create-student-enrollments-table.js`.
  3. Student Lifecycle APIs: `/students/:id/enroll`, `/students/:id/transfer`, `/students/:id/graduate`, `/students/:id/withdraw`, `/students/:id/profile`.
  4. Frontend Pages:
     - `/dashboard/parents`: List, Create, Edit, View with linked children.
     - `/dashboard/students/[id]`: Multi-tab profile (Academic, Bio, Guardian, Enrollment History).
     - Section Transfer & Status Change Modals.

### Phase 2: Daily Attendance Management System
- **Deliverables:**
  1. Migration `create-attendance-table.js`.
  2. Backend `attendance` module (Bulk upsert endpoint, daily sheet query, student statistics, section monthly report).
  3. Frontend `/dashboard/attendance`:
     - Quick filter by Grade $\rightarrow$ Section $\rightarrow$ Date.
     - Interactive Roster Sheet: Quick toggle buttons ($P / A / L / E$), "Mark All Present" button, remarks field, instant submit.
     - Monthly Attendance Heatmap & Absence rate percentage badge.

### Phase 3: Examinations, Marks Entry & Results Engine
- **Deliverables:**
  1. Migrations `create-exams-and-marks.js` and `create-grading-scales.js`.
  2. Backend `exams` & `marks` modules:
     - Exam CRUD & weight configuration (e.g. Midterm 30%, Quiz 10%, Final 60%).
     - Batch Marks Entry endpoint (`POST /api/v1/marks/batch`) with score cap validation.
     - Results Calculation Service: Calculates student weighted totals, subject grades ($A, B, C...$), semester averages, and section/grade rankings (resolving ties).
  3. Frontend:
     - `/dashboard/exams`: Exam schedule & setup.
     - `/dashboard/marks`: High-speed tabular spreadsheet marks input with keyboard shortcuts ($Tab$, $Enter$).
     - `/dashboard/results`: Rank list, terminal grade sheets, top performers summary.

### Phase 4: Official Report Card & Transcript Generator (PDF/Print)
- **Deliverables:**
  1. Backend PDF generation endpoint or Client-side Print stylesheet.
  2. Standardized Ethiopian / International Terminal Report Card template:
     - School Header, Logo, Motto, Academic Year, Semester.
     - Student Details, Section, Roll No, Attendance record summary.
     - Subject Scores Table (Continuous Assessment, Final Exam, Total, Letter Grade, Teacher Remark).
     - Semester Summary (Total Score, Average, Rank in Section, Rank in Grade, Conduct, Promotion Status).
     - Signature Lines for Homeroom Teacher, Section Head, Principal.

### Phase 5: Administration, Roles (RBAC) & School Settings
- **Deliverables:**
  1. Backend `users`, `roles`, `permissions`, and `settings` modules.
  2. Migration `create-settings-table.js`.
  3. Role-Based Access Control middleware checking permissions per route.
  4. Frontend:
     - `/dashboard/settings/users`: User management, status toggling, password reset.
     - `/dashboard/settings/roles`: Permission matrix editor.
     - `/dashboard/settings`: School profile (name, logo upload, contact info, active year/semester selector).

### Phase 6: Production Hardening, Docker & Deployment
- **Deliverables:**
  1. Multi-stage production `Dockerfile` for Backend and Frontend.
  2. `docker-compose.prod.yml` with Nginx, Backend, Frontend, Postgres, and Redis.
  3. Automated database backup cron script with compression.
  4. GitHub Actions CI/CD pipeline for automated testing, linting, image build, and deployment.

---

## 7. Production Deployment Blueprint (Docker & Nginx)

### 7.1 Multi-Container Production Topology (`docker-compose.prod.yml`)
```yaml
services:
  nginx:
    image: nginx:alpine
    container_name: smart_sms_nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/conf.d:/etc/nginx/conf.d
      - ./docker/certbot/conf:/etc/letsencrypt
      - ./docker/certbot/www:/var/www/certbot
    depends_on:
      - frontend
      - backend
    networks:
      - smart_sms_net

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: smart_sms_backend
    restart: always
    env_file:
      - ./backend/.env.production
    environment:
      - NODE_ENV=production
    depends_on:
      db:
        condition: service_healthy
    networks:
      - smart_sms_net

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: smart_sms_frontend
    restart: always
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=/api
    networks:
      - smart_sms_net

  db:
    image: postgres:17-alpine
    container_name: smart_sms_db
    restart: always
    env_file:
      - ./backend/.env.production
    volumes:
      - db_data:/var/lib/postgresql/data
      - ./docker/backups:/backups
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - smart_sms_net

  redis:
    image: redis:7-alpine
    container_name: smart_sms_redis
    restart: always
    volumes:
      - redis_data:/data
    networks:
      - smart_sms_net

volumes:
  db_data:
  redis_data:

networks:
  smart_sms_net:
    driver: bridge
```

### 7.2 Nginx Configuration (`docker/nginx/conf.d/default.conf`)
```nginx
server {
    listen 80;
    server_name school.example.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name school.example.com;

    ssl_certificate /etc/letsencrypt/live/school.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/school.example.com/privkey.pem;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Backend API Routing
    location /api/ {
        proxy_pass http://backend:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend Routing
    location / {
        proxy_pass http://frontend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 8. Automated Database Backup & Maintenance Plan

Create a backup shell script `docker/scripts/backup-db.sh`:
```bash
#!/bin/sh
set -e

BACKUP_DIR="/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="smart_sms_backup_${TIMESTAMP}.sql.gz"

echo "Starting database backup: ${FILENAME}"
pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" | gzip > "${BACKUP_DIR}/${FILENAME}"

# Remove backups older than 14 days
find "${BACKUP_DIR}" -name "smart_sms_backup_*.sql.gz" -mtime +14 -exec rm {} \;

echo "Backup complete: ${BACKUP_DIR}/${FILENAME}"
```

---

## 9. Definition of Done (DoD) per Feature Module

Before moving any module from In-Progress to Completed:
- [ ] Database migration written with `up` and `down` methods.
- [ ] Appropriate indexes created for filtered/joined columns.
- [ ] Validation schema strictly checks all incoming request properties.
- [ ] Repository isolates all SQL and uses parameterized queries.
- [ ] Service implements business logic & manages transactions where needed.
- [ ] Controller handles errors via standardized JSON envelope.
- [ ] Frontend Service integrates with `apiClient.js`.
- [ ] UI provides responsive forms, tables, pagination, sorting, and search.
- [ ] Error toasts / validation alerts display on failure.
- [ ] Role-based authorization rules applied (Super Admin, School Admin, Registrar, Teacher).
