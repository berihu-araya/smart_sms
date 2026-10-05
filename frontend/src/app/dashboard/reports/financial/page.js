'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './page.module.css';
import * as financeApi from '@/services/financeService';
import { listGrades } from '@/services/gradeService';
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
} from 'react-icons/fa';
import { HiOutlineArrowPath } from 'react-icons/hi2';

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
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().slice(0, 10));

  const loadOverview = useCallback(async () => {
    try {
      const res = await financeApi.getFinanceOverviewKPIs();
      setKpis(res.data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadPnl = useCallback(async () => {
    try {
      setLoading(true);
      const res = await financeApi.getIncomeVsExpenseReport(selectedYear);
      setPnlReport(res.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  const loadDefaulters = useCallback(async () => {
    try {
      setLoading(true);
      const res = await financeApi.getDefaultersReport({ grade_id: selectedGrade });
      setDefaulters(res.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedGrade]);

  const loadCashierShift = useCallback(async () => {
    try {
      setLoading(true);
      const res = await financeApi.getCashierShiftReport(shiftDate);
      setCashierShift(res.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [shiftDate]);

  useEffect(() => {
    loadOverview();
    listGrades({ limit: 100 })
      .then((res) => {
        const list = Array.isArray(res)
          ? res
          : Array.isArray(res?.items)
          ? res.items
          : Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.data?.items)
          ? res.data.items
          : [];
        setGrades(list);
      })
      .catch(() => {});
  }, [loadOverview]);

  useEffect(() => {
    if (activeTab === 'pnl') loadPnl();
    if (activeTab === 'defaulters') loadDefaulters();
    if (activeTab === 'shift') loadCashierShift();
  }, [activeTab, loadPnl, loadDefaulters, loadCashierShift]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.title}>
            <FaFileInvoiceDollar style={{ color: '#4f46e5' }} />
            Financial Analytics & Audit Reports
          </div>
          <div className={styles.subtitle}>
            Analyze institutional fee collection rates, cash flow statements, fee defaulters aging lists, and cashier close shifts.
          </div>
        </div>

        <div className={styles.headerActions}>
          <button className={styles.btnSecondary} onClick={() => window.print()}>
            <FaPrint /> Print Report
          </button>
          <button className={styles.btnSecondary} onClick={() => (activeTab === 'pnl' ? loadPnl() : activeTab === 'defaulters' ? loadDefaulters() : loadCashierShift())}>
            <HiOutlineArrowPath /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '10px' }}>
          <FaExclamationTriangle /> {error}
        </div>
      )}

      {/* KPI Overview */}
      {kpis && (
        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon} style={{ background: '#dcfce7', color: '#059669' }}>
              <FaMoneyBillWave />
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Total Revenue Inflow</span>
              <span className={styles.kpiValue} style={{ color: '#059669' }}>
                {(Number(kpis.totalCollected) + Number(kpis.totalOtherIncome)).toLocaleString()} ETB
              </span>
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon} style={{ background: '#fee2e2', color: '#dc2626' }}>
              <FaReceipt />
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Total Outflow (Exp + Payroll)</span>
              <span className={styles.kpiValue} style={{ color: '#dc2626' }}>
                {Number(kpis.totalOutflow).toLocaleString()} ETB
              </span>
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon} style={{ background: kpis.netCashFlow >= 0 ? '#ccfbf1' : '#ffe4e6', color: kpis.netCashFlow >= 0 ? '#0f766e' : '#be123c' }}>
              <FaChartLine />
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Net Operating Surplus / Deficit</span>
              <span className={styles.kpiValue} style={{ color: kpis.netCashFlow >= 0 ? '#0f766e' : '#be123c' }}>
                {Number(kpis.netCashFlow).toLocaleString()} ETB
              </span>
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon} style={{ background: '#e0e7ff', color: '#4f46e5' }}>
              <FaFileInvoiceDollar />
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Fee Collection Rate</span>
              <span className={styles.kpiValue} style={{ color: '#4f46e5' }}>
                {kpis.collectionEfficiency}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className={styles.tabsNav}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'pnl' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('pnl')}
        >
          <FaChartLine /> Income vs Expense Statement (P&L)
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'defaulters' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('defaulters')}
        >
          <FaUserTimes /> Fee Defaulters Aging Analysis
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'shift' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('shift')}
        >
          <FaCashRegister /> Cashier Daily Shift Close Register
        </button>
      </div>

      {/* TAB 1: P&L STATEMENT */}
      {activeTab === 'pnl' && (
        <>
          <div className={styles.filterBar}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>Select Calendar Year:</span>
              <select
                className={styles.filterSelect}
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {[2025, 2026, 2027, 2028].map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.tableCard}>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Fee Collections</th>
                    <th>Direct Incomes</th>
                    <th>Total Inflow</th>
                    <th>Operational Expenses</th>
                    <th>Payroll Outflow</th>
                    <th>Total Outflow</th>
                    <th>Net Surplus / Deficit</th>
                  </tr>
                </thead>
                <tbody>
                  {(pnlReport?.monthlyBreakdown || []).map((row) => (
                    <tr key={row.month}>
                      <td style={{ fontWeight: 700 }}>{monthNames[row.month - 1]}</td>
                      <td>{Number(row.fee_collections).toLocaleString()} ETB</td>
                      <td>{Number(row.direct_incomes).toLocaleString()} ETB</td>
                      <td style={{ fontWeight: 700, color: '#059669' }}>
                        {Number(row.total_income).toLocaleString()} ETB
                      </td>
                      <td>{Number(row.operational_expenses).toLocaleString()} ETB</td>
                      <td>{Number(row.payroll_expenses).toLocaleString()} ETB</td>
                      <td style={{ fontWeight: 700, color: '#dc2626' }}>
                        {Number(row.total_expense).toLocaleString()} ETB
                      </td>
                      <td
                        style={{
                          fontWeight: 800,
                          color: Number(row.net_profit_loss) >= 0 ? '#059669' : '#dc2626',
                        }}
                      >
                        {Number(row.net_profit_loss).toLocaleString()} ETB
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: DEFAULTERS LIST */}
      {activeTab === 'defaulters' && (
        <>
          <div className={styles.filterBar}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <select
                className={styles.filterSelect}
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
              >
                <option value="">All Grade Levels</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.tableCard}>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Grade / Section</th>
                    <th>Invoice # / Title</th>
                    <th>Due Date</th>
                    <th>Total Billed</th>
                    <th>Paid</th>
                    <th>Outstanding Balance</th>
                    <th>Days Overdue</th>
                    <th>Parent Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {defaulters.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: '#059669', fontWeight: 600 }}>
                        <FaCheckCircle /> Excellent! No outstanding fee defaulters found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    defaulters.map((d) => (
                      <tr key={d.invoice_id}>
                        <td>
                          <strong>{d.student_first_name} {d.student_last_name}</strong>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Adm: {d.admission_number}</div>
                        </td>
                        <td>{d.grade_name || 'N/A'} {d.section_name ? `(${d.section_name})` : ''}</td>
                        <td>{d.invoice_number} ({d.invoice_title})</td>
                        <td>{d.due_date ? new Date(d.due_date).toLocaleDateString() : 'N/A'}</td>
                        <td style={{ fontWeight: 600 }}>{Number(d.total_amount).toLocaleString()} ETB</td>
                        <td style={{ color: '#059669' }}>{Number(d.paid_amount).toLocaleString()} ETB</td>
                        <td style={{ color: '#dc2626', fontWeight: 800 }}>{Number(d.balance_amount).toLocaleString()} ETB</td>
                        <td>
                          {Number(d.days_overdue) > 0 ? (
                            <span className={styles.daysOverdueBadge}>{d.days_overdue} days</span>
                          ) : (
                            <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Current</span>
                          )}
                        </td>
                        <td>
                          <div>{d.parent_name || 'N/A'}</div>
                          <div style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: 600 }}>{d.parent_phone || 'N/A'}</div>
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

      {/* TAB 3: CASHIER SHIFT REGISTER */}
      {activeTab === 'shift' && (
        <>
          <div className={styles.filterBar}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>Shift Date:</span>
              <input
                type="date"
                className={styles.filterSelect}
                value={shiftDate}
                onChange={(e) => setShiftDate(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.tableCard}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                Daily Cashier Close Shift Summary ({new Date(shiftDate).toLocaleDateString()})
              </h3>
              <div style={{ display: 'flex', gap: '2rem', marginTop: '0.5rem', fontSize: '1rem' }}>
                <div>Total Collections: <strong style={{ color: '#059669' }}>{Number(cashierShift?.totalCollected || 0).toLocaleString()} ETB</strong></div>
                <div>Total Receipts Issued: <strong>{cashierShift?.totalTransactions || 0}</strong></div>
              </div>
            </div>

            <div className={styles.shiftSummaryGrid}>
              {(cashierShift?.methodsBreakdown || []).map((m, idx) => (
                <div key={idx} className={styles.shiftMethodCard}>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{m.payment_method}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#059669' }}>
                    {Number(m.total_collected).toLocaleString()} ETB
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{m.transaction_count} transactions recorded</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
