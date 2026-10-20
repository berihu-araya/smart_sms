# SMART SMS: System Settings & Governance Engine Specification
**Module:** Enterprise Platform Configuration, RBAC Governance, Security & Disaster Recovery Suite  
**Target Platform:** Multi-Tenant School Management SaaS (SMART SMS)  
**Document Classification:** Architectural Specification & Deployment Readiness Guide  
**Version:** 1.0.0-PROD  
**Target System:** Node.js 20 LTS / Express 5 / PostgreSQL 17 / Next.js 16 (React 19)  
**Author:** Senior Systems & Enterprise Architecture Engineer  

---

## 1. Executive Summary & Foundational Role

In the **SMART SMS** ecosystem, the **System Settings Module** serves as the **Platform Control Plane** and **Single Source of Truth (SSOT)** for institutional governance, security policies, and administrative operations. 

While individual academic and operational modules (Students, Teachers, Attendance, Exams, Finance, Timetable, Library) handle day-to-day transactional workflows, **System Settings dictates the behavioral boundaries, fiscal parameters, temporal scopes, and access privileges** governing those transactions.

```
+=========================================================================================================+
|                                    SMART SMS SYSTEM CONTROL PLANE                                       |
+=========================================================================================================+
|                                                                                                         |
|   +--------------------------+   +--------------------------+   +-----------------------------------+   |
|   | 1. Institutional Identity|   | 2. Temporal Engine       |   | 3. Academic Hierarchy             |   |
|   | - Legal Identity & Code  |   | - Academic Years Master  |   | - Department Classifications      |   |
|   | - Official Seal & Logo   |   | - Term & Semester Bounds |   | - Head of Dept (HOD) Delegation   |   |
|   | - Tax / Localization     |   | - Active Session Clock   |   | - Faculty Resource Allocations    |   |
|   | - Currency & Formatters  |   | - End-of-Year Migration  |   | - Budget & Curriculum Ownership   |   |
|   +--------------------------+   +--------------------------+   +-----------------------------------+   |
|                 |                              |                                  |                     |
|                 +------------------------------+----------------------------------+                     |
|                                                |                                                        |
|   +-------------------------------------------------------------------------------------------------+   |
|   |                        CORE IDENTITY, SECURITY & ACCESS GOVERNANCE (IAM)                        |   |
|   |  - Role-Based Access Control (RBAC Hierarchy: Super Admin -> Admin -> Teacher -> Parent -> etc)  |   |
|   |  - Fine-Grained Permission Matrix (Entity CRUD + Approve + Export + Scope Toggles)              |   |
|   |  - User Identity Lifecycle (Provisioning, Status Suspension, Secure Credential Resets)         |   |
|   |  - Immutable Security Audit Trail (Tamper-evident logs of data deltas, IP, User-Agent)          |   |
|   +-------------------------------------------------------------------------------------------------+   |
|                                                |                                                        |
|                 +------------------------------+----------------------------------+                     |
|                 |                                                                 |                     |
|   +--------------------------+                                  +-----------------------------------+   |
|   | 4. Disaster Recovery     |                                  | 5. Enterprise Interoperability    |   |
|   | - Automated DB Snapshots |                                  | - Odoo 18 Multi-Channel Sync      |   |
|   | - Pre-Migration Safety   |                                  | - Real-time Bi-directional Ledger |   |
|   | - Point-in-Time Restore  |                                  | - Student / Invoice / Pay Sync    |   |
|   | - Encrypted Archive Dump |                                  | - Fault-tolerant Retry Queues     |   |
|   +--------------------------+                                  +-----------------------------------+   |
+=========================================================================================================+
```

---

## 2. Why System Settings is the Key of the Entire System

System Settings is not merely an administrative convenience form; it is the **architectural spine** of the entire application. Modifying a single value in System Settings reverberates across every functional subsystem:

