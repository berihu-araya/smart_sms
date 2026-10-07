'use client';

import React, { useState, useEffect, useCallback, useMemo, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import styles from './page.module.css';
import { useAuth } from '@/hooks/useAuth';
import * as financeApi from '@/services/financeService';
import { listUsers } from '@/services/userService';
import {
  FaWallet,
  FaPlus,
  FaMoneyBillWave,
  FaFileInvoiceDollar,
  FaUsers,
  FaCalendarAlt,
  FaCheck,
  FaTimes,
  FaPrint,
  FaDownload,
  FaTrash,
  FaSearch,
  FaCalculator,
  FaFileContract,
} from 'react-icons/fa';
import { HiOutlineArrowPath } from 'react-icons/hi2';

function subscribeToClient() {
  return () => { };
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

const PAYROLL_STATUS_DETAILS = {
  DRAFT: { label: 'Draft', style: 'statusDraft', nextStatus: 'CALCULATED', action: 'Calculate' },
  CALCULATED: { label: 'Calculated', style: 'statusCalculated', nextStatus: 'REVIEWED', action: 'Mark reviewed' },
  REVIEWED: { label: 'Reviewed', style: 'statusReviewed', nextStatus: 'APPROVED', action: 'Approve' },
  APPROVED: { label: 'Approved', style: 'statusApproved', nextStatus: 'PAID', action: 'Mark paid' },
  PAID: { label: 'Paid', style: 'statusPaid', nextStatus: 'DONE', action: 'Close period' },
  DONE: { label: 'Done', style: 'statusClosed', action: 'Closed' },
};

function normalizePayrollStatus(status) {
  if (status === 'PROCESSED') return 'CALCULATED';
  if (status === 'DISBURSED') return 'PAID';
  return status;
}

function ModalPortal({ isOpen, onClose, children }) {
  const mounted = useSyncExternalStore(subscribeToClient, getClientSnapshot, getServerSnapshot);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className={styles.modalOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      {children}
    </div>,
    document.body
  );
}

/**
 * Returns total days in a given calendar month
 */
function getDaysInMonth(year, month) {
  const y = Number(year);
  const m = Number(month);
  if (!y || !m || m < 1 || m > 12) return 30;
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/**
 * Calculates contract eligibility and proration factor for a given month and year
 */
function calculateContractProration(contractStartDate, contractEndDate, year, month) {
  const totalDays = getDaysInMonth(year, month);
  const y = Number(year);
  const m = Number(month);

  const monthStart = new Date(Date.UTC(y, m - 1, 1));
  const monthEnd = new Date(Date.UTC(y, m - 1, totalDays));

  if (!contractStartDate) {
    return {
      isEligible: true,
      workedDays: totalDays,
      totalDays,
      prorationFactor: 1.0,
      isProrated: false,
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

  if (start > monthEnd) {
    return {
      isEligible: false,
      workedDays: 0,
      totalDays,
      prorationFactor: 0.0,
      isProrated: false,
      reason: 'Contract starts after period',
    };
  }

  if (end && end < monthStart) {
    return {
      isEligible: false,
      workedDays: 0,
      totalDays,
      prorationFactor: 0.0,
      isProrated: false,
      reason: 'Contract ended before period',
    };
  }

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
    };
  }

  if (workedDays >= totalDays) {
    return {
      isEligible: true,
      workedDays: totalDays,
      totalDays,
      prorationFactor: 1.0,
      isProrated: false,
    };
  }

  const factor = Math.round((workedDays / totalDays) * 10000) / 10000;
  return {
    isEligible: true,
    workedDays,
    totalDays,
    prorationFactor: factor,
    isProrated: true,
  };
}

/**
 * Statutory Ethiopian Monthly PAYE progressive tax calculation
 */
function calculateProgressivePAYE(taxableIncome) {
  const taxable = Math.max(0, Number(taxableIncome) || 0);
  if (taxable <= 2000) return 0.00;
  if (taxable <= 4000) return Math.round(((taxable * 0.15) - 300.00) * 100) / 100;
  if (taxable <= 7000) return Math.round(((taxable * 0.20) - 500.00) * 100) / 100;
  if (taxable <= 10000) return Math.round(((taxable * 0.25) - 850.00) * 100) / 100;
  if (taxable <= 14000) return Math.round(((taxable * 0.30) - 1350.00) * 100) / 100;
  return Math.round(((taxable * 0.35) - 2050.00) * 100) / 100;
}

/**
 * Computes full Ethiopian salary breakdown with contract proration support
 */
function computeSalaryBreakdown({
  baseSalary = 0,
  transportAllowance = 0,
  professionalAllowance = 0,
  housingAllowance = 0,
  medicalAllowance = 0,
  otherAllowances = 0,
  pensionEmployeeRate = 7.0,
  pensionEmployerRate = 11.0,
  transportExemptionLimit = 600.0,
  workedDays = null,
  totalDaysInMonth = null,
  prorationFactor = null,
}) {
  const rawBase = Math.max(0, Number(baseSalary) || 0);
  const rawTransport = Math.max(0, Number(transportAllowance) || 0);
  const rawProfessional = Math.max(0, Number(professionalAllowance) || 0);
  const rawHousing = Math.max(0, Number(housingAllowance) || 0);
  const rawMedical = Math.max(0, Number(medicalAllowance) || 0);
  const rawOther = Math.max(0, Number(otherAllowances) || 0);

  let factor = 1.0;
  let hasProration = false;
  let finalWorkedDays = totalDaysInMonth || 30;
  let finalTotalDays = totalDaysInMonth || 30;

  if (prorationFactor !== null && prorationFactor !== undefined) {
    factor = Math.max(0, Math.min(1.0, Number(prorationFactor)));
    hasProration = factor < 1.0;
    finalWorkedDays = workedDays !== null ? Number(workedDays) : Math.round(factor * finalTotalDays);
  } else if (workedDays !== null && totalDaysInMonth !== null && Number(totalDaysInMonth) > 0) {
    finalWorkedDays = Number(workedDays);
    finalTotalDays = Number(totalDaysInMonth);
    if (finalWorkedDays < finalTotalDays) {
      factor = finalWorkedDays / finalTotalDays;
      hasProration = true;
    }
  }

  const base = hasProration ? Math.round(rawBase * factor * 100) / 100 : rawBase;
  const transport = hasProration ? Math.round(rawTransport * factor * 100) / 100 : rawTransport;
  const professional = hasProration ? Math.round(rawProfessional * factor * 100) / 100 : rawProfessional;
  const housing = hasProration ? Math.round(rawHousing * factor * 100) / 100 : rawHousing;
  const medical = hasProration ? Math.round(rawMedical * factor * 100) / 100 : rawMedical;
  const other = hasProration ? Math.round(rawOther * factor * 100) / 100 : rawOther;

  const effectiveExemptionLimit = hasProration ? Math.round(transportExemptionLimit * factor * 100) / 100 : transportExemptionLimit;
  const transportExemption = Math.min(transport, effectiveExemptionLimit);
  const taxableTransport = Math.max(0, transport - transportExemption);

  const totalAllowances = Math.round((transport + professional + housing + medical + other) * 100) / 100;
  const grossSalary = Math.round((base + totalAllowances) * 100) / 100;

  const unproratedGross = Math.round((rawBase + rawTransport + rawProfessional + rawHousing + rawMedical + rawOther) * 100) / 100;

  const taxableIncome = Math.round((base + taxableTransport + professional + housing + medical + other) * 100) / 100;

  const payeTax = calculateProgressivePAYE(taxableIncome);
  const pensionEmployee = Math.round(((base * Number(pensionEmployeeRate)) / 100) * 100) / 100;
  const pensionEmployer = Math.round(((base * Number(pensionEmployerRate)) / 100) * 100) / 100;

  const totalDeductions = Math.round((payeTax + pensionEmployee) * 100) / 100;
  const netSalary = Math.max(0, Math.round((grossSalary - totalDeductions) * 100) / 100);

  return {
    base,
    unproratedBase: rawBase,
    unproratedGross,
    transport,
    transportExemption,
    taxableTransport,
    professional,
    housing,
    medical,
    other,
    totalAllowances,
    grossSalary,
    taxableIncome,
    payeTax,
    pensionEmployee,
    pensionEmployer,
    totalDeductions,
    netSalary,
    isProrated: hasProration,
    workedDays: finalWorkedDays,
    totalDays: finalTotalDays,
    prorationFactor: factor,
  };
}

function createEmptyStructureForm() {
  const today = new Date().toISOString().split('T')[0];
  return {
    user_id: '',
    contract_type: 'PERMANENT',
    contract_start_date: today,
    contract_end_date: '',
    employment_type: 'FULL_TIME',
    base_salary: '',
    housing_allowance: 0,
    transport_allowance: 0,
    professional_allowance: 0,
    medical_allowance: 0,
    other_allowances: 0,
    tax_rate_percentage: 0,
    pension_employee_percentage: 7.0,
    pension_employer_percentage: 11.0,
    bank_name: 'Commercial Bank of Ethiopia (CBE)',
    bank_account_number: '',
    bank_account_name: '',
  };
}

export default function PayrollPage() {
  const { user } = useAuth();
  const userRole = (user?.role || '').toLowerCase();
  const isTeacherOrStaff = userRole === 'teacher' || userRole === 'staff';
  const canManageSalaryStructures = userRole === 'school admin' || userRole === 'admin';
  const canReviewPayroll = canManageSalaryStructures || userRole === 'accountant';

  const [activeTab, setActiveTab] = useState(isTeacherOrStaff ? 'my_payslips' : 'runs');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [payrollRuns, setPayrollRuns] = useState([]);
  const [salaryStructures, setSalaryStructures] = useState([]);
  const [myPayslips, setMyPayslips] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);

  // Modals
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);
  const [isEditingStructure, setIsEditingStructure] = useState(false);
  const [editingStructureId, setEditingStructureId] = useState(null);
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);
  const [isRunBreakdownModalOpen, setIsRunBreakdownModalOpen] = useState(false);
  const [selectedRunDetails, setSelectedRunDetails] = useState(null);
  const [breakdownSearch, setBreakdownSearch] = useState('');
  const [activePayslip, setActivePayslip] = useState(null);

  // Forms
  const [processForm, setProcessForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    remarks: 'Monthly automated staff salary computation',
  });

  const [structureForm, setStructureForm] = useState(createEmptyStructureForm);

  // Dynamic live calculation for the salary structure form
  const structurePreview = useMemo(() => {
    return computeSalaryBreakdown({
      baseSalary: structureForm.base_salary,
      transportAllowance: structureForm.transport_allowance,
      professionalAllowance: structureForm.professional_allowance,
      housingAllowance: structureForm.housing_allowance,
      medicalAllowance: structureForm.medical_allowance,
      otherAllowances: structureForm.other_allowances,
      pensionEmployeeRate: structureForm.pension_employee_percentage,
      pensionEmployerRate: structureForm.pension_employer_percentage,
      transportExemptionLimit: 600.00,
    });
  }, [
    structureForm.base_salary,
    structureForm.transport_allowance,
    structureForm.professional_allowance,
    structureForm.housing_allowance,
    structureForm.medical_allowance,
    structureForm.other_allowances,
    structureForm.pension_employee_percentage,
    structureForm.pension_employer_percentage,
  ]);

  const loadRuns = useCallback(async () => {
    try {
      setLoading(true);
      const res = await financeApi.listPayrollRuns();
      setPayrollRuns(res.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStructures = useCallback(async () => {
    try {
      setLoading(true);
      const res = await financeApi.listSalaryStructures();
      setSalaryStructures(res.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMyPayslips = useCallback(async () => {
    try {
      setLoading(true);
      const res = await financeApi.getMyPayslips();
      setMyPayslips(res.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function loadStaff() {
      try {
        const res = await listUsers({ limit: 200 }).catch(() => []);
        const list = Array.isArray(res)
          ? res
          : Array.isArray(res?.items)
            ? res.items
            : Array.isArray(res?.data)
              ? res.data
              : Array.isArray(res?.data?.items)
                ? res.data.items
                : [];
        setStaffUsers(list);
      } catch (err) {
        console.error(err);
      }
    }
    loadStaff();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadActiveTab() {
      await Promise.resolve();
      if (cancelled) return;
      if (activeTab === 'runs') await loadRuns();
      if (activeTab === 'structures') await loadStructures();
      if (activeTab === 'my_payslips') await loadMyPayslips();
    }

    loadActiveTab();
    return () => {
      cancelled = true;
    };
  }, [activeTab, loadRuns, loadStructures, loadMyPayslips]);

  const handleProcessPayroll = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const res = await financeApi.createPayrollDraft(processForm);
      setSuccessMsg(`Payroll draft ${res.data.batchReference} created. Review the staff contract proration, then calculate.`);
      setIsProcessModalOpen(false);
      await loadRuns();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdvancePayroll = async (run) => {
    const status = normalizePayrollStatus(run.status);
    const statusDetails = PAYROLL_STATUS_DETAILS[status];
    if (!statusDetails?.nextStatus) return;

    const confirmations = {
      CALCULATED: 'Calculate this draft using active contracts & prorated dates for the selected period?',
      APPROVED: 'Approve this reviewed payroll? Approved payroll results will be locked from further changes.',
      PAID: 'Record this payroll as paid and release official employee payslips?',
      DONE: 'Close this paid payroll period? A closed period cannot be reopened through normal operations.',
    };
    const confirmation = confirmations[statusDetails.nextStatus];
    if (confirmation && !window.confirm(confirmation)) return;

    try {
      setLoading(true);
      setError(null);
      if (status === 'DRAFT') {
        await financeApi.calculatePayrollRun(run.id);
      } else {
        await financeApi.transitionPayrollRun(run.id, statusDetails.nextStatus);
      }
      setSuccessMsg(`Payroll ${run.batch_reference} moved to ${statusDetails.nextStatus}.`);
      await loadRuns();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStructure = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const structureData = {
        ...structureForm,
        base_salary: Number(structureForm.base_salary),
        housing_allowance: Number(structureForm.housing_allowance) || 0,
        transport_allowance: Number(structureForm.transport_allowance) || 0,
        professional_allowance: Number(structureForm.professional_allowance) || 0,
        medical_allowance: Number(structureForm.medical_allowance) || 0,
        other_allowances: Number(structureForm.other_allowances) || 0,
        contract_type: structureForm.contract_type || 'PERMANENT',
        contract_start_date: structureForm.contract_start_date || new Date().toISOString().split('T')[0],
        contract_end_date: structureForm.contract_end_date || null,
        employment_type: structureForm.employment_type || 'FULL_TIME',
      };
      if (isEditingStructure) {
        if (!editingStructureId) {
          throw new Error('Cannot update salary structure because its record ID is missing. Close the form and select Edit again.');
        }
        await financeApi.updateSalaryStructure(editingStructureId, structureData);
      } else {
        await financeApi.upsertSalaryStructure(structureData);
      }
      setSuccessMsg(isEditingStructure ? 'Staff contract & salary structure updated successfully!' : 'Staff contract & salary structure created successfully!');
      setIsStructureModalOpen(false);
      await loadStructures();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSalaryStructure = async (structure) => {
    const employeeName = `${structure.first_name} ${structure.last_name}`.trim();
    if (!window.confirm(`Delete the contract & salary structure for ${employeeName}? Existing payroll records will be kept.`)) return;

    try {
      setLoading(true);
      setError(null);
      await financeApi.deleteSalaryStructure(structure.id);
      setSalaryStructures((current) => current.filter((item) => item.id !== structure.id));
      setSuccessMsg(`Contract for ${employeeName} deleted successfully.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPayslipModal = async (payslipId) => {
    try {
      setLoading(true);
      const res = await financeApi.getPayslipById(payslipId);
      setActivePayslip(res.data);
      setIsPayslipModalOpen(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRunBreakdown = async (runId) => {
    try {
      setLoading(true);
      const res = await financeApi.getPayrollRunById(runId);
      setSelectedRunDetails(res.data);
      setBreakdownSearch('');
      setIsRunBreakdownModalOpen(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBankCsv = async (runId) => {
    try {
      setError(null);
      await financeApi.downloadPayrollBankCsv(runId);
    } catch (err) {
      setError(err.message);
    }
  };

  const totalPaidPayroll = payrollRuns
    .filter((r) => ['PAID', 'DONE', 'DISBURSED'].includes(r.status))
    .reduce((sum, r) => sum + Number(r.total_net_amount), 0);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <span className={styles.eyebrow}>PAYROLL &amp; CONTRACT MANAGEMENT</span>
          <h1 className={styles.title}>
            <span className={styles.titleIcon}><FaWallet /></span>
            Payroll &amp; Employee Contracts
          </h1>
          <div className={styles.subtitle}>
            Manage staff contracts, contract start &amp; end dates, mid-month proration, statutory deductions, and payslips.
          </div>
        </div>

        <div className={styles.headerActions}>
          {canManageSalaryStructures && (
            <>
              <button
                className={styles.btnSecondary}
                onClick={() => {
                  setIsEditingStructure(false);
                  setEditingStructureId(null);
                  setStructureForm(createEmptyStructureForm());
                  setIsStructureModalOpen(true);
                }}
              >
                <FaPlus /> Contracts
              </button>
              <button className={styles.btnPrimary} onClick={() => setIsProcessModalOpen(true)}>
                <FaWallet /> Process Payroll
              </button>
            </>
          )}
          <button
            className={styles.btnSecondary}
            onClick={() => {
              if (activeTab === 'my_payslips') loadMyPayslips();
              else if (activeTab === 'structures') loadStructures();
              else loadRuns();
            }}
            disabled={loading}
          >
            <HiOutlineArrowPath /> Refresh
          </button>
        </div>
      </div>

      {successMsg && (
        <div className={styles.successMessage} role="status">
          {successMsg}
        </div>
      )}
      {error && (
        <div className={styles.errorMessage} role="alert">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      {!isTeacherOrStaff && (
        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon} style={{ background: '#f5f3ff', color: '#7c3aed' }}>
              <FaUsers />
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Active Contracts</span>
              <span className={styles.kpiValue}>
                {salaryStructures.filter((s) => s.is_active).length}
              </span>
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon} style={{ background: '#eff6ff', color: '#3b82f6' }}>
              <FaFileInvoiceDollar />
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Total Payroll Runs</span>
              <span className={styles.kpiValue}>{payrollRuns.length}</span>
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon} style={{ background: '#ecfdf5', color: '#059669' }}>
              <FaMoneyBillWave />
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Total Net Disbursed</span>
              <span className={styles.kpiValue}>{totalPaidPayroll.toLocaleString()} ETB</span>
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon} style={{ background: '#fef3c7', color: '#d97706' }}>
              <FaCalendarAlt />
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Current Period</span>
              <span className={styles.kpiValue}>
                {new Date().toLocaleString('default', { month: 'short' })} {new Date().getFullYear()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className={styles.tabsNav}>
        {!isTeacherOrStaff && (
          <>
            <button
              className={`${styles.tabBtn} ${activeTab === 'runs' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('runs')}
            >
              <FaCalendarAlt /> Monthly Payroll Runs ({payrollRuns.length})
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'structures' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('structures')}
            >
              <FaFileContract /> Staff Contracts &amp; Salaries ({salaryStructures.length})
            </button>
          </>
        )}
        <button
          className={`${styles.tabBtn} ${activeTab === 'my_payslips' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('my_payslips')}
        >
          <FaPrint /> My Official Payslips ({myPayslips.length})
        </button>
      </div>

      {/* TAB 1: PAYROLL RUNS */}
      {activeTab === 'runs' && (
        <div className={styles.tableCard}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Monthly payroll batches</h2>
              <p>Review draft computations, approve prorated compensation, and generate bank files.</p>
            </div>
            <span className={styles.recordCount}>{payrollRuns.length} batches</span>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Batch Reference</th>
                  <th>Period</th>
                  <th>Staff Count</th>
                  <th>Total Gross</th>
                  <th>Total Deductions</th>
                  <th>Total Net Pay</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payrollRuns.length === 0 ? (
                  <tr>
                    <td colSpan="8" className={styles.emptyCell}>
                      No payroll runs created yet. Click &quot;Process Monthly Payroll&quot; to begin.
                    </td>
                  </tr>
                ) : (
                  payrollRuns.map((run) => {
                    const status = normalizePayrollStatus(run.status);
                    const statusDetails = PAYROLL_STATUS_DETAILS[status];
                    const canAdvance = canManageSalaryStructures || (canReviewPayroll && status === 'CALCULATED');

                    return (
                      <tr key={run.id}>
                        <td style={{ fontWeight: 700, color: '#7c3aed' }}>{run.batch_reference}</td>
                        <td>
                          <strong>
                            {new Date(run.year, run.month - 1).toLocaleString('default', { month: 'long' })} {run.year}
                          </strong>
                        </td>
                        <td>{run.total_staff_count} employees</td>
                        <td>{Number(run.total_gross_amount).toLocaleString()} ETB</td>
                        <td style={{ color: '#dc2626' }}>{Number(run.total_deductions_amount).toLocaleString()} ETB</td>
                        <td style={{ fontWeight: 800, color: '#059669' }}>
                          {Number(run.total_net_amount).toLocaleString()} ETB
                        </td>
                        <td>
                          <span
                            className={`${styles.statusBadge} ${styles[statusDetails?.style || 'statusDraft']}`}
                          >
                            {statusDetails?.label || run.status}
                          </span>
                        </td>
                        <td>
                          <div className={styles.payrollActions}>
                            <button
                              className={styles.btnAction}
                              onClick={() => handleOpenRunBreakdown(run.id)}
                              title="View individual employee salary computations, contract dates, and net payments"
                            >
                              <FaUsers style={{ color: '#7c3aed' }} /> All Employees
                            </button>
                            {statusDetails?.nextStatus && (
                              <button
                                className={styles.btnPaid}
                                onClick={() => handleAdvancePayroll(run)}
                                disabled={loading || !canAdvance}
                                title={!canAdvance ? 'Only an administrator can approve, mark paid, or close payroll.' : undefined}
                              >
                                {status === 'DRAFT' ? <FaCalculator /> : <FaCheck />} {statusDetails.action}
                              </button>
                            )}
                            {status === 'DONE' && <span className={styles.payrollClosedLabel}>Period closed</span>}
                            {status !== 'DRAFT' && canManageSalaryStructures && (
                              <button
                                type="button"
                                className={`${styles.btnAction} ${styles.bankCsvAction}`}
                                onClick={() => handleDownloadBankCsv(run.id)}
                                title="Download bank transfer CSV"
                              >
                                <FaDownload /> Bank CSV
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SALARY STRUCTURES & CONTRACTS */}
      {activeTab === 'structures' && (
        <div className={styles.tableCard}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Staff contracts &amp; compensation plans</h2>
              <p>Manage employee contract dates, contract types, base salaries, allowances, and banking details.</p>
            </div>
            <span className={styles.recordCount}>{salaryStructures.length} staff</span>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Role</th>
                  <th>Contract Type</th>
                  <th>Contract Period</th>
                  <th>Base Salary</th>
                  <th>Allowances (Trans/Prof)</th>
                  <th>Other Allowances</th>
                  <th>Pension (Emp/Emplr)</th>
                  <th>Bank Account</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {salaryStructures.length === 0 ? (
                  <tr>
                    <td colSpan="11" className={styles.emptyCell}>
                      No staff contracts or salary structures configured yet. Click &quot;Staff Contract / Salary&quot; to set up staff compensation.
                    </td>
                  </tr>
                ) : (
                  salaryStructures.map((s) => {
                    const otherAllow =
                      Number(s.housing_allowance || 0) +
                      Number(s.medical_allowance || 0) +
                      Number(s.other_allowances || 0);

                    const contractType = (s.contract_type || 'PERMANENT').toUpperCase();
                    const contractBadgeClass =
                      contractType === 'PERMANENT'
                        ? styles.contractBadgePermanent
                        : contractType === 'FIXED_TERM' || contractType === 'CONTRACT'
                          ? styles.contractBadgeFixed
                          : contractType === 'PROBATION'
                            ? styles.contractBadgeProbation
                            : contractType === 'PART_TIME'
                              ? styles.contractBadgePartTime
                              : styles.contractBadgeTemp;

                    const startDateStr = s.contract_start_date ? s.contract_start_date.split('T')[0] : (s.effective_from ? s.effective_from.split('T')[0] : 'N/A');
                    const endDateStr = s.contract_end_date ? s.contract_end_date.split('T')[0] : null;

                    return (
                      <tr key={s.id}>
                        <td>
                          <strong>{s.first_name} {s.last_name}</strong>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.email}</div>
                        </td>
                        <td>{s.role_name || 'Staff'}</td>
                        <td>
                          <span className={`${styles.contractBadge} ${contractBadgeClass}`}>
                            {contractType}
                          </span>
                        </td>
                        <td>
                          <div className={styles.contractPeriodText}>
                            <span>{startDateStr}</span>
                            <span>&rarr;</span>
                            {endDateStr ? (
                              <span>{endDateStr}</span>
                            ) : (
                              <span className={styles.contractOngoingText}>Ongoing</span>
                            )}
                          </div>
                        </td>
                        <td style={{ fontWeight: 700 }}>{Number(s.base_salary).toLocaleString()} ETB</td>
                        <td>
                          <div>Transport: {Number(s.transport_allowance || 0).toLocaleString()} ETB</div>
                          <div style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: 600 }}>
                            Prof: {Number(s.professional_allowance || 0).toLocaleString()} ETB
                          </div>
                        </td>
                        <td>+{otherAllow.toLocaleString()} ETB</td>
                        <td>{s.pension_employee_percentage}% / {s.pension_employer_percentage}%</td>
                        <td>
                          <div>{s.bank_name || 'CBE'}</div>
                          <div style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{s.bank_account_number || 'N/A'}</div>
                        </td>
                        <td>
                          <span className={`${styles.statusBadge} ${s.is_active ? styles.statusPaid : styles.statusDraft}`}>
                            {s.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <button
                            style={{ padding: '0.3rem 0.6rem', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', cursor: 'pointer', marginRight: '0.4rem' }}
                            onClick={() => {
                              setStructureForm({
                                user_id: s.user_id ?? '',
                                contract_type: s.contract_type || 'PERMANENT',
                                contract_start_date: s.contract_start_date ? s.contract_start_date.split('T')[0] : (s.effective_from ? s.effective_from.split('T')[0] : new Date().toISOString().split('T')[0]),
                                contract_end_date: s.contract_end_date ? s.contract_end_date.split('T')[0] : '',
                                employment_type: s.employment_type || 'FULL_TIME',
                                base_salary: s.base_salary ?? '',
                                housing_allowance: s.housing_allowance ?? 0,
                                transport_allowance: s.transport_allowance ?? 0,
                                professional_allowance: s.professional_allowance ?? 0,
                                medical_allowance: s.medical_allowance ?? 0,
                                other_allowances: s.other_allowances ?? 0,
                                tax_rate_percentage: s.tax_rate_percentage ?? 0,
                                pension_employee_percentage: s.pension_employee_percentage ?? 7,
                                pension_employer_percentage: s.pension_employer_percentage ?? 11,
                                bank_name: s.bank_name ?? '',
                                bank_account_number: s.bank_account_number ?? '',
                                bank_account_name: s.bank_account_name ?? '',
                              });
                              setEditingStructureId(s.id);
                              setIsEditingStructure(true);
                              setIsStructureModalOpen(true);
                            }}
                          >
                            Edit
                          </button>
                          {canManageSalaryStructures && (
                            <button
                              type="button"
                              className={styles.deleteStructureButton}
                              onClick={() => handleDeleteSalaryStructure(s)}
                              disabled={loading}
                              aria-label={`Delete contract for ${s.first_name} ${s.last_name}`}
                              title={`Delete contract for ${s.first_name} ${s.last_name}`}
                            >
                              <FaTrash aria-hidden="true" />
                              <span>Delete</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: MY PAYSLIPS */}
      {activeTab === 'my_payslips' && (
        <div className={styles.tableCard}>
          <div className={styles.cardHeader}>
            <div>
              <h2>My official payslips</h2>
              <p>View your monthly compensation statements, active days worked, statutory tax &amp; pension, and net salary.</p>
            </div>
            <span className={styles.recordCount}>{myPayslips.length} payslips</span>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Payslip #</th>
                  <th>Period</th>
                  <th>Days Worked</th>
                  <th>Payable Base</th>
                  <th>Allowances</th>
                  <th>Gross Pay</th>
                  <th>Deductions</th>
                  <th>Net Take-Home Pay</th>
                  <th>Payslip</th>
                </tr>
              </thead>
              <tbody>
                {myPayslips.length === 0 ? (
                  <tr>
                    <td colSpan="9" className={styles.emptyCell}>
                      No payslips generated for your account yet.
                    </td>
                  </tr>
                ) : (
                  myPayslips.map((ps) => (
                    <tr key={ps.id}>
                      <td style={{ fontWeight: 700, color: '#7c3aed' }}>{ps.payslip_number}</td>
                      <td>
                        <strong>
                          {new Date(ps.year, ps.month - 1).toLocaleString('default', { month: 'long' })} {ps.year}
                        </strong>
                      </td>
                      <td>
                        {ps.is_prorated ? (
                          <span className={`${styles.prorationPill} ${styles.prorationPillProrated}`}>
                            {ps.worked_days || 0}/{ps.total_days_in_month || 30} days (Prorated)
                          </span>
                        ) : (
                          <span className={`${styles.prorationPill} ${styles.prorationPillFull}`}>
                            Full Month ({ps.total_days_in_month || 30}d)
                          </span>
                        )}
                      </td>
                      <td>{Number(ps.base_salary).toLocaleString()} ETB</td>
                      <td>+{Number(ps.total_allowances).toLocaleString()} ETB</td>
                      <td style={{ fontWeight: 700 }}>{Number(ps.gross_salary).toLocaleString()} ETB</td>
                      <td style={{ color: '#dc2626' }}>-{Number(ps.total_deductions).toLocaleString()} ETB</td>
                      <td style={{ fontWeight: 800, color: '#059669', fontSize: '1rem' }}>
                        {Number(ps.net_salary).toLocaleString()} ETB
                      </td>
                      <td>
                        <button
                          style={{ padding: '0.35rem 0.7rem', background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                          onClick={() => handleOpenPayslipModal(ps.id)}
                        >
                          <FaPrint /> View / Print
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: PROCESS MONTHLY PAYROLL DRAFT */}
      <ModalPortal isOpen={isProcessModalOpen} onClose={() => setIsProcessModalOpen(false)}>
        <div className={`${styles.modalContent} ${styles.processModal}`}>
          <div className={styles.modalHeader}>
            <h3>
              <FaWallet /> Create Monthly Payroll Draft
            </h3>
            <button className={styles.closeBtn} onClick={() => setIsProcessModalOpen(false)}>
              <FaTimes />
            </button>
          </div>
          <form onSubmit={handleProcessPayroll} className={styles.processForm}>
            <div className={`${styles.modalBody} ${styles.processBody}`}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Payroll Month *</label>
                  <select
                    className={styles.formSelect}
                    value={processForm.month}
                    onChange={(e) => setProcessForm({ ...processForm, month: e.target.value })}
                  >
                    {[
                      'January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'
                    ].map((m, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Year *</label>
                  <input
                    type="number"
                    className={styles.formInput}
                    value={processForm.year}
                    onChange={(e) => setProcessForm({ ...processForm, year: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Remarks / Notes</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={processForm.remarks}
                  onChange={(e) => setProcessForm({ ...processForm, remarks: e.target.value })}
                />
              </div>

              {/* Live Staff Salary & Contract Proration Computation Preview */}
              <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Live Contract Proration &amp; Compensation Preview</span>
                  <span style={{ fontSize: '0.8rem', color: '#7c3aed', fontWeight: 600 }}>
                    {salaryStructures.length} Active Staff Configured
                  </span>
                </label>
                <div className={styles.previewBox}>
                  {salaryStructures.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '0.75rem' }}>
                      No active salary structures configured. Please configure structures first.
                    </div>
                  ) : (
                    salaryStructures.map((s) => {
                      const proration = calculateContractProration(
                        s.contract_start_date || s.effective_from,
                        s.contract_end_date,
                        Number(processForm.year),
                        Number(processForm.month)
                      );

                      if (!proration.isEligible || proration.workedDays <= 0) {
                        return (
                          <div key={s.id} className={styles.previewItem} style={{ opacity: 0.6, background: '#f8fafc' }}>
                            <div>
                              <strong>{s.first_name} {s.last_name}</strong>
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                Contract: {s.contract_start_date ? s.contract_start_date.split('T')[0] : 'N/A'} &rarr; {s.contract_end_date ? s.contract_end_date.split('T')[0] : 'Ongoing'}
                              </div>
                            </div>
                            <div>
                              <span className={`${styles.prorationPill} ${styles.prorationPillExcluded}`}>
                                Excluded ({proration.reason || 'Outside Period'})
                              </span>
                            </div>
                          </div>
                        );
                      }

                      const breakdown = computeSalaryBreakdown({
                        baseSalary: s.base_salary,
                        transportAllowance: s.transport_allowance,
                        professionalAllowance: s.professional_allowance,
                        housingAllowance: s.housing_allowance,
                        medicalAllowance: s.medical_allowance,
                        otherAllowances: s.other_allowances,
                        pensionEmployeeRate: s.pension_employee_percentage,
                        pensionEmployerRate: s.pension_employer_percentage,
                        transportExemptionLimit: 600.00,
                        workedDays: proration.workedDays,
                        totalDaysInMonth: proration.totalDays,
                        prorationFactor: proration.prorationFactor,
                      });

                      return (
                        <div key={s.id} className={styles.previewItem}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <strong>{s.first_name} {s.last_name}</strong>
                              {proration.isProrated ? (
                                <span className={`${styles.prorationPill} ${styles.prorationPillProrated}`}>
                                  Prorated: {proration.workedDays}/{proration.totalDays}d ({Math.round(proration.prorationFactor * 100)}%)
                                </span>
                              ) : (
                                <span className={`${styles.prorationPill} ${styles.prorationPillFull}`}>
                                  Full Month ({proration.totalDays}d)
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                              Base: {breakdown.base.toLocaleString()} ETB {proration.isProrated && <span className={styles.unproratedBaseLabel}>({breakdown.unproratedBase.toLocaleString()} ETB)</span>} | Gross: {breakdown.grossSalary.toLocaleString()} ETB | PAYE: {breakdown.payeTax.toLocaleString()} ETB | Pension: {breakdown.pensionEmployee.toLocaleString()} ETB
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span className={styles.netBadge}>
                              Net: {breakdown.netSalary.toLocaleString()} ETB
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className={`${styles.modalFooter} ${styles.processFooter}`}>
              <button type="button" className={styles.btnSecondary} onClick={() => setIsProcessModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className={styles.btnPrimary} disabled={loading}>
                {loading ? 'Creating draft...' : 'Create payroll draft'}
              </button>
            </div>
          </form>
        </div>
      </ModalPortal>

      {/* MODAL 2: STAFF CONTRACT & SALARY STRUCTURE */}
      <ModalPortal isOpen={isStructureModalOpen} onClose={() => setIsStructureModalOpen(false)}>
        <div className={`${styles.modalContent} ${styles.modalLarge} ${styles.structureModal}`}>
          <div className={`${styles.modalHeader} ${styles.structureModalHeader}`}>
            <div className={styles.structureModalHeading}>
              <span className={styles.structureModalIcon}><FaFileContract /></span>
              <h3>
                {isEditingStructure ? 'Edit Staff Contract & Compensation' : 'Create Staff Contract & Compensation'}
              </h3>
              <p>Configure employment contract terms, start/end dates, monthly earnings, statutory deductions, and payment account.</p>
            </div>
            <span className={styles.monthlyBadge}>ETB <span>/</span> MONTHLY</span>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={() => setIsStructureModalOpen(false)}
              aria-label="Close salary structure form"
            >
              <FaTimes />
            </button>
          </div>
          <form onSubmit={handleSaveStructure} className={styles.structureForm}>
            <div className={`${styles.modalBody} ${styles.structureBody}`}>
              <div className={styles.structureFormColumn}>
                {/* SECTION 1: STAFF & CONTRACT TERMS */}
                <section className={styles.structureSection}>
                  <div className={styles.structureSectionHeader}>
                    <span className={styles.structureStep}>01</span>
                    <div>
                      <h4>Staff member &amp; Contract terms</h4>
                      <p>Select employee and define their contract start and end dates.</p>
                    </div>
                  </div>
                  <div className={styles.structureFieldsGrid}>
                    <div className={`${styles.formGroup} ${styles.baseSalaryField}`}>
                      <label htmlFor="salary-structure-user">Staff / teacher <span className={styles.requiredMark}>*</span></label>
                      <select
                        id="salary-structure-user"
                        className={styles.formSelect}
                        value={structureForm.user_id}
                        onChange={(e) => setStructureForm({ ...structureForm, user_id: e.target.value })}
                        required
                        disabled={isEditingStructure}
                      >
                        <option value="">Select a staff member</option>
                        {staffUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.first_name} {u.last_name} ({u.role_name || u.role || 'Staff'}) - {u.email}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="contract-type">Contract type <span className={styles.requiredMark}>*</span></label>
                      <select
                        id="contract-type"
                        className={styles.formSelect}
                        value={structureForm.contract_type}
                        onChange={(e) => setStructureForm({ ...structureForm, contract_type: e.target.value })}
                        required
                      >
                        <option value="PERMANENT">Permanent / Indefinite</option>
                        <option value="FIXED_TERM">Fixed-Term Contract</option>
                        <option value="PROBATION">Probationary Period</option>
                        <option value="PART_TIME">Part-Time Contract</option>
                        <option value="TEMPORARY">Temporary / Seasonal</option>
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="employment-type">Employment model</label>
                      <select
                        id="employment-type"
                        className={styles.formSelect}
                        value={structureForm.employment_type}
                        onChange={(e) => setStructureForm({ ...structureForm, employment_type: e.target.value })}
                      >
                        <option value="FULL_TIME">Full-Time Staff</option>
                        <option value="PART_TIME">Part-Time Staff</option>
                        <option value="CONTRACTUAL">Contractor / Consultant</option>
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="contract-start-date">Contract start date <span className={styles.requiredMark}>*</span></label>
                      <input
                        id="contract-start-date"
                        type="date"
                        className={styles.formInput}
                        value={structureForm.contract_start_date}
                        onChange={(e) => setStructureForm({ ...structureForm, contract_start_date: e.target.value })}
                        required
                      />
                      <span className={styles.fieldHint}>Mid-month hires are automatically prorated from this date.</span>
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="contract-end-date">Contract end date (Optional)</label>
                      <input
                        id="contract-end-date"
                        type="date"
                        className={styles.formInput}
                        value={structureForm.contract_end_date}
                        onChange={(e) => setStructureForm({ ...structureForm, contract_end_date: e.target.value })}
                      />
                      <span className={styles.fieldHint}>Leave blank for ongoing / permanent positions.</span>
                    </div>
                  </div>
                </section>

                {/* SECTION 2: MONTHLY EARNINGS */}
                <section className={styles.structureSection}>
                  <div className={styles.structureSectionHeader}>
                    <span className={styles.structureStep}>02</span>
                    <div>
                      <h4>Monthly earnings</h4>
                      <p>Add the base contractual salary and monthly allowances.</p>
                    </div>
                  </div>
                  <div className={styles.structureFieldsGrid}>
                    <div className={`${styles.formGroup} ${styles.baseSalaryField}`}>
                      <label htmlFor="salary-base">Base monthly salary <span className={styles.requiredMark}>*</span></label>
                      <div className={styles.currencyInput}>
                        <input
                          id="salary-base"
                          type="number"
                          step="0.01"
                          className={styles.formInput}
                          placeholder="0.00"
                          value={structureForm.base_salary}
                          onChange={(e) => setStructureForm({ ...structureForm, base_salary: e.target.value })}
                          required
                        />
                        <span>ETB</span>
                      </div>
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="salary-transport">Transport allowance</label>
                      <div className={styles.currencyInput}>
                        <input
                          id="salary-transport"
                          type="number"
                          step="0.01"
                          className={styles.formInput}
                          placeholder="0.00"
                          value={structureForm.transport_allowance}
                          onChange={(e) => setStructureForm({ ...structureForm, transport_allowance: e.target.value })}
                        />
                        <span>ETB</span>
                      </div>
                      <span className={styles.fieldHint}>First 600 ETB is tax-exempt.</span>
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="salary-professional">Professional allowance</label>
                      <div className={styles.currencyInput}>
                        <input
                          id="salary-professional"
                          type="number"
                          step="0.01"
                          className={styles.formInput}
                          placeholder="0.00"
                          value={structureForm.professional_allowance}
                          onChange={(e) => setStructureForm({ ...structureForm, professional_allowance: e.target.value })}
                        />
                        <span>ETB</span>
                      </div>
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="salary-housing">Housing allowance</label>
                      <div className={styles.currencyInput}>
                        <input
                          id="salary-housing"
                          type="number"
                          step="0.01"
                          className={styles.formInput}
                          placeholder="0.00"
                          value={structureForm.housing_allowance}
                          onChange={(e) => setStructureForm({ ...structureForm, housing_allowance: e.target.value })}
                        />
                        <span>ETB</span>
                      </div>
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="salary-medical">Medical allowance</label>
                      <div className={styles.currencyInput}>
                        <input
                          id="salary-medical"
                          type="number"
                          step="0.01"
                          className={styles.formInput}
                          placeholder="0.00"
                          value={structureForm.medical_allowance}
                          onChange={(e) => setStructureForm({ ...structureForm, medical_allowance: e.target.value })}
                        />
                        <span>ETB</span>
                      </div>
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="salary-other">Other allowances</label>
                      <div className={styles.currencyInput}>
                        <input
                          id="salary-other"
                          type="number"
                          step="0.01"
                          className={styles.formInput}
                          placeholder="0.00"
                          value={structureForm.other_allowances}
                          onChange={(e) => setStructureForm({ ...structureForm, other_allowances: e.target.value })}
                        />
                        <span>ETB</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* SECTION 3: STATUTORY DEDUCTIONS */}
                <section className={styles.structureSection}>
                  <div className={styles.structureSectionHeader}>
                    <span className={styles.structureStep}>03</span>
                    <div>
                      <h4>Statutory deductions</h4>
                      <p>Statutory Ethiopian pension rates.</p>
                    </div>
                  </div>
                  <div className={styles.structureFieldsGrid}>
                    <div className={styles.formGroup}>
                      <label htmlFor="salary-employee-pension">Employee pension rate</label>
                      <div className={styles.percentInput}>
                        <input
                          id="salary-employee-pension"
                          type="number"
                          min="0"
                          step="0.01"
                          className={styles.formInput}
                          value={structureForm.pension_employee_percentage}
                          onChange={(e) => setStructureForm({ ...structureForm, pension_employee_percentage: e.target.value })}
                        />
                        <span>%</span>
                      </div>
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="salary-employer-pension">Employer pension rate</label>
                      <div className={styles.percentInput}>
                        <input
                          id="salary-employer-pension"
                          type="number"
                          min="0"
                          step="0.01"
                          className={styles.formInput}
                          value={structureForm.pension_employer_percentage}
                          onChange={(e) => setStructureForm({ ...structureForm, pension_employer_percentage: e.target.value })}
                        />
                        <span>%</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* SECTION 4: PAYMENT DETAILS */}
                <section className={styles.structureSection}>
                  <div className={styles.structureSectionHeader}>
                    <span className={styles.structureStep}>04</span>
                    <div>
                      <h4>Payment &amp; Banking Details</h4>
                      <p>Bank details used for bank transfer exports and salary deposit.</p>
                    </div>
                  </div>
                  <div className={styles.structureFieldsGrid}>
                    <div className={styles.formGroup}>
                      <label htmlFor="salary-bank-name">Bank name</label>
                      <input
                        id="salary-bank-name"
                        type="text"
                        className={styles.formInput}
                        value={structureForm.bank_name}
                        onChange={(e) => setStructureForm({ ...structureForm, bank_name: e.target.value })}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="salary-account-name">Account holder name</label>
                      <input
                        id="salary-account-name"
                        type="text"
                        className={styles.formInput}
                        value={structureForm.bank_account_name ?? ''}
                        onChange={(e) => setStructureForm({ ...structureForm, bank_account_name: e.target.value })}
                      />
                    </div>
                    <div className={`${styles.formGroup} ${styles.accountNumberField}`}>
                      <label htmlFor="salary-account-number">Bank account number</label>
                      <input
                        id="salary-account-number"
                        type="text"
                        className={styles.formInput}
                        value={structureForm.bank_account_number}
                        onChange={(e) => setStructureForm({ ...structureForm, bank_account_number: e.target.value })}
                      />
                    </div>
                  </div>
                </section>
              </div>

              <aside className={styles.structurePreviewPanel}>
                <div className={styles.structurePreviewHeading}>
                  <span className={styles.previewIcon}><FaCalculator /></span>
                  <div>
                    <h4>Monthly compensation summary</h4>
                    <p>Statutory Ethiopian PAYE &amp; Pension</p>
                  </div>
                </div>
                <div className={styles.netEstimate}>
                  <span>Estimated monthly take-home</span>
                  <strong>{structurePreview.netSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  <small>ETB <span>/ full month</span></small>
                </div>
                <div className={styles.previewBreakdown}>
                  <div><span>Contract base salary</span><strong>{structurePreview.base.toLocaleString()} ETB</strong></div>
                  <div><span>Total allowances</span><strong>+{structurePreview.totalAllowances.toLocaleString()} ETB</strong></div>
                  <div><span>Gross salary</span><strong>{structurePreview.grossSalary.toLocaleString()} ETB</strong></div>
                  <div><span>Taxable income</span><strong>{structurePreview.taxableIncome.toLocaleString()} ETB</strong></div>
                  <div><span>Transport tax exemption</span><strong className={styles.positiveValue}>{structurePreview.transportExemption.toLocaleString()} ETB</strong></div>
                  <div><span>PAYE income tax</span><strong className={styles.deductionValue}>−{structurePreview.payeTax.toLocaleString()} ETB</strong></div>
                  <div><span>Employee pension ({structureForm.pension_employee_percentage || 0}%)</span><strong className={styles.deductionValue}>−{structurePreview.pensionEmployee.toLocaleString()} ETB</strong></div>
                  <div><span>Employer pension ({structureForm.pension_employer_percentage || 0}%)</span><strong className={styles.positiveValue}>{structurePreview.pensionEmployer.toLocaleString()} ETB</strong></div>
                  <div className={styles.previewNetSalary}><span>Net salary</span><strong>{structurePreview.netSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB</strong></div>
                </div>
                <div className={styles.previewNote}>
                  Mid-month contract start or end dates will automatically prorate the base salary, allowances, and tax exemptions based on exact calendar days worked.
                </div>
              </aside>
            </div>

            <div className={`${styles.modalFooter} ${styles.structureModalFooter}`}>
              <button type="button" className={styles.btnSecondary} onClick={() => setIsStructureModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className={styles.btnPrimary} disabled={loading}>
                {loading ? 'Saving...' : isEditingStructure ? 'Save changes' : 'Save contract & salary'}
              </button>
            </div>
          </form>
        </div>
      </ModalPortal>

      {/* MODAL 3: PRINTABLE OFFICIAL PAYSLIP */}
      <ModalPortal isOpen={isPayslipModalOpen} onClose={() => setIsPayslipModalOpen(false)}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h3>
              <FaPrint /> Official Employee Payslip
            </h3>
            <button className={styles.closeBtn} onClick={() => setIsPayslipModalOpen(false)}>
              <FaTimes />
            </button>
          </div>
          <div className={styles.modalBody}>
            {activePayslip && (
              <div className={styles.payslipPrintContainer}>
                <div className={styles.payslipHeader}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{activePayslip.school_name || 'SMART SMS ACADEMY'}</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Statutory Staff Remuneration &amp; Compensation Statement</div>
                  <div className={styles.payslipTitle}>
                    PAYSLIP: {new Date(activePayslip.year, activePayslip.month - 1).toLocaleString('default', { month: 'long' })}{' '}
                    {activePayslip.year}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '1rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px' }}>
                  <div><strong>Employee:</strong> {activePayslip.first_name} {activePayslip.last_name}</div>
                  <div><strong>Role:</strong> {activePayslip.role_name || 'Staff'}</div>
                  <div><strong>Payslip #:</strong> {activePayslip.payslip_number}</div>
                  <div><strong>Bank Account:</strong> {activePayslip.bank_account_number || 'N/A'}</div>
                  <div><strong>Contract Type:</strong> {activePayslip.contract_type || 'PERMANENT'}</div>
                  <div>
                    <strong>Period Worked:</strong>{' '}
                    {activePayslip.is_prorated ? (
                      <span style={{ color: '#7c3aed', fontWeight: 700 }}>
                        {activePayslip.worked_days} of {activePayslip.total_days_in_month} Days (Prorated {Math.round((Number(activePayslip.proration_factor) || 0) * 100)}%)
                      </span>
                    ) : (
                      <span>Full Month ({activePayslip.total_days_in_month || 30} Days)</span>
                    )}
                  </div>
                </div>

                <div className={styles.payslipColumns}>
                  <div className={styles.payslipBox}>
                    <h4 style={{ color: '#059669', marginBottom: '0.5rem' }}>Gross Earnings</h4>
                    {activePayslip.is_prorated && Number(activePayslip.unprorated_base_salary) > 0 && (
                      <div className={styles.payslipLine} style={{ color: '#64748b', fontSize: '0.8rem' }}>
                        <span>Full Monthly Base:</span>
                        <span>{Number(activePayslip.unprorated_base_salary).toLocaleString()} ETB</span>
                      </div>
                    )}
                    <div className={styles.payslipLine}>
                      <span>{activePayslip.is_prorated ? 'Payable Base Salary (Prorated):' : 'Base Salary:'}</span>
                      <span>{Number(activePayslip.base_salary).toLocaleString()} ETB</span>
                    </div>
                    {Number(activePayslip.professional_allowance) > 0 && (
                      <div className={styles.payslipLine}>
                        <span>Professional Allowance:</span>
                        <span>+{Number(activePayslip.professional_allowance).toLocaleString()} ETB</span>
                      </div>
                    )}
                    {(activePayslip.items || [])
                      .filter((i) => i.item_type === 'ALLOWANCE' && !i.name.includes('Professional Allowance'))
                      .map((item, idx) => (
                        <div key={idx} className={styles.payslipLine}>
                          <span>{item.name}:</span>
                          <span>+{Number(item.amount).toLocaleString()} ETB</span>
                        </div>
                      ))}
                    <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '0.4rem', marginTop: '0.4rem', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                      <span>Gross Salary:</span>
                      <span>{Number(activePayslip.gross_salary).toLocaleString()} ETB</span>
                    </div>
                    {Number(activePayslip.transport_exemption) > 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '0.2rem' }}>
                        Non-taxable Transport Exemption: {Number(activePayslip.transport_exemption).toLocaleString()} ETB
                      </div>
                    )}
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                      Taxable Income: {Number(activePayslip.taxable_income || activePayslip.gross_salary).toLocaleString()} ETB
                    </div>
                  </div>

                  <div className={styles.payslipBox}>
                    <h4 style={{ color: '#dc2626', marginBottom: '0.5rem' }}>Statutory Deductions</h4>
                    <div className={styles.payslipLine}>
                      <span>Employee Pension (7%):</span>
                      <span>-{Number(activePayslip.pension_employee_deduction).toLocaleString()} ETB</span>
                    </div>
                    <div className={styles.payslipLine}>
                      <span>Employment Income Tax (PAYE):</span>
                      <span>-{Number(activePayslip.tax_deduction).toLocaleString()} ETB</span>
                    </div>
                    {(activePayslip.items || [])
                      .filter((i) => i.item_type === 'DEDUCTION' && !i.name.includes('Pension') && !i.name.includes('Tax'))
                      .map((item, idx) => (
                        <div key={idx} className={styles.payslipLine}>
                          <span>{item.name}:</span>
                          <span>-{Number(item.amount).toLocaleString()} ETB</span>
                        </div>
                      ))}
                    <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '0.4rem', marginTop: '0.4rem', fontWeight: 700, display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                      <span>Total Deductions:</span>
                      <span>-{Number(activePayslip.total_deductions).toLocaleString()} ETB</span>
                    </div>
                    {Number(activePayslip.pension_employer_contribution) > 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.2rem' }}>
                        Employer Pension Contribution (11%): {Number(activePayslip.pension_employer_contribution).toLocaleString()} ETB
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.payslipNetBox}>
                  <span>NET TAKE-HOME SALARY:</span>
                  <span>{Number(activePayslip.net_salary).toLocaleString()} ETB</span>
                </div>
              </div>
            )}
          </div>
          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnSecondary} onClick={() => setIsPayslipModalOpen(false)}>
              Close
            </button>
            <button type="button" className={styles.btnPrimary} onClick={() => window.print()}>
              <FaPrint /> Print Official Payslip
            </button>
          </div>
        </div>
      </ModalPortal>

      {/* MODAL 4: PAYROLL RUN DETAILED BREAKDOWN & NET PAYMENTS */}
      <ModalPortal isOpen={isRunBreakdownModalOpen} onClose={() => setIsRunBreakdownModalOpen(false)}>
        <div className={`${styles.modalContent} ${styles.modalLarge}`}>
          <div className={styles.modalHeader}>
            <div>
              <h3>
                <FaUsers style={{ color: '#7c3aed' }} /> Employee Salary Computation &amp; Net Payments
              </h3>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.2rem' }}>
                Batch Reference: <strong>{selectedRunDetails?.batch_reference}</strong> &bull; Period:{' '}
                <strong>
                  {selectedRunDetails ? new Date(selectedRunDetails.year, selectedRunDetails.month - 1).toLocaleString('default', { month: 'long' }) : ''}{' '}
                  {selectedRunDetails?.year}
                </strong>
              </div>
            </div>
            <button className={styles.closeBtn} onClick={() => setIsRunBreakdownModalOpen(false)}>
              <FaTimes />
            </button>
          </div>

          <div className={styles.modalBody}>
            {selectedRunDetails && (
              <>
                {/* Summary Stat Pills */}
                <div className={styles.statGridSmall}>
                  <div className={styles.statPill}>
                    <span className={styles.statPillLabel}>Total Employees</span>
                    <span className={styles.statPillValue}>{selectedRunDetails.total_staff_count || selectedRunDetails.payslips?.length || 0}</span>
                  </div>
                  <div className={styles.statPill}>
                    <span className={styles.statPillLabel}>Total Gross Salary</span>
                    <span className={styles.statPillValue}>{Number(selectedRunDetails.total_gross_amount || 0).toLocaleString()} ETB</span>
                  </div>
                  <div className={styles.statPill}>
                    <span className={styles.statPillLabel}>Tax &amp; Pension Deductions</span>
                    <span className={styles.statPillValue} style={{ color: '#dc2626' }}>
                      {Number(selectedRunDetails.total_deductions_amount || 0).toLocaleString()} ETB
                    </span>
                  </div>
                  <div className={styles.statPill} style={{ background: '#ecfdf5', borderColor: '#a7f3d0' }}>
                    <span className={styles.statPillLabel} style={{ color: '#065f46' }}>
                      {['PAID', 'DONE', 'DISBURSED'].includes(normalizePayrollStatus(selectedRunDetails.status))
                        ? 'Total net paid'
                        : 'Total net pay'}
                    </span>
                    <span className={styles.statPillValue} style={{ color: '#059669' }}>
                      {Number(selectedRunDetails.total_net_amount || 0).toLocaleString()} ETB
                    </span>
                  </div>
                </div>

                {/* Filter Search */}
                <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <div className={styles.searchBox} style={{ flex: 1 }}>
                    <FaSearch />
                    <input
                      type="text"
                      placeholder="Search employee by name, role, email, or account number..."
                      value={breakdownSearch}
                      onChange={(e) => setBreakdownSearch(e.target.value)}
                    />
                  </div>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    Showing {(selectedRunDetails.payslips || []).filter((ps) => {
                      const q = breakdownSearch.toLowerCase();
                      return (
                        !q ||
                        `${ps.first_name} ${ps.last_name}`.toLowerCase().includes(q) ||
                        (ps.role_name || '').toLowerCase().includes(q) ||
                        (ps.email || '').toLowerCase().includes(q) ||
                        (ps.bank_account_number || '').toLowerCase().includes(q)
                      );
                    }).length} employee records
                  </span>
                </div>

                {/* Employees Computation Table */}
                <div className={styles.tableWrapper} style={{ maxHeight: '420px', overflowY: 'auto' }}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Contract &amp; Days</th>
                        <th>Payable Base</th>
                        <th>Allowances</th>
                        <th>Gross Salary</th>
                        <th>Taxable Income</th>
                        <th>PAYE Tax</th>
                        <th>Pension (7%)</th>
                        <th>Total Deductions</th>
                        <th>Net Payment</th>
                        <th>Bank Account</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedRunDetails.payslips || [])
                        .filter((ps) => {
                          const q = breakdownSearch.toLowerCase();
                          return (
                            !q ||
                            `${ps.first_name} ${ps.last_name}`.toLowerCase().includes(q) ||
                            (ps.role_name || '').toLowerCase().includes(q) ||
                            (ps.email || '').toLowerCase().includes(q) ||
                            (ps.bank_account_number || '').toLowerCase().includes(q)
                          );
                        })
                        .map((ps) => (
                          <tr key={ps.id}>
                            <td>
                              <strong>{ps.first_name} {ps.last_name}</strong>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{ps.role_name || 'Staff'} &bull; {ps.email}</div>
                            </td>
                            <td>
                              <div>
                                <span className={styles.contractTypeLabel} style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                  {ps.contract_type || 'PERMANENT'}
                                </span>
                              </div>
                              {ps.is_prorated ? (
                                <span className={`${styles.prorationPill} ${styles.prorationPillProrated}`} style={{ marginTop: '0.2rem' }}>
                                  {ps.worked_days}/{ps.total_days_in_month}d ({Math.round((Number(ps.proration_factor) || 0) * 100)}%)
                                </span>
                              ) : (
                                <span className={`${styles.prorationPill} ${styles.prorationPillFull}`} style={{ marginTop: '0.2rem' }}>
                                  Full ({ps.total_days_in_month || 30}d)
                                </span>
                              )}
                            </td>
                            <td>
                              <div>{Number(ps.base_salary).toLocaleString()} ETB</div>
                              {ps.is_prorated && Number(ps.unprorated_base_salary) > 0 && (
                                <div className={styles.unproratedBaseLabel}>
                                  {Number(ps.unprorated_base_salary).toLocaleString()} ETB
                                </div>
                              )}
                            </td>
                            <td>{Number(ps.total_allowances || 0).toLocaleString()} ETB</td>
                            <td style={{ fontWeight: 600 }}>{Number(ps.gross_salary).toLocaleString()} ETB</td>
                            <td style={{ color: '#475569' }}>
                              {Number(ps.taxable_income || ps.gross_salary).toLocaleString()} ETB
                            </td>
                            <td style={{ color: '#dc2626' }}>{Number(ps.tax_deduction).toLocaleString()} ETB</td>
                            <td style={{ color: '#d97706' }}>{Number(ps.pension_employee_deduction).toLocaleString()} ETB</td>
                            <td style={{ color: '#dc2626', fontWeight: 600 }}>{Number(ps.total_deductions).toLocaleString()} ETB</td>
                            <td>
                              <span className={styles.netBadge}>
                                {Number(ps.net_salary).toLocaleString()} ETB
                              </span>
                            </td>
                            <td>
                              <div style={{ fontSize: '0.8rem' }}>
                                {ps.bank_name || 'Bank'}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                {ps.bank_account_number || 'N/A'}
                              </div>
                            </td>
                            <td>
                              <span
                                className={`${styles.statusBadge} ${ps.status === 'PAID' ? styles.statusPaid : styles.statusProcessed
                                  }`}
                              >
                                {ps.status === 'PAID'
                                  ? 'Paid'
                                  : ps.status === 'GENERATED'
                                    ? 'Processed'
                                    : ps.status || 'Unknown'}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnSecondary} onClick={() => setIsRunBreakdownModalOpen(false)}>
              Close
            </button>
            {selectedRunDetails && (
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => handleDownloadBankCsv(selectedRunDetails.id)}
              >
                <FaDownload /> Export Bank CSV
              </button>
            )}
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}
