/**
 * Ethiopian Payroll Calculation Engine
 * Implements statutory Ethiopian monthly PAYE tax brackets, pension deductions, and configurable earning components.
 */

const DEFAULT_TAX_BRACKETS = [
  { min: 0, max: 2000, rate: 0.00, offset: 0.00 },
  { min: 2000, max: 4000, rate: 0.15, offset: 300.00 },
  { min: 4000, max: 7000, rate: 0.20, offset: 500.00 },
  { min: 7000, max: 10000, rate: 0.25, offset: 850.00 },
  { min: 10000, max: 14000, rate: 0.30, offset: 1350.00 },
  { min: 14000, max: null, rate: 0.35, offset: 2050.00 },
];

const DEFAULT_TRANSPORT_EXEMPTION = 600.00;
const DEFAULT_PENSION_EMPLOYEE_RATE = 7.00;
const DEFAULT_PENSION_EMPLOYER_RATE = 11.00;

function round2(val) {
  return Math.round((Number(val) + Number.EPSILON) * 100) / 100; // the purpose of adding Number.EPSILON is to avoid floating point rounding errors and round to 2 decimal places.
}

/**
 * Calculates Ethiopian Progressive Monthly PAYE Tax
 * @param {number} taxableIncome - Monthly taxable earnings in ETB
 * @param {Array} brackets - Configurable tax brackets
 * @returns {number} PAYE income tax amount rounded to 2 decimal places
 */
function calculateProgressivePAYE(taxableIncome, brackets = DEFAULT_TAX_BRACKETS) {
  const taxable = round2(Math.max(0, Number(taxableIncome) || 0));
  if (taxable <= 2000) return 0.00;

  const rawList = brackets && Array.isArray(brackets) && brackets.length > 0 ? brackets : DEFAULT_TAX_BRACKETS;
  const sorted = rawList
    .map((b) => ({
      min: Number(b.min) || 0,
      max: b.max !== null && b.max !== undefined ? Number(b.max) : Infinity,
      rate: Number(b.rate) || 0,
      offset: b.offset !== null && b.offset !== undefined ? Number(b.offset) : null,
    }))
    .sort((a, b) => a.min - b.min);

  // If offset formula is present for the matching bracket
  const matched = sorted.find((b) => taxable > b.min && taxable <= b.max);
  if (matched && matched.offset !== null) {
    return round2(taxable * matched.rate - matched.offset);
  }

  // Progressive slab integration fallback
  let totalTax = 0;
  for (const b of sorted) {
    if (taxable <= b.min) break;
    const slab = Math.min(taxable, b.max) - b.min;
    if (slab > 0 && b.rate > 0) {
      totalTax += slab * b.rate;
    }
  }

  return round2(totalTax);
}

/**
 * Calculates full monthly employee compensation, deductions, taxes, and net salary.
 * @param {Object} params
 * @returns {Object} itemized breakdown
 */
