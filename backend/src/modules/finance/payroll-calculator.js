/**
 * Ethiopian Payroll Calculation Engine
 * Implements statutory Ethiopian monthly PAYE tax brackets, pension deductions,
 * contract date proration, and configurable earning/deduction components.
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
  return Math.round((Number(val) + Number.EPSILON) * 100) / 100;
}

function round4(val) {
  return Math.round((Number(val) + Number.EPSILON) * 10000) / 10000;
}

/**
 * Returns the exact number of days in a given calendar month/year
 * @param {number} year - e.g. 2026
 * @param {number} month - 1 to 12
 * @returns {number} days count (e.g. 28, 29, 30, 31)
 */
function getDaysInMonth(year, month) {
  const y = Number(year);
  const m = Number(month);
  if (!y || !m || m < 1 || m > 12) return 30;
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/**
 * Formats a Date object or string to YYYY-MM-DD
 */
function formatDateToYYYYMMDD(date) {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Calculates contract eligibility and proration factor for a specific payroll period.
 * @param {string|Date} contractStartDate
 * @param {string|Date|null} contractEndDate
 * @param {number} year
 * @param {number} month
 * @returns {Object} proration details
 */
function calculateContractProration(contractStartDate, contractEndDate, year, month) {
  const totalDays = getDaysInMonth(year, month);
  const y = Number(year);
  const m = Number(month);

  const monthStart = new Date(Date.UTC(y, m - 1, 1));
  const monthEnd = new Date(Date.UTC(y, m - 1, totalDays));

  // If no contract start date provided, assume active full month
  if (!contractStartDate) {
    return {
      isEligible: true,
      workedDays: totalDays,
      totalDays,
      prorationFactor: 1.0,
      isProrated: false,
      contractStartDate: formatDateToYYYYMMDD(monthStart),
      contractEndDate: contractEndDate ? formatDateToYYYYMMDD(contractEndDate) : null,
      effectiveStartDate: formatDateToYYYYMMDD(monthStart),
      effectiveEndDate: formatDateToYYYYMMDD(monthEnd),
    };
  }

  const rawStart = new Date(contractStartDate);
  const start = new Date(Date.UTC(rawStart.getUTCFullYear(), rawStart.getUTCMonth(), rawStart.getUTCDate()));

  let end = null;
  if (contractEndDate) {
    const rawEnd = new Date(contractEndDate);
    if (!isNaN(rawEnd.getTime())) {
      end = new Date(Date.UTC(rawEnd.getUTCFullYear(), rawEnd.getUTCMonth(), rawEnd.getUTCDate()));
    }
  }

  // 1. Employee contract starts AFTER the payroll month ends -> NOT eligible
  if (start > monthEnd) {
    return {
      isEligible: false,
      workedDays: 0,
      totalDays,
      prorationFactor: 0.0,
      isProrated: false,
      contractStartDate: formatDateToYYYYMMDD(start),
      contractEndDate: end ? formatDateToYYYYMMDD(end) : null,
      reason: 'Contract starts after payroll period',
    };
  }

  // 2. Employee contract ended BEFORE the payroll month starts -> NOT eligible
  if (end && end < monthStart) {
    return {
      isEligible: false,
      workedDays: 0,
      totalDays,
      prorationFactor: 0.0,
      isProrated: false,
      contractStartDate: formatDateToYYYYMMDD(start),
      contractEndDate: formatDateToYYYYMMDD(end),
      reason: 'Contract ended before payroll period',
    };
  }

  // 3. Active in this month: determine effective worked range
  const effectiveStart = start > monthStart ? start : monthStart;
  const effectiveEnd = end && end < monthEnd ? end : monthEnd;

  const msPerDay = 1000 * 60 * 60 * 24;
  const workedDays = Math.max(0, Math.round((effectiveEnd.getTime() - effectiveStart.getTime()) / msPerDay) + 1);

  if (workedDays <= 0) {
    return {
      isEligible: false,
      workedDays: 0,
      totalDays,
      prorationFactor: 0.0,
      isProrated: false,
      contractStartDate: formatDateToYYYYMMDD(start),
      contractEndDate: end ? formatDateToYYYYMMDD(end) : null,
      reason: 'Zero active days in period',
    };
  }

  if (workedDays >= totalDays) {
    return {
      isEligible: true,
      workedDays: totalDays,
      totalDays,
      prorationFactor: 1.0,
      isProrated: false,
      contractStartDate: formatDateToYYYYMMDD(start),
      contractEndDate: end ? formatDateToYYYYMMDD(end) : null,
      effectiveStartDate: formatDateToYYYYMMDD(effectiveStart),
      effectiveEndDate: formatDateToYYYYMMDD(effectiveEnd),
    };
  }

  const prorationFactor = round4(workedDays / totalDays);

  return {
    isEligible: true,
    workedDays,
    totalDays,
    prorationFactor,
    isProrated: true,
    contractStartDate: formatDateToYYYYMMDD(start),
    contractEndDate: end ? formatDateToYYYYMMDD(end) : null,
    effectiveStartDate: formatDateToYYYYMMDD(effectiveStart),
    effectiveEndDate: formatDateToYYYYMMDD(effectiveEnd),
  };
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
 * Calculates full monthly employee compensation, deductions, taxes, and net salary,
 * supporting contract-based mid-month proration.
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
  contractStartDate = null,
  contractEndDate = null,
  contractType = 'PERMANENT',
  workedDays = null,
  totalDaysInMonth = null,
  prorationFactor = null,
  isProrated = null,
} = {}) {
  const rawBasic = round2(Math.max(0, Number(basicSalary) || 0));
  const rawTransport = round2(Math.max(0, Number(transportAllowance) || 0));
  const rawProfessional = round2(Math.max(0, Number(professionalAllowance) || 0));
  const rawHousing = round2(Math.max(0, Number(housingAllowance) || 0));
  const rawMedical = round2(Math.max(0, Number(medicalAllowance) || 0));
  const rawOther = round2(Math.max(0, Number(otherAllowances) || 0));

  // Determine proration factor
  let factor = 1.0;
  let hasProration = false;
  let finalWorkedDays = totalDaysInMonth || 30;
  let finalTotalDays = totalDaysInMonth || 30;

  if (prorationFactor !== null && prorationFactor !== undefined) {
    factor = Math.max(0, Math.min(1.0, Number(prorationFactor)));
    hasProration = factor < 1.0 || isProrated === true;
    finalWorkedDays = workedDays !== null ? Number(workedDays) : Math.round(factor * finalTotalDays);
  } else if (workedDays !== null && totalDaysInMonth !== null && Number(totalDaysInMonth) > 0) {
    finalWorkedDays = Number(workedDays);
    finalTotalDays = Number(totalDaysInMonth);
    if (finalWorkedDays < finalTotalDays) {
      factor = round4(finalWorkedDays / finalTotalDays);
      hasProration = true;
    }
  }

  // Calculate unprorated gross for audit/records
  let unproratedCustomAllowancesSum = 0;
  if (Array.isArray(customEarnings)) {
    for (const earn of customEarnings) {
      const amt = round2(Number(earn.amount) || 0);
      if (amt > 0 && earn.included_in_gross !== false) {
        unproratedCustomAllowancesSum += amt;
      }
    }
  }
  const unproratedTotalAllowances = round2(rawTransport + rawProfessional + rawHousing + rawMedical + rawOther + unproratedCustomAllowancesSum);
  const unproratedGrossSalary = round2(rawBasic + unproratedTotalAllowances);

  // Apply proration factor to basic salary and allowances
  const basic = hasProration ? round2(rawBasic * factor) : rawBasic;
  const transport = hasProration ? round2(rawTransport * factor) : rawTransport;
  const professional = hasProration ? round2(rawProfessional * factor) : rawProfessional;
  const housing = hasProration ? round2(rawHousing * factor) : rawHousing;
  const medical = hasProration ? round2(rawMedical * factor) : rawMedical;
  const other = hasProration ? round2(rawOther * factor) : rawOther;

  // Transport tax exemption (also scaled by proration factor if prorated)
  const baseExemptionLimit = Number(transportExemptionLimit) >= 0 ? Number(transportExemptionLimit) : DEFAULT_TRANSPORT_EXEMPTION;
  const effectiveExemptionLimit = hasProration ? round2(baseExemptionLimit * factor) : baseExemptionLimit;
  const transportExemption = round2(Math.min(transport, effectiveExemptionLimit));
  const taxableTransport = round2(Math.max(0, transport - transportExemption));

  // Parse custom earnings
  let customAllowancesSum = 0;
  let customTaxableSum = 0;
  let customPensionableSum = 0;
  const normalizedEarnings = [];

  if (Array.isArray(customEarnings)) {
    for (const earn of customEarnings) {
      const fullAmt = round2(Number(earn.amount) || 0);
      if (fullAmt > 0) {
        const amt = hasProration ? round2(fullAmt * factor) : fullAmt;
        const isIncludedInGross = earn.included_in_gross !== false;
        const isTaxable = earn.is_taxable !== false;
        const isPensionable = earn.is_pensionable === true;

        if (isIncludedInGross) customAllowancesSum += amt;
        if (isTaxable) customTaxableSum += amt;
        if (isPensionable) customPensionableSum += amt;

        normalizedEarnings.push({
          name: earn.name || 'Custom Allowance',
          fullAmount: fullAmt,
          amount: amt,
          is_taxable: isTaxable,
          is_pensionable: isPensionable,
          included_in_gross: isIncludedInGross,
          is_prorated: hasProration,
        });
      }
    }
  }

  // Parse custom deductions
  let customDeductionsSum = 0;
  const normalizedDeductions = [];

  if (Array.isArray(customDeductions)) {
    for (const ded of customDeductions) {
      const fullAmt = round2(Number(ded.amount) || 0);
      if (fullAmt > 0) {
        const amt = (hasProration && ded.is_fixed !== true) ? round2(fullAmt * factor) : fullAmt;
        customDeductionsSum += amt;
        normalizedDeductions.push({
          name: ded.name || 'Custom Deduction',
          fullAmount: fullAmt,
          amount: amt,
          is_prorated: hasProration && ded.is_fixed !== true,
        });
      }
    }
  }

  const standardAllowances = round2(transport + professional + housing + medical + other);
  const totalAllowances = round2(standardAllowances + customAllowancesSum);
  const grossSalary = round2(basic + totalAllowances);

  // Pensionable Base (Default is Basic Salary + configured pensionable allowances)
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

  // Net Take-home Salary
  const netSalary = round2(Math.max(0, grossSalary - totalDeductions));

  // Build itemized breakdown lines for payslips and UI
  const itemizedAllowances = [];
  if (housing > 0) {
    itemizedAllowances.push({
      name: hasProration ? `Housing Allowance (Prorated ${finalWorkedDays}/${finalTotalDays}d)` : 'Housing Allowance',
      amount: housing,
      fullAmount: rawHousing,
      type: 'ALLOWANCE',
    });
  }
  if (transport > 0) {
    itemizedAllowances.push({
      name: hasProration ? `Transport Allowance (Prorated ${finalWorkedDays}/${finalTotalDays}d)` : 'Transport Allowance',
      amount: transport,
      fullAmount: rawTransport,
      exemption: transportExemption,
      type: 'ALLOWANCE',
    });
  }
  if (professional > 0) {
    itemizedAllowances.push({
      name: hasProration ? `Professional Allowance (Prorated ${finalWorkedDays}/${finalTotalDays}d)` : 'Professional Allowance',
      amount: professional,
      fullAmount: rawProfessional,
      type: 'ALLOWANCE',
    });
  }
  if (medical > 0) {
    itemizedAllowances.push({
      name: hasProration ? `Medical Allowance (Prorated ${finalWorkedDays}/${finalTotalDays}d)` : 'Medical Allowance',
      amount: medical,
      fullAmount: rawMedical,
      type: 'ALLOWANCE',
    });
  }
  if (other > 0) {
    itemizedAllowances.push({
      name: hasProration ? `Other Allowances (Prorated ${finalWorkedDays}/${finalTotalDays}d)` : 'Other Allowances',
      amount: other,
      fullAmount: rawOther,
      type: 'ALLOWANCE',
    });
  }
  for (const ce of normalizedEarnings) {
    itemizedAllowances.push({
      name: hasProration ? `${ce.name} (Prorated ${finalWorkedDays}/${finalTotalDays}d)` : ce.name,
      amount: ce.amount,
      fullAmount: ce.fullAmount,
      type: 'ALLOWANCE',
    });
  }

  const itemizedDeductions = [
    {
      name: `Employee Pension (${empRate}%)`,
      amount: pensionEmployee,
      type: 'DEDUCTION',
    },
    {
      name: 'Employment Income Tax (PAYE)',
      amount: payeTax,
      type: 'DEDUCTION',
    },
  ];
  for (const cd of normalizedDeductions) {
    itemizedDeductions.push({
      name: cd.name,
      amount: cd.amount,
      fullAmount: cd.fullAmount,
      type: 'DEDUCTION',
    });
  }

  return {
    contractType: contractType || 'PERMANENT',
    contractStartDate: formatDateToYYYYMMDD(contractStartDate),
    contractEndDate: formatDateToYYYYMMDD(contractEndDate),
    workedDays: finalWorkedDays,
    totalDaysInMonth: finalTotalDays,
    prorationFactor: factor,
    isProrated: hasProration,
    unproratedBaseSalary: rawBasic,
    unproratedTotalAllowances,
    unproratedGrossSalary,
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
  getDaysInMonth,
  calculateContractProration,
  calculateProgressivePAYE,
  calculateEmployeeSalary,
  round2,
  round4,
};
