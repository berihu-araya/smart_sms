/**
 * Validation routines for the Finance Module
 */

function isValidUUID(str) {
  if (!str || typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function validateFeeCategory(data) {
  const errors = [];
  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    errors.push('Category name is required');
  }
  if (!data.code || typeof data.code !== 'string' || !data.code.trim()) {
    errors.push('Category code is required');
  }
  return errors;
}

function validateFeeStructure(data) {
  const errors = [];
  if (!data.fee_category_id || !isValidUUID(data.fee_category_id)) {
    errors.push('A valid fee_category_id is required');
  }
  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    errors.push('Fee structure name is required');
  }
  if (data.amount === undefined || data.amount === null || isNaN(Number(data.amount)) || Number(data.amount) < 0) {
    errors.push('A non-negative amount is required');
  }
  if (data.frequency && !['ONE_TIME', 'MONTHLY', 'TERMWISE', 'ANNUAL'].includes(data.frequency)) {
    errors.push('Frequency must be ONE_TIME, MONTHLY, TERMWISE, or ANNUAL');
  }
  if (data.grade_id && !isValidUUID(data.grade_id)) {
    errors.push('grade_id must be a valid UUID if provided');
  }
  if (data.academic_year_id && !isValidUUID(data.academic_year_id)) {
    errors.push('academic_year_id must be a valid UUID if provided');
  }
  return errors;
}

function validateFeeDiscount(data) {
  const errors = [];
  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    errors.push('Discount name is required');
  }
  if (!data.code || typeof data.code !== 'string' || !data.code.trim()) {
    errors.push('Discount code is required');
  }
  if (!data.discount_type || !['PERCENTAGE', 'FIXED_AMOUNT'].includes(data.discount_type)) {
    errors.push('discount_type must be PERCENTAGE or FIXED_AMOUNT');
  }
  if (data.value === undefined || isNaN(Number(data.value)) || Number(data.value) <= 0) {
    errors.push('Discount value must be greater than zero');
  }
  if (data.discount_type === 'PERCENTAGE' && Number(data.value) > 100) {
    errors.push('Percentage discount value cannot exceed 100%');
  }
  return errors;
}

function validateCreateInvoice(data) {
  const errors = [];
  if (!data.student_id || !isValidUUID(data.student_id)) {
    errors.push('Valid student_id is required');
  }
  if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
    errors.push('Invoice title is required');
  }
  if (!data.due_date || isNaN(Date.parse(data.due_date))) {
    errors.push('Valid due_date is required');
  }
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    errors.push('At least one fee invoice item is required');
  } else {
    data.items.forEach((item, index) => {
      if (!item.fee_category_id || !isValidUUID(item.fee_category_id)) {
        errors.push(`Item ${index + 1}: Valid fee_category_id is required`);
      }
      if (!item.description || !item.description.trim()) {
        errors.push(`Item ${index + 1}: Description is required`);
      }
      if (item.base_amount === undefined || isNaN(Number(item.base_amount)) || Number(item.base_amount) < 0) {
        errors.push(`Item ${index + 1}: base_amount must be >= 0`);
      }
    });
  }
  return errors;
}

function validateBatchInvoice(data) {
  const errors = [];
  if (!data.academic_year_id || !isValidUUID(data.academic_year_id)) {
    errors.push('Valid academic_year_id is required');
  }
  if (data.grade_id && !isValidUUID(data.grade_id)) {
    errors.push('grade_id must be a valid UUID if provided');
  }
  if (data.section_id && !isValidUUID(data.section_id)) {
    errors.push('section_id must be a valid UUID if provided');
  }
  if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
    errors.push('Invoice title is required');
  }
  if (!data.due_date || isNaN(Date.parse(data.due_date))) {
    errors.push('Valid due_date is required');
  }
  return errors;
}