1. **The Temporal Clock (Academic Year & Term):**
   - When the `active_academic_year_id` or `active_term` changes, all active schedules, student section rosters, fee billing structures, exam schedules, and attendance registers dynamically pivot to the new session.
   - Historical records are instantly preserved in immutable read-only snapshots.
2. **Access Security & Zero Trust Boundary:**
   - The permissions matrix determines whether a teacher can see marks for students outside their assigned section, whether an accountant can issue refunds without administrative counter-signature, and whether staff can export personally identifiable student records.
3. **Institutional Accountability & Compliance (Audit Trail):**
   - In educational institutions, grade alterations, fee waivers, and role changes carry high legal and regulatory liability. The audit engine guarantees non-repudiation by logging before-and-after JSON deltas, executing user identity, IP address, and timestamp.
4. **Business Continuity & Resilience:**
   - Automated snapshot orchestration guarantees that institutional data is protected against ransomware, human operator error, or hardware failure with clear Recovery Point Objectives (RPO < 24h) and Recovery Time Objectives (RTO < 30min).
5. **Enterprise ERP Financial Harmonization:**
   - Seamlessly mirrors student registrations, fee invoices, customer payments, staff payroll contracts, and journal entries into Odoo 18 without human dual-entry overhead.

---

## 3. Sub-Module Breakdown: Current State vs. Production Scope

The SMART SMS sidebar exposes 8 specialized sub-modules under `System Settings` (plus integrated User Management). Below is the comprehensive engineering audit of what is currently live versus what must be completed for a 100% deployment-ready system:

| Sub-Module | Sidebar Route | Current Implementation Status | Missing Enterprise Functionality (Deployment Gaps) |
| :--- | :--- | :--- | :--- |
| **1. General Settings** | `/dashboard/settings` | **Partial** (`page.js` handles school name, code, email, phone, address, motto, active year, term, currency). | • Institutional logo and signature/stamp upload for certificates.<br>• Policy toggles: Minimum attendance threshold (e.g. 75%), grading scheme selection (GPA vs Percentage), default passing score.<br>• Notification & SMS automated gateway toggles (e.g. auto-notify parents on 3 consecutive absences). |
| **2. Academic Years** | `/dashboard/settings/academic-years` | **Complete** (CRUD, active year flag, search, delete safeguards). | • Term subdivision boundaries (Quarter/Semester start and end dates).<br>• Automated End-of-Year promotion wizard (promoting students from Grade $N$ to $N+1$). |
| **3. Departments** | `/dashboard/settings/departments` | **Placeholder** (`ModuleComingSoon`). | • Dedicated `departments` relational table in PostgreSQL.<br>• Head of Department (HOD) appointment & teacher allocation.<br>• Classification: Academic vs Administrative vs Operational.<br>• Departmental budget and curriculum subject grouping. |
| **4. User Roles** | `/dashboard/settings/roles` | **Partial** (Read-only cards displaying predefined role permissions). | • Custom institutional role creation (e.g. "Exam Officer", "Dean of Students", "Cashier").<br>• Role inheritance and member headcount analytics.<br>• Guardrails preventing accidental deletion or lockout of root roles. |
| **5. Permissions Matrix** | `/dashboard/settings/permissions` | **Placeholder** (`ModuleComingSoon`). | • Relational `role_permissions` schema mapping Role $\times$ Module $\times$ Action.<br>• Fine-grained privileges: `can_view`, `can_create`, `can_edit`, `can_delete`, `can_approve`, `can_export`.<br>• Teacher scoping: `OWN_SECTIONS_ONLY` vs `DEPARTMENT_WIDE` vs `ALL_SCHOOL`. |
| **6. Audit Logs** | `/dashboard/settings/audit` | **Schema Only** (`audit_logs` table created in Migration 001, but UI is `ModuleComingSoon`). | • Query API endpoint with high-performance composite filtering.<br>• Search by User, Resource Type (`STUDENT`, `MARK`, `FEE`, `ROLE`), Action (`INSERT`, `UPDATE`, `DELETE`, `PUBLISH`), Date Range.<br>• JSON diff modal showing exact before/after change deltas.<br>• One-click export to CSV / PDF for regulatory inspection. |
| **7. Backups & DR** | `/dashboard/settings/backups` | **Placeholder** (`ModuleComingSoon`). | • Automated scheduled PostgreSQL dump executor (`pg_dump` worker).<br>• On-demand manual snapshot trigger before risky batch updates.<br>• Backup catalog storage in `system_backups` table with SHA-256 checksums.<br>• Secure download endpoint for off-site archiving. |
| **8. ERP Integration** | `/dashboard/settings/erp-integration` | **Complete & Production Ready** (Full Odoo 18 multi-channel sync, batch size controls, real-time status, logs). | • Webhook receiver for inbound Odoo payment reconciliations.<br>• Automatic sync health alert triggers on consecutive connection drops. |
| **9. User Accounts** | `/dashboard/settings/users` | **Complete & Production Ready** (User directory, filter by role, create user modal, status toggle, password reset). | • Mandatory password change upon first login flag.<br>• Session termination and multi-session revocation desk. |

