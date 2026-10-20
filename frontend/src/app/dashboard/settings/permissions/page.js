'use strict';
'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import { listRoles, getRolePermissions, updateRolePermissions } from '@/services/roleService';
import {
  HiKey,
  HiShieldCheck,
  HiCheckCircle,
  HiArrowPath,
  HiCheck,
  HiAcademicCap,
  HiUserGroup,
  HiClipboardDocumentCheck,
  HiChartBar,
  HiBanknotes,
  HiBuildingOffice2,
  HiCog6Tooth,
} from 'react-icons/hi2';

const MODULE_DEFINITIONS = [
  { key: 'students', label: 'Students Directory & Admissions', icon: HiUserGroup },
  { key: 'teachers', label: 'Teaching Faculty & Staff', icon: HiAcademicCap },
  { key: 'attendance', label: 'Student & Staff Attendance', icon: HiClipboardDocumentCheck },
  { key: 'marks', label: 'Continuous Evaluation & Exam Marks', icon: HiChartBar },
  { key: 'exams', label: 'Examinations & Master Schedules', icon: HiClipboardDocumentCheck },
  { key: 'timetable', label: 'Class Schedules & Room Allocation', icon: HiAcademicCap },
  { key: 'finance', label: 'Tuition Fees, Invoicing & Payroll', icon: HiBanknotes },
  { key: 'library', label: 'Library Catalog & Book Circulation', icon: HiAcademicCap },
  { key: 'transport', label: 'Transport Routes & Vehicle Fleet', icon: HiBuildingOffice2 },
  { key: 'announcements', label: 'Announcements & Broadcast Notices', icon: HiAcademicCap },
  { key: 'reports', label: 'Academic & Institutional Analytics', icon: HiChartBar },
  { key: 'departments', label: 'Faculties & Operational Departments', icon: HiBuildingOffice2 },
  { key: 'roles_permissions', label: 'Roles & Security Policies', icon: HiKey },
  { key: 'audit_logs', label: 'System Audit Trail & Security Logs', icon: HiShieldCheck },
  { key: 'backups', label: 'Automated Snapshots & Recovery', icon: HiCog6Tooth },
  { key: 'settings', label: 'General School System Settings', icon: HiCog6Tooth },
];