function validateRecordPayment(data) {
  const errors = [];
  if (!data.invoice_id || !isValidUUID(data.invoice_id)) {
    errors.push('Valid invoice_id is required');
  }
  if (data.amount === undefined || isNaN(Number(data.amount)) || Number(data.amount) <= 0) {
    errors.push('Payment amount must be greater than zero');
  }
  const allowedMethods = ['CASH', 'BANK_TRANSFER', 'BANK_SLIP', 'TELEBIRR', 'CBE_BIRR', 'CHECK', 'CARD', 'ONLINE'];
  if (!data.payment_method || !allowedMethods.includes(data.payment_method)) {
    errors.push(`payment_method must be one of: ${allowedMethods.join(', ')}`);
  }
  return errors;
}

function validateBankSlipSubmission(data) {
  const errors = [];
  if (!data.invoice_id || !isValidUUID(data.invoice_id)) {
    errors.push('Valid invoice_id is required');
  }
  if (!data.student_id || !isValidUUID(data.student_id)) {
    errors.push('Valid student_id is required');
  }
  if (!data.bank_name || !data.bank_name.trim()) {
    errors.push('Bank name is required');
  }
  if (!data.reference_number || !data.reference_number.trim()) {
    errors.push('Deposit transaction reference number is required');
  }
  if (data.amount === undefined || isNaN(Number(data.amount)) || Number(data.amount) <= 0) {
    errors.push('Deposit amount must be greater than zero');
  }
  if (!data.deposit_date || isNaN(Date.parse(data.deposit_date))) {
    errors.push('Valid deposit_date is required');
  }
  if (!data.slip_attachment_url || !data.slip_attachment_url.trim()) {
    errors.push('Bank slip image attachment is required');
  }
  return errors;
}

function validateExpense(data) {
  const errors = [];
  if (!data.expense_category_id || !isValidUUID(data.expense_category_id)) {
    errors.push('Valid expense_category_id is required');
  }
  if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
    errors.push('Expense title is required');
  }
  if (!data.payee || typeof data.payee !== 'string' || !data.payee.trim()) {
    errors.push('Payee name or vendor is required');
  }
  if (data.amount === undefined || isNaN(Number(data.amount)) || Number(data.amount) <= 0) {
    errors.push('Expense amount must be greater than zero');
  }
  return errors;
}

function validateIncome(data) {
  const errors = [];
  if (!data.income_category_id || !isValidUUID(data.income_category_id)) {
    errors.push('Valid income_category_id is required');
  }
  if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
    errors.push('Income title is required');
  }
  if (!data.payer || typeof data.payer !== 'string' || !data.payer.trim()) {
    errors.push('Payer or source name is required');
  }
  if (data.amount === undefined || isNaN(Number(data.amount)) || Number(data.amount) <= 0) {
    errors.push('Income amount must be greater than zero');
  }
  return errors;
}

function validateSalaryStructure(data) {
  const errors = [];
  if (!data.user_id || !isValidUUID(data.user_id)) {
    errors.push('Valid user_id is required');
  }
  if (data.base_salary === undefined || isNaN(Number(data.base_salary)) || Number(data.base_salary) < 0) {
    errors.push('base_salary must be a non-negative number');
  }
  return errors;
}

function validatePayrollRun(data) {
  const errors = [];
  if (!data.month || isNaN(Number(data.month)) || Number(data.month) < 1 || Number(data.month) > 12) {
    errors.push('Valid month (1-12) is required');
  }
  if (!data.year || isNaN(Number(data.year)) || Number(data.year) < 2000) {
    errors.push('Valid year is required');
  }
  return errors;
}

module.exports = {
  isValidUUID,
  validateFeeCategory,
  validateFeeStructure,
  validateFeeDiscount,
  validateCreateInvoice,
  validateBatchInvoice,
  validateRecordPayment,
  validateBankSlipSubmission,
  validateExpense,
  validateIncome,
  validateSalaryStructure,
  validatePayrollRun,
};