---

## 4. Deep-Dive Architecture of Required Components

### 4.1 Module 1: General Institutional Settings & Policy Engine
#### Domain Functionality:
- **Identity & Legal Profile:** School name, legal registration code, tax identification number (TIN), accreditation body, official mailing address, emergency contact numbers, school motto.
- **Branding Assets:** Official school emblem/logo (vector SVG/PNG), principal/registrar digital signature stamp (used on automated report cards, official transcripts, and tuition receipts).
- **Academic Operational Rules:**
  - `min_attendance_threshold`: Default 75%. Below this, students trigger exam hall ticket warnings.
  - `grading_scale`: Selection between Standard Letter (A+, A, B, C, D, F), 4.0 GPA, or 100% Numeric.
  - `passing_grade_percentage`: Minimum score required to pass a subject (default 50%).
  - `exam_approval_required`: Boolean toggle requiring Principal/HOD approval before exam marks publish to parents.
- **Notification & Gateway Configuration:**
  - Automated parent SMS on morning attendance absence.
  - Automated fee reminder alerts $N$ days before due date.

---

### 4.2 Module 2: Institutional Departments & Faculty Governance
#### Domain Functionality:
- **Organizational Structure:**
  - Grouping academic staff into subject faculties: e.g., *Department of Natural Sciences*, *Department of Mathematics & ICT*, *Department of Languages & Literature*, *Department of Social Sciences*.
  - Grouping non-teaching personnel into operational units: *Finance & Bursary*, *Campus Security & Transport*, *Library Services*, *Maintenance & Facilities*.
- **HOD Appointment & Delegation:**
  - Appoint a designated Teacher as Head of Department (HOD).
  - HODs receive delegated authority:
    - Review and approve draft examination marks entered by department subject teachers.
    - Oversee departmental curriculum coverage and syllabus completion.
    - Allocate teaching workloads and submit departmental budget requisitions.

---

### 4.3 Module 3: Dynamic RBAC & Fine-Grained Permissions Matrix
#### Domain Functionality:
SMART SMS enforces a **Hybrid RBAC + Relationship-Based Authorization (ReBAC)** model:
1. **Predefined Base Roles:**
   - `Super Admin`: Platform owner, multi-school tenant management, unconstrained database access.
   - `School Admin`: Institutional principal / administrator; full control over school operations.
   - `Teacher`: Instructor; access constrained by assignment relationships.
   - `Student`: Enrolled pupil; self-service view of personal grades, timetable, attendance, fees.
   - `Parent`: Guardian; access strictly constrained to linked children profiles.
   - `Staff`: Administrative clerk; assists with registrations and fee logging.
   - `Librarian`: Manages catalogue, book loans, shelf locations, and library fines.
   - `Accountant`: Manages student billing, cashier shifts, payroll disbursements, and expense vouchers.
