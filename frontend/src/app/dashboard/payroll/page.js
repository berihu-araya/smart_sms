'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  FaSearch,
  FaCalculator,
} from 'react-icons/fa';
import { HiOutlineArrowPath } from 'react-icons/hi2';

function ModalPortal({ isOpen, onClose, children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
 * Computes full Ethiopian salary breakdown
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
}) {
  const base = Math.max(0, Number(baseSalary) || 0);
  const transport = Math.max(0, Number(transportAllowance) || 0);
  const professional = Math.max(0, Number(professionalAllowance) || 0);
  const housing = Math.max(0, Number(housingAllowance) || 0);
  const medical = Math.max(0, Number(medicalAllowance) || 0);
  const other = Math.max(0, Number(otherAllowances) || 0);

  const transportExemption = Math.min(transport, transportExemptionLimit);
  const taxableTransport = Math.max(0, transport - transportExemption);

  const totalAllowances = Math.round((transport + professional + housing + medical + other) * 100) / 100;
  const grossSalary = Math.round((base + totalAllowances) * 100) / 100;

  const taxableIncome = Math.round((base + taxableTransport + professional + housing + medical + other) * 100) / 100;

  const payeTax = calculateProgressivePAYE(taxableIncome);
  const pensionEmployee = Math.round(((base * Number(pensionEmployeeRate)) / 100) * 100) / 100;
  const pensionEmployer = Math.round(((base * Number(pensionEmployerRate)) / 100) * 100) / 100;

  const totalDeductions = Math.round((payeTax + pensionEmployee) * 100) / 100;
  const netSalary = Math.max(0, Math.round((grossSalary - totalDeductions) * 100) / 100);

  return {
    base,
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
  };
}

