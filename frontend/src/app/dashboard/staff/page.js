'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import styles from './page.module.css';
import {
  listStaff,
  getStaffRoles,
  toggleStaffStatus,
} from '@/services/staffService';
import {
  StaffFormModal,
  StaffViewModal,
  StaffResetPasswordModal,
  StaffDeleteModal,
} from '@/components/staff';
import {
  HiPlus,
  HiArrowPath,
  HiCheckCircle,
  HiNoSymbol,
  HiEnvelope,
  HiPhone,
  HiShieldCheck,
  HiMagnifyingGlass,
  HiXMark,
  HiEye,
  HiPencilSquare,
  HiKey,
  HiTrash,
  HiUserGroup,
  HiShieldExclamation,
} from 'react-icons/hi2';
import { FaUserTie } from 'react-icons/fa6';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active Only' },
  { value: 'INACTIVE', label: 'Inactive Only' },
];

const SORT_OPTIONS = [
  { value: 'NAME_ASC', label: 'Name (A → Z)' },
  { value: 'NAME_DESC', label: 'Name (Z → A)' },
  { value: 'ROLE_ASC', label: 'Role (A → Z)' },
  { value: 'STATUS', label: 'Status (Active First)' },
];

export default function StaffManagementPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('NAME_ASC');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editStaffId, setEditStaffId] = useState(null);
  const [viewingStaff, setViewingStaff] = useState(null);
  const [resettingStaff, setResettingStaff] = useState(null);
  const [deletingStaff, setDeletingStaff] = useState(null);

  // Load roles metadata
  const loadMetadata = async () => {
    try {
      const staffRoles = await getStaffRoles();
      setRoles(staffRoles);
    } catch (err) {
      console.error('Failed to load roles:', err);
    }
  };

  // Load Staff Users
  const loadStaffList = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const staffData = await listStaff({ limit: 100 });
      setUsers(staffData);
    } catch (err) {
      setError(err.message || 'Failed to load staff members directory');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadMetadata();
    void loadStaffList();
  }, [loadStaffList]);

  // Handle status toggle
  const handleToggleStatus = async (user) => {
    const nextStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await toggleStaffStatus(user.id, nextStatus);
      setMessage(
        `Staff member "${user.first_name} ${user.last_name}" is now ${
          nextStatus === 'ACTIVE' ? 'Activated' : 'Deactivated'
        }.`
      );
      setTimeout(() => setMessage(null), 4000);
      loadStaffList();
    } catch (err) {
      setError(err.message || 'Failed to update account status');
    }
  };

  const handleToastSuccess = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 4000);
    loadStaffList();
  };

  // Derived statistics
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.status === 'ACTIVE').length;
    const inactive = users.filter((u) => u.status !== 'ACTIVE').length;
    const admins = users.filter((u) => (u.role_name || '').toLowerCase().includes('admin')).length;
    return { total, active, inactive, admins };
  }, [users]);

  // Filtered & Sorted Staff list
  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => {
        // Search term matching
        if (search.trim()) {
          const q = search.toLowerCase();
          const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
          const email = (u.email || '').toLowerCase();
          const phone = (u.phone || '').toLowerCase();
          const role = (u.role_name || '').toLowerCase();
          if (!fullName.includes(q) && !email.includes(q) && !phone.includes(q) && !role.includes(q)) {
            return false;
          }
        }
        // Role filter
        if (roleFilter !== 'ALL' && u.role_name !== roleFilter) {
          return false;
        }
        // Status filter
        if (statusFilter !== 'ALL' && u.status !== statusFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'NAME_ASC') {
          const nameA = `${a.first_name || ''} ${a.last_name || ''}`;
          const nameB = `${b.first_name || ''} ${b.last_name || ''}`;
          return nameA.localeCompare(nameB);
        }
        if (sortBy === 'NAME_DESC') {
          const nameA = `${a.first_name || ''} ${a.last_name || ''}`;
          const nameB = `${b.first_name || ''} ${b.last_name || ''}`;
          return nameB.localeCompare(nameA);
        }
        if (sortBy === 'ROLE_ASC') {
          return (a.role_name || '').localeCompare(b.role_name || '');
        }
        if (sortBy === 'STATUS') {
          return (a.status === 'ACTIVE' ? 0 : 1) - (b.status === 'ACTIVE' ? 0 : 1);
        }
        return 0;
      });
  }, [users, search, roleFilter, statusFilter, sortBy]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>
            <FaUserTie className={styles.titleIcon} />
            Staff & Administrative Operations
          </h1>
          <p className={styles.subtitle}>
            Manage school staff members, coordinators, and administrative officers.
          </p>
        </div>
        <div className={styles.actions}>
          <button
            className={styles.btnSecondary}
            onClick={() => loadStaffList(true)}
            disabled={refreshing}
            title="Reload directory"
          >
            <HiArrowPath className={refreshing ? styles.spinner : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <button
            className={styles.btnPrimary}
            onClick={() => setIsCreateOpen(true)}
          >
            <HiPlus size={18} />
            <span>Add Staff Member</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <div className={`${styles.alert} ${styles.alertSuccess}`}>
          <div className={styles.alertContent}>
            <HiCheckCircle size={20} />
            <span>{message}</span>
          </div>
          <button className={styles.alertClose} onClick={() => setMessage(null)}>
            <HiXMark />
          </button>
        </div>
      )}

      {error && (
        <div className={`${styles.alert} ${styles.alertError}`}>
          <div className={styles.alertContent}>
            <HiShieldExclamation size={20} />
            <span>{error}</span>
          </div>
          <button className={styles.alertClose} onClick={() => setError(null)}>
            <HiXMark />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrapper} ${styles.statIconBlue}`}>
            <HiUserGroup />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Total Staff</span>
            <span className={styles.statValue}>{stats.total}</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIconWrapper} ${styles.statIconGreen}`}>
            <HiCheckCircle />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Active Staff</span>
            <span className={styles.statValue}>{stats.active}</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIconWrapper} ${styles.statIconAmber}`}>
            <HiNoSymbol />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Inactive / Suspended</span>
            <span className={styles.statValue}>{stats.inactive}</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIconWrapper} ${styles.statIconPurple}`}>
            <HiShieldCheck />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Admins & Officers</span>
            <span className={styles.statValue}>{stats.admins}</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <HiMagnifyingGlass className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by name, email, role, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className={styles.searchClear}
              onClick={() => setSearch('')}
              title="Clear search"
            >
              <HiXMark size={16} />
            </button>
          )}
        </div>

        <div className={styles.filterControls}>
          {/* Role Filter */}
          <select
            className={styles.select}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="ALL">All Roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            className={styles.select}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Sort By */}
          <select
            className={styles.select}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Staff Table Card */}
      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.loadingState}>
            <HiArrowPath className={styles.spinner} size={36} />
            <p>Loading staff directory...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <FaUserTie />
            </div>
            <h3 className={styles.emptyTitle}>No staff members found</h3>
            <p className={styles.emptySubtitle}>
              {search || roleFilter !== 'ALL' || statusFilter !== 'ALL'
                ? 'Try adjusting your search criteria or resetting filters.'
                : 'Get started by adding your school coordinators and administrative staff.'}
            </p>
            {search || roleFilter !== 'ALL' || statusFilter !== 'ALL' ? (
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => {
                  setSearch('');
                  setRoleFilter('ALL');
                  setStatusFilter('ALL');
                }}
              >
                Reset All Filters
              </button>
            ) : (
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => setIsCreateOpen(true)}
              >
                <HiPlus size={18} />
                <span>Add First Staff Member</span>
              </button>
            )}
          </div>
        ) : (
          <div className={styles.tableResponsive}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Contact Details</th>
                  <th>Assigned Role</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const initials = `${(u.first_name || '')[0] || ''}${(u.last_name || '')[0] || ''}`.toUpperCase() || 'S';
                  const isAdmin = (u.role_name || '').toLowerCase().includes('admin');

                  return (
                    <tr key={u.id}>
                      {/* Staff Member */}
                      <td>
                        <div className={styles.staffCell}>
                          <div className={`${styles.avatar} ${isAdmin ? styles.avatarAdmin : ''}`}>
                            {initials}
                          </div>
                          <div className={styles.staffInfo}>
                            <div
                              className={styles.staffName}
                              onClick={() => setViewingStaff(u)}
                            >
                              {u.first_name} {u.last_name}
                            </div>
                            <div className={styles.staffEmail}>{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Contact Details */}
                      <td>
                        <div className={styles.contactCell}>
                          <span className={styles.contactItem}>
                            <HiEnvelope size={15} color="#2563eb" />
                            {u.email}
                          </span>
                          {u.phone ? (
                            <span className={styles.contactItem}>
                              <HiPhone size={15} color="#64748b" />
                              {u.phone}
                            </span>
                          ) : (
                            <span className={styles.contactMuted}>No phone</span>
                          )}
                        </div>
                      </td>

                      {/* Assigned Role */}
                      <td>
                        <span className={`${styles.roleBadge} ${isAdmin ? styles.roleBadgeAdmin : ''}`}>
                          <HiShieldCheck size={14} />
                          {u.role_name || 'Staff'}
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <span
                          className={
                            u.status === 'ACTIVE'
                              ? styles.statusPillActive
                              : styles.statusPillInactive
                          }
                        >
                          <span
                            className={`${styles.statusDot} ${
                              u.status === 'ACTIVE' ? styles.statusDotActive : ''
                            }`}
                          />
                          {u.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td>
                        <div className={styles.actionsGroup}>
                          {/* View */}
                          <button
                            type="button"
                            className={`${styles.iconBtn} ${styles.iconBtnPrimary}`}
                            title="View Profile Overview"
                            onClick={() => setViewingStaff(u)}
                          >
                            <HiEye size={16} />
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            className={`${styles.iconBtn} ${styles.iconBtnPrimary}`}
                            title="Edit Staff Details"
                            onClick={() => setEditStaffId(u.id)}
                          >
                            <HiPencilSquare size={16} />
                          </button>

                          {/* Reset Password */}
                          <button
                            type="button"
                            className={`${styles.iconBtn} ${styles.iconBtnWarning}`}
                            title="Reset Staff Password"
                            onClick={() => setResettingStaff(u)}
                          >
                            <HiKey size={16} />
                          </button>

                          {/* Toggle Active / Inactive */}
                          <button
                            type="button"
                            className={`${styles.iconBtn} ${
                              u.status === 'ACTIVE' ? styles.iconBtnDanger : styles.iconBtnSuccess
                            }`}
                            title={
                              u.status === 'ACTIVE'
                                ? 'Deactivate Staff Account'
                                : 'Activate Staff Account'
                            }
                            onClick={() => handleToggleStatus(u)}
                          >
                            {u.status === 'ACTIVE' ? (
                              <HiNoSymbol size={16} color="#ef4444" />
                            ) : (
                              <HiCheckCircle size={16} color="#10b981" />
                            )}
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                            title="Delete Staff Member"
                            onClick={() => setDeletingStaff(u)}
                          >
                            <HiTrash size={16} color="#ef4444" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Create Staff Member */}
      {isCreateOpen && (
        <StaffFormModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          roles={roles}
          onSuccess={handleToastSuccess}
        />
      )}

      {/* MODAL 2: Edit Staff Member */}
      {editStaffId && (
        <StaffFormModal
          isOpen={Boolean(editStaffId)}
          onClose={() => setEditStaffId(null)}
          staffId={editStaffId}
          roles={roles}
          onSuccess={handleToastSuccess}
        />
      )}

      {/* MODAL 3: View Staff Member */}
      {viewingStaff && (
        <StaffViewModal
          isOpen={Boolean(viewingStaff)}
          onClose={() => setViewingStaff(null)}
          staff={viewingStaff}
          onEdit={(staff) => setEditStaffId(staff.id)}
          onResetPassword={(staff) => setResettingStaff(staff)}
          onToggleStatus={(staff) => handleToggleStatus(staff)}
        />
      )}

      {/* MODAL 4: Reset Password Modal */}
      {resettingStaff && (
        <StaffResetPasswordModal
          isOpen={Boolean(resettingStaff)}
          onClose={() => setResettingStaff(null)}
          staff={resettingStaff}
          onSuccess={handleToastSuccess}
        />
      )}

      {/* MODAL 5: Delete Staff Modal */}
      {deletingStaff && (
        <StaffDeleteModal
          isOpen={Boolean(deletingStaff)}
          onClose={() => setDeletingStaff(null)}
          staff={deletingStaff}
          onSuccess={handleToastSuccess}
        />
      )}
    </div>
  );
}