2. **Custom Institutional Roles:**
   - Schools frequently require specialized roles, e.g., *"Examination Officer"*, *"Discipline Dean"*, *"Sports Coordinator"*, *"Storekeeper"*.
   - The system allows creating new roles and assigning granular permissions across 16 functional modules.
3. **The Matrix of Permissions:**
   For every module (`students`, `teachers`, `classes`, `timetable`, `attendance`, `exams`, `marks`, `fees`, `payroll`, `expenses`, `library`, `transport`, `announcements`, `reports`, `settings`):
   - `can_view`: Read records.
   - `can_create`: Author new records.
   - `can_edit`: Modify existing records.
   - `can_delete`: Soft-delete records.
   - `can_approve`: Authorize published state (e.g. marks publishing, payroll closure).
   - `can_export`: Download CSV / Excel / PDF data dumps.
   - `scope`: `OWN_ONLY` (only data tied to user), `DEPARTMENT_ONLY` (faculty level), `SCHOOL` (institution wide).

---

### 4.4 Module 4: Enterprise Audit Logging & Non-Repudiation Trail
#### Domain Functionality:
- **Tamper-Evident Chronological Ledger:**
  - Every destructive or sensitive state change triggers an automated audit entry before transaction commit.
  - Monitored Events:
    - Mark insertions, updates, and terminal result publishing.
    - Fee discount, waiver, or scholarship allocations.
    - User creation, password resets, role elevation, and account locks.
    - Student status transitions (Admitted $\to$ Suspended $\to$ Transferred $\to$ Graduated).
    - System setting and academic session changes.
- **Audit Record Schema:**
  - `id`: UUID Primary Key.
  - `school_id`: Multi-tenant boundary.
  - `user_id`: Acting operator (with name & email cached/joined).
  - `action`: Standardized event string (`MARK_UPDATED`, `FEE_WAIVER_GRANTED`, `USER_SUSPENDED`, etc.).
  - `resource_type`: Entity class (`STUDENT`, `MARK`, `FEE_PAYMENT`, `SYSTEM_SETTING`).
  - `resource_id`: Target entity UUID.
  - `old_values`: JSONB state before modification.
  - `new_values`: JSONB state after modification.
  - `ip_address` & `user_agent`: Client network metadata.
  - `created_at`: High-precision timestamp with timezone.
- **Audit Log UX:**
  - Filterable by date range, operator user, resource type, and action keyword.
  - Integrated "Diff Inspector" modal highlighting changed JSON attributes in green/red.

---

### 4.5 Module 5: Automated Database Backups & Disaster Recovery (DR)
#### Domain Functionality:
- **Resilience Standard:**
  - Education databases store legal student transcripts and financial balances that cannot be lost under any circumstances.
- **Backup Types:**
  1. *Scheduled Automated Daily Snapshots:* Executed via background cron during low-traffic maintenance windows (e.g., 02:00 UTC).
  2. *Pre-Migration Snapshots:* Manually triggered by administrator prior to running batch promotions or major data imports.
  3. *On-Demand Archive Download:* Generates a compressed, AES-256 encrypted `.sql.gz` dump directly downloadable by verified Super Admins.
- **Operational Safety:**
  - Automated retention lifecycle (keep last 7 daily, 4 weekly, 12 monthly snapshots).
  - Pre-flight disk space and integrity checks.
  - Checksum validation (SHA-256) on every generated backup artifact.

---

## 5. Database Architecture & Schema Specification

To transition System Settings to 100% production readiness, the following database migrations must be applied:

### 5.1 New Table: `departments`
```sql
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(30) NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'ACADEMIC', -- 'ACADEMIC', 'ADMINISTRATIVE', 'SUPPORT'
    hod_teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    budget NUMERIC(15, 2) DEFAULT 0.00,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'INACTIVE'
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_school_department_code UNIQUE (school_id, code)
);

CREATE INDEX idx_departments_school_status ON departments(school_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_departments_hod ON departments(hod_teacher_id);
```