export default function PayrollPage() {
  const { user } = useAuth();
  const userRole = (user?.role || '').toLowerCase();
  const isTeacherOrStaff = userRole === 'teacher' || userRole === 'staff';

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

  const [structureForm, setStructureForm] = useState({
    user_id: '',
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
  });

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
    if (activeTab === 'runs') loadRuns();
    if (activeTab === 'structures') loadStructures();
    if (activeTab === 'my_payslips') loadMyPayslips();
  }, [activeTab, loadRuns, loadStructures, loadMyPayslips]);

  const handleProcessPayroll = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const res = await financeApi.processMonthlyPayroll(processForm);
      setSuccessMsg(`Payroll run ${res.data.batchReference} generated for ${res.data.totalStaffCount} staff members!`);
      setIsProcessModalOpen(false);
      loadRuns();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPayrollPaid = async (runId) => {
    if (!window.confirm('Mark this payroll as paid and release official payslips to staff?')) return;
    try {
      setLoading(true);
      await financeApi.markPayrollPaid(runId);
      setSuccessMsg('Payroll run marked as paid and payslips released!');
      loadRuns();
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
      await financeApi.upsertSalaryStructure({
        ...structureForm,
        base_salary: Number(structureForm.base_salary),
        housing_allowance: Number(structureForm.housing_allowance) || 0,
        transport_allowance: Number(structureForm.transport_allowance) || 0,
        professional_allowance: Number(structureForm.professional_allowance) || 0,
        medical_allowance: Number(structureForm.medical_allowance) || 0,
        other_allowances: Number(structureForm.other_allowances) || 0,
      });
      setSuccessMsg('Staff salary structure updated successfully!');
      setIsStructureModalOpen(false);
      loadStructures();
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

  const totalPaidPayroll = payrollRuns
    .filter((r) => r.status === 'DISBURSED')
    .reduce((sum, r) => sum + Number(r.total_net_amount), 0);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <span className={styles.eyebrow}>PAYROLL MANAGEMENT</span>
          <h1 className={styles.title}>
            <span className={styles.titleIcon}><FaWallet /></span>
            Payroll &amp; compensation
          </h1>
          <div className={styles.subtitle}>
            Manage monthly pay runs, staff salary structures, statutory deductions, and payslips.
          </div>
        </div>

        <div className={styles.headerActions}>
          {!isTeacherOrStaff && (
            <>
              <button className={styles.btnSecondary} onClick={() => setIsStructureModalOpen(true)}>
                <FaPlus /> Salary Structure
              </button>
              <button className={styles.btnPrimary} onClick={() => setIsProcessModalOpen(true)}>
                <FaWallet /> Process Monthly Payroll
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
            <div className={`${styles.kpiIcon} ${styles.kpiIconPurple}`}>
              <FaMoneyBillWave />
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Net payroll paid</span>
              <span className={`${styles.kpiValue} ${styles.kpiValuePurple}`}>
                {totalPaidPayroll.toLocaleString()} <small>ETB</small>
              </span>
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div className={`${styles.kpiIcon} ${styles.kpiIconBlue}`}>
              <FaUsers />
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Configured Staff</span>
              <span className={styles.kpiValue}>{salaryStructures.length}</span>
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div className={`${styles.kpiIcon} ${styles.kpiIconGreen}`}>
              <FaCalendarAlt />
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Payroll Batches</span>
              <span className={styles.kpiValue}>{payrollRuns.length}</span>
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
              <FaWallet /> Monthly Payroll Runs
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'structures' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('structures')}
            >
              <FaUsers /> Salary Structures & Scales
            </button>
          </>
        )}
        <button
          className={`${styles.tabBtn} ${activeTab === 'my_payslips' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('my_payslips')}
        >
          <FaFileInvoiceDollar /> My Digital Payslips
        </button>
      </div>

      {/* TAB 1: RUNS */}
      {activeTab === 'runs' && (
        <div className={styles.tableCard}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Monthly payroll runs</h2>
              <p>Review staff totals, check each calculation, and mark completed payments.</p>
            </div>
            <span className={styles.recordCount}>{payrollRuns.length} runs</span>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Batch Reference</th>
                  <th>Month / Year</th>
                  <th>Staff Count</th>
                  <th>Gross Salary</th>
                  <th>Tax & Pension Deductions</th>
                  <th>Net pay</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payrollRuns.length === 0 ? (
                  <tr>
                    <td colSpan="8" className={styles.emptyCell}>
                      No payroll runs processed yet. Click &quot;Process Monthly Payroll&quot; to execute batch salary computation.
                    </td>
                  </tr>
                ) : (
                  payrollRuns.map((run) => (
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
                          className={`${styles.statusBadge} ${
                            run.status === 'DISBURSED' ? styles.statusPaid : styles.statusProcessed
                          }`}
                        >
                          {run.status === 'DISBURSED'
                            ? 'Paid'
                            : run.status === 'PROCESSED'
                            ? 'Processed'
                            : run.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <button
                            className={styles.btnAction}
                            onClick={() => handleOpenRunBreakdown(run.id)}
                            title="View individual employee salary computations and net payments"
                          >
                            <FaUsers style={{ color: '#7c3aed' }} /> Employee Breakdown
                          </button>
                          {run.status !== 'DISBURSED' && (
                            <button
                              className={styles.btnPaid}
                              onClick={() => handleMarkPayrollPaid(run.id)}
                              disabled={loading}
                            >
                              <FaCheck /> Mark paid
                            </button>
                          )}
                          <a
                            href={`/api/v1/finance/payroll/runs/${run.id}/bank-export`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ padding: '0.35rem 0.65rem', background: '#f1f5f9', color: '#334155', borderRadius: '6px', textDecoration: 'none', fontWeight: 600, fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            <FaDownload /> Bank CSV
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: STRUCTURES */}
      {activeTab === 'structures' && (
        <div className={styles.tableCard}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Salary structures</h2>
              <p>Review each staff member’s base salary, allowances, pension, and bank details.</p>
            </div>
            <span className={styles.recordCount}>{salaryStructures.length} staff</span>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Role</th>
                  <th>Base Salary</th>
                  <th>Transport Allowance</th>
                  <th>Professional Allowance</th>
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
                    <td colSpan="10" className={styles.emptyCell}>
                      No staff salary structures configured yet. Click &quot;Salary Structure&quot; to set up staff compensation.
                    </td>
                  </tr>
                ) : (
                  salaryStructures.map((s) => {
                    const otherAllow =
                      Number(s.housing_allowance || 0) +
                      Number(s.medical_allowance || 0) +
                      Number(s.other_allowances || 0);

                    return (
                      <tr key={s.id}>
                        <td>
                          <strong>{s.first_name} {s.last_name}</strong>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.email}</div>
                        </td>
                        <td>{s.role_name || 'Staff'}</td>
                        <td style={{ fontWeight: 700 }}>{Number(s.base_salary).toLocaleString()} ETB</td>
                        <td>
                          <div>{Number(s.transport_allowance || 0).toLocaleString()} ETB</div>
                          <div style={{ fontSize: '0.7rem', color: '#059669' }}>Exempt: 600 ETB</div>
                        </td>
                        <td style={{ fontWeight: 600, color: '#4f46e5' }}>
                          {Number(s.professional_allowance || 0).toLocaleString()} ETB
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
                            style={{ padding: '0.3rem 0.6rem', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', cursor: 'pointer' }}
                            onClick={() => {
                              setStructureForm({
                                user_id: s.user_id,
                                base_salary: s.base_salary,
                                housing_allowance: s.housing_allowance,
                                transport_allowance: s.transport_allowance,
                                professional_allowance: s.professional_allowance || 0,
                                medical_allowance: s.medical_allowance,
                                other_allowances: s.other_allowances,
                                tax_rate_percentage: s.tax_rate_percentage,
                                pension_employee_percentage: s.pension_employee_percentage,
                                pension_employer_percentage: s.pension_employer_percentage,
                                bank_name: s.bank_name,
                                bank_account_number: s.bank_account_number,
                                bank_account_name: s.bank_account_name,
                              });
                              setIsStructureModalOpen(true);
                            }}
                          >
                            Edit
                          </button>
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
              <h2>My payslips</h2>
              <p>View your monthly earnings, deductions, and net take-home pay.</p>
            </div>
            <span className={styles.recordCount}>{myPayslips.length} payslips</span>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Payslip #</th>
                  <th>Month / Year</th>
                  <th>Base Salary</th>
                  <th>Allowances</th>
                  <th>Gross Pay</th>
                  <th>Deductions (Tax + Pension)</th>
                  <th>Net Take-Home Pay</th>
                  <th>Payslip</th>
                </tr>
              </thead>
              <tbody>
                {myPayslips.length === 0 ? (
                  <tr>
                    <td colSpan="8" className={styles.emptyCell}>
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

      {/* MODAL 1: PROCESS PAYROLL */}
      <ModalPortal isOpen={isProcessModalOpen} onClose={() => setIsProcessModalOpen(false)}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h3>
              <FaWallet /> Execute Monthly Payroll Run
            </h3>
            <button className={styles.closeBtn} onClick={() => setIsProcessModalOpen(false)}>
              <FaTimes />
            </button>
          </div>
          <form onSubmit={handleProcessPayroll}>
            <div className={styles.modalBody}>
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

              {/* Live Staff Salary Computation Preview */}
              <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Live Ethiopian Salary Computation Preview</span>
                  <span style={{ fontSize: '0.8rem', color: '#7c3aed', fontWeight: 600 }}>
                    {salaryStructures.length} Active Staff Structures
                  </span>
                </label>
                <div className={styles.previewBox}>
                  {salaryStructures.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '0.75rem' }}>
                      No active salary structures configured. Please configure structures first.
                    </div>
                  ) : (
                    salaryStructures.map((s) => {
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
                      });

                      return (
                        <div key={s.id} className={styles.previewItem}>
                          <div>
                            <strong>{s.first_name} {s.last_name}</strong>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              Base: {breakdown.base.toLocaleString()} ETB | Gross: {breakdown.grossSalary.toLocaleString()} ETB | Taxable: {breakdown.taxableIncome.toLocaleString()} ETB | PAYE: {breakdown.payeTax.toLocaleString()} ETB | Pension: {breakdown.pensionEmployee.toLocaleString()} ETB
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

            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnSecondary} onClick={() => setIsProcessModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className={styles.btnPrimary} disabled={loading}>
                Execute Payroll Calculation
              </button>
            </div>
          </form>
        </div>
      </ModalPortal>

      {/* MODAL 2: SALARY STRUCTURE */}
      <ModalPortal isOpen={isStructureModalOpen} onClose={() => setIsStructureModalOpen(false)}>
        <div className={`${styles.modalContent} ${styles.modalLarge}`}>
          <div className={styles.modalHeader}>
            <div>
              <h3>
                <FaUsers style={{ color: '#7c3aed' }} /> Staff Salary Structure Configuration
              </h3>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Configurable allowances with 600 ETB transport tax exemption & statutory PAYE / Pension calculation
              </div>
            </div>
            <button className={styles.closeBtn} onClick={() => setIsStructureModalOpen(false)}>
              <FaTimes />
            </button>
          </div>
          <form onSubmit={handleSaveStructure}>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Staff / Teacher Member *</label>
                <select
                  className={styles.formSelect}
                  value={structureForm.user_id}
                  onChange={(e) => setStructureForm({ ...structureForm, user_id: e.target.value })}
                  required
                >
                  <option value="">Select Staff Member</option>
                  {staffUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} ({u.role_name || u.role || 'Staff'}) - {u.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Base Monthly Salary (ETB) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className={styles.formInput}
                    placeholder="e.g. 38609"
                    value={structureForm.base_salary}
                    onChange={(e) => setStructureForm({ ...structureForm, base_salary: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>
                    Transport Allowance (ETB)
                    <span style={{ fontSize: '0.75rem', color: '#059669', marginLeft: '0.5rem', fontWeight: 500 }}>
                      (First 600 ETB tax-exempt)
                    </span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className={styles.formInput}
                    placeholder="e.g. 3860"
                    value={structureForm.transport_allowance}
                    onChange={(e) => setStructureForm({ ...structureForm, transport_allowance: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Professional Allowance (ETB)</label>
                  <input
                    type="number"
                    step="0.01"
                    className={styles.formInput}
                    placeholder="e.g. 3860"
                    value={structureForm.professional_allowance}
                    onChange={(e) => setStructureForm({ ...structureForm, professional_allowance: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Housing Allowance (ETB)</label>
                  <input
                    type="number"
                    step="0.01"
                    className={styles.formInput}
                    value={structureForm.housing_allowance}
                    onChange={(e) => setStructureForm({ ...structureForm, housing_allowance: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Medical Allowance (ETB)</label>
                  <input
                    type="number"
                    step="0.01"
                    className={styles.formInput}
                    value={structureForm.medical_allowance}
                    onChange={(e) => setStructureForm({ ...structureForm, medical_allowance: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Other Allowances (ETB)</label>
                  <input
                    type="number"
                    step="0.01"
                    className={styles.formInput}
                    value={structureForm.other_allowances}
                    onChange={(e) => setStructureForm({ ...structureForm, other_allowances: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Bank Name</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={structureForm.bank_name}
                    onChange={(e) => setStructureForm({ ...structureForm, bank_name: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Bank Account Number</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={structureForm.bank_account_number}
                    onChange={(e) => setStructureForm({ ...structureForm, bank_account_number: e.target.value })}
                  />
                </div>
              </div>

              {/* Real-time Calculation Breakdown Preview */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', marginTop: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.75rem' }}>
                  <FaCalculator style={{ color: '#7c3aed' }} /> Real-Time Statutory Calculation Preview
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.85rem' }}>
                  <div style={{ background: '#fff', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Gross Salary</div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>{structurePreview.grossSalary.toLocaleString()} ETB</div>
                  </div>
                  <div style={{ background: '#fff', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Transport Exemption</div>
                    <div style={{ fontWeight: 700, color: '#059669' }}>-{structurePreview.transportExemption.toLocaleString()} ETB</div>
                  </div>
                  <div style={{ background: '#fff', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Taxable Income</div>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{structurePreview.taxableIncome.toLocaleString()} ETB</div>
                  </div>
                  <div style={{ background: '#fff', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#64748b', fontSize: '0.75rem' }}>PAYE Income Tax</div>
                    <div style={{ fontWeight: 700, color: '#dc2626' }}>-{structurePreview.payeTax.toLocaleString()} ETB</div>
                  </div>
                  <div style={{ background: '#fff', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Employee Pension (7%)</div>
                    <div style={{ fontWeight: 700, color: '#d97706' }}>-{structurePreview.pensionEmployee.toLocaleString()} ETB</div>
                  </div>
                  <div style={{ background: '#ecfdf5', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                    <div style={{ color: '#065f46', fontSize: '0.75rem', fontWeight: 600 }}>Estimated Net Pay</div>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#059669' }}>{structurePreview.netSalary.toLocaleString()} ETB</div>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnSecondary} onClick={() => setIsStructureModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className={styles.btnPrimary} disabled={loading}>
                Save Salary Structure
              </button>
            </div>
          </form>
        </div>
      </ModalPortal>

      {/* MODAL 3: PRINTABLE PAYSLIP */}
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
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Statutory Staff Remuneration & Compensation Statement</div>
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
                </div>

                <div className={styles.payslipColumns}>
                  <div className={styles.payslipBox}>
                    <h4 style={{ color: '#059669', marginBottom: '0.5rem' }}>Gross Earnings</h4>
                    <div className={styles.payslipLine}>
                      <span>Base Salary:</span>
                      <span>{Number(activePayslip.base_salary).toLocaleString()} ETB</span>
                    </div>
                    {Number(activePayslip.professional_allowance) > 0 && (
                      <div className={styles.payslipLine}>
                        <span>Professional Allowance:</span>
                        <span>+{Number(activePayslip.professional_allowance).toLocaleString()} ETB</span>
                      </div>
                    )}
                    {(activePayslip.items || [])
                      .filter((i) => i.item_type === 'ALLOWANCE' && i.name !== 'Professional Allowance')
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
                <FaUsers style={{ color: '#7c3aed' }} /> Employee Salary Computation & Net Payments
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
                    <span className={styles.statPillLabel}>Tax & Pension Deductions</span>
                    <span className={styles.statPillValue} style={{ color: '#dc2626' }}>
                      {Number(selectedRunDetails.total_deductions_amount || 0).toLocaleString()} ETB
                    </span>
                  </div>
                  <div className={styles.statPill} style={{ background: '#ecfdf5', borderColor: '#a7f3d0' }}>
                    <span className={styles.statPillLabel} style={{ color: '#065f46' }}>
                      {selectedRunDetails.status === 'DISBURSED' ? 'Total net paid' : 'Total net pay'}
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
                        <th>Base Salary</th>
                        <th>Allowances</th>
                        <th>Gross Salary</th>
                        <th>Taxable Income</th>
                        <th>PAYE Tax</th>
                        <th>Pension (7%)</th>
                        <th>Total Deductions</th>
                        <th>Net Payment</th>
                        <th>Bank Account</th>
                        <th>Action</th>
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
                            <td>{Number(ps.base_salary).toLocaleString()} ETB</td>
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
                              <button
                                className={styles.btnAction}
                                onClick={() => handleOpenPayslipModal(ps.id)}
                                title="Print / View Official Payslip"
                              >
                                <FaPrint /> Payslip
                              </button>
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
              <a
                href={`/api/v1/finance/payroll/runs/${selectedRunDetails.id}/bank-export`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.btnPrimary}
                style={{ textDecoration: 'none' }}
              >
                <FaDownload /> Export Bank CSV
              </a>
            )}
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}
