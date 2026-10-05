# SMART SMS: Finance Module Specification & End-to-End Implementation Guide
**Module:** Financial Administration & Enterprise Billing Suite  
**Target Environment:** Multi-Tenant School Management SaaS (SMART SMS)  
**Version:** 1.0.0-PROD  
**Last Updated:** March 2026 / 2018 E.C.  

---

## 1. Executive Summary & Domain Scope

The **Finance Module** is a mission-critical core pillar of SMART SMS. It provides a comprehensive, double-entry-aligned, multi-tenant financial engine that automates student tuition billing, manages payment collection channels (cash, bank slips, mobile payments), tracks institutional operational expenditures, logs miscellaneous revenues, processes monthly staff payroll with statutory deductions, and generates audit-ready financial statements.

```
+==================================================================================================+
|                                    SMART SMS FINANCE ECOSYSTEM                                   |
+==================================================================================================+
|                                                                                                  |
|   +--------------------------+  +--------------------------+  +-------------------------------+  |
|   |  1. Student Fee Suite    |  |  2. Expense Management   |  |     3. Income & Revenue       |  |
|   |  - Categories & Masters  |  |  - Expense Categories    |  |  - Non-tuition revenue        |  |
|   |  - Batch Invoicing       |  |  - Vouchers & Receipts   |  |  - Canteen, rentals, grants   |  |
|   |  - Waivers/Scholarships  |  |  - Department Budgets    |  |  - Direct deposit tracking    |  |
|   |  - Multi-channel Pay     |  |  - Multi-tier Approvals  |  |  - Income category breakdown  |  |
|   |  - Bank Slip Review      |  |                          |  |                               |  |
|   +--------------------------+  +--------------------------+  +-------------------------------+  |
|                                                                                                  |
|   +--------------------------+  +--------------------------+  +-------------------------------+  |
|   |    4. Staff Payroll      |  |  5. Financial Analytics  |  |    6. Portals & Workflows     |  |
|   |  - Salary Structures     |  |  - Income vs Expense     |  |  - Parent Fee & Slip Upload   |  |
|   |  - Allowances & Tax/Pen  |  |  - Collection Efficiency |  |  - Cashier Shift Register     |  |
|   |  - Batch Payslip Gen     |  |  - Aging Defaulters List |  |  - Accountant Approval Desk   |  |
|   |  - Bank CSV Batch Export |  |  - Cash Flow Statement   |  |  - Thermal & A4 Print Engine  |  |
|   +--------------------------+  +--------------------------+  +-------------------------------+  |
+==================================================================================================+
```

---

## 2. Architecture & Technology Stack Alignment

This module strictly adheres to the SMART SMS established architectural patterns:

| Layer | Implementation Pattern | Key Responsibilities |
| :--- | :--- | :--- |
| **Database** | PostgreSQL 17 + `node-pg-migrate` | Relational integrity, UUID primary keys, multi-tenant `school_id`, ACID transactions for all monetary movements, composite indexes for high-speed ledger lookups. |
| **Backend API** | Node.js 20 LTS + Express 5 | Modular layered pattern: `finance.routes.js`, `finance.validation.js`, `finance.controller.js`, `finance.service.js`, `finance.repository.js`. |
| **Security & RBAC** | JWT Stateless Auth + Role Guards | Strict role-based endpoint protection with tenant isolation and parent-student relationship authorization checks. |
| **Frontend UI** | Next.js 16 App Router + React 19 | Responsive glassmorphic UI, CSS Modules (`page.module.css`), portals for modals, `@media print` layouts for thermal receipts, A4 tax invoices, and payslips. |
| **Client Services** | `feeService.js`, `expenseService.js`, `payrollService.js`, `incomeService.js` | Integrated with `apiClient.js` for automatic token injection and standard JSON envelope handling. |

---

## 3. Database Schema & Migration Architecture

### 3.1 Entity Relationship Diagram (Finance Domain)