### 5.2 New Table: `role_permissions`
```sql
CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    module VARCHAR(50) NOT NULL, -- e.g. 'students', 'marks', 'attendance', 'finance'
    can_view BOOLEAN NOT NULL DEFAULT true,
    can_create BOOLEAN NOT NULL DEFAULT false,
    can_edit BOOLEAN NOT NULL DEFAULT false,
    can_delete BOOLEAN NOT NULL DEFAULT false,
    can_approve BOOLEAN NOT NULL DEFAULT false,
    can_export BOOLEAN NOT NULL DEFAULT false,
    scope VARCHAR(30) NOT NULL DEFAULT 'SCHOOL', -- 'OWN_ONLY', 'DEPARTMENT_ONLY', 'SCHOOL'
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_role_module UNIQUE (role_id, module)
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
```

### 5.3 New Table: `system_backups`
```sql
CREATE TABLE system_backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    backup_type VARCHAR(30) NOT NULL DEFAULT 'MANUAL', -- 'SCHEDULED', 'MANUAL', 'PRE_MIGRATION'
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED', -- 'IN_PROGRESS', 'COMPLETED', 'FAILED'
    storage_path TEXT NOT NULL,
    checksum_sha256 VARCHAR(64),
    error_message TEXT,
    initiated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_system_backups_created ON system_backups(created_at DESC);
```

### 5.4 Enhancements to `settings` Table
```sql
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Africa/Addis_Ababa',
ADD COLUMN IF NOT EXISTS date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
ADD COLUMN IF NOT EXISTS min_attendance_percentage INT DEFAULT 75,
ADD COLUMN IF NOT EXISTS passing_grade_percentage INT DEFAULT 50,
ADD COLUMN IF NOT EXISTS grading_system VARCHAR(30) DEFAULT 'LETTER_SCALE',
ADD COLUMN IF NOT EXISTS auto_absence_alert BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stamp_url TEXT;
```

---

## 6. REST API Design & Endpoint Contracts

All settings endpoints require authentication (`jwtAuth`) and strict authorization guards (`requireRole(['Super Admin', 'School Admin'])`).

### 6.1 General Settings API
- `GET /api/v1/settings` $\to$ Returns unified school configuration.
- `PUT /api/v1/settings` $\to$ Updates institutional profile, branding, academic thresholds, and localization.

### 6.2 Departments API
- `GET /api/v1/settings/departments` $\to$ List departments with HOD details, faculty count, and budget.
- `POST /api/v1/settings/departments` $\to$ Create a new academic or operational department.
- `GET /api/v1/settings/departments/:id` $\to$ Get department detail with allocated teachers and subject curriculum.
- `PUT /api/v1/settings/departments/:id` $\to$ Update department, reassign HOD, or adjust budget.
- `DELETE /api/v1/settings/departments/:id` $\to$ Soft-delete department (safeguarded if teachers assigned).

### 6.3 Roles & Permissions API
- `GET /api/v1/roles` $\to$ List all system and custom roles with user counts.
- `POST /api/v1/roles` $\to$ Create custom institutional role.
- `GET /api/v1/roles/:id/permissions` $\to$ Get 16-module permission matrix for a specific role.
- `PUT /api/v1/roles/:id/permissions` $\to$ Batch save updated permission flags for the role.

### 6.4 Audit Logs API
- `GET /api/v1/settings/audit-logs` $\to$ Paginated audit entries.
  - Query parameters: `page`, `limit`, `search`, `userId`, `resourceType`, `action`, `startDate`, `endDate`.
- `GET /api/v1/settings/audit-logs/:id` $\to$ Retrieve full audit record with JSON before/after delta diff.
- `GET /api/v1/settings/audit-logs/export` $\to$ Stream CSV dump of audit trail for external compliance.

