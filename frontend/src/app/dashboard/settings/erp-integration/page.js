'use strict';
'use client';

import { useState, useEffect } from 'react';
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
} from 'react-icons/hi2';

export default function ErpIntegrationPage() {
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncingType, setSyncingType] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getOdooStatus();
      setStatusData(res);
    } catch (err) {
      setError(err.message || 'Failed to connect to Odoo ERP service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSync = async (type, syncFn, label) => {
    try {
      setSyncingType(type);
      setFeedback(null);
      setError(null);
      const res = await syncFn();
      setFeedback(`Successfully triggered ${label}: ${res?.synced_count || 0} records synchronized.`);
      await fetchStatus();
    } catch (err) {
      setError(err.message || `Failed to synchronize ${label}`);
    } finally {
      setSyncingType(null);
    }
  };

  const isEnabled = statusData?.enabled;
  const odooInfo = statusData?.odoo?.data;
  const metrics = odooInfo?.metrics;

  return (
    <div className={styles.container}>
      <div>
        <Link href="/dashboard/settings" className={styles.backLink}>
          <HiArrowLeft /> Back to Settings
        </Link>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Odoo 18 ERP Integration</h1>
            <p className={styles.subtitle}>
              Monitor connection health, student & billing data sync, and automatic invoice reconciliation.
            </p>
          </div>
          <button
            onClick={fetchStatus}
            disabled={loading}
            className={styles.btnSecondary}
          >
            <HiArrowPath className={loading ? 'animate-spin' : ''} /> Refresh Status
          </button>
        </div>
      </div>

      {feedback && <div className={`${styles.alert} ${styles.alertSuccess}`}>{feedback}</div>}
      {error && <div className={`${styles.alert} ${styles.alertError}`}>{error}</div>}

      <div className={styles.grid}>
        {/* Status Card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>
              <HiBuildingOffice2 /> ERP Connection Status
            </div>
            {isEnabled ? (
              <span className={styles.badgeSuccess}>
                <HiCheckCircle /> Connected
              </span>
            ) : (
              <span className={styles.badgeWarning}>
                <HiExclamationTriangle /> Offline / Disabled
              </span>
            )}
          </div>
          <div className={styles.cardBody}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Integration Mode</span>
              <span className={styles.infoValue}>{isEnabled ? 'ACTIVE (REST + JWT)' : 'DISABLED'}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>ERP Target</span>
              <span className={styles.infoValue}>Odoo 18 Enterprise</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Company Name</span>
              <span className={styles.infoValue}>{odooInfo?.company_name || 'Primary School Entity'}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Company ID</span>
              <span className={styles.infoValue}>{odooInfo?.company_id || 1}</span>
            </div>
          </div>
        </div>

        {/* Sync Metrics Card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>ERP Records Synchronized</div>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.metricGrid}>
              <div className={styles.metricBox}>
                <div className={styles.metricNumber}>{metrics?.students_synced ?? 0}</div>
                <div className={styles.metricLabel}>Students</div>
              </div>
              <div className={styles.metricBox}>
                <div className={styles.metricNumber}>{metrics?.parents_synced ?? 0}</div>
                <div className={styles.metricLabel}>Parents</div>
              </div>
              <div className={styles.metricBox}>
                <div className={styles.metricNumber}>{metrics?.school_invoices_recorded ?? 0}</div>
                <div className={styles.metricLabel}>Invoices</div>
              </div>
              <div className={styles.metricBox}>
                <div className={styles.metricNumber}>{metrics?.fee_payments_reconciled ?? 0}</div>
                <div className={styles.metricLabel}>Reconciled</div>
              </div>
              <div className={styles.metricBox}>
                <div className={styles.metricNumber}>{metrics?.staff_synced ?? 0}</div>
                <div className={styles.metricLabel}>Staff (HR)</div>
              </div>
              <div className={styles.metricBox}>
                <div className={styles.metricNumber}>{metrics?.payroll_entries_recorded ?? 0}</div>
                <div className={styles.metricLabel}>Payroll GL</div>
              </div>
            </div>
          </div>
        </div>

        {/* Sync Actions Card */}
        <div className={`${styles.card} ${styles.actionsCard}`}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>Manual Batch Synchronization</div>
          </div>
          <div className={styles.cardBody}>
            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
              Automatic synchronization occurs in real-time on student enrollment, invoice creation, and payment collection.
              Use the manual triggers below to sync existing historical records or recover from network interruptions.
            </p>
            <div className={styles.actionGrid}>
              <div className={styles.actionBox}>
                <div>
                  <div className={styles.actionTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <HiAcademicCap style={{ color: '#2563eb' }} /> Students & Parents
                  </div>
                  <div className={styles.actionDesc}>
                    Syncs student admission profiles, grade levels, sections, and parent contact details into Odoo contacts.
                  </div>
                </div>
                <button
                  className={styles.btnPrimary}
                  disabled={syncingType !== null}
                  onClick={() => handleSync('students', triggerSyncStudents, 'Students & Parents')}
                >
                  <HiArrowPath className={syncingType === 'students' ? 'animate-spin' : ''} />
                  {syncingType === 'students' ? 'Syncing...' : 'Sync Students'}
                </button>
              </div>

              <div className={styles.actionBox}>
                <div>
                  <div className={styles.actionTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <HiDocumentText style={{ color: '#0891b2' }} /> Student Fee Invoices
                  </div>
                  <div className={styles.actionDesc}>
                    Generates and posts matching customer fee invoices in Odoo ERP with fee item breakdowns.
                  </div>
                </div>
                <button
                  className={styles.btnPrimary}
                  disabled={syncingType !== null}
                  onClick={() => handleSync('invoices', triggerSyncInvoices, 'Fee Invoices')}
                >
                  <HiArrowPath className={syncingType === 'invoices' ? 'animate-spin' : ''} />
                  {syncingType === 'invoices' ? 'Syncing...' : 'Sync Invoices'}
                </button>
              </div>

              <div className={styles.actionBox}>
                <div>
                  <div className={styles.actionTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <HiCreditCard style={{ color: '#16a34a' }} /> Fee Payments & Reconciliation
                  </div>
                  <div className={styles.actionDesc}>
                    Pushes collected fee receipts, posts journal entries, and automatically marks invoices as paid.
                  </div>
                </div>
                <button
                  className={styles.btnPrimary}
                  disabled={syncingType !== null}
                  onClick={() => handleSync('payments', triggerSyncPayments, 'Fee Payments')}
                >
                  <HiArrowPath className={syncingType === 'payments' ? 'animate-spin' : ''} />
                  {syncingType === 'payments' ? 'Syncing...' : 'Sync Payments'}
                </button>
              </div>

              <div className={styles.actionBox}>
                <div>
                  <div className={styles.actionTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <HiUserGroup style={{ color: '#9333ea' }} /> All Staff & Contracts (HR)
                  </div>
                  <div className={styles.actionDesc}>
                    Syncs all school staff (teachers, librarians, accountants, drivers, guards, admins) into Odoo hr.employee and full contracts with independent allowances (housing, transport, medical, professional, other) into hr.contract.
                  </div>
                </div>
                <button
                  className={styles.btnPrimary}
                  disabled={syncingType !== null}
                  onClick={() => handleSync('staff', triggerSyncStaff, 'All Staff & Contracts')}
                >
                  <HiArrowPath className={syncingType === 'staff' ? 'animate-spin' : ''} />
                  {syncingType === 'staff' ? 'Syncing...' : 'Sync All Staff'}
                </button>
              </div>

              <div className={styles.actionBox}>
                <div>
                  <div className={styles.actionTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <HiBanknotes style={{ color: '#d97706' }} /> Payroll Disbursement (GL)
                  </div>
                  <div className={styles.actionDesc}>
                    Syncs approved and paid monthly payroll runs to balanced General Ledger double-entry journal entries (account.move) in Odoo.
                  </div>
                </div>
                <button
                  className={styles.btnPrimary}
                  disabled={syncingType !== null}
                  onClick={() => handleSync('payroll', triggerSyncPayroll, 'Payroll Disbursement')}
                >
                  <HiArrowPath className={syncingType === 'payroll' ? 'animate-spin' : ''} />
                  {syncingType === 'payroll' ? 'Syncing...' : 'Sync Payroll'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
