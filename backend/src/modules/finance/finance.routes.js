const express = require('express');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');

const {
  getSettings,
  updateSettings,
  listFeeCategories,
  createFeeCategory,
  updateFeeCategory,
  deleteFeeCategory,
  listFeeStructures,
  createFeeStructure,
  updateFeeStructure,
  deleteFeeStructure,
  listFeeDiscounts,
  createFeeDiscount,
  updateFeeDiscount,
  deleteFeeDiscount,
  listInvoices,
  getInvoiceById,
  getMyInvoices,
  createInvoice,
  generateBatchInvoices,
  cancelInvoice,
  listPayments,
  getPaymentById,
  recordPayment,
  listBankSlips,
  submitBankSlip,
  reviewBankSlip,
  listExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  listIncomeCategories,
  createIncomeCategory,
  updateIncomeCategory,
  deleteIncomeCategory,
  listIncomes,
  createIncome,
  deleteIncome,
  listSalaryStructures,
  getSalaryStructure,
  upsertSalaryStructure,
  listPayrollRuns,
  getPayrollRunById,
  processMonthlyPayroll,
  disbursePayroll,
  getPayslipById,
  getMyPayslips,
  exportBankCsv,
  getOverviewKPIs,
  getDefaultersReport,
  getIncomeVsExpenseReport,
  getCashierShiftReport,
} = require('./finance.controller');

const router = express.Router();

router.use(authMiddleware);

// Roles
const ADMIN_ROLES = ['School Admin', 'Admin'];
const FINANCE_STAFF = ['School Admin', 'Admin', 'Staff', 'Accountant'];
const ALL_STAFF_AND_TEACHERS = ['School Admin', 'Admin', 'Staff', 'Accountant', 'Teacher'];
const PARENT_STUDENT_STAFF = ['School Admin', 'Admin', 'Staff', 'Accountant', 'Parent', 'Student'];

// 1. SETTINGS
router.get('/config', authorizeRoles(...FINANCE_STAFF), getSettings);
router.put('/config', authorizeRoles(...ADMIN_ROLES), updateSettings);

// 2. FEE CATEGORIES
router.get('/fee-categories', authorizeRoles(...FINANCE_STAFF), listFeeCategories);
router.post('/fee-categories', authorizeRoles(...FINANCE_STAFF), createFeeCategory);
router.put('/fee-categories/:id', authorizeRoles(...FINANCE_STAFF), updateFeeCategory);
router.delete('/fee-categories/:id', authorizeRoles(...ADMIN_ROLES), deleteFeeCategory);

// 3. FEE STRUCTURES (Fee Master)
router.get('/fee-structures', authorizeRoles(...FINANCE_STAFF), listFeeStructures);
router.post('/fee-structures', authorizeRoles(...FINANCE_STAFF), createFeeStructure);
router.put('/fee-structures/:id', authorizeRoles(...FINANCE_STAFF), updateFeeStructure);
router.delete('/fee-structures/:id', authorizeRoles(...ADMIN_ROLES), deleteFeeStructure);

// 4. FEE DISCOUNTS & SCHOLARSHIPS
router.get('/fee-discounts', authorizeRoles(...FINANCE_STAFF), listFeeDiscounts);
router.post('/fee-discounts', authorizeRoles(...FINANCE_STAFF), createFeeDiscount);
router.put('/fee-discounts/:id', authorizeRoles(...FINANCE_STAFF), updateFeeDiscount);
router.delete('/fee-discounts/:id', authorizeRoles(...ADMIN_ROLES), deleteFeeDiscount);

// 5. INVOICES
router.get('/invoices/my-invoices', authorizeRoles('Parent', 'Student'), getMyInvoices);
router.get('/invoices', authorizeRoles(...FINANCE_STAFF), listInvoices);
router.get('/invoices/:id', authorizeRoles(...PARENT_STUDENT_STAFF), getInvoiceById);
router.post('/invoices/batch', authorizeRoles(...FINANCE_STAFF), generateBatchInvoices);
router.post('/invoices', authorizeRoles(...FINANCE_STAFF), createInvoice);
router.post('/invoices/:id/cancel', authorizeRoles(...ADMIN_ROLES), cancelInvoice);