### 6.5 Backups & Disaster Recovery API
- `GET /api/v1/settings/backups` $\to$ List catalog of historical snapshots with size, checksum, and date.
- `POST /api/v1/settings/backups/trigger` $\to$ Initiate an on-demand snapshot process.
- `GET /api/v1/settings/backups/:id/download` $\to$ Secure stream download of `.sql.gz` snapshot archive.

---

## 7. Frontend Architecture & User Experience (UX)

In accordance with SMART SMS standards:
- Built with **Next.js 16 App Router** and **React 19**.
- Styled using **Pure Vanilla CSS Modules** (`page.module.css`) with responsive glassmorphic cards, curated HSL color schemes, and subtle micro-animations.
- High accessibility (WCAG AA compliant contrast, aria attributes, keyboard navigation).
- Dedicated sub-routes under `/dashboard/settings/*`:

```
frontend/src/app/dashboard/settings/
├── page.js & page.module.css               (General Settings Hub & Policy Form)
├── academic-years/                         (Academic Calendar Cycles - Active)
├── departments/                            (Faculty & HOD Management)
│   ├── page.js
│   └── page.module.css
├── roles/                                  (Role List & Hierarchy Viewer)
├── permissions/                            (Interactive Permissions Matrix)
│   ├── page.js
│   └── page.module.css
├── audit/                                  (Security Audit Trail & Delta Viewer)
│   ├── page.js
│   └── page.module.css
├── backups/                                (Disaster Recovery & Snapshots)
│   ├── page.js
│   └── page.module.css
├── erp-integration/                        (Odoo 18 Synchronizer - Active)
└── users/                                  (Account Directory & Passwords - Active)
```

---

## 8. Implementation Roadmap: Step-by-Step Delivery Plan

To execute this architecture efficiently without breaking existing working modules, implementation will follow this structured 4-phase sequence:

### Phase 1: Institutional Departments & Hierarchy Engine
1. Execute database migration creating `departments` table and referencing `schools` and `teachers`.
2. Build backend module: `department.repository.js`, `department.service.js`, `department.controller.js`, `department.routes.js`.
3. Build frontend service `departmentService.js` and implement modern Next.js management page at `/dashboard/settings/departments`.
4. Connect Teacher form to select departmental affiliation.

### Phase 2: Enterprise Audit Trail & Compliance Viewer
1. Create `audit.repository.js`, `audit.service.js`, `audit.controller.js`, and mount at `/api/v1/settings/audit-logs`.
2. Implement backend audit middleware / hook to automatically record critical actions (mark entry, fee edits, user updates).
3. Build frontend service `auditService.js` and implement searchable audit timeline with JSON diff modal at `/dashboard/settings/audit`.

### Phase 3: Fine-Grained Permissions & Access Control Matrix
1. Execute database migration creating `role_permissions` table.
2. Build permission management endpoints in `role.controller.js` and integrate with `AuthorizationService`.
3. Build interactive matrix UI at `/dashboard/settings/permissions` allowing administrators to toggle permissions per module with real-time saving.

### Phase 4: Automated Backups & Disaster Recovery Suite
1. Build `backup.service.js` utilizing `pg_dump` with gzip compression and SHA-256 verification.
2. Store backup metadata in `system_backups` table with download streaming.
3. Build backup management UI at `/dashboard/settings/backups` with manual snapshot trigger, progress state, and download links.

---

## 9. Conclusion & Senior Engineer Sign-Off

The **System Settings Suite** transforms SMART SMS from a collection of isolated administrative forms into an **enterprise-grade, multi-tenant institutional operating system**. 

By establishing clean institutional identity, academic session governance, faculty hierarchy, strict least-privilege RBAC, tamper-evident audit trails, and resilient disaster recovery, SMART SMS achieves full operational readiness for production deployment in premier schools, colleges, and educational academies.
