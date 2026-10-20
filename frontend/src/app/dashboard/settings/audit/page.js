'use strict';
'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import { listAuditLogs, getExportAuditLogsUrl } from '@/services/auditService';
import {
  HiShieldCheck,
  HiMagnifyingGlass,
  HiArrowDownTray,
  HiEye,
  HiXMark,
  HiClock,
  HiCheckCircle,
} from 'react-icons/hi2';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [resourceFilter, setResourceFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Diff modal
  const [selectedLog, setSelectedLog] = useState(null);

  const loadData = async (page = 1) => {
    try {
      setLoading(true);
      const res = await listAuditLogs({
        page,
        limit: 25,
        search,
        action: actionFilter,
        resourceType: resourceFilter,
        startDate,
        endDate,
      });

      setLogs(res.data || []);
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(1);
  }, [search, actionFilter, resourceFilter, startDate, endDate]);

  const handleExport = () => {
    const url = getExportAuditLogsUrl({
      search,
      action: actionFilter,
      resourceType: resourceFilter,
      startDate,
      endDate,
    });
    window.open(url, '_blank');
  };

  const getActionBadgeClass = (action = '') => {
    const act = action.toUpperCase();
    if (act.includes('DELETE')) return styles.badgeDelete;
    if (act.includes('CREATE') || act.includes('INSERT')) return styles.badgeCreate;
    if (act.includes('ROLE') || act.includes('SECURITY')) return styles.badgeSecurity;
    return styles.badgeUpdate;
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>System Audit Trail & Security Logs</h1>
          <p className={styles.subtitle}>
            Chronological, immutable ledger of security-critical actions, record deltas, and access modifications.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.exportBtn} onClick={handleExport}>
            <HiArrowDownTray /> Export Audit CSV
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={styles.filterCard}>
        <div className={styles.searchInputWrapper}>
          <HiMagnifyingGlass className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search logs by user, action, IP, or resource..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className={styles.filterSelect}
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        >
          <option value="ALL">All Actions</option>
          <option value="DEPARTMENT_CREATED">Department Created</option>
          <option value="DEPARTMENT_UPDATED">Department Updated</option>
          <option value="DEPARTMENT_DELETED">Department Deleted</option>
          <option value="ROLE_CREATED">Role Created</option>
          <option value="ROLE_DELETED">Role Deleted</option>
          <option value="ROLE_PERMISSIONS_UPDATED">Permissions Updated</option>
          <option value="BACKUP_TRIGGERED">Backup Triggered</option>
        </select>

        <select
          className={styles.filterSelect}
          value={resourceFilter}
          onChange={(e) => setResourceFilter(e.target.value)}
        >
          <option value="ALL">All Resource Types</option>
          <option value="DEPARTMENT">Department</option>
          <option value="ROLE">Role</option>
          <option value="ROLE_PERMISSIONS">Permissions</option>
          <option value="SYSTEM_BACKUP">Backups</option>
          <option value="SYSTEM_SETTING">Settings</option>
        </select>

        <input
          type="date"
          className={styles.dateInput}
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          title="Start Date"
        />
        <input
          type="date"
          className={styles.dateInput}
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          title="End Date"
        />
      </div>

      {/* Audit Logs Table */}
      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.emptyState}>Loading audit records...</div>
        ) : logs.length === 0 ? (
          <div className={styles.emptyState}>
            <HiShieldCheck className={styles.emptyIcon} />
            <p>No audit trail records found for the selected criteria.</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Operator User</th>
                <th>Client IP</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Inspection</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>
                      {new Date(log.created_at).toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {new Date(log.created_at).toLocaleTimeString()}
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.actionBadge} ${getActionBadgeClass(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{log.resource_type || 'SYSTEM'}</div>
                    {log.resource_id && (
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                        {log.resource_id.substring(0, 8)}...
                      </div>
                    )}
                  </td>
                  <td>
                    <div className={styles.userCell}>
                      <span className={styles.userName}>{log.user_name || 'System / Automated'}</span>
                      <span className={styles.userMeta}>
                        {log.user_role || 'Automation'} {log.user_email ? `• ${log.user_email}` : ''}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#475569' }}>
                      {log.ip_address || '127.0.0.1'}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: log.status === 'SUCCESS' ? '#059669' : '#dc2626',
                      }}
                    >
                      {log.status || 'SUCCESS'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {(log.old_values || log.new_values) && (
                      <button className={styles.diffBtn} onClick={() => setSelectedLog(log)}>
                        <HiEye /> Inspect Delta
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        <div className={styles.pagination}>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} records)
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className={styles.pageBtn}
              disabled={pagination.page <= 1}
              onClick={() => loadData(pagination.page - 1)}
            >
              Previous
            </button>
            <button
              className={styles.pageBtn}
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => loadData(pagination.page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Delta Diff Modal */}
      {selectedLog && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle}>Audit Delta Inspector</h2>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
                  {selectedLog.action} on {selectedLog.resource_type} • ID: {selectedLog.resource_id}
                </p>
              </div>
              <button className={styles.closeBtn} onClick={() => setSelectedLog(null)}>
                <HiXMark />
              </button>
            </div>

            <div className={styles.diffGrid}>
              <div>
                <div className={styles.diffLabel} style={{ color: '#b91c1c' }}>
                  Before State (Old Values)
                </div>
                <div className={styles.diffBox}>
                  {selectedLog.old_values
                    ? JSON.stringify(selectedLog.old_values, null, 2)
                    : '// No previous state recorded'}
                </div>
              </div>

              <div>
                <div className={styles.diffLabel} style={{ color: '#15803d' }}>
                  After State (New Values)
                </div>
                <div className={styles.diffBox}>
                  {selectedLog.new_values
                    ? JSON.stringify(selectedLog.new_values, null, 2)
                    : '// Record was removed'}
                </div>
              </div>
            </div>

            <div
              style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button className={styles.exportBtn} onClick={() => setSelectedLog(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