// 6. PAYMENTS & RECEIPTS
router.get('/payments', authorizeRoles(...FINANCE_STAFF), listPayments);
router.get('/payments/:id', authorizeRoles(...PARENT_STUDENT_STAFF), getPaymentById);
router.post('/payments', authorizeRoles(...FINANCE_STAFF), recordPayment);

// 7. BANK SLIPS
router.get('/payments/bank-slips/list', authorizeRoles(...FINANCE_STAFF), listBankSlips);
router.post('/payments/bank-slips/submit', authorizeRoles('Parent', 'Student'), submitBankSlip);
router.patch('/payments/bank-slips/:id/review', authorizeRoles(...FINANCE_STAFF), reviewBankSlip);

// 8. EXPENSES
router.get('/expense-categories', authorizeRoles(...FINANCE_STAFF), listExpenseCategories);
router.post('/expense-categories', authorizeRoles(...FINANCE_STAFF), createExpenseCategory);
router.put('/expense-categories/:id', authorizeRoles(...FINANCE_STAFF), updateExpenseCategory);
router.delete('/expense-categories/:id', authorizeRoles(...ADMIN_ROLES), deleteExpenseCategory);

router.get('/expenses', authorizeRoles(...FINANCE_STAFF), listExpenses);
router.post('/expenses', authorizeRoles(...FINANCE_STAFF), createExpense);
router.put('/expenses/:id', authorizeRoles(...FINANCE_STAFF), updateExpense);
router.delete('/expenses/:id', authorizeRoles(...ADMIN_ROLES), deleteExpense);

// 9. INCOMES
router.get('/income-categories', authorizeRoles(...FINANCE_STAFF), listIncomeCategories);
router.post('/income-categories', authorizeRoles(...FINANCE_STAFF), createIncomeCategory);
router.put('/income-categories/:id', authorizeRoles(...FINANCE_STAFF), updateIncomeCategory);
router.delete('/income-categories/:id', authorizeRoles(...ADMIN_ROLES), deleteIncomeCategory);

router.get('/incomes', authorizeRoles(...FINANCE_STAFF), listIncomes);
router.post('/incomes', authorizeRoles(...FINANCE_STAFF), createIncome);
router.delete('/incomes/:id', authorizeRoles(...ADMIN_ROLES), deleteIncome);

// 10. PAYROLL
router.get('/payroll/structures', authorizeRoles(...ADMIN_ROLES, 'Accountant'), listSalaryStructures);
router.get('/payroll/structures/user/:userId', authorizeRoles(...ADMIN_ROLES, 'Accountant'), getSalaryStructure);
router.post('/payroll/structures', authorizeRoles(...ADMIN_ROLES), upsertSalaryStructure);

router.get('/payroll/runs', authorizeRoles(...ADMIN_ROLES, 'Accountant'), listPayrollRuns);
router.get('/payroll/runs/:id', authorizeRoles(...ADMIN_ROLES, 'Accountant'), getPayrollRunById);
router.post('/payroll/runs/process', authorizeRoles(...ADMIN_ROLES), processMonthlyPayroll);
router.patch('/payroll/runs/:id/disburse', authorizeRoles(...ADMIN_ROLES), disbursePayroll);
router.get('/payroll/runs/:id/bank-export', authorizeRoles(...ADMIN_ROLES), exportBankCsv);

router.get('/payroll/payslips/my-payslips', authorizeRoles(...ALL_STAFF_AND_TEACHERS), getMyPayslips);
router.get('/payroll/payslips/:id', authorizeRoles(...ALL_STAFF_AND_TEACHERS), getPayslipById);

// 11. REPORTS & KPIS
router.get('/reports/overview-kpis', authorizeRoles(...FINANCE_STAFF), getOverviewKPIs);
router.get('/reports/defaulters', authorizeRoles(...FINANCE_STAFF), getDefaultersReport);
router.get('/reports/income-vs-expense', authorizeRoles(...ADMIN_ROLES, 'Accountant'), getIncomeVsExpenseReport);
router.get('/reports/cashier-shift', authorizeRoles(...FINANCE_STAFF), getCashierShiftReport);

module.exports = router;
