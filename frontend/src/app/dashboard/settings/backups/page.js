'use strict';
'use client';

import { useState, useEffect, useMemo } from 'react';
import styles from './page.module.css';
import { listBackups, triggerBackup, getBackupDownloadUrl } from '@/services/backupService';
import {
  HiDatabase,
  HiArrowDownTray,
  HiArrowPath,
  HiShieldCheck,
  HiServerStack,
  HiCheckCircle,
  HiClock,
} from 'react-icons/hi2';

export default function BackupsPage() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await listBackups();
      setBackups(data || []);
    } catch (err) {
      console.error('Failed to load backups:', err);
      setError('Unable to load database backup catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => {
    const total = backups.length;
    const totalBytes = backups.reduce((acc, b) => acc + (parseInt(b.file_size_bytes, 10) || 0), 0);
    const totalMb = (totalBytes / (1024 * 1024)).toFixed(2);
    const lastBackup = backups[0]?.created_at
      ? new Date(backups[0].created_at).toLocaleDateString()
      : 'None';
    return { total, totalMb, lastBackup };
  }, [backups]);

  const handleTriggerBackup = async () => {
    setTriggering(true);
    setError(null);
    setMessage(null);

    try {
      const result = await triggerBackup('MANUAL');
      setMessage(
        `Database snapshot '${result.file_name}' generated successfully with verified SHA-256 integrity!`
      );
      loadData();
      setTimeout(() => setMessage(null), 5000);
    } catch (err) {
      setError(err.message || 'Failed to trigger backup');
    } finally {
      setTriggering(false);
    }
  };

  const formatFileSize = (bytes) => {
    const b = parseInt(bytes, 10) || 0;
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Automated Database Backups & Disaster Recovery</h1>
          <p className={styles.subtitle}>
            Manage automated snapshot archives, point-in-time recovery checkpoints, and disaster readiness.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.triggerBtn}
            onClick={handleTriggerBackup}
            disabled={triggering}
          >
            {triggering ? (
              <>
                <HiArrowPath className="animate-spin" /> Generating Snapshot...
              </>
            ) : (
              <>
                <HiDatabase /> Trigger Manual Snapshot
              </>
            )}
          </button>
        </div>
      </div>

      {message && <div className={`${styles.alert} ${styles.alertSuccess}`}>{message}</div>}
      {error && <div className={`${styles.alert} ${styles.alertError}`}>{error}</div>}

      {/* Resilience Metrics */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#eff6ff', color: '#2563eb' }}>
            <HiServerStack />
          </div>
          <div>
            <div className={styles.statValue}>{stats.total}</div>
            <div className={styles.statLabel}>Available Snapshots</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#ecfdf5', color: '#059669' }}>
            <HiShieldCheck />
          </div>
          <div>
            <div className={styles.statValue} style={{ color: '#059669' }}>
              Protected
            </div>
            <div className={styles.statLabel}>Disaster Readiness</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#f5f3ff', color: '#7c3aed' }}>
            <HiClock />
          </div>
          <div>
            <div className={styles.statValue}>{stats.lastBackup}</div>
            <div className={styles.statLabel}>Last Snapshot Date</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#fffbeb', color: '#d97706' }}>
            <HiDatabase />
          </div>
          <div>
            <div className={styles.statValue}>{stats.totalMb} MB</div>
            <div className={styles.statLabel}>Storage Footprint</div>
          </div>
        </div>
      </div>

      {/* Backups Catalog */}
      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.emptyState}>Loading backup catalog...</div>
        ) : backups.length === 0 ? (
          <div className={styles.emptyState}>
            <HiDatabase className={styles.emptyIcon} />
            <p>No database snapshots generated yet. Click above to trigger your first backup.</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Snapshot Name</th>
                <th>Type</th>
                <th>File Size</th>
                <th>SHA-256 Checksum</th>
                <th>Initiated By</th>
                <th>Created At</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((b) => (
                <tr key={b.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{b.file_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>PostgreSQL Schema & Tables</div>
                  </td>
                  <td>
                    <span className={styles.typeBadge}>{b.backup_type}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{formatFileSize(b.file_size_bytes)}</span>
                  </td>
                  <td>
                    {b.checksum_sha256 ? (
                      <span className={styles.checksumBadge} title={b.checksum_sha256}>
                        {b.checksum_sha256.substring(0, 12)}...
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>-</span>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      {b.initiated_by_name || 'System Scheduler'}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      {new Date(b.created_at).toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {new Date(b.created_at).toLocaleTimeString()}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <a
                      href={getBackupDownloadUrl(b.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.downloadBtn}
                    >
                      <HiArrowDownTray /> Download Archive
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