```
                       +-------------------+
                       |      schools      | (Multi-Tenant Root)
                       +---------+---------+
                                 |
         +-----------------------+------------------------+----------------------+
         |                       |                        |                      |
+--------v---------+    +--------v---------+    +---------v--------+   +---------v--------+
|  fee_categories  |    |expense_categories|    |income_categories |   |salary_structures |
+--------+---------+    +--------+---------+    +---------+--------+   +---------+--------+
         |                       |                        |                      |
+--------v---------+    +--------v---------+    +---------v--------+   +---------v--------+
|  fee_structures  |    |     expenses     |    |     incomes      |   |   payroll_runs   |
+--------+---------+    +------------------+    +------------------+   +---------+--------+
         |                                                                       |
+--------v----------------+                                            +---------v--------+
|  student_fee_invoices   |<---+                                       |     payslips     |
+--------+----------------+    |                                       +---------+--------+
         |                     |                                                 |
+--------v----------------+    |                                       +---------v--------+
|fee_invoice_items /      |    |                                       |  payslip_items   |
|   fee_discounts         |    |                                       +------------------+
+-------------------------+    |
         |                     |
+--------v----------------+    |
|      fee_payments       +----+
+--------+----------------+
         |
+--------v----------------+
|  bank_slip_submissions  |
+-------------------------+
```

---

### 3.2 Database Migration DDL Specifications

The migration script `backend/migrations/1785489200008_create-finance-module-tables.js` creates 15 cohesive relational tables.

#### Table 1: `fee_categories`
Defines fee types (e.g., Tuition Fee, Registration Fee, Transport Fee, Laboratory Fee, Library Fee, Hostel Fee, Graduation Fee).
```sql
CREATE TABLE fee_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(30) NOT NULL,
    description TEXT,
    is_refundable BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_fee_categories_school_code UNIQUE (school_id, code)
);
CREATE INDEX idx_fee_categories_school ON fee_categories(school_id) WHERE deleted_at IS NULL;
```

#### Table 2: `fee_structures` (Fee Master)
Maps fee categories to specific grades, academic years, and terms with payment frequencies.
```sql
CREATE TABLE fee_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
    grade_id UUID NOT NULL REFERENCES grades(id) ON DELETE RESTRICT,
    fee_category_id UUID NOT NULL REFERENCES fee_categories(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    frequency VARCHAR(30) NOT NULL CHECK (frequency IN ('ONE_TIME', 'MONTHLY', 'TERMWISE', 'ANNUAL')),
    due_day_of_month INTEGER CHECK (due_day_of_month BETWEEN 1 AND 31),
    due_date DATE,
    late_fine_type VARCHAR(20) NOT NULL DEFAULT 'NONE' CHECK (late_fine_type IN ('NONE', 'FIXED', 'PERCENTAGE', 'DAILY')),
    late_fine_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    grace_period_days INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_fee_structures_composite ON fee_structures(school_id, academic_year_id, grade_id) WHERE deleted_at IS NULL;
```

#### Table 3: `fee_discounts` (Scholarships & Waivers)
Defines discount types (e.g., Sibling Discount 15%, Staff Child 50%, Academic Merit 100%, Need-Based Scholarship).
```sql
CREATE TABLE fee_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(30) NOT NULL,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('PERCENTAGE', 'FIXED_AMOUNT')),
    value NUMERIC(10, 2) NOT NULL CHECK (value > 0),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_fee_discounts_school_code UNIQUE (school_id, code)
);
CREATE INDEX idx_fee_discounts_school ON fee_discounts(school_id) WHERE deleted_at IS NULL;
```

#### Table 4: `student_fee_invoices`
Represents the student's bill for a given billing cycle.
```sql
CREATE TABLE student_fee_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(50) NOT NULL,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
    grade_id UUID NOT NULL REFERENCES grades(id) ON DELETE RESTRICT,
    section_id UUID REFERENCES sections(id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL,
    month INTEGER CHECK (month BETWEEN 1 AND 12),
    term_name VARCHAR(50),
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    subtotal_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    fine_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    balance_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'UNPAID' CHECK (status IN ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED')),
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_fee_invoices_school_number UNIQUE (school_id, invoice_number)
);
CREATE INDEX idx_fee_invoices_student ON student_fee_invoices(school_id, student_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_fee_invoices_due_date ON student_fee_invoices(school_id, due_date, status) WHERE deleted_at IS NULL;
```

