'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styles from './page.module.css';
import * as financeApi from '@/services/financeService';
import { listGrades } from '@/services/gradeService';
import {
  MonthlyCashflowChart,
  DonutPieChart,
  RadialGaugeChart,
} from '@/components/reports/charts';
import {
  FaFileInvoiceDollar,
  FaChartLine,
  FaUserTimes,
  FaCashRegister,
  FaPrint,
  FaDownload,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaReceipt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaSearch,
  FaPhoneAlt,
  FaUniversity,
  FaMobileAlt,
  FaShieldAlt,
  FaClock,
} from 'react-icons/fa';
import { HiOutlineArrowPath } from 'react-icons/hi2';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const monthNames = MONTH_NAMES;


const PAYMENT_METHOD_COLORS = {
  CASH: '#10b981',
  TELEBIRR: '#0284c7',
  BANK_SLIP: '#6366f1',
  BANK_TRANSFER: '#8b5cf6',
  CHEQUE: '#f59e0b',
  POS: '#ec4899',
};

export default function FinancialReportsPage() {
  const [activeTab, setActiveTab] = useState('pnl');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [kpis, setKpis] = useState(null);
  const [pnlReport, setPnlReport] = useState(null);
  const [defaulters, setDefaulters] = useState([]);
  const [cashierShift, setCashierShift] = useState(null);

  const [grades, setGrades] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedGrade, setSelectedGrade] = useState('');
  const [defaulterSearch, setDefaulterSearch] = useState('');
  const [selectedAgingBucket, setSelectedAgingBucket] = useState('ALL');

  // Default shift date - check if there's today's date or fallback to latest shift date with records
  const [shiftDate, setShiftDate] = useState('2026-10-08');

  // 1. Initial mount effect
  useEffect(() => {
    let isCancelled = false;

    async function fetchInitialData() {
      try {
        const res = await financeApi.getFinanceOverviewKPIs();
        if (!isCancelled) setKpis(res?.data || null);
      } catch (e) {
        console.error('Failed to load financial overview KPIs:', e);
      }

      try {
        const res = await listGrades({ limit: 100 });
        const list = Array.isArray(res)
          ? res
          : Array.isArray(res?.items)
          ? res.items
          : Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.data?.items)
          ? res.data.items
          : [];
        if (!isCancelled) setGrades(list);
      } catch {
        // non-blocking
      }
    }

    fetchInitialData();

    return () => {
      isCancelled = true;
    };
  }, []);

  // 2. Tab and Filter switch effect
  useEffect(() => {
    let isCancelled = false;

    async function fetchTabData() {
      setLoading(true);
      setError(null);
      try {
        if (activeTab === 'pnl') {
          const res = await financeApi.getIncomeVsExpenseReport(selectedYear);
          if (!isCancelled) setPnlReport(res?.data || null);
        } else if (activeTab === 'defaulters') {
          const res = await financeApi.getDefaultersReport({ grade_id: selectedGrade });
          if (!isCancelled) setDefaulters(res?.data || []);
        } else if (activeTab === 'shift') {
          const res = await financeApi.getCashierShiftReport(shiftDate);
          if (!isCancelled) setCashierShift(res?.data || null);
        }
      } catch (e) {
        if (!isCancelled) setError(e.message || 'Failed to load report data');
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    fetchTabData();

    return () => {
      isCancelled = true;
    };
  }, [activeTab, selectedYear, selectedGrade, shiftDate]);

  // Manual refresh handler
  const handleRefresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const kpiRes = await financeApi.getFinanceOverviewKPIs();
      setKpis(kpiRes?.data || null);

      if (activeTab === 'pnl') {
        const res = await financeApi.getIncomeVsExpenseReport(selectedYear);
        setPnlReport(res?.data || null);
      } else if (activeTab === 'defaulters') {
        const res = await financeApi.getDefaultersReport({ grade_id: selectedGrade });
        setDefaulters(res?.data || []);
      } else if (activeTab === 'shift') {
        const res = await financeApi.getCashierShiftReport(shiftDate);
        setCashierShift(res?.data || null);
      }
    } catch (e) {
      setError(e.message || 'Failed to refresh financial reports');
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedYear, selectedGrade, shiftDate]);


  // Helper for CSV export
  const downloadCsv = (filename, csvContent) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export P&L CSV
  const exportPnlCsv = () => {
    if (!pnlReport?.monthlyBreakdown) return;
    const headers = [
      'Month',
      'Fee Collections (ETB)',
      'Direct Incomes (ETB)',
      'Total Inflow (ETB)',
      'Operational Expenses (ETB)',
      'Payroll Outflow (ETB)',
      'Total Outflow (ETB)',
      'Net Profit/Loss (ETB)',
    ];
    const rows = pnlReport.monthlyBreakdown.map((r) => [
      `"${monthNames[r.month - 1]}"`,
      r.fee_collections,
      r.direct_incomes,
      r.total_income,
      r.operational_expenses,
      r.payroll_expenses,
      r.total_expense,
      r.net_profit_loss,
    ]);
    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    downloadCsv(`Annual_PnL_Statement_${selectedYear}.csv`, csv);
  };

  // Defaulters Aging Bucket categorization
  const { categorizedDefaulters, agingBuckets, gradeDebtSummary } = useMemo(() => {
    const buckets = {
      CURRENT: { label: 'Current (0 Days)', min: -Infinity, max: 0, count: 0, amount: 0, color: '#10b981' },
      MILD: { label: '1 - 30 Days', min: 1, max: 30, count: 0, amount: 0, color: '#3b82f6' },
      MODERATE: { label: '31 - 60 Days', min: 31, max: 60, count: 0, amount: 0, color: '#f59e0b' },
      HIGHRISK: { label: '61 - 90 Days', min: 61, max: 90, count: 0, amount: 0, color: '#f97316' },
      CRITICAL: { label: '90+ Days Critical', min: 91, max: Infinity, count: 0, amount: 0, color: '#ef4444' },
    };

    const gradeMap = new Map();

    const list = (defaulters || []).map((d) => {
      const days = Number(d.days_overdue || 0);
      const balance = Number(d.balance_amount || 0);

      let bucketKey = 'CURRENT';
      if (days > 90) bucketKey = 'CRITICAL';
      else if (days > 60) bucketKey = 'HIGHRISK';
      else if (days > 30) bucketKey = 'MODERATE';
      else if (days > 0) bucketKey = 'MILD';

      buckets[bucketKey].count += 1;
      buckets[bucketKey].amount += balance;

      // Grade breakdown
      const gName = d.grade_name || 'Unassigned Grade';
      gradeMap.set(gName, (gradeMap.get(gName) || 0) + balance);

      return {
        ...d,
        daysOverdueNum: days,
        balanceNum: balance,
        bucketKey,
      };
    });

    // Grade donut array
    const gradeColors = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
    const gradeSummary = Array.from(gradeMap.entries()).map(([name, total], idx) => ({
      name,
      total_amount: total,
      color: gradeColors[idx % gradeColors.length],
    }));

    return {
      categorizedDefaulters: list,
      agingBuckets: buckets,
      gradeDebtSummary: gradeSummary,
    };
  }, [defaulters]);

  // Filtered Defaulters for table
  const filteredDefaulters = useMemo(() => {
    return categorizedDefaulters.filter((d) => {
      // Bucket filter
      if (selectedAgingBucket !== 'ALL' && d.bucketKey !== selectedAgingBucket) {
        return false;
      }
      // Search filter
      if (defaulterSearch.trim()) {
        const query = defaulterSearch.toLowerCase().trim();
        const fullName = `${d.student_first_name} ${d.student_last_name}`.toLowerCase();
        const adm = String(d.admission_number || '').toLowerCase();
        const invNum = String(d.invoice_number || '').toLowerCase();
        const phone = String(d.parent_phone || '').toLowerCase();
        const parent = String(d.parent_name || '').toLowerCase();

        return (
          fullName.includes(query) ||
          adm.includes(query) ||
          invNum.includes(query) ||
          phone.includes(query) ||
          parent.includes(query)
        );
      }
      return true;
    });
  }, [categorizedDefaulters, selectedAgingBucket, defaulterSearch]);

  // Export Defaulters CSV
  const exportDefaultersCsv = () => {
    if (filteredDefaulters.length === 0) return;
    const headers = [
      'Student Name',
      'Admission No',
      'Grade',
      'Section',
      'Invoice No',
      'Invoice Title',
      'Due Date',
      'Total Billed (ETB)',
      'Paid (ETB)',
      'Outstanding Balance (ETB)',
      'Days Overdue',
      'Parent Name',
      'Parent Phone',
    ];
    const rows = filteredDefaulters.map((d) => [
      `"${d.student_first_name} ${d.student_last_name}"`,
      `"${d.admission_number || ''}"`,
      `"${d.grade_name || ''}"`,
      `"${d.section_name || ''}"`,
      `"${d.invoice_number || ''}"`,
      `"${d.invoice_title || ''}"`,
      `"${d.due_date ? new Date(d.due_date).toLocaleDateString() : ''}"`,
      d.total_amount,
      d.paid_amount,
      d.balance_amount,
      d.days_overdue,
      `"${d.parent_name || ''}"`,
      `"${d.parent_phone || ''}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    downloadCsv(`Fee_Defaulters_Roster_${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  // Export Cashier Shift CSV
  const exportCashierShiftCsv = () => {
    if (!cashierShift?.transactions || cashierShift.transactions.length === 0) return;
    const headers = [
      'Receipt No',
      'Date/Time',
      'Student Name',
      'Admission No',
      'Invoice No',
      'Payment Method',
      'Reference No',
      'Amount (ETB)',
      'Received By',
    ];
    const rows = cashierShift.transactions.map((tx) => [
      `"${tx.receipt_number}"`,
      `"${new Date(tx.created_at || tx.payment_date).toLocaleString()}"`,
      `"${tx.student_first_name} ${tx.student_last_name}"`,
      `"${tx.admission_number || ''}"`,
      `"${tx.invoice_number || ''}"`,
      `"${tx.payment_method}"`,
      `"${tx.transaction_reference || 'N/A'}"`,
      tx.amount,
      `"${tx.received_by_first_name || ''} ${tx.received_by_last_name || ''}".trim()`,
    ]);
    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    downloadCsv(`Cashier_Shift_Register_${shiftDate}.csv`, csv);
  };

  const cashierDonutData = useMemo(() => {
    return (cashierShift?.methodsBreakdown || []).map((m) => ({
      name: m.payment_method,
      total_collected: Number(m.total_collected || 0),
      count: Number(m.transaction_count || 0),
      color: PAYMENT_METHOD_COLORS[m.payment_method] || '#64748b',
    }));
  }, [cashierShift]);

  // Aging Bracket Donut Data
  const agingDonutData = useMemo(() => {
    return Object.values(agingBuckets).map((b) => ({
      name: b.label,
      total_amount: b.amount,
      count: b.count,
      color: b.color,
    }));
  }, [agingBuckets]);

  // Revenue Stream Donut Data (Fees vs Direct Incomes)
  const revenueDonutData = useMemo(() => {
    const feeTotal = Number(pnlReport?.annualSummary?.totalFeeCollections || 0);
    const directTotal = Number(pnlReport?.annualSummary?.totalDirectIncomes || 0);
    return [
      { name: 'Fee Collections', total_amount: feeTotal, color: '#10b981' },
      { name: 'Direct Incomes', total_amount: directTotal, color: '#3b82f6' },
    ].filter((d) => d.total_amount > 0);
  }, [pnlReport]);

  // Expenditure Allocation Donut Data (OpEx vs Payroll)
  const expenditureDonutData = useMemo(() => {
    const opTotal = Number(pnlReport?.annualSummary?.totalOperationalExpenses || 0);
    const payTotal = Number(pnlReport?.annualSummary?.totalPayrollExpenses || 0);
    return [
      { name: 'Staff Payroll Disbursed', total_amount: payTotal, color: '#f43f5e' },
      { name: 'Operational & Facility Expenses', total_amount: opTotal, color: '#f59e0b' },
    ].filter((d) => d.total_amount > 0);
  }, [pnlReport]);

  return (
    <div className={styles.container}>
      {/* Print Only Official Document Header */}
      <div className={styles.printHeader}>
        <div className={styles.printHeaderTitle}>SMART SCHOOL MANAGEMENT SYSTEM</div>
        <div style={{ fontSize: '1.1rem', fontWeight: 750, color: '#334155', marginTop: '0.2rem' }}>
          OFFICIAL FINANCIAL AUDIT & REVENUE RECONCILIATION STATEMENT
        </div>
        <div className={styles.printHeaderMeta}>
          <span>Generated On: {new Date().toLocaleString()}</span>
          <span>Fiscal Period: Calendar Year {selectedYear}</span>
          <span>Authentication: Certified School Ledger</span>
        </div>
      </div>

      {/* Main Interactive Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.title}>
            <div className={styles.titleIcon}>
              <FaFileInvoiceDollar />
            </div>
            Financial Intelligence & Fiscal Audit Suite
          </div>
          <div className={styles.subtitle}>
            Monitor institutional fee collections, cash flow dynamics, debt aging brackets, and cashier shift reconciliation in real-time.
          </div>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => window.print()}
          >
            <FaPrint /> Print Audit Package
          </button>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => {
              if (activeTab === 'pnl') exportPnlCsv();
              else if (activeTab === 'defaulters') exportDefaultersCsv();
              else exportCashierShiftCsv();
            }}
          >
            <FaDownload /> Export CSV
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={handleRefresh}
            disabled={loading}
          >
            <HiOutlineArrowPath className={loading ? 'animate-spin' : ''} />
            {loading ? 'Refreshing...' : 'Refresh Ledger'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', color: '#991b1b', padding: '0.85rem 1.25rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.6rem', border: '1px solid #fecaca' }}>
          <FaExclamationTriangle /> {error}
        </div>
      )}

      {/* Top Highlights Strip & Collection Efficiency Radial Gauge */}
      {kpis && (
        <div className={styles.topOverviewRow}>
          {/* 4 Metric Cards Grid */}
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon} style={{ background: '#dcfce7', color: '#059669' }}>
                <FaMoneyBillWave />
              </div>
              <div className={styles.kpiInfo}>
                <span className={styles.kpiLabel}>Total Revenue Inflow</span>
                <span className={styles.kpiValue} style={{ color: '#059669' }}>
                  {(Number(kpis.totalCollected || 0) + Number(kpis.totalOtherIncome || 0)).toLocaleString()} ETB
                </span>
                <span className={styles.kpiSubtext}>
                  Fees: {Number(kpis.totalCollected || 0).toLocaleString()} • Direct: {Number(kpis.totalOtherIncome || 0).toLocaleString()}
                </span>
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon} style={{ background: '#fee2e2', color: '#dc2626' }}>
                <FaReceipt />
              </div>
              <div className={styles.kpiInfo}>
                <span className={styles.kpiLabel}>Total Outflow (OpEx + Payroll)</span>
                <span className={styles.kpiValue} style={{ color: '#dc2626' }}>
                  {Number(kpis.totalOutflow || 0).toLocaleString()} ETB
                </span>
                <span className={styles.kpiSubtext}>
                  Payroll: {Number(kpis.totalPayroll || 0).toLocaleString()} • Exp: {Number(kpis.totalExpenses || 0).toLocaleString()}
                </span>
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div
                className={styles.kpiIcon}
                style={{
                  background: kpis.netCashFlow >= 0 ? '#ccfbf1' : '#ffe4e6',
                  color: kpis.netCashFlow >= 0 ? '#0f766e' : '#be123c',
                }}
              >
                <FaChartLine />
              </div>
              <div className={styles.kpiInfo}>
                <span className={styles.kpiLabel}>Net Operating Surplus</span>
                <span
                  className={styles.kpiValue}
                  style={{ color: kpis.netCashFlow >= 0 ? '#0f766e' : '#be123c' }}
                >
                  {kpis.netCashFlow >= 0 ? '+' : ''}
                  {Number(kpis.netCashFlow || 0).toLocaleString()} ETB
                </span>
                <span className={styles.kpiSubtext}>
                  Operating Margin: <strong>{kpis.operatingMargin || '0.0'}%</strong>
                </span>
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon} style={{ background: '#ffedd5', color: '#c2410c' }}>
                <FaUserTimes />
              </div>
              <div className={styles.kpiInfo}>
                <span className={styles.kpiLabel}>Total Overdue Debt</span>
                <span className={styles.kpiValue} style={{ color: '#c2410c' }}>
                  {Number(kpis.totalOutstanding || 0).toLocaleString()} ETB
                </span>
                <span className={styles.kpiSubtext}>
                  {kpis.overdueInvoicesCount || 0} delinquent student accounts
                </span>
              </div>
            </div>
          </div>

          {/* Radial Collection Efficiency Gauge */}
          <RadialGaugeChart
            value={kpis.collectionEfficiency || 0}
            max={100}
            title="Fee Collection Yield"
            subtitle="Realized fee collections vs total invoiced"
            badgeText={
              Number(kpis.collectionEfficiency || 0) >= 80
                ? 'Healthy Recovery Rate'
                : Number(kpis.collectionEfficiency || 0) >= 50
                ? 'Moderate Yield • Follow-up Advised'
                : 'Delinquency Warning • Action Required'
            }
            midLabel="75% Target"
            valueSuffix="%"
          />
        </div>
      )}

      {/* Main Tab Navigation */}
      <div className={styles.tabsNav}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'pnl' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('pnl')}
        >
          <FaChartLine /> Cash Flow Dynamics & P&L Statement
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'defaulters' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('defaulters')}
        >
          <FaUserTimes /> Fee Defaulters Aging Matrix ({defaulters.length})
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'shift' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('shift')}
        >
          <FaCashRegister /> Cashier Daily Shift Close Register
        </button>
      </div>

      {/* =========================================================================
          TAB 1: CASH FLOW DYNAMICS & P&L STATEMENT
         ========================================================================= */}
      {activeTab === 'pnl' && (
        <>
          {/* Year Filter Bar */}
          <div className={styles.filterBar}>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Fiscal Calendar Year:</span>
              <select
                className={styles.filterSelect}
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {[2024, 2025, 2026, 2027, 2028].map((yr) => (
                  <option key={yr} value={yr}>
                    Calendar Year {yr}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Annual Profit Margin:{' '}
                <strong style={{ color: Number(pnlReport?.annualSummary?.profitMargin || 0) >= 0 ? '#059669' : '#dc2626' }}>
                  {pnlReport?.annualSummary?.profitMargin || '0.0'}%
                </strong>
              </span>
              <button type="button" className={styles.btnSecondary} onClick={exportPnlCsv}>
                <FaDownload /> Export P&L (CSV)
              </button>
            </div>
          </div>

          {/* Monthly Cashflow Visual Chart Component */}
          <MonthlyCashflowChart
            data={pnlReport?.monthlyBreakdown || []}
            year={selectedYear}
            title="Monthly Cash Inflow vs Outflow Dynamics"
            subtitle="Interactive 12-month trajectory of tuition collections, grants, and institutional expenses"
            currency="ETB"
          />

          {/* Revenue & Expenditure Distribution Donut Charts */}
          <div className={styles.chartsGrid}>
            <DonutPieChart
              data={revenueDonutData}
              title="Revenue Stream Distribution"
              subtitle="Contribution of student tuition vs direct school income"
              centerLabel="Total Inflow"
              formatValue={(val) => `${Number(val).toLocaleString()} ETB`}
              emptyMessage="No revenue recorded for the selected fiscal year."
            />

            <DonutPieChart
              data={expenditureDonutData}
              title="Expenditure Allocation"
              subtitle="Operational facility expenses vs staff payroll commitments"
              centerLabel="Total Outflow"
              formatValue={(val) => `${Number(val).toLocaleString()} ETB`}
              emptyMessage="No expenditures recorded for the selected fiscal year."
            />
          </div>

          {/* 12-Month Audited Ledger Table */}
          <div className={styles.tableCard}>
            <div className={styles.tableCardHeader}>
              <div>
                <div className={styles.tableCardTitle}>12-Month Audited Fiscal Ledger ({selectedYear})</div>
                <div className={styles.tableCardSubtitle}>
                  Detailed line-item accounting of monthly inflows, payroll, direct overheads, and operating margins.
                </div>
              </div>
              <button type="button" className={styles.btnSecondary} onClick={exportPnlCsv}>
                <FaDownload /> Download Spreadsheet
              </button>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Fee Collections</th>
                    <th>Direct Incomes</th>
                    <th>Total Inflow</th>
                    <th>Operational Exp</th>
                    <th>Payroll Outflow</th>
                    <th>Total Outflow</th>
                    <th>Net Operating Result</th>
                  </tr>
                </thead>
                <tbody>
                  {(pnlReport?.monthlyBreakdown || []).map((row) => (
                    <tr key={row.month}>
                      <td style={{ fontWeight: 750, color: '#0f172a' }}>{monthNames[row.month - 1]}</td>
                      <td>{Number(row.fee_collections).toLocaleString()} ETB</td>
                      <td>{Number(row.direct_incomes).toLocaleString()} ETB</td>
                      <td style={{ fontWeight: 750, color: '#059669' }}>
                        {Number(row.total_income).toLocaleString()} ETB
                      </td>
                      <td>{Number(row.operational_expenses).toLocaleString()} ETB</td>
                      <td>{Number(row.payroll_expenses).toLocaleString()} ETB</td>
                      <td style={{ fontWeight: 750, color: '#dc2626' }}>
                        {Number(row.total_expense).toLocaleString()} ETB
                      </td>
                      <td
                        style={{
                          fontWeight: 850,
                          color: Number(row.net_profit_loss) >= 0 ? '#059669' : '#dc2626',
                        }}
                      >
                        {Number(row.net_profit_loss) >= 0 ? '+' : ''}
                        {Number(row.net_profit_loss).toLocaleString()} ETB
                      </td>
                    </tr>
                  ))}

                  {/* Year-End Total Summary Row */}
                  {pnlReport?.annualSummary && (
                    <tr className={styles.totalRow}>
                      <td>ANNUAL FISCAL TOTAL</td>
                      <td>{Number(pnlReport.annualSummary.totalFeeCollections).toLocaleString()} ETB</td>
                      <td>{Number(pnlReport.annualSummary.totalDirectIncomes).toLocaleString()} ETB</td>
                      <td style={{ color: '#059669' }}>
                        {Number(pnlReport.annualSummary.totalIncome).toLocaleString()} ETB
                      </td>
                      <td>{Number(pnlReport.annualSummary.totalOperationalExpenses).toLocaleString()} ETB</td>
                      <td>{Number(pnlReport.annualSummary.totalPayrollExpenses).toLocaleString()} ETB</td>
                      <td style={{ color: '#dc2626' }}>
                        {Number(pnlReport.annualSummary.totalExpense).toLocaleString()} ETB
                      </td>
                      <td
                        style={{
                          color: Number(pnlReport.annualSummary.netProfitLoss) >= 0 ? '#059669' : '#dc2626',
                          fontSize: '0.98rem',
                        }}
                      >
                        {Number(pnlReport.annualSummary.netProfitLoss) >= 0 ? '+' : ''}
                        {Number(pnlReport.annualSummary.netProfitLoss).toLocaleString()} ETB
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* =========================================================================
          TAB 2: FEE DEFAULTERS AGING MATRIX
         ========================================================================= */}
      {activeTab === 'defaulters' && (
        <>
          {/* Aging Matrix 5 Buckets Filter Cards */}
          <div className={styles.agingMatrixGrid}>
            <div
              className={`${styles.agingCard} ${selectedAgingBucket === 'ALL' ? styles.agingCardActive : ''}`}
              onClick={() => setSelectedAgingBucket('ALL')}
            >
              <div className={styles.agingCardHeader}>
                <span className={styles.agingCardTitle} style={{ color: '#4f46e5' }}>All Defaulters</span>
                <span className={styles.agingCountBadge} style={{ background: '#e0e7ff', color: '#4338ca' }}>
                  {categorizedDefaulters.length} accounts
                </span>
              </div>
              <div className={styles.agingAmount} style={{ color: '#4f46e5' }}>
                {categorizedDefaulters.reduce((acc, c) => acc + c.balanceNum, 0).toLocaleString()} ETB
              </div>
              <span className={styles.agingSubtext}>Total delinquent receivables</span>
            </div>

            <div
              className={`${styles.agingCard} ${selectedAgingBucket === 'MILD' ? styles.agingCardActive : ''}`}
              onClick={() => setSelectedAgingBucket('MILD')}
            >
              <div className={styles.agingCardHeader}>
                <span className={styles.agingCardTitle} style={{ color: '#2563eb' }}>1 - 30 Days</span>
                <span className={styles.agingCountBadge} style={{ background: '#dbeafe', color: '#1e40af' }}>
                  {agingBuckets.MILD.count}
                </span>
              </div>
              <div className={styles.agingAmount} style={{ color: '#2563eb' }}>
                {agingBuckets.MILD.amount.toLocaleString()} ETB
              </div>
              <span className={styles.agingSubtext}>Mild delinquency (recent due)</span>
            </div>

            <div
              className={`${styles.agingCard} ${selectedAgingBucket === 'MODERATE' ? styles.agingCardActive : ''}`}
              onClick={() => setSelectedAgingBucket('MODERATE')}
            >
              <div className={styles.agingCardHeader}>
                <span className={styles.agingCardTitle} style={{ color: '#d97706' }}>31 - 60 Days</span>
                <span className={styles.agingCountBadge} style={{ background: '#fef3c7', color: '#92400e' }}>
                  {agingBuckets.MODERATE.count}
                </span>
              </div>
              <div className={styles.agingAmount} style={{ color: '#d97706' }}>
                {agingBuckets.MODERATE.amount.toLocaleString()} ETB
              </div>
              <span className={styles.agingSubtext}>Moderate aging • SMS reminder</span>
            </div>

            <div
              className={`${styles.agingCard} ${selectedAgingBucket === 'HIGHRISK' ? styles.agingCardActive : ''}`}
              onClick={() => setSelectedAgingBucket('HIGHRISK')}
            >
              <div className={styles.agingCardHeader}>
                <span className={styles.agingCardTitle} style={{ color: '#ea580c' }}>61 - 90 Days</span>
                <span className={styles.agingCountBadge} style={{ background: '#ffedd5', color: '#9a3412' }}>
                  {agingBuckets.HIGHRISK.count}
                </span>
              </div>
              <div className={styles.agingAmount} style={{ color: '#ea580c' }}>
                {agingBuckets.HIGHRISK.amount.toLocaleString()} ETB
              </div>
              <span className={styles.agingSubtext}>High financial risk tier</span>
            </div>

            <div
              className={`${styles.agingCard} ${selectedAgingBucket === 'CRITICAL' ? styles.agingCardActive : ''}`}
              onClick={() => setSelectedAgingBucket('CRITICAL')}
            >
              <div className={styles.agingCardHeader}>
                <span className={styles.agingCardTitle} style={{ color: '#dc2626' }}>90+ Days Critical</span>
                <span className={styles.agingCountBadge} style={{ background: '#fee2e2', color: '#991b1b' }}>
                  {agingBuckets.CRITICAL.count}
                </span>
              </div>
              <div className={styles.agingAmount} style={{ color: '#dc2626' }}>
                {agingBuckets.CRITICAL.amount.toLocaleString()} ETB
              </div>
              <span className={styles.agingSubtext}>Immediate bursar escalation</span>
            </div>
          </div>

          {/* Defaulter Visuals: Aging Bracket Distribution + Grade Debt Split */}
          <div className={styles.chartsGrid}>
            <DonutPieChart
              data={agingDonutData}
              title="Delinquent Debt by Aging Bracket"
              subtitle="Distribution of outstanding receivables by overdue duration"
              centerLabel="Total Debt"
              formatValue={(val) => `${Number(val).toLocaleString()} ETB`}
              emptyMessage="No overdue debts across aging buckets."
            />

            <DonutPieChart
              data={gradeDebtSummary}
              title="Outstanding Debt by Grade Level"
              subtitle="Proportion of unpaid balances across academic grades"
              centerLabel="Total Debt"
              formatValue={(val) => `${Number(val).toLocaleString()} ETB`}
              emptyMessage="No grade level debts recorded."
            />
          </div>

          {/* Filter Bar with Grade Selector & Live Search */}
          <div className={styles.filterBar}>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Filter Grade:</span>
              <select
                className={styles.filterSelect}
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
              >
                <option value="">All Academic Grades</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>

              <span className={styles.filterLabel}>Aging Bucket:</span>
              <select
                className={styles.filterSelect}
                value={selectedAgingBucket}
                onChange={(e) => setSelectedAgingBucket(e.target.value)}
              >
                <option value="ALL">All Overdue Tiers</option>
                <option value="CURRENT">Current (0 Days)</option>
                <option value="MILD">1 - 30 Days</option>
                <option value="MODERATE">31 - 60 Days</option>
                <option value="HIGHRISK">61 - 90 Days</option>
                <option value="CRITICAL">90+ Days Critical</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <div className={styles.searchIconWrapper}>
                <FaSearch className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search student, adm #, invoice, phone..."
                  className={styles.searchInput}
                  value={defaulterSearch}
                  onChange={(e) => setDefaulterSearch(e.target.value)}
                />
              </div>

              <button
                type="button"
                className={styles.btnSecondary}
                onClick={exportDefaultersCsv}
                disabled={filteredDefaulters.length === 0}
              >
                <FaDownload /> Export Roster ({filteredDefaulters.length})
              </button>
            </div>
          </div>

          {/* Detailed Defaulters Roster Table */}
          <div className={styles.tableCard}>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Student Details</th>
                    <th>Grade & Section</th>
                    <th>Invoice # & Title</th>
                    <th>Due Date</th>
                    <th>Total Billed</th>
                    <th>Paid</th>
                    <th>Outstanding Debt</th>
                    <th>Aging Status</th>
                    <th>Parent / Guardian Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDefaulters.length === 0 ? (
                    <tr>
                      <td colSpan="9">
                        <div className={styles.emptyStateCard}>
                          <FaCheckCircle className={styles.emptyStateIcon} />
                          <div className={styles.emptyStateTitle}>Zero Outstanding Delinquencies</div>
                          <div className={styles.emptyStateText}>
                            All students matching the selected grade and aging filters are fully settled with no overdue fee balances.
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredDefaulters.map((d) => (
                      <tr key={d.invoice_id}>
                        <td>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>
                            {d.student_first_name} {d.student_last_name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            Adm No: <strong>{d.admission_number || 'N/A'}</strong>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 650 }}>{d.grade_name || 'N/A'}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {d.section_name ? `Section ${d.section_name}` : ''}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#4f46e5' }}>{d.invoice_number}</div>
                          <div style={{ fontSize: '0.76rem', color: '#475569' }}>{d.invoice_title}</div>
                        </td>
                        <td>
                          {d.due_date ? (
                            <span style={{ fontSize: '0.85rem' }}>
                              {new Date(d.due_date).toLocaleDateString()}
                            </span>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td style={{ fontWeight: 600 }}>{Number(d.total_amount).toLocaleString()} ETB</td>
                        <td style={{ color: '#059669', fontWeight: 600 }}>
                          {Number(d.paid_amount).toLocaleString()} ETB
                        </td>
                        <td style={{ color: '#dc2626', fontWeight: 850, fontSize: '0.96rem' }}>
                          {Number(d.balance_amount).toLocaleString()} ETB
                        </td>
                        <td>
                          {d.daysOverdueNum > 90 ? (
                            <span className={`${styles.daysOverdueBadge} ${styles.badgeCritical}`}>
                              {d.daysOverdueNum}d Overdue
                            </span>
                          ) : d.daysOverdueNum > 60 ? (
                            <span className={`${styles.daysOverdueBadge} ${styles.badgeHighRisk}`}>
                              {d.daysOverdueNum}d Overdue
                            </span>
                          ) : d.daysOverdueNum > 30 ? (
                            <span className={`${styles.daysOverdueBadge} ${styles.badgeModerate}`}>
                              {d.daysOverdueNum}d Overdue
                            </span>
                          ) : d.daysOverdueNum > 0 ? (
                            <span className={`${styles.daysOverdueBadge} ${styles.badgeMild}`}>
                              {d.daysOverdueNum}d Overdue
                            </span>
                          ) : (
                            <span className={`${styles.daysOverdueBadge} ${styles.badgeCurrent}`}>Current</span>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{d.parent_name || 'Primary Guardian'}</div>
                          {d.parent_phone ? (
                            <a
                              href={`tel:${d.parent_phone}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                color: '#4f46e5',
                                fontWeight: 700,
                                fontSize: '0.78rem',
                                textDecoration: 'none',
                                marginTop: '0.15rem',
                              }}
                            >
                              <FaPhoneAlt style={{ fontSize: '0.7rem' }} />
                              {d.parent_phone}
                            </a>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>No phone recorded</span>
                          )}
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

      {/* =========================================================================
          TAB 3: CASHIER DAILY SHIFT CLOSE REGISTER
         ========================================================================= */}
      {activeTab === 'shift' && (
        <>
          {/* Shift Date Filter Bar */}
          <div className={styles.filterBar}>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Shift Audit Date:</span>
              <input
                type="date"
                className={styles.filterSelect}
                value={shiftDate}
                onChange={(e) => setShiftDate(e.target.value)}
              />

              {/* Quick Date Switchers */}
              <button
                type="button"
                className={styles.controlBtn}
                style={{ background: shiftDate === new Date().toISOString().slice(0, 10) ? '#eef2ff' : '#f1f5f9', color: '#4f46e5' }}
                onClick={() => setShiftDate(new Date().toISOString().slice(0, 10))}
              >
                Today
              </button>
              <button
                type="button"
                className={styles.controlBtn}
                style={{ background: shiftDate === '2026-10-08' ? '#eef2ff' : '#f1f5f9', color: '#4f46e5' }}
                onClick={() => setShiftDate('2026-10-08')}
              >
                Oct 8 (Last Shift Active)
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              <button type="button" className={styles.btnSecondary} onClick={exportCashierShiftCsv}>
                <FaDownload /> Export Shift Register (CSV)
              </button>
              <button type="button" className={styles.btnSecondary} onClick={() => window.print()}>
                <FaPrint /> Print Close Slip
              </button>
            </div>
          </div>

          {/* Shift KPI Summary Cards */}
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon} style={{ background: '#dcfce7', color: '#059669' }}>
                <FaCashRegister />
              </div>
              <div className={styles.kpiInfo}>
                <span className={styles.kpiLabel}>Total Shift Collections</span>
                <span className={styles.kpiValue} style={{ color: '#059669' }}>
                  {Number(cashierShift?.totalCollected || 0).toLocaleString()} ETB
                </span>
                <span className={styles.kpiSubtext}>Date: {new Date(shiftDate).toLocaleDateString()}</span>
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon} style={{ background: '#e0e7ff', color: '#4338ca' }}>
                <FaReceipt />
              </div>
              <div className={styles.kpiInfo}>
                <span className={styles.kpiLabel}>Receipts Issued</span>
                <span className={styles.kpiValue} style={{ color: '#4338ca' }}>
                  {cashierShift?.totalTransactions || 0}
                </span>
                <span className={styles.kpiSubtext}>Verified audit tokens recorded</span>
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon} style={{ background: '#fef3c7', color: '#b45309' }}>
                <FaMoneyBillWave />
              </div>
              <div className={styles.kpiInfo}>
                <span className={styles.kpiLabel}>Average Receipt Value</span>
                <span className={styles.kpiValue} style={{ color: '#b45309' }}>
                  {cashierShift?.totalTransactions > 0
                    ? Math.round(Number(cashierShift.totalCollected) / Number(cashierShift.totalTransactions)).toLocaleString()
                    : '0'}{' '}
                  ETB
                </span>
                <span className={styles.kpiSubtext}>Per student transaction</span>
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon} style={{ background: '#ccfbf1', color: '#0f766e' }}>
                <FaShieldAlt />
              </div>
              <div className={styles.kpiInfo}>
                <span className={styles.kpiLabel}>Shift Reconciliation Status</span>
                <span className={styles.kpiValue} style={{ color: '#0f766e', fontSize: '1.25rem' }}>
                  {Number(cashierShift?.totalCollected || 0) > 0 ? 'Verified & Balanced' : 'No Activity'}
                </span>
                <span className={styles.kpiSubtext}>Audited by internal finance controls</span>
              </div>
            </div>
          </div>

          {/* Payment Channel Donut Chart & Method Cards */}
          <div className={styles.chartsGrid}>
            <DonutPieChart
              data={cashierDonutData}
              title="Payment Channel Distribution"
              subtitle="Breakdown of collections by transaction gateway"
              centerLabel="Shift Intake"
              formatValue={(val) => `${Number(val).toLocaleString()} ETB`}
              emptyMessage="No payments recorded on this date."
            />

            <div className={styles.tableCard} style={{ display: 'flex', flexDirection: 'column' }}>
              <div className={styles.tableCardHeader}>
                <div>
                  <div className={styles.tableCardTitle}>Tender Breakdown by Method</div>
                  <div className={styles.tableCardSubtitle}>Detailed channel subtotals for cashier drawer close</div>
                </div>
              </div>

              <div className={styles.shiftSummaryGrid}>
                {(cashierShift?.methodsBreakdown || []).map((m, idx) => (
                  <div key={idx} className={styles.shiftMethodCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className={styles.shiftMethodName}>{m.payment_method}</span>
                      {m.payment_method === 'CASH' ? (
                        <FaMoneyBillWave style={{ color: '#10b981' }} />
                      ) : m.payment_method === 'TELEBIRR' ? (
                        <FaMobileAlt style={{ color: '#0284c7' }} />
                      ) : (
                        <FaUniversity style={{ color: '#6366f1' }} />
                      )}
                    </div>
                    <div className={styles.shiftMethodAmount}>
                      {Number(m.total_collected).toLocaleString()} ETB
                    </div>
                    <div className={styles.shiftMethodTxCount}>
                      {m.transaction_count} transaction{Number(m.transaction_count) > 1 ? 's' : ''} recorded
                    </div>
                  </div>
                ))}

                {(!cashierShift?.methodsBreakdown || cashierShift.methodsBreakdown.length === 0) && (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', gridColumn: '1 / -1' }}>
                    No payment methods active for this shift date.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Shift Audit Trail Register Table */}
          <div className={styles.tableCard}>
            <div className={styles.tableCardHeader}>
              <div>
                <div className={styles.tableCardTitle}>
                  Itemized Shift Receipts Ledger ({new Date(shiftDate).toLocaleDateString()})
                </div>
                <div className={styles.tableCardSubtitle}>
                  Comprehensive audit trail of every receipt issued, transaction reference, student account, and cashier timestamp.
                </div>
              </div>
              <button type="button" className={styles.btnSecondary} onClick={exportCashierShiftCsv}>
                <FaDownload /> Export Audit Sheet
              </button>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Receipt #</th>
                    <th>Timestamp</th>
                    <th>Student Name</th>
                    <th>Adm / Grade</th>
                    <th>Invoice Reference</th>
                    <th>Payment Method</th>
                    <th>Transaction Ref</th>
                    <th>Amount Collected</th>
                  </tr>
                </thead>
                <tbody>
                  {!cashierShift?.transactions || cashierShift.transactions.length === 0 ? (
                    <tr>
                      <td colSpan="8">
                        <div className={styles.emptyStateCard}>
                          <FaClock className={styles.emptyStateIcon} style={{ color: '#94a3b8' }} />
                          <div className={styles.emptyStateTitle}>No Receipts Logged on this Date</div>
                          <div className={styles.emptyStateText}>
                            There were no fee collections recorded on {new Date(shiftDate).toLocaleDateString()}. Use the date picker above or click &ldquo;Oct 8&rdquo; to view historical shift activities.
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    cashierShift.transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td>
                          <strong style={{ color: '#4f46e5', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                            {tx.receipt_number}
                          </strong>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {tx.created_at ? new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>
                            {tx.student_first_name} {tx.student_last_name}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.82rem', fontWeight: 650 }}>{tx.grade_name || 'N/A'}</div>
                          <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Adm: {tx.admission_number || 'N/A'}</div>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.82rem', color: '#475569' }}>{tx.invoice_number}</span>
                        </td>
                        <td>
                          <span
                            className={styles.paymentMethodBadge}
                            style={{
                              background:
                                tx.payment_method === 'CASH'
                                  ? '#dcfce7'
                                  : tx.payment_method === 'TELEBIRR'
                                  ? '#e0f2fe'
                                  : '#e0e7ff',
                              color:
                                tx.payment_method === 'CASH'
                                  ? '#166534'
                                  : tx.payment_method === 'TELEBIRR'
                                  ? '#0369a1'
                                  : '#3730a3',
                            }}
                          >
                            {tx.payment_method}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#475569' }}>
                          {tx.transaction_reference || '—'}
                        </td>
                        <td style={{ fontWeight: 850, color: '#059669', fontSize: '0.95rem' }}>
                          {Number(tx.amount).toLocaleString()} ETB
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

      {/* Print Only Signatures & Audit Seal Block */}
      <div className={styles.printSignatures}>
        <div className={styles.signatureBlock}>
          <div className={styles.signatureLine} />
          <div className={styles.signatureTitle}>Shift Cashier / Bursar Signature</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Printed Name & Date</div>
        </div>

        <div className={styles.signatureBlock}>
          <div className={styles.signatureLine} />
          <div className={styles.signatureTitle}>Senior Accountant Verification</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Audit Clearance Sign-off</div>
        </div>

        <div className={styles.signatureBlock}>
          <div className={styles.signatureLine} />
          <div className={styles.signatureTitle}>Principal / School Administrator</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Official School Seal Stamp</div>
        </div>
      </div>
    </div>
  );
}