function calculateEmployeeSalary({
  basicSalary = 0,
  transportAllowance = 0,
  professionalAllowance = 0,
  housingAllowance = 0,
  medicalAllowance = 0,
  otherAllowances = 0,
  customEarnings = [],
  customDeductions = [],
  transportExemptionLimit = DEFAULT_TRANSPORT_EXEMPTION,
  pensionEmployeeRate = DEFAULT_PENSION_EMPLOYEE_RATE,
  pensionEmployerRate = DEFAULT_PENSION_EMPLOYER_RATE,
  taxBrackets = DEFAULT_TAX_BRACKETS,
} = {}) {
  const basic = round2(Math.max(0, Number(basicSalary) || 0));
  const transport = round2(Math.max(0, Number(transportAllowance) || 0));
  const professional = round2(Math.max(0, Number(professionalAllowance) || 0));
  const housing = round2(Math.max(0, Number(housingAllowance) || 0));
  const medical = round2(Math.max(0, Number(medicalAllowance) || 0));
  const other = round2(Math.max(0, Number(otherAllowances) || 0));

  // Configurable transport tax exemption
  const exemptionLimit = Number(transportExemptionLimit) >= 0 ? Number(transportExemptionLimit) : DEFAULT_TRANSPORT_EXEMPTION;
  const transportExemption = round2(Math.min(transport, exemptionLimit));
  const taxableTransport = round2(Math.max(0, transport - transportExemption));

  // Parse custom earnings
  let customAllowancesSum = 0;
  let customTaxableSum = 0;
  let customPensionableSum = 0;
  const normalizedEarnings = [];

  if (Array.isArray(customEarnings)) {
    for (const earn of customEarnings) {
      const amt = round2(Number(earn.amount) || 0);
      if (amt > 0) {
        const isIncludedInGross = earn.included_in_gross !== false;
        const isTaxable = earn.is_taxable !== false;
        const isPensionable = earn.is_pensionable === true;

        if (isIncludedInGross) customAllowancesSum += amt;
        if (isTaxable) customTaxableSum += amt;
        if (isPensionable) customPensionableSum += amt;

        normalizedEarnings.push({
          name: earn.name || 'Custom Allowance',
          amount: amt,
          is_taxable: isTaxable,
          is_pensionable: isPensionable,
          included_in_gross: isIncludedInGross,
        });
      }
    }
  }

  // Parse custom deductions
  let customDeductionsSum = 0;
  const normalizedDeductions = [];

  if (Array.isArray(customDeductions)) {
    for (const ded of customDeductions) {
      const amt = round2(Number(ded.amount) || 0);
      if (amt > 0) {
        customDeductionsSum += amt;
        normalizedDeductions.push({
          name: ded.name || 'Custom Deduction',
          amount: amt,
        });
      }
    }
  }

  const standardAllowances = round2(transport + professional + housing + medical + other);
  const totalAllowances = round2(standardAllowances + customAllowancesSum);
  const grossSalary = round2(basic + totalAllowances);

  // Pensionable Base (Default is Basic Salary + any configured pensionable allowances)
  const pensionableBase = round2(basic + customPensionableSum);
  const empRate = Number(pensionEmployeeRate) >= 0 ? Number(pensionEmployeeRate) : DEFAULT_PENSION_EMPLOYEE_RATE;
  const emplrRate = Number(pensionEmployerRate) >= 0 ? Number(pensionEmployerRate) : DEFAULT_PENSION_EMPLOYER_RATE;

  const pensionEmployee = round2((pensionableBase * empRate) / 100);
  const pensionEmployer = round2((pensionableBase * emplrRate) / 100);

  // Taxable Income = Basic + Taxable Transport + Professional + Housing + Medical + Other + Custom Taxable
  const taxableIncome = round2(
    basic + taxableTransport + professional + housing + medical + other + customTaxableSum
  );

  // PAYE Income Tax
  const payeTax = calculateProgressivePAYE(taxableIncome, taxBrackets);

  // Total Deductions
  const otherDeductions = round2(customDeductionsSum);
  const totalDeductions = round2(pensionEmployee + payeTax + otherDeductions);

  // Net Take-home Salary (Employer pension is paid by employer and does NOT reduce employee net salary)
  const netSalary = round2(Math.max(0, grossSalary - totalDeductions));

  // Build itemized breakdown lines for payslips and UI
  const itemizedAllowances = [];
  if (housing > 0) itemizedAllowances.push({ name: 'Housing Allowance', amount: housing, type: 'ALLOWANCE' });
  if (transport > 0) itemizedAllowances.push({ name: 'Transport Allowance', amount: transport, exemption: transportExemption, type: 'ALLOWANCE' });
  if (professional > 0) itemizedAllowances.push({ name: 'Professional Allowance', amount: professional, type: 'ALLOWANCE' });
  if (medical > 0) itemizedAllowances.push({ name: 'Medical Allowance', amount: medical, type: 'ALLOWANCE' });
  if (other > 0) itemizedAllowances.push({ name: 'Other Allowances', amount: other, type: 'ALLOWANCE' });
  for (const ce of normalizedEarnings) {
    itemizedAllowances.push({ name: ce.name, amount: ce.amount, type: 'ALLOWANCE' });
  }

  const itemizedDeductions = [
    { name: `Employee Pension (${empRate}%)`, amount: pensionEmployee, type: 'DEDUCTION' },
    { name: 'Employment Income Tax (PAYE)', amount: payeTax, type: 'DEDUCTION' },
  ];
  for (const cd of normalizedDeductions) {
    itemizedDeductions.push({ name: cd.name, amount: cd.amount, type: 'DEDUCTION' });
  }

  return {
    basicSalary: basic,
    transportAllowance: transport,
    transportExemption,
    taxableTransport,
    professionalAllowance: professional,
    housingAllowance: housing,
    medicalAllowance: medical,
    otherAllowances: other,
    customEarnings: normalizedEarnings,
    customDeductions: normalizedDeductions,
    totalAllowances,
    grossSalary,
    pensionableBase,
    pensionEmployeeRate: empRate,
    pensionEmployerRate: emplrRate,
    pensionEmployee,
    pensionEmployer,
    taxableIncome,
    payeTax,
    otherDeductions,
    totalDeductions,
    netSalary,
    itemizedAllowances,
    itemizedDeductions,
  };
}

module.exports = {
  DEFAULT_TAX_BRACKETS,
  DEFAULT_TRANSPORT_EXEMPTION,
  DEFAULT_PENSION_EMPLOYEE_RATE,
  DEFAULT_PENSION_EMPLOYER_RATE,
  calculateProgressivePAYE,
  calculateEmployeeSalary,
  round2,
};