#### Table 5: `student_fee_invoice_items`
Individual line items on an invoice (e.g., Tuition Fee 2500 ETB, Computer Lab 300 ETB, less Sibling Discount 375 ETB).
```sql
CREATE TABLE student_fee_invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES student_fee_invoices(id) ON DELETE CASCADE,
    fee_structure_id UUID REFERENCES fee_structures(id) ON DELETE SET NULL,
    fee_category_id UUID NOT NULL REFERENCES fee_categories(id) ON DELETE RESTRICT,
    fee_discount_id UUID REFERENCES fee_discounts(id) ON DELETE SET NULL,
    description VARCHAR(200) NOT NULL,
    base_amount NUMERIC(12, 2) NOT NULL,
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    final_amount NUMERIC(12, 2) NOT NULL,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_invoice_items_invoice ON student_fee_invoice_items(invoice_id);
```

#### Table 6: `fee_payments`
Tracks payments made against invoices. Supports partial payments, multi-channel processing, and instant receipt generation.
```sql
CREATE TABLE fee_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    receipt_number VARCHAR(50) NOT NULL,
    invoice_id UUID NOT NULL REFERENCES student_fee_invoices(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('CASH', 'BANK_TRANSFER', 'BANK_SLIP', 'TELEBIRR', 'CBE_BIRR', 'CHECK', 'CARD', 'ONLINE')),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_reference VARCHAR(100),
    bank_name VARCHAR(100),
    slip_image_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING_VERIFICATION', 'COMPLETED', 'REJECTED', 'REFUNDED')),
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    remarks TEXT,
    received_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_fee_payments_school_receipt UNIQUE (school_id, receipt_number)
);
CREATE INDEX idx_fee_payments_invoice ON fee_payments(invoice_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_fee_payments_student ON fee_payments(school_id, student_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_fee_payments_date ON fee_payments(school_id, payment_date);
```

#### Table 7: `bank_slip_submissions`
Self-service portal uploads by parents/students for manual verification by the school accountant.
```sql
CREATE TABLE bank_slip_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    invoice_id UUID NOT NULL REFERENCES student_fee_invoices(id) ON DELETE RESTRICT,
    submitted_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    bank_name VARCHAR(100) NOT NULL,
    reference_number VARCHAR(100) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    deposit_date DATE NOT NULL,
    slip_attachment_url TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_bank_slips_status ON bank_slip_submissions(school_id, status);
```

#### Table 8: `expense_categories`
Chart of operational accounts for school expenses.
```sql
CREATE TABLE expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(30) NOT NULL,
    description TEXT,
    monthly_budget NUMERIC(12, 2) DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_expense_categories_school_code UNIQUE (school_id, code)
);
CREATE INDEX idx_expense_categories_school ON expense_categories(school_id) WHERE deleted_at IS NULL;
```

#### Table 9: `expenses`
Operational expenses with attachment proofs and approval statuses.
```sql
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    voucher_number VARCHAR(50) NOT NULL,
    expense_category_id UUID NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
    title VARCHAR(150) NOT NULL,
    payee VARCHAR(150) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('CASH', 'BANK_TRANSFER', 'CHECK', 'PETTY_CASH', 'ONLINE')),
    reference_number VARCHAR(100),
    receipt_attachment_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'APPROVED' CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PAID')),
    notes TEXT,
    recorded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_expenses_school_voucher UNIQUE (school_id, voucher_number)
);
CREATE INDEX idx_expenses_category ON expenses(school_id, expense_category_id, expense_date) WHERE deleted_at IS NULL;
```

#### Table 10: `income_categories`
Non-tuition revenue categories (e.g., Canteen, Hall Rental, Donations, Book/Uniform Sales).
```sql
CREATE TABLE income_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(30) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_income_categories_school_code UNIQUE (school_id, code)
);
CREATE INDEX idx_income_categories_school ON income_categories(school_id) WHERE deleted_at IS NULL;
```

#### Table 11: `incomes`
Direct school revenues and deposits.
```sql
CREATE TABLE incomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    receipt_number VARCHAR(50) NOT NULL,
    income_category_id UUID NOT NULL REFERENCES income_categories(id) ON DELETE RESTRICT,
    title VARCHAR(150) NOT NULL,
    payer VARCHAR(150) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    income_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('CASH', 'BANK_TRANSFER', 'CHECK', 'ONLINE')),
    reference_number VARCHAR(100),
    receipt_attachment_url TEXT,
    notes TEXT,
    recorded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_incomes_school_receipt UNIQUE (school_id, receipt_number)
);
CREATE INDEX idx_incomes_category ON incomes(school_id, income_category_id, income_date) WHERE deleted_at IS NULL;
```

