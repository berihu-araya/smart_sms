'use strict';
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import { listRoles, createRole, deleteRole } from '@/services/roleService';
import {
  HiShieldCheck,
  HiCheckCircle,
  HiUsers,
  HiPlus,
  HiTrash,
  HiKey,
  HiXMark,
  HiChevronRight,
} from 'react-icons/hi2';

const PROTECTED_ROLES = [
  'school admin',
  'admin',
  'super admin',
  'teacher',
  'student',
  'parent',
  'staff',
];

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const data = await listRoles();
      setRoles(data || []);
    } catch (err) {
      console.error('Failed to load roles:', err);
      setError('Unable to load roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      await createRole(formData);
      setMessage(`Custom role '${formData.name}' created successfully!`);
      setIsModalOpen(false);
      setFormData({ name: '', description: '' });
      loadRoles();
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      setError(err.message || 'Failed to create role');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (role) => {
    if (
      !confirm(
        `Are you sure you want to delete custom role '${role.name}'? This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await deleteRole(role.id);
      setMessage(`Role '${role.name}' removed.`);
      loadRoles();
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      setError(err.message || 'Failed to delete role');
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Roles & Access Governance (RBAC)</h1>
          <p className={styles.subtitle}>
            Manage institutional role hierarchies, user assignments, and configure granular functional permissions.
          </p>
        </div>
        <div>
          <button className={styles.primaryBtn} onClick={() => setIsModalOpen(true)}>
            <HiPlus /> Add Custom Role
          </button>
        </div>
      </div>

      {message && <div className={`${styles.alert} ${styles.alertSuccess}`}>{message}</div>}
      {error && <div className={`${styles.alert} ${styles.alertError}`}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          Loading institutional roles...
        </div>
      ) : (
        <div className={styles.rolesGrid}>
          {roles.map((role) => {
            const isProtected = PROTECTED_ROLES.includes(role.name.toLowerCase());

            return (
              <div key={role.id} className={styles.roleCard}>
                <div>
                  <div className={styles.roleHeader}>
                    <div className={styles.roleName}>{role.name}</div>
                    <div className={styles.badgeGroup}>
                      {isProtected && <span className={styles.systemBadge}>System Core</span>}
                      <span className={styles.userCountBadge}>
                        <HiUsers style={{ display: 'inline', marginRight: '3px' }} />
                        {role.user_count || 0} Users
                      </span>
                    </div>
                  </div>

                  <div className={styles.roleDesc} style={{ marginTop: '0.75rem' }}>
                    {role.description || 'System access role with defined operational boundaries.'}
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <Link
                    href={`/dashboard/settings/permissions?roleId=${role.id}`}
                    className={styles.permLink}
                  >
                    <HiKey /> Configure Permissions <HiChevronRight size={13} />
                  </Link>

                  {!isProtected && parseInt(role.user_count, 10) === 0 && (
                    <button
                      className={styles.deleteRoleBtn}
                      title="Delete Custom Role"
                      onClick={() => handleDelete(role)}
                    >
                      <HiTrash />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Create Custom Institutional Role</h2>
              <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}>
                <HiXMark />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Role Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Examination Officer or Dean of Students"
                    className={styles.formInput}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Description</label>
                  <textarea
                    className={styles.formTextarea}
                    placeholder="Briefly state the institutional scope and duties for this role..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.primaryBtn} disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
