'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  FaUniversity,
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
    medical_allowance: 0,
    other_allowances: 0,
    tax_rate_percentage: 0,
    pension_employee_percentage: 7.0,
    pension_employer_percentage: 11.0,
    bank_name: 'Commercial Bank of Ethiopia (CBE)',
    bank_account_number: '',
    bank_account_name: '',
  });

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

  const handleDisbursePayroll = async (runId) => {
    if (!window.confirm('Mark this payroll as disbursed and release official payslips to staff?')) return;
    try {
      setLoading(true);
      await financeApi.disbursePayroll(runId);
      setSuccessMsg('Payroll run disbursed and payslips released!');
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
        medical_allowance: Number(structureForm.medical_allowance) || 0,
        other_allowances: Number(structureForm.other_allowances) || 0,
      });
      setSuccessMsg('Staff salary structure updated');
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

  const totalPayrollOutflow = payrollRuns
    .filter((r) => r.status === 'DISBURSED')
    .reduce((sum, r) => sum + Number(r.total_net_amount), 0);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.title}>
            <FaWallet style={{ color: '#7c3aed' }} />
            Staff Payroll & Compensation Management
          </div>
          <div className={styles.subtitle}>
            Manage staff salary structures, execute monthly automated payroll calculations, and issue digital payslips.
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
          <button className={styles.btnSecondary} onClick={() => loadRuns()}>
            <HiOutlineArrowPath /> Refresh
          </button>
        </div>
      </div>

      {successMsg && (
        <div style={{ background: '#ecfdf5', color: '#065f46', padding: '0.75rem 1rem', borderRadius: '10px' }}>
          {successMsg}
        </div>
      )}
      {error && (
        <div style={{ background: '#fef2f2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '10px' }}>
          {error}
        </div>
      )}

      {/* KPI Cards */}
      {!isTeacherOrStaff && (
        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon} style={{ background: '#f5f3ff', color: '#7c3aed' }}>
              <FaMoneyBillWave />
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Total Disbursed Payroll</span>
              <span className={styles.kpiValue} style={{ color: '#7c3aed' }}>
                {totalPayrollOutflow.toLocaleString()} ETB
              </span>
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon} style={{ background: '#e0e7ff', color: '#4f46e5' }}>
              <FaUsers />
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Configured Staff</span>
              <span className={styles.kpiValue}>{salaryStructures.length}</span>
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon} style={{ background: '#dcfce7', color: '#059669' }}>
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
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Batch Reference</th>
                  <th>Month / Year</th>
                  <th>Staff Count</th>
                  <th>Gross Salary</th>
                  <th>Tax & Pension Deductions</th>
                  <th>Net Disbursed</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payrollRuns.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      No payroll runs processed yet. Click "Process Monthly Payroll" to execute batch salary computation.
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
                          {run.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          {run.status !== 'DISBURSED' && (
                            <button
                              style={{ padding: '0.35rem 0.65rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                              onClick={() => handleDisbursePayroll(run.id)}
                            >
                              <FaCheck /> Disburse
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
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Role</th>
                  <th>Base Salary</th>
                  <th>Allowances (Housing + Trans + Med)</th>
                  <th>Pension (Emp/Emplr)</th>
                  <th>Bank Account</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {salaryStructures.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      No staff salary structures configured yet. Click "Salary Structure" to set up staff compensation.
                    </td>
                  </tr>
                ) : (
                  salaryStructures.map((s) => {
                    const totalAllow =
                      Number(s.housing_allowance || 0) +
                      Number(s.transport_allowance || 0) +
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
                        <td>+{totalAllow.toLocaleString()} ETB</td>
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
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
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
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h3>
              <FaUsers /> Staff Salary Structure Configuration
            </h3>
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
                    value={structureForm.base_salary}
                    onChange={(e) => setStructureForm({ ...structureForm, base_salary: e.target.value })}
                    required
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
                  <label>Transport Allowance (ETB)</label>
                  <input
                    type="number"
                    step="0.01"
                    className={styles.formInput}
                    value={structureForm.transport_allowance}
                    onChange={(e) => setStructureForm({ ...structureForm, transport_allowance: e.target.value })}
                  />
                </div>
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
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Staff Compensation & Remuneration Slip</div>
                  <div className={styles.payslipTitle}>
                    PAYSLIP: {new Date(activePayslip.year, activePayslip.month - 1).toLocaleString('default', { month: 'long' })}{' '}
                    {activePayslip.year}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <div><strong>Employee:</strong> {activePayslip.first_name} {activePayslip.last_name}</div>
                  <div><strong>Role:</strong> {activePayslip.role_name || 'Staff'}</div>
                  <div><strong>Payslip #:</strong> {activePayslip.payslip_number}</div>
                  <div><strong>Bank Account:</strong> {activePayslip.bank_account_number || 'N/A'}</div>
                </div>

                <div className={styles.payslipColumns}>
                  <div className={styles.payslipBox}>
                    <h4 style={{ color: '#059669' }}>Gross Earnings</h4>
                    <div className={styles.payslipLine}>
                      <span>Base Salary:</span>
                      <span>{Number(activePayslip.base_salary).toLocaleString()} ETB</span>
                    </div>
                    {(activePayslip.items || [])
                      .filter((i) => i.item_type === 'ALLOWANCE')
                      .map((item, idx) => (
                        <div key={idx} className={styles.payslipLine}>
                          <span>{item.name}:</span>
                          <span>+{Number(item.amount).toLocaleString()} ETB</span>
                        </div>
                      ))}
                    <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '0.4rem', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                      <span>Gross Pay:</span>
                      <span>{Number(activePayslip.gross_salary).toLocaleString()} ETB</span>
                    </div>
                  </div>

                  <div className={styles.payslipBox}>
                    <h4 style={{ color: '#dc2626' }}>Statutory Deductions</h4>
                    <div className={styles.payslipLine}>
                      <span>Pension (Employee):</span>
                      <span>-{Number(activePayslip.pension_employee_deduction).toLocaleString()} ETB</span>
                    </div>
                    <div className={styles.payslipLine}>
                      <span>Income Tax:</span>
                      <span>-{Number(activePayslip.tax_deduction).toLocaleString()} ETB</span>
                    </div>
                    <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '0.4rem', fontWeight: 700, display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                      <span>Total Deductions:</span>
                      <span>-{Number(activePayslip.total_deductions).toLocaleString()} ETB</span>
                    </div>
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
    </div>
  );
}
