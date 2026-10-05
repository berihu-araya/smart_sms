'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styles from './page.module.css';
import { useAuth } from '@/hooks/useAuth';
import * as financeApi from '@/services/financeService';
import { listStudents } from '@/services/studentService';
import { listGrades } from '@/services/gradeService';
import { listSections } from '@/services/sectionService';
import { listAcademicYears } from '@/services/academicYearService';
import {
  FaMoneyBillWave,
  FaReceipt,
  FaFileInvoiceDollar,
  FaPlus,
  FaSearch,
  FaFilter,
  FaCheck,
  FaTimes,
  FaPrint,
  FaUniversity,
  FaEye,
  FaBan,
  FaCalendarAlt,
  FaLayerGroup,
  FaUserGraduate,
  FaTag,
  FaPercentage,
  FaExclamationTriangle,
  FaUpload,
  FaHistory,
  FaCheckCircle,
} from 'react-icons/fa';
import {
  HiOutlineCurrencyDollar,
  HiOutlineClipboardDocumentCheck,
  HiOutlineArrowPath,
  HiOutlineBanknotes,
} from 'react-icons/hi2';

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

export default function FeesManagementPage() {
  const { user } = useAuth();
  const userRole = (user?.role || '').toLowerCase();
  const isParentOrStudent = userRole === 'parent' || userRole === 'student';

  const [activeTab, setActiveTab] = useState(isParentOrStudent ? 'my_fees' : 'invoices');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Core Data States
  const [kpis, setKpis] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [myInvoices, setMyInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [feeStructures, setFeeStructures] = useState([]);
  const [feeCategories, setFeeCategories] = useState([]);
  const [feeDiscounts, setFeeDiscounts] = useState([]);
  const [bankSlips, setBankSlips] = useState([]);

  // Auxiliary Options
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState([]);
  const [sections, setSections] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isSingleInvoiceModalOpen, setIsSingleInvoiceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isSlipReviewModalOpen, setIsSlipReviewModalOpen] = useState(false);
  const [isSlipUploadModalOpen, setIsSlipUploadModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Selected Records for Modals
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [activePaymentReceipt, setActivePaymentReceipt] = useState(null);
  const [activeBankSlip, setActiveBankSlip] = useState(null);

  // Form States
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'CASH',
    payment_date: new Date().toISOString().slice(0, 10),
    transaction_reference: '',
    bank_name: 'Commercial Bank of Ethiopia (CBE)',
    remarks: '',
  });

  const [batchForm, setBatchForm] = useState({
    academic_year_id: '',
    grade_id: '',
    section_id: '',
    title: `${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()} Tuition Fee`,
    month: new Date().getMonth() + 1,
    term_name: 'Term 1',
    due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  });

  const [singleInvoiceForm, setSingleInvoiceForm] = useState({
    student_id: '',
    academic_year_id: '',
    title: 'Tuition Fee Invoice',
    month: new Date().getMonth() + 1,
    term_name: 'Term 1',
    due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    fee_category_id: '',
    amount: '',
    description: 'Tuition and educational services fee',
  });

  const [structureForm, setStructureForm] = useState({
    academic_year_id: '',
    grade_id: '',
    fee_category_id: '',
    name: 'Tuition Fee',
    amount: '',
    frequency: 'MONTHLY',
    due_day_of_month: 10,
    late_fine_amount: 0,
    grace_period_days: 5,
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    code: '',
    description: '',
    is_refundable: false,
  });

  const [discountForm, setDiscountForm] = useState({
    name: '',
    code: '',
    discount_type: 'PERCENTAGE',
    value: '',
    description: '',
  });

  const [slipUploadForm, setSlipUploadForm] = useState({
    invoice_id: '',
    student_id: '',
    bank_name: 'Commercial Bank of Ethiopia (CBE)',
    reference_number: '',
    amount: '',
    deposit_date: new Date().toISOString().slice(0, 10),
    slip_attachment_url: '',
  });

  // Load KPI overview
  const loadKpis = useCallback(async () => {
    try {
      const res = await financeApi.getFinanceOverviewKPIs();
      setKpis(res.data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Load Invoices
  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await financeApi.listInvoices({
        grade_id: selectedGrade,
        status: selectedStatus,
        search: searchTerm,
      });
      setInvoices(res.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedGrade, selectedStatus, searchTerm]);

  // Load My Invoices (Parent / Student)
  const loadMyInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await financeApi.getMyInvoices();
      setMyInvoices(res.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Structures, Categories, Discounts
  const loadMasterData = useCallback(async () => {
    try {
      const [strRes, catRes, discRes] = await Promise.all([
        financeApi.listFeeStructures(),
        financeApi.listFeeCategories(),
        financeApi.listFeeDiscounts(),
      ]);
      setFeeStructures(strRes.data || []);
      setFeeCategories(catRes.data || []);
      setFeeDiscounts(discRes.data || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Load Payments
  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await financeApi.listPayments({ search: searchTerm });
      setPayments(res.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  // Load Bank Slips
  const loadBankSlips = useCallback(async () => {
    try {
      setLoading(true);
      const res = await financeApi.listBankSlips();
      setBankSlips(res.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Auxiliary Dropdowns
  useEffect(() => {
    function extractItems(res) {
      if (!res) return [];
      if (Array.isArray(res)) return res;
      if (Array.isArray(res.items)) return res.items;
      if (Array.isArray(res.data)) return res.data;
      if (Array.isArray(res.data?.items)) return res.data.items;
      return [];
    }

    async function loadAux() {
      try {
        const [stRes, grRes, secRes, ayRes] = await Promise.all([
          listStudents({ limit: 500 }).catch(() => []),
          listGrades({ limit: 100 }).catch(() => []),
          listSections({ limit: 100 }).catch(() => []),
          listAcademicYears({ limit: 100 }).catch(() => []),
        ]);
        const stList = extractItems(stRes);
        const grList = extractItems(grRes);
        const secList = extractItems(secRes);
        const ayList = extractItems(ayRes);

        setStudents(stList);
        setGrades(grList);
        setSections(secList);
        setAcademicYears(ayList);

        const activeYear = ayList.find((y) => y.is_active);
        if (activeYear) {
          setBatchForm((prev) => ({ ...prev, academic_year_id: activeYear.id }));
          setSingleInvoiceForm((prev) => ({ ...prev, academic_year_id: activeYear.id }));
          setStructureForm((prev) => ({ ...prev, academic_year_id: activeYear.id }));
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadAux();
  }, []);

  useEffect(() => {
    if (!isParentOrStudent) {
      loadKpis();
    }
  }, [isParentOrStudent, loadKpis]);

  useEffect(() => {
    if (activeTab === 'invoices') loadInvoices();
    if (activeTab === 'my_fees') loadMyInvoices();
    if (activeTab === 'structures') loadMasterData();
    if (activeTab === 'payments') loadPayments();
    if (activeTab === 'bank_slips') loadBankSlips();
  }, [activeTab, loadInvoices, loadMyInvoices, loadMasterData, loadPayments, loadBankSlips]);

  // Handlers
  const handleOpenPaymentModal = (invoice) => {
    setActiveInvoice(invoice);
    setPaymentForm({
      amount: invoice.balance_amount,
      payment_method: 'CASH',
      payment_date: new Date().toISOString().slice(0, 10),
      transaction_reference: '',
      bank_name: 'Commercial Bank of Ethiopia (CBE)',
      remarks: '',
    });
    setIsPaymentModalOpen(true);
  };

  const handleRecordPaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const res = await financeApi.recordPayment({
        invoice_id: activeInvoice.id,
        amount: Number(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        payment_date: paymentForm.payment_date,
        transaction_reference: paymentForm.transaction_reference,
        bank_name: paymentForm.bank_name,
        remarks: paymentForm.remarks,
      });
      setSuccessMsg(`Payment recorded! Receipt #${res.data.receipt_number} issued.`);
      setIsPaymentModalOpen(false);
      loadInvoices();
      loadKpis();

      // Open printable receipt immediately
      const receiptData = await financeApi.getPaymentById(res.data.id);
      setActivePaymentReceipt(receiptData.data);
      setIsReceiptModalOpen(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSingleInvoiceSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const student = students.find((s) => s.id === singleInvoiceForm.student_id);
      await financeApi.createInvoice({
        student_id: singleInvoiceForm.student_id,
        academic_year_id: singleInvoiceForm.academic_year_id,
        grade_id: student?.grade_id || undefined,
        section_id: student?.section_id || undefined,
        title: singleInvoiceForm.title,
        month: Number(singleInvoiceForm.month) || undefined,
        term_name: singleInvoiceForm.term_name,
        due_date: singleInvoiceForm.due_date,
        items: [
          {
            fee_category_id: singleInvoiceForm.fee_category_id,
            description: singleInvoiceForm.description || singleInvoiceForm.title,
            base_amount: Number(singleInvoiceForm.amount),
          },
        ],
      });
      setSuccessMsg('Student invoice created successfully');
      setIsSingleInvoiceModalOpen(false);
      loadInvoices();
      loadKpis();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchGenerateSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const res = await financeApi.generateBatchInvoices(batchForm);
      setSuccessMsg(`Successfully generated ${res.data.totalGenerated} invoices (Total: ${res.data.totalAmount} ETB)`);
      setIsBatchModalOpen(false);
      loadInvoices();
      loadKpis();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStructureSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await financeApi.createFeeStructure(structureForm);
      setSuccessMsg('Fee structure created successfully');
      setIsStructureModalOpen(false);
      loadMasterData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await financeApi.createFeeCategory(categoryForm);
      setSuccessMsg('Fee category registered successfully');
      setIsCategoryModalOpen(false);
      loadMasterData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDiscountSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await financeApi.createFeeDiscount(discountForm);
      setSuccessMsg('Scholarship/Discount rule created');
      setIsDiscountModalOpen(false);
      loadMasterData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBankSlipReview = async (action) => {
    try {
      setLoading(true);
      setError(null);
      await financeApi.reviewBankSlip(activeBankSlip.id, {
        action,
        remarks: action === 'APPROVE' ? 'Verified by cashier' : 'Invalid transaction reference',
      });
      setSuccessMsg(`Bank slip has been ${action.toLowerCase()}ed.`);
      setIsSlipReviewModalOpen(false);
      loadBankSlips();
      loadKpis();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelInvoice = async (invoiceId) => {
    if (!window.confirm('Are you sure you want to cancel this unpaid invoice?')) return;
    try {
      setLoading(true);
      await financeApi.cancelInvoice(invoiceId, 'Administrative cancellation');
      setSuccessMsg('Invoice cancelled successfully');
      loadInvoices();
      loadKpis();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReceiptModal = async (paymentId) => {
    try {
      setLoading(true);
      const res = await financeApi.getPaymentById(paymentId);
      setActivePaymentReceipt(res.data);
      setIsReceiptModalOpen(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.title}>
            <HiOutlineBanknotes style={{ color: '#4f46e5' }} />
            Student Fee & Tuition Management
            <span className={styles.roleBadge}>{userRole}</span>
          </div>
          <div className={styles.subtitle}>
            Configure fee structures, generate batch invoices, accept multi-channel payments, and review bank slips.
          </div>
        </div>

        <div className={styles.headerActions}>
          {!isParentOrStudent && (
            <>
              <button className={styles.btnPrimary} onClick={() => setIsSingleInvoiceModalOpen(true)}>
                <FaPlus /> Student Invoice
              </button>
              <button className={styles.btnSecondary} onClick={() => setIsBatchModalOpen(true)}>
                <FaLayerGroup /> Batch Invoices
              </button>
              <button className={styles.btnSecondary} onClick={() => setIsStructureModalOpen(true)}>
                <FaPlus /> Fee Master
              </button>
            </>
          )}
          <button className={styles.btnSecondary} onClick={() => (activeTab === 'invoices' ? loadInvoices() : loadMasterData())}>
            <HiOutlineArrowPath /> Refresh
          </button>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className={styles.alertSuccess}>
          <FaCheckCircle /> {successMsg}
          <button style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setSuccessMsg(null)}>
            <FaTimes />
          </button>
        </div>
      )}
      {error && (
        <div className={styles.alertError}>
          <FaExclamationTriangle /> {error}
          <button style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setError(null)}>
            <FaTimes />
          </button>
        </div>
      )}

      {/* KPI Overview Cards */}
      {!isParentOrStudent && kpis && (
        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon} style={{ background: '#e0e7ff', color: '#4f46e5' }}>
              <FaFileInvoiceDollar />
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Total Invoiced</span>
              <span className={styles.kpiValue}>{Number(kpis.totalInvoiced).toLocaleString()} ETB</span>
              <span className={styles.kpiSubtext}>{kpis.totalInvoicesCount} invoices issued</span>
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon} style={{ background: '#dcfce7', color: '#059669' }}>
              <FaMoneyBillWave />
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Total Collected</span>
              <span className={styles.kpiValue} style={{ color: '#059669' }}>
                {Number(kpis.totalCollected).toLocaleString()} ETB
              </span>
              <span className={styles.kpiSubtext}>{kpis.collectionEfficiency}% collection rate</span>
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon} style={{ background: '#fee2e2', color: '#dc2626' }}>
              <FaReceipt />
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Total Outstanding</span>
              <span className={styles.kpiValue} style={{ color: '#dc2626' }}>
                {Number(kpis.totalOutstanding).toLocaleString()} ETB
              </span>
              <span className={styles.kpiSubtext}>{kpis.overdueInvoicesCount} overdue bills</span>
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon} style={{ background: '#fef3c7', color: '#d97706' }}>
              <FaUniversity />
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Bank Slips Review</span>
              <span className={styles.kpiValue}>{kpis.pendingBankSlipsCount}</span>
              <span className={styles.kpiSubtext}>Pending accountant review</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className={styles.tabsNav}>
        {!isParentOrStudent && (
          <>
            <button
              className={`${styles.tabBtn} ${activeTab === 'invoices' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('invoices')}
            >
              <FaFileInvoiceDollar /> Invoices & Billing
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'structures' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('structures')}
            >
              <FaLayerGroup /> Fee Master & Structures
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'payments' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('payments')}
            >
              <FaMoneyBillWave /> Payment Receipts
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'bank_slips' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('bank_slips')}
            >
              <FaUniversity /> Bank Slip Verification
              {kpis?.pendingBankSlipsCount > 0 && <span className={styles.tabBadge}>{kpis.pendingBankSlipsCount}</span>}
            </button>
          </>
        )}
        {isParentOrStudent && (
          <button
            className={`${styles.tabBtn} ${activeTab === 'my_fees' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('my_fees')}
          >
            <FaUserGraduate /> My Fee Invoices & Statements
          </button>
        )}
      </div>

      {/* TAB 1: INVOICES & BILLING */}
      {activeTab === 'invoices' && (
        <>
          <div className={styles.filterBar}>
            <div className={styles.searchGroup}>
              <FaSearch color="#94a3b8" />
              <input
                type="text"
                placeholder="Search invoice #, student name, admission #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className={styles.filterControls}>
              <select className={styles.filterSelect} value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)}>
                <option value="">All Grades</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>

              <select className={styles.filterSelect} value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="UNPAID">Unpaid</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="PAID">Paid</option>
                <option value="OVERDUE">Overdue</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          <div className={styles.tableCard}>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Student Name</th>
                    <th>Grade / Class</th>
                    <th>Title / Billing Period</th>
                    <th>Due Date</th>
                    <th>Total Amount</th>
                    <th>Paid</th>
                    <th>Balance Due</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan="10" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                        No invoices found. Use "Batch Invoices" to generate billing records for students.
                      </td>
                    </tr>
                  ) : (
                    invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td style={{ fontWeight: 700, color: '#4f46e5' }}>{inv.invoice_number}</td>
                        <td>
                          <strong>{inv.student_first_name} {inv.student_last_name}</strong>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Adm: {inv.student_admission_number}</div>
                        </td>
                        <td>{inv.grade_name || 'N/A'} {inv.section_name ? `(${inv.section_name})` : ''}</td>
                        <td>{inv.title}</td>
                        <td style={{ color: new Date(inv.due_date) < new Date() && inv.status !== 'PAID' ? '#dc2626' : 'inherit' }}>
                          {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td style={{ fontWeight: 700 }}>{Number(inv.total_amount).toLocaleString()} ETB</td>
                        <td style={{ color: '#059669', fontWeight: 600 }}>{Number(inv.paid_amount).toLocaleString()} ETB</td>
                        <td style={{ color: Number(inv.balance_amount) > 0 ? '#dc2626' : '#64748b', fontWeight: 700 }}>
                          {Number(inv.balance_amount).toLocaleString()} ETB
                        </td>
                        <td>
                          <span
                            className={`${styles.statusBadge} ${
                              inv.status === 'PAID'
                                ? styles.statusPaid
                                : inv.status === 'PARTIALLY_PAID'
                                ? styles.statusPartial
                                : inv.status === 'CANCELLED'
                                ? styles.statusCancelled
                                : styles.statusUnpaid
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td>
                          <div className={styles.actionBtns}>
                            {Number(inv.balance_amount) > 0 && inv.status !== 'CANCELLED' && (
                              <button className={`${styles.btnAction} ${styles.btnActionPay}`} onClick={() => handleOpenPaymentModal(inv)}>
                                <FaMoneyBillWave /> Pay
                              </button>
                            )}
                            {Number(inv.paid_amount) === 0 && inv.status !== 'CANCELLED' && (
                              <button className={`${styles.btnAction} ${styles.btnActionCancel}`} onClick={() => handleCancelInvoice(inv.id)}>
                                <FaBan />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: FEE MASTER & STRUCTURES */}
      {activeTab === 'structures' && (
        <>
          <div className={styles.filterBar}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className={styles.btnPrimary} onClick={() => setIsStructureModalOpen(true)}>
                <FaPlus /> New Fee Structure
              </button>
              <button className={styles.btnSecondary} onClick={() => setIsCategoryModalOpen(true)}>
                <FaTag /> Fee Categories ({feeCategories.length})
              </button>
              <button className={styles.btnSecondary} onClick={() => setIsDiscountModalOpen(true)}>
                <FaPercentage /> Discounts & Waivers ({feeDiscounts.length})
              </button>
            </div>
          </div>

          <div className={styles.tableCard}>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Structure Name</th>
                    <th>Category</th>
                    <th>Grade Allocation</th>
                    <th>Amount (ETB)</th>
                    <th>Frequency</th>
                    <th>Due Day</th>
                    <th>Grace Period</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {feeStructures.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                        No fee structures defined yet. Click "New Fee Structure" to configure class fees.
                      </td>
                    </tr>
                  ) : (
                    feeStructures.map((fs) => (
                      <tr key={fs.id}>
                        <td style={{ fontWeight: 700, color: '#0f172a' }}>{fs.name}</td>
                        <td>
                          <span style={{ padding: '0.2rem 0.5rem', background: '#f1f5f9', borderRadius: '6px', fontWeight: 600 }}>
                            {fs.category_name} ({fs.category_code})
                          </span>
                        </td>
                        <td>{fs.grade_name || 'All Grades'}</td>
                        <td style={{ fontWeight: 800, color: '#4f46e5' }}>{Number(fs.amount).toLocaleString()} ETB</td>
                        <td>{fs.frequency}</td>
                        <td>Day {fs.due_day_of_month || 10}</td>
                        <td>{fs.grace_period_days || 0} days</td>
                        <td>
                          <span className={`${styles.statusBadge} ${fs.is_active ? styles.statusPaid : styles.statusCancelled}`}>
                            {fs.is_active ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TAB 3: PAYMENT RECEIPTS */}
      {activeTab === 'payments' && (
        <div className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Student Name</th>
                  <th>Invoice Title</th>
                  <th>Payment Method</th>
                  <th>Payment Date</th>
                  <th>Amount Paid</th>
                  <th>Cashier / Collector</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      No payment transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 700, color: '#059669' }}>{p.receipt_number}</td>
                      <td>
                        <strong>{p.student_first_name} {p.student_last_name}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Adm: {p.student_admission_number}</div>
                      </td>
                      <td>{p.invoice_title}</td>
                      <td>
                        <span style={{ padding: '0.2rem 0.6rem', background: '#f0fdf4', color: '#15803d', borderRadius: '6px', fontWeight: 600 }}>
                          {p.payment_method}
                        </span>
                      </td>
                      <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                      <td style={{ fontWeight: 800, color: '#059669' }}>{Number(p.amount).toLocaleString()} ETB</td>
                      <td>{p.received_by_first_name} {p.received_by_last_name}</td>
                      <td>
                        <button className={styles.btnAction} onClick={() => handleOpenReceiptModal(p.id)}>
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

      {/* TAB 4: BANK SLIP VERIFICATION DESK */}
      {activeTab === 'bank_slips' && (
        <div className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Submission Date</th>
                  <th>Student Name</th>
                  <th>Invoice #</th>
                  <th>Bank Name</th>
                  <th>Ref #</th>
                  <th>Amount</th>
                  <th>Slip Image</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bankSlips.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      No bank deposit slips pending verification.
                    </td>
                  </tr>
                ) : (
                  bankSlips.map((slip) => (
                    <tr key={slip.id}>
                      <td>{new Date(slip.created_at).toLocaleDateString()}</td>
                      <td>
                        <strong>{slip.student_first_name} {slip.student_last_name}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Adm: {slip.student_admission_number}</div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{slip.invoice_number}</td>
                      <td>{slip.bank_name}</td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{slip.reference_number}</td>
                      <td style={{ fontWeight: 800, color: '#059669' }}>{Number(slip.amount).toLocaleString()} ETB</td>
                      <td>
                        <a href={slip.slip_attachment_url} target="_blank" rel="noopener noreferrer" style={{ color: '#4f46e5', fontWeight: 600 }}>
                          View Slip Proof
                        </a>
                      </td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            slip.status === 'APPROVED'
                              ? styles.statusPaid
                              : slip.status === 'REJECTED'
                              ? styles.statusUnpaid
                              : styles.statusPartial
                          }`}
                        >
                          {slip.status}
                        </span>
                      </td>
                      <td>
                        {slip.status === 'PENDING' && (
                          <div className={styles.actionBtns}>
                            <button
                              className={`${styles.btnAction} ${styles.btnActionPay}`}
                              onClick={() => {
                                setActiveBankSlip(slip);
                                setIsSlipReviewModalOpen(true);
                              }}
                            >
                              <FaCheck /> Review
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: MY FEES (STUDENT & PARENT PORTAL) */}
      {activeTab === 'my_fees' && (
        <div className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Student Name</th>
                  <th>Class</th>
                  <th>Billing Title</th>
                  <th>Due Date</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Outstanding Balance</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {myInvoices.length === 0 ? (
                  <tr>
                    <td colSpan="10" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      No fee records found for your account.
                    </td>
                  </tr>
                ) : (
                  myInvoices.map((inv) => (
                    <tr key={inv.id}>
                      <td style={{ fontWeight: 700, color: '#4f46e5' }}>{inv.invoice_number}</td>
                      <td><strong>{inv.student_first_name} {inv.student_last_name}</strong></td>
                      <td>{inv.grade_name} {inv.section_name ? `(${inv.section_name})` : ''}</td>
                      <td>{inv.title}</td>
                      <td>{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}</td>
                      <td style={{ fontWeight: 700 }}>{Number(inv.total_amount).toLocaleString()} ETB</td>
                      <td style={{ color: '#059669', fontWeight: 600 }}>{Number(inv.paid_amount).toLocaleString()} ETB</td>
                      <td style={{ color: Number(inv.balance_amount) > 0 ? '#dc2626' : '#64748b', fontWeight: 800 }}>
                        {Number(inv.balance_amount).toLocaleString()} ETB
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${inv.status === 'PAID' ? styles.statusPaid : styles.statusUnpaid}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td>
                        {Number(inv.balance_amount) > 0 && (
                          <button
                            className={`${styles.btnAction} ${styles.btnActionPay}`}
                            onClick={() => {
                              setSlipUploadForm((prev) => ({
                                ...prev,
                                invoice_id: inv.id,
                                student_id: inv.student_id,
                                amount: inv.balance_amount,
                              }));
                              setIsSlipUploadModalOpen(true);
                            }}
                          >
                            <FaUpload /> Upload Bank Slip
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: RECORD PAYMENT */}
      <ModalPortal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h3>
              <FaMoneyBillWave /> Record Fee Payment
            </h3>
            <button className={styles.closeBtn} onClick={() => setIsPaymentModalOpen(false)}>
              <FaTimes />
            </button>
          </div>
          <form onSubmit={handleRecordPaymentSubmit}>
            <div className={styles.modalBody}>
              {activeInvoice && (
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div><strong>Student:</strong> {activeInvoice.student_first_name} {activeInvoice.student_last_name}</div>
                  <div><strong>Invoice #:</strong> {activeInvoice.invoice_number} ({activeInvoice.title})</div>
                  <div><strong>Outstanding Balance:</strong> <span style={{ color: '#dc2626', fontWeight: 800 }}>{Number(activeInvoice.balance_amount).toLocaleString()} ETB</span></div>
                </div>
              )}

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Amount to Pay (ETB) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className={styles.formInput}
                    value={paymentForm.amount}
                    max={activeInvoice?.balance_amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Payment Method *</label>
                  <select
                    className={styles.formSelect}
                    value={paymentForm.payment_method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                  >
                    <option value="CASH">Cash (Hand-to-Hand)</option>
                    <option value="BANK_TRANSFER">Bank Transfer (CBE / Awash)</option>
                    <option value="TELEBIRR">Telebirr SuperApp</option>
                    <option value="CBE_BIRR">CBE Birr</option>
                    <option value="CARD">POS / Debit Card</option>
                    <option value="CHECK">Bank Cheque</option>
                  </select>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Bank Name</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={paymentForm.bank_name}
                    onChange={(e) => setPaymentForm({ ...paymentForm, bank_name: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Transaction / Ref Number</label>
                  <input
                    type="text"
                    placeholder="e.g. FT262788910X"
                    className={styles.formInput}
                    value={paymentForm.transaction_reference}
                    onChange={(e) => setPaymentForm({ ...paymentForm, transaction_reference: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Remarks / Notes</label>
                <textarea
                  className={styles.formTextarea}
                  placeholder="Additional cashier remarks..."
                  value={paymentForm.remarks}
                  onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnSecondary} onClick={() => setIsPaymentModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className={styles.btnSuccess} disabled={loading}>
                <FaCheck /> Confirm Payment & Print Receipt
              </button>
            </div>
          </form>
        </div>
      </ModalPortal>

      {/* MODAL: SINGLE STUDENT INVOICE */}
      <ModalPortal isOpen={isSingleInvoiceModalOpen} onClose={() => setIsSingleInvoiceModalOpen(false)}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h3>
              <FaFileInvoiceDollar /> Issue Student Invoice
            </h3>
            <button className={styles.closeBtn} onClick={() => setIsSingleInvoiceModalOpen(false)}>
              <FaTimes />
            </button>
          </div>
          <form onSubmit={handleSingleInvoiceSubmit}>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Target Student *</label>
                <select
                  className={styles.formSelect}
                  value={singleInvoiceForm.student_id}
                  onChange={(e) => setSingleInvoiceForm({ ...singleInvoiceForm, student_id: e.target.value })}
                  required
                >
                  <option value="">Select Student</option>
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.first_name} {st.last_name} ({st.admission_number || 'No ID'}) - {st.grade_name || 'Grade'} {st.section_name || ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Academic Year *</label>
                  <select
                    className={styles.formSelect}
                    value={singleInvoiceForm.academic_year_id}
                    onChange={(e) => setSingleInvoiceForm({ ...singleInvoiceForm, academic_year_id: e.target.value })}
                    required
                  >
                    <option value="">Select Academic Year</option>
                    {academicYears.map((ay) => (
                      <option key={ay.id} value={ay.id}>
                        {ay.name} {ay.is_active ? '(Active)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Fee Category *</label>
                  <select
                    className={styles.formSelect}
                    value={singleInvoiceForm.fee_category_id}
                    onChange={(e) => setSingleInvoiceForm({ ...singleInvoiceForm, fee_category_id: e.target.value })}
                    required
                  >
                    <option value="">Select Category</option>
                    {feeCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Invoice Title *</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={singleInvoiceForm.title}
                  onChange={(e) => setSingleInvoiceForm({ ...singleInvoiceForm, title: e.target.value })}
                  required
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Amount (ETB) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={styles.formInput}
                    value={singleInvoiceForm.amount}
                    onChange={(e) => setSingleInvoiceForm({ ...singleInvoiceForm, amount: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Payment Due Date *</label>
                  <input
                    type="date"
                    className={styles.formInput}
                    value={singleInvoiceForm.due_date}
                    onChange={(e) => setSingleInvoiceForm({ ...singleInvoiceForm, due_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Description / Line Item Details</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={singleInvoiceForm.description}
                  onChange={(e) => setSingleInvoiceForm({ ...singleInvoiceForm, description: e.target.value })}
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnSecondary} onClick={() => setIsSingleInvoiceModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className={styles.btnPrimary} disabled={loading}>
                <FaFileInvoiceDollar /> Issue Invoice
              </button>
            </div>
          </form>
        </div>
      </ModalPortal>

      {/* MODAL 2: BATCH INVOICE GENERATOR */}
      <ModalPortal isOpen={isBatchModalOpen} onClose={() => setIsBatchModalOpen(false)}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h3>
              <FaLayerGroup /> Generate Batch Invoices
            </h3>
            <button className={styles.closeBtn} onClick={() => setIsBatchModalOpen(false)}>
              <FaTimes />
            </button>
          </div>
          <form onSubmit={handleBatchGenerateSubmit}>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Academic Year *</label>
                <select
                  className={styles.formSelect}
                  value={batchForm.academic_year_id}
                  onChange={(e) => setBatchForm({ ...batchForm, academic_year_id: e.target.value })}
                  required
                >
                  <option value="">Select Academic Year</option>
                  {academicYears.map((ay) => (
                    <option key={ay.id} value={ay.id}>
                      {ay.name} {ay.is_active ? '(Active Session)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Target Grade</label>
                  <select
                    className={styles.formSelect}
                    value={batchForm.grade_id}
                    onChange={(e) => setBatchForm({ ...batchForm, grade_id: e.target.value })}
                  >
                    <option value="">All Grades</option>
                    {grades.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Target Section</label>
                  <select
                    className={styles.formSelect}
                    value={batchForm.section_id}
                    onChange={(e) => setBatchForm({ ...batchForm, section_id: e.target.value })}
                  >
                    <option value="">All Sections</option>
                    {sections
                      .filter((s) => !batchForm.grade_id || s.grade_id === batchForm.grade_id)
                      .map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          {sec.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Invoice Title *</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={batchForm.title}
                  onChange={(e) => setBatchForm({ ...batchForm, title: e.target.value })}
                  required
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Billing Month (1-12)</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    className={styles.formInput}
                    value={batchForm.month}
                    onChange={(e) => setBatchForm({ ...batchForm, month: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Payment Due Date *</label>
                  <input
                    type="date"
                    className={styles.formInput}
                    value={batchForm.due_date}
                    onChange={(e) => setBatchForm({ ...batchForm, due_date: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnSecondary} onClick={() => setIsBatchModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className={styles.btnPrimary} disabled={loading}>
                <FaLayerGroup /> Generate Class Invoices
              </button>
            </div>
          </form>
        </div>
      </ModalPortal>

      {/* MODAL 3: FEE STRUCTURE (FEE MASTER) */}
      <ModalPortal isOpen={isStructureModalOpen} onClose={() => setIsStructureModalOpen(false)}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h3>
              <FaLayerGroup /> Configure Fee Structure
            </h3>
            <button className={styles.closeBtn} onClick={() => setIsStructureModalOpen(false)}>
              <FaTimes />
            </button>
          </div>
          <form onSubmit={handleCreateStructureSubmit}>
            <div className={styles.modalBody}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Fee Category *</label>
                  <select
                    className={styles.formSelect}
                    value={structureForm.fee_category_id}
                    onChange={(e) => setStructureForm({ ...structureForm, fee_category_id: e.target.value })}
                    required
                  >
                    <option value="">Select Category</option>
                    {feeCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Grade Level</label>
                  <select
                    className={styles.formSelect}
                    value={structureForm.grade_id}
                    onChange={(e) => setStructureForm({ ...structureForm, grade_id: e.target.value })}
                  >
                    <option value="">All Grades</option>
                    {grades.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Structure Name *</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={structureForm.name}
                    onChange={(e) => setStructureForm({ ...structureForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Amount (ETB) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className={styles.formInput}
                    value={structureForm.amount}
                    onChange={(e) => setStructureForm({ ...structureForm, amount: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Frequency</label>
                  <select
                    className={styles.formSelect}
                    value={structureForm.frequency}
                    onChange={(e) => setStructureForm({ ...structureForm, frequency: e.target.value })}
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="TERMWISE">Term-wise / Semester</option>
                    <option value="ANNUAL">Annual</option>
                    <option value="ONE_TIME">One-Time Registration</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Due Day of Month</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    className={styles.formInput}
                    value={structureForm.due_day_of_month}
                    onChange={(e) => setStructureForm({ ...structureForm, due_day_of_month: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnSecondary} onClick={() => setIsStructureModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className={styles.btnPrimary} disabled={loading}>
                Save Structure
              </button>
            </div>
          </form>
        </div>
      </ModalPortal>

      {/* MODAL 4: FEE CATEGORY */}
      <ModalPortal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h3>
              <FaTag /> Add Fee Category
            </h3>
            <button className={styles.closeBtn} onClick={() => setIsCategoryModalOpen(false)}>
              <FaTimes />
            </button>
          </div>
          <form onSubmit={handleCreateCategorySubmit}>
            <div className={styles.modalBody}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Category Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Tuition Fee, Transport Fee"
                    className={styles.formInput}
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Code *</label>
                  <input
                    type="text"
                    placeholder="e.g. TUI, TRN, LAB"
                    className={styles.formInput}
                    value={categoryForm.code}
                    onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  className={styles.formTextarea}
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnSecondary} onClick={() => setIsCategoryModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className={styles.btnPrimary}>
                Save Category
              </button>
            </div>
          </form>
        </div>
      </ModalPortal>

      {/* MODAL 5: SCHOLARSHIPS & DISCOUNTS */}
      <ModalPortal isOpen={isDiscountModalOpen} onClose={() => setIsDiscountModalOpen(false)}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h3>
              <FaPercentage /> Add Discount / Scholarship Rule
            </h3>
            <button className={styles.closeBtn} onClick={() => setIsDiscountModalOpen(false)}>
              <FaTimes />
            </button>
          </div>
          <form onSubmit={handleCreateDiscountSubmit}>
            <div className={styles.modalBody}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Discount Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. Sibling Discount, Staff Child"
                    className={styles.formInput}
                    value={discountForm.name}
                    onChange={(e) => setDiscountForm({ ...discountForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Code *</label>
                  <input
                    type="text"
                    placeholder="e.g. SIB15, SCHOLAR100"
                    className={styles.formInput}
                    value={discountForm.code}
                    onChange={(e) => setDiscountForm({ ...discountForm, code: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Discount Type</label>
                  <select
                    className={styles.formSelect}
                    value={discountForm.discount_type}
                    onChange={(e) => setDiscountForm({ ...discountForm, discount_type: e.target.value })}
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED_AMOUNT">Fixed Amount (ETB)</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Value ({discountForm.discount_type === 'PERCENTAGE' ? '%' : 'ETB'}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className={styles.formInput}
                    value={discountForm.value}
                    onChange={(e) => setDiscountForm({ ...discountForm, value: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnSecondary} onClick={() => setIsDiscountModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className={styles.btnPrimary}>
                Save Discount
              </button>
            </div>
          </form>
        </div>
      </ModalPortal>

      {/* MODAL 6: BANK SLIP REVIEW */}
      <ModalPortal isOpen={isSlipReviewModalOpen} onClose={() => setIsSlipReviewModalOpen(false)}>
        <div className={`${styles.modalContent} ${styles.modalLarge}`}>
          <div className={styles.modalHeader}>
            <h3>
              <FaUniversity /> Review Bank Deposit Slip
            </h3>
            <button className={styles.closeBtn} onClick={() => setIsSlipReviewModalOpen(false)}>
              <FaTimes />
            </button>
          </div>
          <div className={styles.modalBody}>
            {activeBankSlip && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>Student & Invoice Info</div>
                  <div><strong>Student:</strong> {activeBankSlip.student_first_name} {activeBankSlip.student_last_name}</div>
                  <div><strong>Invoice #:</strong> {activeBankSlip.invoice_number}</div>
                  <div><strong>Bank Name:</strong> {activeBankSlip.bank_name}</div>
                  <div><strong>Reference #:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>{activeBankSlip.reference_number}</span></div>
                  <div><strong>Deposit Amount:</strong> <span style={{ color: '#059669', fontWeight: 800 }}>{Number(activeBankSlip.amount).toLocaleString()} ETB</span></div>
                  <div><strong>Deposit Date:</strong> {new Date(activeBankSlip.deposit_date).toLocaleDateString()}</div>
                </div>

                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>Attached Deposit Slip Proof</div>
                  <img
                    src={activeBankSlip.slip_attachment_url}
                    alt="Bank Deposit Slip Proof"
                    style={{ width: '100%', maxHeight: '280px', objectFit: 'contain', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                  />
                </div>
              </div>
            )}
          </div>
          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnSecondary} onClick={() => setIsSlipReviewModalOpen(false)}>
              Close
            </button>
            <button type="button" className={styles.btnActionCancel} onClick={() => handleBankSlipReview('REJECT')}>
              <FaTimes /> Reject Slip
            </button>
            <button type="button" className={styles.btnSuccess} onClick={() => handleBankSlipReview('APPROVE')}>
              <FaCheck /> Approve & Issue Receipt
            </button>
          </div>
        </div>
      </ModalPortal>

      {/* MODAL 7: PRINTABLE RECEIPT */}
      <ModalPortal isOpen={isReceiptModalOpen} onClose={() => setIsReceiptModalOpen(false)}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h3>
              <FaReceipt /> Official Payment Receipt
            </h3>
            <button className={styles.closeBtn} onClick={() => setIsReceiptModalOpen(false)}>
              <FaTimes />
            </button>
          </div>
          <div className={styles.modalBody}>
            {activePaymentReceipt && (
              <div className={styles.receiptPrintContainer}>
                <div className={styles.receiptHeader}>
                  <div className={styles.receiptSchoolName}>{activePaymentReceipt.school_name || 'SMART SMS ACADEMY'}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{activePaymentReceipt.school_address || 'Addis Ababa, Ethiopia'}</div>
                  <div className={styles.receiptNumber}>OFFICIAL RECEIPT: {activePaymentReceipt.receipt_number}</div>
                </div>

                <div className={styles.receiptGrid}>
                  <div><strong>Student Name:</strong> {activePaymentReceipt.student_first_name} {activePaymentReceipt.student_last_name}</div>
                  <div><strong>Admission #:</strong> {activePaymentReceipt.student_admission_number}</div>
                  <div><strong>Grade / Class:</strong> {activePaymentReceipt.grade_name || 'N/A'}</div>
                  <div><strong>Payment Date:</strong> {new Date(activePaymentReceipt.payment_date).toLocaleDateString()}</div>
                  <div><strong>Payment Method:</strong> {activePaymentReceipt.payment_method}</div>
                  <div><strong>Transaction Ref:</strong> {activePaymentReceipt.transaction_reference || 'N/A'}</div>
                </div>

                <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '0.75rem' }}>
                  <div><strong>Invoice Billed:</strong> {activePaymentReceipt.invoice_title} ({activePaymentReceipt.invoice_number})</div>
                </div>

                <div className={styles.receiptTotalBox}>
                  <span>AMOUNT PAID:</span>
                  <span style={{ color: '#059669' }}>{Number(activePaymentReceipt.amount).toLocaleString()} ETB</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>
                  <span>Remaining Invoice Balance: {Number(activePaymentReceipt.invoice_balance).toLocaleString()} ETB</span>
                  <span>Cashier: {activePaymentReceipt.received_by_first_name} {activePaymentReceipt.received_by_last_name}</span>
                </div>
              </div>
            )}
          </div>
          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnSecondary} onClick={() => setIsReceiptModalOpen(false)}>
              Close
            </button>
            <button type="button" className={styles.btnPrimary} onClick={() => window.print()}>
              <FaPrint /> Print Receipt
            </button>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}