#### Table 12: `salary_structures`
Defines base compensation, allowances, and deduction presets for staff.
```sql
CREATE TABLE salary_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    base_salary NUMERIC(12, 2) NOT NULL CHECK (base_salary >= 0),
    housing_allowance NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    transport_allowance NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    medical_allowance NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    other_allowances NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    tax_rate_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    pension_employee_percentage NUMERIC(5, 2) NOT NULL DEFAULT 7.00,
    pension_employer_percentage NUMERIC(5, 2) NOT NULL DEFAULT 11.00,
    bank_name VARCHAR(100),
    bank_account_number VARCHAR(50),
    bank_account_name VARCHAR(150),
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_salary_structures_user UNIQUE (school_id, user_id)
);
CREATE INDEX idx_salary_structures_user ON salary_structures(school_id, user_id) WHERE deleted_at IS NULL;
```

#### Table 13: `payroll_runs`
Monthly batch payroll computation headers.
```sql
CREATE TABLE payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    batch_reference VARCHAR(50) NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    total_staff_count INTEGER NOT NULL DEFAULT 0,
    total_gross_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_deductions_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_net_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'CALCULATED', 'REVIEWED', 'APPROVED', 'PAID', 'DONE')),
    processed_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    disbursed_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_payroll_runs_school_month_year UNIQUE (school_id, month, year)
);
CREATE INDEX idx_payroll_runs_month_year ON payroll_runs(school_id, year, month) WHERE deleted_at IS NULL;
```

Payroll runs move through `DRAFT` → `CALCULATED` → `REVIEWED` → `APPROVED` → `PAID` → `DONE`. A draft is calculated from the active salary structures; approval locks the calculated results; payment updates the payslips to `PAID`; and `DONE` closes the period. Admins can advance every stage; Accountants can calculate and review, but only Admins can approve, record payment, or close the period. Legacy `PROCESSED` and `DISBURSED` records are migrated to `CALCULATED` and `PAID`.

#### Table 14: `payslips`
Individual staff payslip record generated in a payroll run.
```sql
CREATE TABLE payslips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    payslip_number VARCHAR(50) NOT NULL,
    base_salary NUMERIC(12, 2) NOT NULL,
    total_allowances NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    gross_salary NUMERIC(12, 2) NOT NULL,
    tax_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    pension_employee_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    pension_employer_contribution NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    other_deductions NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_deductions NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_salary NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL DEFAULT 'BANK_TRANSFER',
    bank_account_number VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'GENERATED' CHECK (status IN ('GENERATED', 'PAID', 'CANCELLED')),
    payment_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_payslips_school_number UNIQUE (school_id, payslip_number)
);
CREATE INDEX idx_payslips_user ON payslips(school_id, user_id, created_at);
```

#### Table 15: `payslip_items`
Itemized lines of allowances and deductions for audit and print transparency.
```sql
CREATE TABLE payslip_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payslip_id UUID NOT NULL REFERENCES payslips(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('ALLOWANCE', 'DEDUCTION')),
    name VARCHAR(100) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_payslip_items_payslip ON payslip_items(payslip_id);
```

---

## 4. RESTful API Specifications & Endpoints Contract

All endpoints require `Authorization: Bearer <token>` and enforce multi-tenant isolation and RBAC.

### 4.1 Fee Categories & Fee Master (`/api/v1/finance/fee-categories`, `/api/v1/finance/fee-structures`)

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/finance/fee-categories` | Admin, Staff | List all fee categories |
| `POST` | `/api/v1/finance/fee-categories` | Admin, Staff | Create a fee category |
| `PUT` | `/api/v1/finance/fee-categories/:id` | Admin, Staff | Update a fee category |
| `DELETE`| `/api/v1/finance/fee-categories/:id`| Admin | Soft delete a fee category |
| `GET` | `/api/v1/finance/fee-structures` | Admin, Staff | List fee structures (filters: `academic_year_id`, `grade_id`) |
| `POST` | `/api/v1/finance/fee-structures` | Admin, Staff | Create a fee structure |
| `PUT` | `/api/v1/finance/fee-structures/:id` | Admin, Staff | Update a fee structure |
| `DELETE`| `/api/v1/finance/fee-structures/:id`| Admin | Soft delete a fee structure |
| `GET` | `/api/v1/finance/fee-discounts` | Admin, Staff | List discount rules & scholarships |
| `POST` | `/api/v1/finance/fee-discounts` | Admin, Staff | Create a discount rule |

---

### 4.2 Student Fee Invoices (`/api/v1/finance/invoices`)

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/finance/invoices` | Admin, Staff | List all student invoices with search, grade, section, status, and pagination |
| `GET` | `/api/v1/finance/invoices/:id` | Admin, Staff, Parent, Student | Get full invoice details with line items and payment history |
| `POST` | `/api/v1/finance/invoices/generate-batch` | Admin, Staff | Batch generate invoices for an entire grade or section for a month/term |
| `POST` | `/api/v1/finance/invoices` | Admin, Staff | Create a single customized invoice for a student |
| `PUT` | `/api/v1/finance/invoices/:id` | Admin, Staff | Update invoice notes, due date, or manual adjustments |
| `POST` | `/api/v1/finance/invoices/:id/cancel` | Admin | Cancel an unpaid invoice |
| `GET` | `/api/v1/finance/invoices/my-invoices` | Parent, Student | Get logged-in student's or linked children's invoices |