export default function PermissionsPage() {
  const [roles, setRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Load roles list
  useEffect(() => {
    async function loadRoles() {
      try {
        const rList = await listRoles();
        setRoles(rList || []);
        if (rList && rList.length > 0) {
          setSelectedRoleId(rList[0].id);
        }
      } catch (err) {
        console.error('Failed to load roles:', err);
        setError('Unable to load institutional roles');
      } finally {
        setLoading(false);
      }
    }
    loadRoles();
  }, []);

  // Load permissions whenever selectedRoleId changes
  useEffect(() => {
    if (!selectedRoleId) return;

    async function loadPerms() {
      try {
        setLoading(true);
        const data = await getRolePermissions(selectedRoleId);
        const fetchedPerms = data.permissions || [];

        // Ensure all module keys exist in array
        const normalized = MODULE_DEFINITIONS.map((m) => {
          const match = fetchedPerms.find((p) => p.module === m.key);
          return (
            match || {
              module: m.key,
              can_view: false,
              can_create: false,
              can_edit: false,
              can_delete: false,
              can_approve: false,
              can_export: false,
              scope: 'SCHOOL',
            }
          );
        });

        setPermissions(normalized);
      } catch (err) {
        console.error('Failed to load role permissions:', err);
        setError('Failed to load permissions for selected role');
      } finally {
        setLoading(false);
      }
    }

    loadPerms();
  }, [selectedRoleId]);

  const handleToggle = (moduleKey, field) => {
    setPermissions((prev) =>
      prev.map((p) => {
        if (p.module === moduleKey) {
          return { ...p, [field]: !p[field] };
        }
        return p;
      })
    );
  };

  const handleScopeChange = (moduleKey, newScope) => {
    setPermissions((prev) =>
      prev.map((p) => {
        if (p.module === moduleKey) {
          return { ...p, scope: newScope };
        }
        return p;
      })
    );
  };

  // Batch presets
  const handleGrantFull = () => {
    setPermissions((prev) =>
      prev.map((p) => ({
        ...p,
        can_view: true,
        can_create: true,
        can_edit: true,
        can_delete: true,
        can_approve: true,
        can_export: true,
        scope: 'SCHOOL',
      }))
    );
  };

  const handleGrantReadOnly = () => {
    setPermissions((prev) =>
      prev.map((p) => ({
        ...p,
        can_view: true,
        can_create: false,
        can_edit: false,
        can_delete: false,
        can_approve: false,
        can_export: false,
        scope: 'SCHOOL',
      }))
    );
  };

  const handleRevokeAll = () => {
    setPermissions((prev) =>
      prev.map((p) => ({
        ...p,
        can_view: false,
        can_create: false,
        can_edit: false,
        can_delete: false,
        can_approve: false,
        can_export: false,
        scope: 'SCHOOL',
      }))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await updateRolePermissions(selectedRoleId, permissions);
      const roleName = roles.find((r) => r.id === selectedRoleId)?.name || 'Role';
      setMessage(`Privileges for '${roleName}' updated and applied across the system!`);
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      setError(err.message || 'Failed to update permissions');
    } finally {
      setSaving(false);
    }
  };

  const currentRole = roles.find((r) => r.id === selectedRoleId);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Granular Permissions & Scope Matrix</h1>
          <p className={styles.subtitle}>
            Define dynamic module-level create, read, update, delete, approve, and export privileges for custom and system roles.
          </p>
        </div>
      </div>

      {message && <div className={`${styles.alert} ${styles.alertSuccess}`}>{message}</div>}
      {error && <div className={`${styles.alert} ${styles.alertError}`}>{error}</div>}

      {/* Role Selector & Batch Presets */}
      <div className={styles.roleSelectorCard}>
        <div className={styles.roleSelectGroup}>
          <label className={styles.roleSelectLabel}>Configuring Role:</label>
          <select
            className={styles.roleSelect}
            value={selectedRoleId}
            onChange={(e) => setSelectedRoleId(e.target.value)}
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.user_count || 0} users)
              </option>
            ))}
          </select>
        </div>

        <div className={styles.batchActions}>
          <button type="button" className={styles.batchBtn} onClick={handleGrantFull}>
            Grant Full Access
          </button>
          <button type="button" className={styles.batchBtn} onClick={handleGrantReadOnly}>
            Set Read-Only
          </button>
          <button type="button" className={styles.batchBtn} onClick={handleRevokeAll}>
            Revoke All
          </button>
        </div>
      </div>

      {/* Permissions Matrix Table */}
      <div className={styles.matrixCard}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            Loading privileges for {currentRole?.name || 'role'}...
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '30%' }}>System Module</th>
                <th style={{ textAlign: 'center' }}>View (Read)</th>
                <th style={{ textAlign: 'center' }}>Create</th>
                <th style={{ textAlign: 'center' }}>Edit (Update)</th>
                <th style={{ textAlign: 'center' }}>Delete</th>
                <th style={{ textAlign: 'center' }}>Approve</th>
                <th style={{ textAlign: 'center' }}>Export</th>
                <th style={{ textAlign: 'center' }}>Data Scope</th>
              </tr>
            </thead>
            <tbody>
              {MODULE_DEFINITIONS.map((m) => {
                const perm = permissions.find((p) => p.module === m.key) || {
                  can_view: false,
                  can_create: false,
                  can_edit: false,
                  can_delete: false,
                  can_approve: false,
                  can_export: false,
                  scope: 'SCHOOL',
                };
                const IconComponent = m.icon;

                return (
                  <tr key={m.key}>
                    <td>
                      <div className={styles.moduleCell}>
                        <div className={styles.moduleIcon}>
                          <IconComponent />
                        </div>
                        <div>
                          <div className={styles.moduleName}>{m.label}</div>
                          <div className={styles.moduleKey}>{m.key}</div>
                        </div>
                      </div>
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <div className={styles.checkboxWrapper}>
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          checked={Boolean(perm.can_view)}
                          onChange={() => handleToggle(m.key, 'can_view')}
                        />
                      </div>
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <div className={styles.checkboxWrapper}>
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          checked={Boolean(perm.can_create)}
                          onChange={() => handleToggle(m.key, 'can_create')}
                        />
                      </div>
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <div className={styles.checkboxWrapper}>
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          checked={Boolean(perm.can_edit)}
                          onChange={() => handleToggle(m.key, 'can_edit')}
                        />
                      </div>
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <div className={styles.checkboxWrapper}>
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          checked={Boolean(perm.can_delete)}
                          onChange={() => handleToggle(m.key, 'can_delete')}
                        />
                      </div>
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <div className={styles.checkboxWrapper}>
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          checked={Boolean(perm.can_approve)}
                          onChange={() => handleToggle(m.key, 'can_approve')}
                        />
                      </div>
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <div className={styles.checkboxWrapper}>
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          checked={Boolean(perm.can_export)}
                          onChange={() => handleToggle(m.key, 'can_export')}
                        />
                      </div>
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <select
                        className={styles.scopeSelect}
                        value={perm.scope || 'SCHOOL'}
                        onChange={(e) => handleScopeChange(m.key, e.target.value)}
                      >
                        <option value="SCHOOL">School Wide</option>
                        <option value="DEPARTMENT_ONLY">Department Only</option>
                        <option value="OWN_ONLY">Own Records Only</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Save Button */}
      <div className={styles.footerActions}>
        <button className={styles.saveBtn} onClick={handleSave} disabled={saving || loading}>
          {saving ? (
            <>
              <HiArrowPath className="animate-spin" /> Saving Privileges...
            </>
          ) : (
            <>
              <HiCheck /> Save Role Permissions
            </>
          )}
        </button>
      </div>
    </div>
  );
}
