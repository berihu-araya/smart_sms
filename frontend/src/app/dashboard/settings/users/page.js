'use strict';
'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './page.module.css';
import {
  listUsers,
  createUser,
  toggleUserStatus,
  resetUserPassword,
  deleteUser,
} from '@/services/userService';
import { listRoles } from '@/services/roleService';
import {
  HiPlus,
  HiKey,
  HiTrash,
  HiArrowPath,
  HiCheckCircle,
  HiNoSymbol,
} from 'react-icons/hi2';

export default function UsersManagementPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  const [loading, setLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

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
      setRoles(rData || []);
      if (rData && rData.length > 0) {
        setFormData((prev) => ({ ...prev, roleId: rData[0].id }));
      }
    } catch (err) {
      console.error('Failed to load roles:', err);
    }
  };

  const loadUsersList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (search) params.search = search;
      if (selectedRole) params.roleId = selectedRole;

      const data = await listUsers(params);
      setUsers(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search, selectedRole]);

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    loadUsersList();
  }, [loadUsersList]);

  const handleCreateUser = async (e) => {
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
        roleId: roles.length > 0 ? roles[0].id : '',
        password: '',
        status: 'ACTIVE',
      });
      loadUsersList();
    } catch (err) {
      setError(err.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await toggleUserStatus(user.id, newStatus);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
      );
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!targetUser || !newPassword) return;
    setSubmitting(true);
    try {
      await resetUserPassword(targetUser.id, newPassword);
      setIsResetModalOpen(false);
      setNewPassword('');
      alert(`Password successfully reset for ${targetUser.email}`);
    } catch (err) {
      alert('Password reset failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!confirm('Are you sure you want to permanently delete this user account?')) return;
    try {
      await deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>User Management & RBAC</h1>
          <p className={styles.subtitle}>
            Administer institutional user accounts, access roles, and credential authorizations.
          </p>
        </div>
        <button className={styles.btnPrimary} onClick={() => setIsCreateModalOpen(true)}>
          <HiPlus size={18} />
          Add New User
        </button>
      </div>

      {error && <div style={{ color: '#dc2626', fontWeight: 500 }}>{error}</div>}

      {/* Filter Row */}
      <div className={styles.filterCard}>
        <input
          type="text"
          placeholder="Search by name or email..."
          className={styles.searchInput}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className={styles.select}
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
        >
          <option value="">All Roles</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>

        <button className={styles.btnAction} onClick={loadUsersList}>
          <HiArrowPath size={16} />
        </button>
      </div>

      {/* Users Table */}
      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.emptyState}>Loading user directory...</div>
        ) : users.length === 0 ? (
          <div className={styles.emptyState}>
            <h3>No Users Found</h3>
            <p>No user accounts matched your search criteria.</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>User Details</th>
                <th>Role</th>
                <th>Phone Number</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className={styles.userInfo}>
                      <div className={styles.avatar}>
                        {u.first_name ? u.first_name.charAt(0) : 'U'}
                      </div>
                      <div>
                        <div className={styles.userName}>
                          {u.first_name} {u.last_name}
                        </div>
                        <div className={styles.userEmail}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={styles.roleBadge}>{u.role_name || 'User'}</span>
                  </td>
                  <td style={{ color: '#475569' }}>{u.phone || '-'}</td>
                  <td>
                    <span
                      className={
                        u.status === 'ACTIVE' ? styles.statusActive : styles.statusSuspended
                      }
                    >
                      {u.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={styles.btnAction}
                        title={u.status === 'ACTIVE' ? 'Suspend Access' : 'Activate Access'}
                        onClick={() => handleToggleStatus(u)}
                      >
                        {u.status === 'ACTIVE' ? (
                          <>
                            <HiNoSymbol style={{ color: '#dc2626' }} /> Suspend
                          </>
                        ) : (
                          <>
                            <HiCheckCircle style={{ color: '#16a34a' }} /> Activate
                          </>
                        )}
                      </button>

                      <button
                        className={styles.btnAction}
                        title="Reset Password"
                        onClick={() => {
                          setTargetUser(u);
                          setIsResetModalOpen(true);
                        }}
                      >
                        <HiKey /> Reset Key
                      </button>

                      <button
                        className={styles.btnAction}
                        style={{ color: '#dc2626' }}
                        onClick={() => handleDeleteUser(u.id)}
                      >
                        <HiTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create User Modal */}
      {isCreateModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Create New User Account</h2>
              <button
                className={styles.modalClose}
                onClick={() => setIsCreateModalOpen(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className={styles.modalBody}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className={styles.label}>First Name *</label>
                    <input
                      type="text"
                      required
                      className={styles.input}
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={styles.label}>Last Name *</label>
                    <input
                      type="text"
                      required
                      className={styles.input}
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className={styles.label}>Email Address *</label>
                  <input
                    type="email"
                    required
                    className={styles.input}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className={styles.label}>Phone Number</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={styles.label}>Role *</label>
                    <select
                      className={styles.input}
                      value={formData.roleId}
                      onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={styles.label}>Password (min 6 characters) *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    className={styles.input}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnAction}
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

      {/* Password Reset Modal */}
      {isResetModalOpen && targetUser && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Reset User Password</h2>
              <button
                className={styles.modalClose}
                onClick={() => setIsResetModalOpen(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleResetPasswordSubmit}>
              <div className={styles.modalBody}>
                <p style={{ fontSize: '0.9rem', color: '#475569' }}>
                  Setting a new password for <strong>{targetUser.email}</strong>.
                </p>
                <div>
                  <label className={styles.label}>New Password *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Enter new strong password"
                    className={styles.input}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnAction}
                  onClick={() => setIsResetModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={submitting}
                >
                  {submitting ? 'Updating...' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