#### Sample Request: Batch Invoice Generation (`POST /api/v1/finance/invoices/generate-batch`)
```json
{
  "academic_year_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  "grade_id": "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
  "section_id": null,
  "title": "October 2026 Tuition & Facility Fee",
  "month": 10,
  "term_name": "Semester 1",
  "due_date": "2026-10-25",
  "apply_active_discounts": true
}
```

#### Sample Response: Standard Response Envelope
```json
{
  "success": true,
  "message": "Batch invoice generation completed successfully",
  "data": {
    "totalGenerated": 142,
    "totalAmount": 355000.00,
    "batchReference": "INV-BATCH-202610-GR9"
  }
}
```

---

### 4.3 Fee Payments & Collection (`/api/v1/finance/payments`)

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/finance/payments` | Admin, Staff | List payments with date range, method, and cashier filters |
| `GET` | `/api/v1/finance/payments/:id` | Admin, Staff, Parent, Student | Get payment details and printable receipt data |
| `POST` | `/api/v1/finance/payments` | Admin, Staff | Record a new fee payment (cash, bank, POS, mobile) |
| `POST` | `/api/v1/finance/payments/bank-slip` | Parent, Student | Upload a bank deposit slip for review |
| `GET` | `/api/v1/finance/payments/bank-slips` | Admin, Staff | List pending bank slips for verification |
| `PATCH`| `/api/v1/finance/payments/bank-slips/:id/review`| Admin, Staff | Approve or Reject a submitted bank slip |

#### Sample Request: Record Payment (`POST /api/v1/finance/payments`)
```json
{
  "invoice_id": "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f",
  "student_id": "d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a",
  "amount": 2500.00,
  "payment_method": "BANK_TRANSFER",
  "payment_date": "2026-10-05",
  "transaction_reference": "FT2627889102X",
  "bank_name": "Commercial Bank of Ethiopia (CBE)",
  "remarks": "Paid via CBE Mobile Banking"
}
```

---

### 4.4 School Expenses (`/api/v1/finance/expenses`)

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/finance/expense-categories` | Admin, Staff | List expense categories & budget allocations |
| `POST` | `/api/v1/finance/expense-categories` | Admin, Staff | Create expense category with monthly budget |
| `PUT` | `/api/v1/finance/expense-categories/:id`| Admin, Staff | Update expense category & budget |
| `GET` | `/api/v1/finance/expenses` | Admin, Staff | List expenses with category, date, and status filters |
| `POST` | `/api/v1/finance/expenses` | Admin, Staff | Log an expense voucher with receipt upload |
| `PUT` | `/api/v1/finance/expenses/:id` | Admin, Staff | Update an expense record |
| `DELETE`| `/api/v1/finance/expenses/:id` | Admin | Soft delete an expense |
| `PATCH`| `/api/v1/finance/expenses/:id/approve` | Admin | Approve a pending expense requisition |

---

