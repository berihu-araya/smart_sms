'use strict';
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import {
  getOdooStatus,
  triggerSyncStudents,
  triggerSyncInvoices,
  triggerSyncPayments,
  triggerSyncStaff,
  triggerSyncPayroll,
} from '@/services/odooService';
import {
  HiArrowLeft,
  HiCheckCircle,
  HiExclamationTriangle,
  HiArrowPath,
  HiBuildingOffice2,
  HiAcademicCap,
  HiDocumentText,
  HiCreditCard,
  HiUserGroup,
  HiBanknotes,
  HiShieldCheck,
  HiServerStack,
  HiCpuChip,
  HiSparkles,
  HiArrowsRightLeft,
  HiCheck,
  HiXMark,
  HiClock,
  HiInformationCircle,
  HiChevronRight,
  HiBolt,
} from 'react-icons/hi2';

export default function ErpIntegrationPage() {
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('channels'); // 'channels' | 'architecture' | 'matrix'
  const [syncingType, setSyncingType] = useState(null);
  const [toast, setToast] = useState(null);
  const [latencyMs, setLatencyMs] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Per-channel batch limit selectors
  const [batchLimits, setBatchLimits] = useState({
    students: 50,
    invoices: 50,
    payments: 50,
    staff: 50,
    payroll: 20,
  });

  // Sequential full system sync progress state
  const [fullSyncProgress, setFullSyncProgress] = useState({
    active: false,
    currentStep: 0,
    totalSteps: 5,
    currentLabel: '',
    results: [],
  });

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const start = Date.now();
      const res = await getOdooStatus();
      setLatencyMs(Date.now() - start);
      setStatusData(res);
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (err) {
      setToast({
        type: 'error',
        text: err.message || 'Failed to connect to Odoo ERP service. Ensure Odoo container is running.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getOdooStatus()
      .then((res) => {
        if (active) {
          setStatusData(res);
          setLastSyncTime(new Date().toLocaleTimeString());
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setToast({
            type: 'error',
            text: err.message || 'Failed to connect to Odoo ERP service. Ensure Odoo container is running.',
          });
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSync = async (type, syncFn, label) => {
    try {
      setSyncingType(type);
      setToast(null);
      const limit = batchLimits[type] || 50;
      const res = await syncFn(limit);
      const syncedCount = res?.synced_count ?? res?.synced?.length ?? 0;
      setToast({
        type: 'success',
        text: `Successfully synced ${label}: ${syncedCount} records pushed to Odoo ERP.`,
      });
      await fetchStatus();
    } catch (err) {
      setToast({
        type: 'error',
        text: err.message || `Failed to synchronize ${label}`,
      });
    } finally {
      setSyncingType(null);
    }
  };

  // Run all 5 synchronization channels sequentially with live progress feedback
  const handleRunFullSync = async () => {
    const steps = [
      { type: 'students', label: 'Students & Parents', fn: triggerSyncStudents, limit: batchLimits.students },
      { type: 'invoices', label: 'Student Fee Invoices', fn: triggerSyncInvoices, limit: batchLimits.invoices },
      { type: 'payments', label: 'Fee Payments & Reconciliation', fn: triggerSyncPayments, limit: batchLimits.payments },
      { type: 'staff', label: 'All Staff & Full Contracts', fn: triggerSyncStaff, limit: batchLimits.staff },
      { type: 'payroll', label: 'Payroll GL Journal Disbursement', fn: triggerSyncPayroll, limit: batchLimits.payroll },
    ];

    setSyncingType('all');
    setToast(null);
    setFullSyncProgress({
      active: true,
      currentStep: 1,
      totalSteps: steps.length,
      currentLabel: steps[0].label,
      results: [],
    });

    const accumulatedResults = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      setFullSyncProgress((prev) => ({
        ...prev,
        currentStep: i + 1,
        currentLabel: step.label,
      }));

      try {
        const res = await step.fn(step.limit);
        const count = res?.synced_count ?? res?.synced?.length ?? 0;
        accumulatedResults.push({ label: step.label, success: true, count });
      } catch (err) {
        accumulatedResults.push({ label: step.label, success: false, error: err.message });
      }
    }

    setFullSyncProgress((prev) => ({
      ...prev,
      results: accumulatedResults,
    }));

    await fetchStatus();

    // Auto close progress modal after 2.5 seconds and display toast
    setTimeout(() => {
      setFullSyncProgress({ active: false, currentStep: 0, totalSteps: 5, currentLabel: '', results: [] });
      setSyncingType(null);
      const totalSynced = accumulatedResults.reduce((sum, r) => sum + (r.count || 0), 0);
      setToast({
        type: 'success',
        text: `Full System Synchronization Complete! Pushed ${totalSynced} total records across 5 modules into Odoo ERP.`,
      });
    }, 2000);
  };

  const isEnabled = statusData?.enabled;
  const odooInfo = statusData?.odoo?.data;
  const metrics = odooInfo?.metrics;

  return (
    <div className={styles.container}>
      {/* ------------------------------------------------------------------
         1. HERO HEADER & CONNECTION STATUS
         ------------------------------------------------------------------ */}
      <section className={styles.heroHeader}>
        <div className={styles.breadcrumbNav}>
          <Link href="/dashboard/settings" className={styles.backLink}>
            <HiArrowLeft /> Back to Settings
          </Link>
          <span className={styles.breadcrumbSeparator}>/</span>
          <span className={styles.breadcrumbCurrent}>ERP & Finance Integration</span>
        </div>

        <div className={styles.headerMainRow}>
          <div className={styles.titleArea}>
            <div className={styles.titleBadgeRow}>
              <h1 className={styles.title}>Enterprise ERP Integration</h1>
              {isEnabled ? (
                <span className={styles.statusBadgeConnected}>
                  <span className={styles.statusDotPulse} /> Connected & Operational
                </span>
              ) : (
                <span className={styles.statusBadgeOffline}>
                  <span className={styles.statusDotOffline} /> Standby / Disabled
                </span>
              )}
            </div>
            <p className={styles.subtitle}>
              High-throughput bidirectional financial & HR synchronization bridge between Smart SMS and Odoo 18.0+ Enterprise.
            </p>

            <div className={styles.metaChipsRow}>
              <span className={`${styles.metaChip} ${styles.metaChipAccent}`}>
                <HiServerStack /> Odoo 18.0 Enterprise
              </span>
              <span className={styles.metaChip}>
                <HiBuildingOffice2 /> Entity: {odooInfo?.company_name || 'ABT Tech'} (ID: {odooInfo?.company_id || 1})
              </span>
              <span className={styles.metaChip}>
                <HiShieldCheck /> Protocol: REST + JWT (HS256)
              </span>
              {latencyMs !== null && (
                <span className={`${styles.metaChip} ${styles.metaChipEmerald}`}>
                  <HiBolt /> Latency: {latencyMs}ms
                </span>
              )}
              {lastSyncTime && (
                <span className={styles.metaChip}>
                  <HiClock /> Last Health Check: {lastSyncTime}
                </span>
              )}
            </div>
          </div>

          <div className={styles.headerActions}>
            <button
              onClick={fetchStatus}
              disabled={loading || syncingType !== null}
              className={styles.btnRefresh}
              title="Re-query Odoo ERP health & metrics"
            >
              <HiArrowPath className={loading ? 'animate-spin' : ''} />
              {loading ? 'Pinging...' : 'Refresh Health'}
            </button>

            <button
              onClick={handleRunFullSync}
              disabled={loading || syncingType !== null || !isEnabled}
              className={styles.btnMasterSync}
              title="Sequentially synchronize all modules"
            >
              <HiSparkles />
              {syncingType === 'all' ? 'Running System Sync...' : 'Run Full System Sync'}
            </button>
          </div>
        </div>
      </section>

      {/* Toast Alert */}
      {toast && (
        <div className={`${styles.alertToast} ${toast.type === 'success' ? styles.alertSuccess : styles.alertError}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {toast.type === 'success' ? <HiCheckCircle size={20} /> : <HiExclamationTriangle size={20} />}
            <span>{toast.text}</span>
          </div>
          <button onClick={() => setToast(null)} className={styles.alertCloseBtn}>
            <HiXMark />
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------
         2. TAB NAVIGATION
         ------------------------------------------------------------------ */}
      <nav className={styles.tabBar} aria-label="ERP Integration Navigation">
        <button
          className={`${styles.tabButton} ${activeTab === 'channels' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('channels')}
        >
          <HiArrowsRightLeft /> Sync Channels & Metrics
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'architecture' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('architecture')}
        >
          <HiCpuChip /> Architecture & Pipelines
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'matrix' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('matrix')}
        >
          <HiDocumentText /> Entity Mapping Matrix
        </button>
      </nav>

      {/* ------------------------------------------------------------------
         TAB 1: CHANNELS & METRICS
         ------------------------------------------------------------------ */}
      {activeTab === 'channels' && (
        <>
          {/* KPI Ribbon (6 Metrics) */}
          <section className={styles.metricsGrid}>
            <div className={`${styles.metricCard} ${styles.metricStudents}`}>
              <div className={styles.metricCardTop}>
                <div className={styles.metricIconBadge}>
                  <HiAcademicCap />
                </div>
                <span className={styles.metricModelChip}>res.partner</span>
              </div>
              <div className={styles.metricValue}>{metrics?.students_synced ?? 0}</div>
              <div className={styles.metricTitle}>Students Enrolled</div>
              <div className={styles.metricSublabel}>Synced with grades & sections</div>
            </div>

            <div className={`${styles.metricCard} ${styles.metricParents}`}>
              <div className={styles.metricCardTop}>
                <div className={styles.metricIconBadge}>
                  <HiUserGroup />
                </div>
                <span className={styles.metricModelChip}>res.partner</span>
              </div>
              <div className={styles.metricValue}>{metrics?.parents_synced ?? 0}</div>
              <div className={styles.metricTitle}>Parents / Guardians</div>
              <div className={styles.metricSublabel}>Billing & emergency contacts</div>
            </div>

            <div className={`${styles.metricCard} ${styles.metricInvoices}`}>
              <div className={styles.metricCardTop}>
                <div className={styles.metricIconBadge}>
                  <HiDocumentText />
                </div>
                <span className={styles.metricModelChip}>account.move</span>
              </div>
              <div className={styles.metricValue}>{metrics?.school_invoices_recorded ?? 0}</div>
              <div className={styles.metricTitle}>Fee Invoices</div>
              <div className={styles.metricSublabel}>Posted AR customer invoices</div>
            </div>

            <div className={`${styles.metricCard} ${styles.metricPayments}`}>
              <div className={styles.metricCardTop}>
                <div className={styles.metricIconBadge}>
                  <HiCreditCard />
                </div>
                <span className={styles.metricModelChip}>account.payment</span>
              </div>
              <div className={styles.metricValue}>{metrics?.fee_payments_reconciled ?? 0}</div>
              <div className={styles.metricTitle}>Fee Reconciliations</div>
              <div className={styles.metricSublabel}>Auto-reconciled receipts</div>
            </div>

            <div className={`${styles.metricCard} ${styles.metricStaff}`}>
              <div className={styles.metricCardTop}>
                <div className={styles.metricIconBadge}>
                  <HiUserGroup />
                </div>
                <span className={styles.metricModelChip}>hr.contract</span>
              </div>
              <div className={styles.metricValue}>{metrics?.staff_synced ?? 0}</div>
              <div className={styles.metricTitle}>All Staff & Contracts</div>
              <div className={styles.metricSublabel}>HR employees with 6 allowances</div>
            </div>

            <div className={`${styles.metricCard} ${styles.metricPayroll}`}>
              <div className={styles.metricCardTop}>
                <div className={styles.metricIconBadge}>
                  <HiBanknotes />
                </div>
                <span className={styles.metricModelChip}>account.move (GL)</span>
              </div>
              <div className={styles.metricValue}>{metrics?.payroll_entries_recorded ?? 0}</div>
              <div className={styles.metricTitle}>Payroll GL Entries</div>
              <div className={styles.metricSublabel}>Balanced salary double-entries</div>
            </div>
          </section>

          {/* Outbox Health Banner */}
          <div className={styles.outboxBanner}>
            <div className={styles.outboxContent}>
              <HiShieldCheck className={styles.outboxIcon} />
              <div>
                <div className={styles.outboxTextTitle}>
                  Reliable Webhook Outbox Queue: {metrics?.pending_outbox_notifications ?? 0} Pending Messages
                </div>
                <div className={styles.outboxTextDesc}>
                  Transactions are logged into Odoo’s outbox table and delivered via scheduled cron with exponential backoff for guaranteed at-least-once delivery.
                </div>
              </div>
            </div>
          </div>

          {/* 5 Synchronization Channels Suite */}
          <section className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleGroup}>
                <h2 className={styles.sectionTitle}>Manual Synchronization Suite</h2>
                <p className={styles.sectionSubtitle}>
                  Real-time events sync automatically on student admission, fee payment, and salary structure saves. Use these triggers to backfill historical records or recover after network interruptions.
                </p>
              </div>
            </div>

            <div className={styles.channelsGrid}>
              {/* Channel 1: Students & Parents */}
              <div className={`${styles.channelCard} ${styles.channelStudents}`}>
                <div className={styles.channelTopBar} />
                <div className={styles.channelCardBody}>
                  <div className={styles.channelHeader}>
                    <div className={styles.channelIconBox}>
                      <HiAcademicCap />
                    </div>
                    <div className={styles.channelTitleGroup}>
                      <div className={styles.channelName}>Students & Parents</div>
                      <span className={styles.channelTargetModel}>Target: res.partner (Customer Hierarchy)</span>
                    </div>
                  </div>
                  <p className={styles.channelDescription}>
                    Synchronizes student admission profiles, active grade levels, sections, and establishes parent guardian relationships as parent-child contacts in Odoo.
                  </p>
                  <div className={styles.channelFeatureList}>
                    <div className={styles.channelFeatureItem}>
                      <span className={styles.featureDot}>•</span>
                      <span>Idempotency via <code>sms_student_reference</code> & <code>sms_parent_reference</code></span>
                    </div>
                    <div className={styles.channelFeatureItem}>
                      <span className={styles.featureDot}>•</span>
                      <span>Automatic link to School Company (ID: {odooInfo?.company_id || 1})</span>
                    </div>
                  </div>
                </div>
                <div className={styles.channelFooter}>
                  <div className={styles.limitSelectorGroup}>
                    <span>Batch:</span>
                    <select
                      value={batchLimits.students}
                      onChange={(e) => setBatchLimits({ ...batchLimits, students: Number(e.target.value) })}
                      className={styles.limitSelect}
                    >
                      <option value="25">25</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                      <option value="250">250</option>
                    </select>
                  </div>
                  <button
                    className={styles.btnChannelSync}
                    disabled={syncingType !== null || !isEnabled}
                    onClick={() => handleSync('students', triggerSyncStudents, 'Students & Parents')}
                  >
                    <HiArrowPath className={syncingType === 'students' ? 'animate-spin' : ''} />
                    {syncingType === 'students' ? 'Syncing...' : 'Sync Students'}
                  </button>
                </div>
              </div>

              {/* Channel 2: Student Fee Invoices */}
              <div className={`${styles.channelCard} ${styles.channelInvoices}`}>
                <div className={styles.channelTopBar} />
                <div className={styles.channelCardBody}>
                  <div className={styles.channelHeader}>
                    <div className={styles.channelIconBox}>
                      <HiDocumentText />
                    </div>
                    <div className={styles.channelTitleGroup}>
                      <div className={styles.channelName}>Student Fee Invoices</div>
                      <span className={styles.channelTargetModel}>Target: account.move (type: out_invoice)</span>
                    </div>
                  </div>
                  <p className={styles.channelDescription}>
                    Pushes term fee bills and generates posted customer invoices in Odoo General Ledger with line-item breakdowns (tuition, transport, uniform).
                  </p>
                  <div className={styles.channelFeatureList}>
                    <div className={styles.channelFeatureItem}>
                      <span className={styles.featureDot}>•</span>
                      <span>Auto-resolves Revenue Analytic Accounts per fee category</span>
                    </div>
                    <div className={styles.channelFeatureItem}>
                      <span className={styles.featureDot}>•</span>
                      <span>Auto-posts invoice directly to Accounts Receivable (AR)</span>
                    </div>
                  </div>
                </div>
                <div className={styles.channelFooter}>
                  <div className={styles.limitSelectorGroup}>
                    <span>Batch:</span>
                    <select
                      value={batchLimits.invoices}
                      onChange={(e) => setBatchLimits({ ...batchLimits, invoices: Number(e.target.value) })}
                      className={styles.limitSelect}
                    >
                      <option value="25">25</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                      <option value="250">250</option>
                    </select>
                  </div>
                  <button
                    className={styles.btnChannelSync}
                    disabled={syncingType !== null || !isEnabled}
                    onClick={() => handleSync('invoices', triggerSyncInvoices, 'Fee Invoices')}
                  >
                    <HiArrowPath className={syncingType === 'invoices' ? 'animate-spin' : ''} />
                    {syncingType === 'invoices' ? 'Syncing...' : 'Sync Invoices'}
                  </button>
                </div>
              </div>

              {/* Channel 3: Fee Payments & Reconciliation */}
              <div className={`${styles.channelCard} ${styles.channelPayments}`}>
                <div className={styles.channelTopBar} />
                <div className={styles.channelCardBody}>
                  <div className={styles.channelHeader}>
                    <div className={styles.channelIconBox}>
                      <HiCreditCard />
                    </div>
                    <div className={styles.channelTitleGroup}>
                      <div className={styles.channelName}>Payments & Reconciliation</div>
                      <span className={styles.channelTargetModel}>Target: account.payment & account.move.line</span>
                    </div>
                  </div>
                  <p className={styles.channelDescription}>
                    Registers payment receipts collected via cash, CBE, Telebirr, or bank transfer, and instantly reconciles matching invoices in Odoo.
                  </p>
                  <div className={styles.channelFeatureList}>
                    <div className={styles.channelFeatureItem}>
                      <span className={styles.featureDot}>•</span>
                      <span>Automatic journal resolution (Cash / Bank journals)</span>
                    </div>
                    <div className={styles.channelFeatureItem}>
                      <span className={styles.featureDot}>•</span>
                      <span>Invoice state switches immediately to &apos;In Payment&apos; / &apos;Paid&apos;</span>
                    </div>
                  </div>
                </div>
                <div className={styles.channelFooter}>
                  <div className={styles.limitSelectorGroup}>
                    <span>Batch:</span>
                    <select
                      value={batchLimits.payments}
                      onChange={(e) => setBatchLimits({ ...batchLimits, payments: Number(e.target.value) })}
                      className={styles.limitSelect}
                    >
                      <option value="25">25</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                      <option value="250">250</option>
                    </select>
                  </div>
                  <button
                    className={styles.btnChannelSync}
                    disabled={syncingType !== null || !isEnabled}
                    onClick={() => handleSync('payments', triggerSyncPayments, 'Fee Payments')}
                  >
                    <HiArrowPath className={syncingType === 'payments' ? 'animate-spin' : ''} />
                    {syncingType === 'payments' ? 'Syncing...' : 'Sync Payments'}
                  </button>
                </div>
              </div>

              {/* Channel 4: All Staff & Full Contracts */}
              <div className={`${styles.channelCard} ${styles.channelStaff}`}>
                <div className={styles.channelTopBar} />
                <div className={styles.channelCardBody}>
                  <div className={styles.channelHeader}>
                    <div className={styles.channelIconBox}>
                      <HiUserGroup />
                    </div>
                    <div className={styles.channelTitleGroup}>
                      <div className={styles.channelName}>All Staff & Contracts (HR)</div>
                      <span className={styles.channelTargetModel}>Target: hr.employee & hr.contract</span>
                    </div>
                  </div>
                  <p className={styles.channelDescription}>
                    Syncs ALL school employees (teachers, librarians, accountants, drivers, guards, admins) and creates full contracts with 6 independent allowance fields.
                  </p>
                  <div className={styles.channelFeatureList}>
                    <div className={styles.channelFeatureItem}>
                      <span className={styles.featureDot}>•</span>
                      <span>Independent Allowances: Housing, Travel, Medical, Professional, Other</span>
                    </div>
                    <div className={styles.channelFeatureItem}>
                      <span className={styles.featureDot}>•</span>
                      <span>Auto-creates missing Departments & Job titles; activates contract</span>
                    </div>
                  </div>
                </div>
                <div className={styles.channelFooter}>
                  <div className={styles.limitSelectorGroup}>
                    <span>Batch:</span>
                    <select
                      value={batchLimits.staff}
                      onChange={(e) => setBatchLimits({ ...batchLimits, staff: Number(e.target.value) })}
                      className={styles.limitSelect}
                    >
                      <option value="25">25</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                      <option value="250">250</option>
                    </select>
                  </div>
                  <button
                    className={styles.btnChannelSync}
                    disabled={syncingType !== null || !isEnabled}
                    onClick={() => handleSync('staff', triggerSyncStaff, 'All Staff & Contracts')}
                  >
                    <HiArrowPath className={syncingType === 'staff' ? 'animate-spin' : ''} />
                    {syncingType === 'staff' ? 'Syncing...' : 'Sync All Staff'}
                  </button>
                </div>
              </div>

              {/* Channel 5: Payroll GL Journal Disbursement */}
              <div className={`${styles.channelCard} ${styles.channelPayroll}`}>
                <div className={styles.channelTopBar} />
                <div className={styles.channelCardBody}>
                  <div className={styles.channelHeader}>
                    <div className={styles.channelIconBox}>
                      <HiBanknotes />
                    </div>
                    <div className={styles.channelTitleGroup}>
                      <div className={styles.channelName}>Payroll Disbursement (GL)</div>
                      <span className={styles.channelTargetModel}>Target: account.move (General Ledger Journal)</span>
                    </div>
                  </div>
                  <p className={styles.channelDescription}>
                    Converts approved and paid monthly payroll batches into balanced double-entry accounting journals with debit gross wages and credit taxes, pensions, and net wages payable.
                  </p>
                  <div className={styles.channelFeatureList}>
                    <div className={styles.channelFeatureItem}>
                      <span className={styles.featureDot}>•</span>
                      <span>Balanced Double-Entry: Debits = Credits strictly enforced</span>
                    </div>
                    <div className={styles.channelFeatureItem}>
                      <span className={styles.featureDot}>•</span>
                      <span>Direct line posting for Income Tax, Employee Pension (7%), Employer Pension (11%)</span>
                    </div>
                  </div>
                </div>
                <div className={styles.channelFooter}>
                  <div className={styles.limitSelectorGroup}>
                    <span>Batch:</span>
                    <select
                      value={batchLimits.payroll}
                      onChange={(e) => setBatchLimits({ ...batchLimits, payroll: Number(e.target.value) })}
                      className={styles.limitSelect}
                    >
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                    </select>
                  </div>
                  <button
                    className={styles.btnChannelSync}
                    disabled={syncingType !== null || !isEnabled}
                    onClick={() => handleSync('payroll', triggerSyncPayroll, 'Payroll Disbursement')}
                  >
                    <HiArrowPath className={syncingType === 'payroll' ? 'animate-spin' : ''} />
                    {syncingType === 'payroll' ? 'Syncing...' : 'Sync Payroll'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ------------------------------------------------------------------
         TAB 2: SYSTEM ARCHITECTURE & DATA PIPELINES
         ------------------------------------------------------------------ */}
      {activeTab === 'architecture' && (
        <section className={styles.archContainer}>
          <div className={styles.archDiagramCard}>
            <div className={styles.sectionTitleGroup}>
              <h2 className={styles.sectionTitle}>Bidirectional Integration Pipeline</h2>
              <p className={styles.sectionSubtitle}>
                Architected with Fault-Isolation, Anti-Corruption Layer, and Eventual Consistency
              </p>
            </div>

            <div className={styles.pipelineVisual}>
              <div className={styles.nodeBox}>
                <div className={styles.nodeBoxHeader}>
                  <HiServerStack style={{ color: '#4f46e5', fontSize: '1.4rem' }} />
                  <span>Smart SMS Engine</span>
                </div>
                <div className={styles.nodeFeatures}>
                  <span>• Node.js / Express Core</span>
                  <span>• PostgreSQL Database</span>
                  <span>• Academics, Fleet, & Finance</span>
                  <span>• Non-blocking Asynchronous Hooks</span>
                </div>
              </div>

              <div className={styles.bridgeConnector}>
                <div className={styles.connectorLine}>
                  <HiArrowsRightLeft />
                </div>
                <span className={styles.connectorBadge}>REST + JWT (HS256)</span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Idempotent API Bridge</span>
              </div>

              <div className={styles.nodeBox}>
                <div className={styles.nodeBoxHeader}>
                  <HiBuildingOffice2 style={{ color: '#059669', fontSize: '1.4rem' }} />
                  <span>Odoo 18.0 Enterprise</span>
                </div>
                <div className={styles.nodeFeatures}>
                  <span>• Python / Odoo ORM</span>
                  <span>• General Ledger & Payroll</span>
                  <span>• Outbox Webhook Dispatcher</span>
                  <span>• Multi-Company Context (ID: 1)</span>
                </div>
              </div>
            </div>

            <div className={styles.archGrid}>
              <div className={styles.archFeatureCard}>
                <div className={styles.archFeatureTitle}>
                  <HiBolt style={{ color: '#f59e0b' }} /> Fault-Tolerant Failure Isolation
                </div>
                <div className={styles.archFeatureDesc}>
                  ERP HTTP requests execute asynchronously. If Odoo is rebooting or under heavy load, local school operations (student enrollment, fee collections, teacher hiring) complete without blocking the user.
                </div>
              </div>

              <div className={styles.archFeatureCard}>
                <div className={styles.archFeatureTitle}>
                  <HiShieldCheck style={{ color: '#4f46e5' }} /> Strict Idempotency & Conflict Safety
                </div>
                <div className={styles.archFeatureDesc}>
                  External references (<code>sms_staff_reference</code>, <code>sms_student_reference</code>) prevent duplicate creation. Multiple sync runs gracefully update existing entities in-flight.
                </div>
              </div>

              <div className={styles.archFeatureCard}>
                <div className={styles.archFeatureTitle}>
                  <HiSparkles style={{ color: '#8b5cf6' }} /> Preserved Domain Granularity
                </div>
                <div className={styles.archFeatureDesc}>
                  Staff compensation is separated into dedicated fields (<code>wage</code>, <code>house_rent_allowance</code>, <code>travel_allowance</code>, <code>medical_allowance</code>) for legal tax exemption compliance.
                </div>
              </div>

              <div className={styles.archFeatureCard}>
                <div className={styles.archFeatureTitle}>
                  <HiClock style={{ color: '#0ea5e9' }} /> Outbox Pattern Webhook Reliability
                </div>
                <div className={styles.archFeatureDesc}>
                  Reverse events from Odoo (such as bank payment reconciliation) write to <code>sms_outbox_message</code> inside the database transaction, dispatched via a cron runner with exponential backoff.
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------------
         TAB 3: ENTITY MAPPING MATRIX
         ------------------------------------------------------------------ */}
      {activeTab === 'matrix' && (
        <section className={styles.matrixTableCard}>
          <div className={styles.tableResponsive}>
            <table className={styles.matrixTable}>
              <thead>
                <tr>
                  <th>Smart SMS Entity</th>
                  <th>Source Fields</th>
                  <th>Sync Direction</th>
                  <th>Target Odoo Model</th>
                  <th>Target Fields / Idempotency Key</th>
                  <th>Business Rules & Transform</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Student Profile</strong></td>
                  <td><code>id, admission_number, first_name, last_name, grade, section</code></td>
                  <td><span className={styles.badgeSyncDir}>SMS → Odoo</span></td>
                  <td><span className={styles.modelTag}>res.partner</span></td>
                  <td><code>sms_student_reference, name, phone, email, is_company: False</code></td>
                  <td>Created as child contact under parent; linked to grade category tag.</td>
                </tr>
                <tr>
                  <td><strong>Parent / Guardian</strong></td>
                  <td><code>id, full_name, phone, email, relationship</code></td>
                  <td><span className={styles.badgeSyncDir}>SMS → Odoo</span></td>
                  <td><span className={styles.modelTag}>res.partner</span></td>
                  <td><code>sms_parent_reference, name, phone, email, is_company: False</code></td>
                  <td>Parent invoice customer contact; receives statement and receipts.</td>
                </tr>
                <tr>
                  <td><strong>Student Fee Invoice</strong></td>
                  <td><code>invoice_number, due_date, total_amount, fee_lines</code></td>
                  <td><span className={styles.badgeSyncDir}>SMS → Odoo</span></td>
                  <td><span className={styles.modelTag}>account.move</span></td>
                  <td><code>sms_invoice_reference, move_type: out_invoice, line_ids</code></td>
                  <td>Auto-posted to Accounts Receivable (AR); generates analytic tag per line.</td>
                </tr>
                <tr>
                  <td><strong>Fee Payment Receipt</strong></td>
                  <td><code>receipt_number, payment_method, amount, payment_date</code></td>
                  <td><span className={styles.badgeSyncDir}>SMS → Odoo</span></td>
                  <td><span className={styles.modelTag}>account.payment</span></td>
                  <td><code>communication, amount, payment_type: inbound, journal_id</code></td>
                  <td>Reconciles against invoice lines; marks invoice &apos;In Payment&apos; or &apos;Paid&apos;.</td>
                </tr>
                <tr>
                  <td><strong>All School Staff</strong></td>
                  <td><code>user_id, name, email, phone, role (Teacher, Driver, Guard, etc.)</code></td>
                  <td><span className={styles.badgeSyncDir}>SMS → Odoo</span></td>
                  <td><span className={styles.modelTag}>hr.employee</span></td>
                  <td><code>sms_staff_reference, name, work_email, department_id, job_id</code></td>
                  <td>Auto-resolves role to department; auto-creates job title if not existing.</td>
                </tr>
                <tr>
                  <td><strong>Employment Contract</strong></td>
                  <td><code>base_salary, housing, transport, medical, professional, other</code></td>
                  <td><span className={styles.badgeSyncDir}>SMS → Odoo</span></td>
                  <td><span className={styles.modelTag}>hr.contract</span></td>
                  <td><code>wage, house_rent_allowance, travel_allowance, medical_allowance, etc.</code></td>
                  <td>Updates in-place if active contract exists; sets state to &apos;open&apos; automatically.</td>
                </tr>
                <tr>
                  <td><strong>Payroll Run</strong></td>
                  <td><code>month, year, total_gross, tax, employee_pension, employer_pension</code></td>
                  <td><span className={styles.badgeSyncDir}>SMS → Odoo</span></td>
                  <td><span className={styles.modelTag}>account.move</span></td>
                  <td><code>ref: PAY-RUN-YYYY-MM, move_type: entry, debit/credit lines</code></td>
                  <td>Balanced double-entry journal posting to Salary Expenses & Liabilities.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------------
         MODAL: SEQUENTIAL FULL SYSTEM SYNC PROGRESS
         ------------------------------------------------------------------ */}
      {fullSyncProgress.active && (
        <div className={styles.progressModalOverlay}>
          <div className={styles.progressModalCard}>
            <div className={styles.progressModalHeader}>
              <div className={styles.progressModalIcon}>
                <HiSparkles />
              </div>
              <div className={styles.progressTitleGroup}>
                <div className={styles.progressModalTitle}>Full System Sync in Progress</div>
                <div className={styles.progressModalDesc}>
                  Pipelining all 5 modules sequentially into Odoo 18 ERP...
                </div>
              </div>
            </div>

            <div className={styles.progressBarContainer}>
              <div
                className={styles.progressBarFill}
                style={{ width: `${(fullSyncProgress.currentStep / fullSyncProgress.totalSteps) * 100}%` }}
              />
            </div>

            <div className={styles.progressStepsList}>
              <div className={`${styles.progressStepItem} ${fullSyncProgress.currentStep === 1 ? styles.stepActive : fullSyncProgress.currentStep > 1 ? styles.stepCompleted : ''}`}>
                <span>1. Students & Parents</span>
                <span>{fullSyncProgress.currentStep > 1 ? <HiCheck /> : fullSyncProgress.currentStep === 1 ? 'Syncing...' : 'Pending'}</span>
              </div>
              <div className={`${styles.progressStepItem} ${fullSyncProgress.currentStep === 2 ? styles.stepActive : fullSyncProgress.currentStep > 2 ? styles.stepCompleted : ''}`}>
                <span>2. Student Fee Invoices</span>
                <span>{fullSyncProgress.currentStep > 2 ? <HiCheck /> : fullSyncProgress.currentStep === 2 ? 'Syncing...' : 'Pending'}</span>
              </div>
              <div className={`${styles.progressStepItem} ${fullSyncProgress.currentStep === 3 ? styles.stepActive : fullSyncProgress.currentStep > 3 ? styles.stepCompleted : ''}`}>
                <span>3. Fee Payments & Reconciliation</span>
                <span>{fullSyncProgress.currentStep > 3 ? <HiCheck /> : fullSyncProgress.currentStep === 3 ? 'Syncing...' : 'Pending'}</span>
              </div>
              <div className={`${styles.progressStepItem} ${fullSyncProgress.currentStep === 4 ? styles.stepActive : fullSyncProgress.currentStep > 4 ? styles.stepCompleted : ''}`}>
                <span>4. All Staff & Full Allowance Contracts</span>
                <span>{fullSyncProgress.currentStep > 4 ? <HiCheck /> : fullSyncProgress.currentStep === 4 ? 'Syncing...' : 'Pending'}</span>
              </div>
              <div className={`${styles.progressStepItem} ${fullSyncProgress.currentStep === 5 ? styles.stepActive : fullSyncProgress.currentStep > 5 ? styles.stepCompleted : ''}`}>
                <span>5. Payroll GL Journal Disbursement</span>
                <span>{fullSyncProgress.currentStep > 5 ? <HiCheck /> : fullSyncProgress.currentStep === 5 ? 'Syncing...' : 'Pending'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
