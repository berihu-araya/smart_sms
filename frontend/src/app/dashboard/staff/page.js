'use strict';
'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from '../settings/users/page.module.css';
import { listUsers, createUser, toggleUserStatus } from '@/services/userService';
import { listRoles } from '@/services/roleService';
import {
  HiPlus,
  HiTrash,
  HiArrowPath,
  HiCheckCircle,
  HiNoSymbol,
  HiEnvelope,
  HiPhone,
  HiShieldCheck,
  HiUser,
} from 'react-icons/hi2';
import { FaUserTie } from 'react-icons/fa';

export default function StaffManagementPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    roleId: '',
    password: '',
    status: 'ACTIVE',
  });

  const loadMetadata = async () => {
    try {
      const rData = await listRoles().catch(() => []);
      const staffRoles = (rData || []).filter(
        (r) => r.name.toLowerCase() === 'staff' || r.name.toLowerCase().includes('admin')
      );
      setRoles(staffRoles.length > 0 ? staffRoles : rData || []);
      if (staffRoles.length > 0) {
        setFormData((prev) => ({ ...prev, roleId: staffRoles[0].id }));
      }
    } catch (err) {
      console.error('Failed to load roles:', err);
    }
  };

  const loadStaffList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listUsers({ search });
      // Filter for administrative and operational staff
      const staffOnly = (data || []).filter(
        (u) =>
          u.role_name?.toLowerCase() === 'staff' ||
          u.role_name?.toLowerCase() === 'school admin' ||
          u.role_name?.toLowerCase() === 'admin'
      );
      setUsers(staffOnly);
    } catch (err) {
      setError(err.message || 'Failed to load staff members');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    loadStaffList();
  }, [loadStaffList]);

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createUser(formData);
      setIsCreateModalOpen(false);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        roleId: roles[0]?.id || '',
        password: '',
        status: 'ACTIVE',
      });
      setMessage('Staff member created successfully!');
      setTimeout(() => setMessage(null), 4000);
      loadStaffList();
    } catch (err) {
      setError(err.message || 'Failed to create staff account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      await toggleUserStatus(user.id);
      loadStaffList();
    } catch (err) {
      setError(err.message || 'Failed to update status');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Staff & Administrative Operations</h1>
          <p className={styles.subtitle}>
            Manage school staff members, administrative officers, and coordinators.
          </p>
        </div>
        <div className={styles.actions}>
          <button
            className={styles.btnPrimary}
            onClick={() => setIsCreateModalOpen(true)}
          >
            <HiPlus /> Add Staff Member
          </button>
        </div>
      </div>

      {message && <div className={`${styles.alert} ${styles.alertSuccess}`}>{message}</div>}
      {error && <div className={`${styles.alert} ${styles.alertError}`}>{error}</div>}

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchGroup}>
          <input
            type="text"
            className={styles.input}
            placeholder="Search staff by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className={styles.btnSecondary} onClick={loadStaffList}>
          <HiArrowPath /> Refresh
        </button>
      </div>

      {/* Staff Table */}
      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.loading}>Loading staff directory...</div>
        ) : users.length === 0 ? (
          <div className={styles.emptyState}>
            <FaUserTie size={48} color="#94a3b8" />
            <p>No staff records found.</p>
          </div>
        ) : (
          <div className={styles.tableResponsive}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Contact Information</th>
                  <th>Assigned Role</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className={styles.userName}>
                        {u.first_name} {u.last_name}
                      </div>
                      <div className={styles.userEmail}>{u.email}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
                        <span>
                          <HiEnvelope style={{ verticalAlign: 'middle', marginRight: '0.35rem' }} />
                          {u.email}
                        </span>
                        {u.phone && (
                          <span style={{ color: '#64748b' }}>
                            <HiPhone style={{ verticalAlign: 'middle', marginRight: '0.35rem' }} />
                            {u.phone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={styles.roleBadge}>
                        <HiShieldCheck /> {u.role_name || 'Staff'}
                      </span>
                    </td>
                    <td>
                      <span
                        className={
                          u.status === 'ACTIVE'
                            ? styles.statusActive
                            : styles.statusInactive
                        }
                      >
                        {u.status}
                      </span>
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          className={styles.iconBtn}
                          title={
                            u.status === 'ACTIVE'
                              ? 'Deactivate Staff Account'
                              : 'Activate Staff Account'
                          }
                          onClick={() => handleToggleStatus(u)}
                        >
                          {u.status === 'ACTIVE' ? (
                            <HiNoSymbol color="#ef4444" />
                          ) : (
                            <HiCheckCircle color="#10b981" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Add Staff Member</h2>
              <button
                className={styles.closeBtn}
                onClick={() => setIsCreateModalOpen(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateStaff}>
              <div className={styles.modalBody}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>First Name *</label>
                    <input
                      type="text"
                      required
                      className={styles.input}
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({ ...formData, firstName: e.target.value })
                      }
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Last Name *</label>
                    <input
                      type="text"
                      required
                      className={styles.input}
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({ ...formData, lastName: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Official Email *</label>
                    <input
                      type="email"
                      required
                      className={styles.input}
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Phone Number</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Role *</label>
                    <select
                      className={styles.select}
                      value={formData.roleId}
                      onChange={(e) =>
                        setFormData({ ...formData, roleId: e.target.value })
                      }
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Initial Password *</label>
                    <input
                      type="password"
                      required
                      className={styles.input}
                      placeholder="Minimum 6 characters"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