### 4.5 School Income (`/api/v1/finance/incomes`)

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/finance/income-categories` | Admin, Staff | List income categories |
| `POST` | `/api/v1/finance/income-categories` | Admin, Staff | Create income category |
| `GET` | `/api/v1/finance/incomes` | Admin, Staff | List direct revenues |
| `POST` | `/api/v1/finance/incomes` | Admin, Staff | Record a revenue transaction |
| `PUT` | `/api/v1/finance/incomes/:id` | Admin, Staff | Update revenue record |
| `DELETE`| `/api/v1/finance/incomes/:id` | Admin | Soft delete revenue record |

---

### 4.6 Staff Payroll & Compensation (`/api/v1/finance/payroll`)

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/finance/payroll/structures` | Admin | List staff salary structures |
| `POST` | `/api/v1/finance/payroll/structures` | Admin | Upsert staff salary configuration |
| `GET` | `/api/v1/finance/payroll/runs` | Admin | List monthly payroll run history |
| `POST` | `/api/v1/finance/payroll/runs/draft` | Admin | Create a draft payroll period |
| `POST` | `/api/v1/finance/payroll/runs/:id/calculate` | Admin, Accountant | Calculate a draft using active salary structures |
| `PATCH` | `/api/v1/finance/payroll/runs/:id/status` | Admin, Accountant (review only) | Advance payroll to the next lifecycle status |
| `POST` | `/api/v1/finance/payroll/runs/process` | Admin | Legacy endpoint to create a draft and calculate it in one request |
| `GET` | `/api/v1/finance/payroll/runs/:id` | Admin | Get payroll run details with itemized payslips |
| `PATCH` | `/api/v1/finance/payroll/runs/:id/disburse` | Admin | Legacy endpoint to mark an approved payroll as paid |
| `GET` | `/api/v1/finance/payroll/payslips/:id` | Admin, Staff, Teacher | Get individual printable payslip |
| `GET` | `/api/v1/finance/payroll/my-payslips` | All Staff, Teachers | Staff self-service portal to view own payslips |
| `GET` | `/api/v1/finance/payroll/runs/:id/bank-export` | Admin | Export batch salary transfer CSV for commercial banks |

---

### 4.7 Financial Reports & Analytics (`/api/v1/finance/reports`)

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/finance/reports/overview-kpis` | Admin, Staff | Real-time financial summary KPI widgets |
| `GET` | `/api/v1/finance/reports/collection-summary`| Admin, Staff | Invoiced vs Collected vs Outstanding breakdown |
| `GET` | `/api/v1/finance/reports/defaulters` | Admin, Staff | Aging unpaid balance report with parent phone numbers |
| `GET` | `/api/v1/finance/reports/income-vs-expense` | Admin | Profit & Loss / Cash flow statement by date range |
| `GET` | `/api/v1/finance/reports/cashier-shift` | Admin, Staff | Daily cashier register close summary |

---

## 5. Backend Implementation Specifications

### 5.1 Directory Structure
```
backend/src/modules/finance/
├── fee/
│   ├── fee.controller.js
│   ├── fee.repository.js
│   ├── fee.routes.js
│   ├── fee.service.js
│   └── fee.validation.js
├── expense/
│   ├── expense.controller.js
│   ├── expense.repository.js
│   ├── expense.routes.js
│   ├── expense.service.js
│   └── expense.validation.js
├── income/
│   ├── income.controller.js
│   ├── income.repository.js
│   ├── income.routes.js
│   ├── income.service.js
│   └── income.validation.js
├── payroll/
│   ├── payroll.controller.js
│   ├── payroll.repository.js
│   ├── payroll.routes.js
│   ├── payroll.service.js
│   └── payroll.validation.js
├── reports/
│   ├── finance-report.controller.js
│   ├── finance-report.repository.js
│   ├── finance-report.routes.js
│   └── finance-report.service.js
├── finance.routes.js            # Unified aggregation router
└── index.js
```

### 5.2 Transaction & Calculation Rules

#### Rule 1: Invoice Balancing & Payment Processing (ACID Transaction)
```javascript
// In fee.service.js
async function recordPayment(schoolId, receivedByUserId, paymentData) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Lock invoice row for update
    const invoiceRes = await client.query(
      `SELECT * FROM student_fee_invoices 
       WHERE id = $1 AND school_id = $2 AND deleted_at IS NULL 
       FOR UPDATE`,
      [paymentData.invoice_id, schoolId]
    );
    if (invoiceRes.rows.length === 0) {
      throw new Error('Invoice not found');
    }
    const invoice = invoiceRes.rows[0];

    const currentBalance = Number(invoice.balance_amount);
    const paymentAmount = Number(paymentData.amount);

    if (paymentAmount <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }
    if (paymentAmount > currentBalance) {
      throw new Error(`Payment amount exceeds outstanding balance of ${currentBalance}`);
    }

    // 2. Generate sequential receipt number: REC-YYYYMM-XXXX
    const receiptNumber = await generateReceiptNumber(client, schoolId);

    // 3. Insert payment record
    const paymentInsertRes = await client.query(
      `INSERT INTO fee_payments 
       (school_id, receipt_number, invoice_id, student_id, amount, payment_method, 
        payment_date, transaction_reference, bank_name, remarks, received_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'COMPLETED')
       RETURNING *`,
      [
        schoolId, receiptNumber, invoice.id, invoice.student_id, paymentAmount,
        paymentData.payment_method, paymentData.payment_date || new Date(),
        paymentData.transaction_reference || null, paymentData.bank_name || null,
        paymentData.remarks || null, receivedByUserId
      ]
    );

    // 4. Update invoice balances and status
    const newPaidAmount = Number(invoice.paid_amount) + paymentAmount;
    const newBalance = Number(invoice.total_amount) - newPaidAmount;
    const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIALLY_PAID';

    await client.query(
      `UPDATE student_fee_invoices 
       SET paid_amount = $1, balance_amount = $2, status = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [newPaidAmount, newBalance, newStatus, invoice.id]
    );

    await client.query('COMMIT');
    return paymentInsertRes.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

#### Rule 2: Ethiopian Progressive Income Tax & Pension Calculation
For staff payroll computation in Ethiopia (or custom configurable school tax slabs):
```javascript
function calculateEthiopianIncomeTax(taxableIncome) {
  if (taxableIncome <= 600) return 0;
  if (taxableIncome <= 1650) return (taxableIncome * 0.10) - 60;
  if (taxableIncome <= 3200) return (taxableIncome * 0.15) - 142.50;
  if (taxableIncome <= 5250) return (taxableIncome * 0.20) - 302.50;
  if (taxableIncome <= 7800) return (taxableIncome * 0.25) - 565.00;
  if (taxableIncome <= 10900) return (taxableIncome * 0.30) - 955.00;
  return (taxableIncome * 0.35) - 1500.00;
}
```

---

## 6. Frontend Architecture & UI/UX Specifications

### 6.1 Route Structure in Next.js 16 App Router
```
frontend/src/app/dashboard/
├── fees/
│   ├── page.js                     # Main Fee Management Hub (Invoices, Collect, Structures, Slips)
│   ├── page.module.css
│   ├── receipt/[id]/page.js        # Printable Thermal / A4 Receipt View
│   └── student/[id]/page.js        # Student 360 Financial Profile
├── expenses/
│   ├── page.js                     # Expense logging, vouchers, budget trackers
│   └── page.module.css
├── income/
│   ├── page.js                     # Non-tuition revenue logging & receipts
│   └── page.module.css
├── payroll/
│   ├── page.js                     # Salary structures, payroll runs, bank exports
│   ├── page.module.css
│   └── payslip/[id]/page.js        # Printable Payslip View
└── reports/
    └── financial/
        ├── page.js                 # P&L, Defaulters, Cashier Shift Reports
        └── page.module.css
```

### 6.2 Frontend Component Suite
```
frontend/src/components/finance/
├── FeeInvoiceModal.jsx             # Single / Custom invoice modal
├── BatchInvoiceDrawer.jsx          # Bulk invoice generation for classes
├── RecordPaymentModal.jsx          # Fast cashier payment entry with change calculator
├── BankSlipReviewModal.jsx         # Zoomable image preview + Approve/Reject actions
├── FeeStructureDrawer.jsx          # Fee master configuration form
├── ExpenseModal.jsx                # Expense voucher creation with receipt upload
├── IncomeModal.jsx                 # Revenue logging form
├── SalaryStructureModal.jsx        # Employee salary & allowance builder
├── ProcessPayrollModal.jsx         # Monthly payroll computation runner
├── PrintableReceipt.jsx            # Dual mode: 80mm POS thermal receipt & A4 Tax Invoice
├── PrintablePayslip.jsx            # Official employee payslip layout
└── FinancialCharts.jsx             # Chart.js / Recharts for P&L and Collection Rate
```

### 6.3 Printable Receipt Standards (`@media print`)
- **80mm Thermal Mode:** Designed for instant receipt printing at cashier counter. Contains School Header, Receipt No, Student Name, Roll No, Class, Itemized Fees, Paid Amount, Balance Due, Cashier Signature, and QR Code with receipt verification hash.
- **A4 Full Invoice Mode:** Designed for corporate/sponsor reimbursement and parent tax records. High contrast, official watermark, school logo, stamp block, and terms & conditions.

---

## 7. Security, Audit Logging & Multi-Tenancy

1. **Strict Multi-Tenant Scoping:** Every SQL query in all finance repositories MUST enforce `WHERE school_id = $X`. No financial record can be fetched or updated without explicit tenant validation.
2. **Double-Entry Financial Audit Trail:** Any modification to invoices (cancellations, discounts, adjustments) writes an immutable record to the `audit_logs` table with `old_values`, `new_values`, `ip_address`, and `user_id`.
3. **Parent-Child Privacy Isolation:** Parents can ONLY view and pay invoices belonging to students linked via `parents.user_id = req.user.id` or `students.parent_id = parent.id`. Direct ID-based parameter tampering is prevented via `AuthorizationService.isParentOfStudent()`.
4. **Number Formatting & Rounding:** All monetary amounts are stored as `NUMERIC(12, 2)` to eliminate floating-point rounding errors.

---

## 8. Step-by-Step Implementation Roadmap

```
+---------------------------------------------------------------------------------------------------+
|                                 IMPLEMENTATION PHASES (1 TO 6)                                    |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|  [ Phase 1: Database Foundations & Migrations ]                                                   |
|  - Create migration: `1785489200008_create-finance-module-tables.js` with all 15 tables           |
|  - Run `npm run migrate:up` & verify indexes and foreign keys                                      |
|                                                                                                   |
|  [ Phase 2: Fee Master & Invoicing Engine ]                                                       |
|  - Build Fee Categories, Structures & Discounts backend module                                     |
|  - Build Batch Invoicing Service with class roster loops & discount deduction                     |
|  - Build Cashier Payment Entry with sequential receipt numbering & invoice balance update         |
|                                                                                                   |
|  [ Phase 3: Parent Portal & Bank Slip Verification ]                                              |
|  - Build Bank Slip Upload endpoint for parents/students with image attachment                     |
|  - Build Accountant Slip Review Desk (Approve -> Auto-triggers payment record & updates balance)  |
|  - Develop Frontend `/dashboard/fees` with multi-tab workspace                                    |
|                                                                                                   |
|  [ Phase 4: Expense & Income Management Suite ]                                                   |
|  - Build Expense Categories, Monthly Budgets, and Voucher Logging backend module                  |
|  - Build Income Categories and Revenue Logging backend module                                     |
|  - Develop Frontend `/dashboard/expenses` and `/dashboard/income` with budget progress bars       |
|                                                                                                   |
|  [ Phase 5: Staff Payroll & Bank Transfer Export ]                                                |
|  - Build Salary Structures with progressive tax and pension formulas                              |
|  - Build Batch Monthly Payroll Computation Engine                                                 |
|  - Build Bank Batch Payment CSV Export formatter (CBE / Awash / Telebirr formats)                 |
|  - Develop Frontend `/dashboard/payroll` with staff payslip generator and `@media print` layout    |
|                                                                                                   |
|  [ Phase 6: Financial Analytics, Reports & Production Hardening ]                                 |
|  - Build Income vs Expense Statement, Collection Efficiency %, and Aging Defaulters report        |
|  - Build Daily Cashier Register Close Sheet                                                       |
|  - Develop Frontend `/dashboard/reports/financial`                                                |
|  - End-to-end integration testing, RBAC permission audits, and production verification            |
+---------------------------------------------------------------------------------------------------+
```

---

## 9. Definition of Done (DoD) Checklist

Before marking the Finance Module complete:
- [ ] Database migration written with reversible `up` and `down` methods.
- [ ] Multi-tenant `school_id` and `deleted_at` indexes present on all 15 tables.
- [ ] Backend validation schemas strictly validate UUIDs, amounts $> 0$, dates, and enum states.
- [ ] All monetary operations execute inside `BEGIN...COMMIT...ROLLBACK` transactions.
- [ ] Sequential receipt and invoice numbers are collision-proof.
- [ ] Frontend uses modern CSS variables, responsive tables, modal portals, and filterable tabs.
- [ ] Printable receipts & payslips render with zero margin overflow on thermal and A4 print targets.
- [ ] Parent and Student roles are strictly constrained to their own linked records.
- [ ] Financial KPIs and Reports match ledger balances with 100% mathematical accuracy.
