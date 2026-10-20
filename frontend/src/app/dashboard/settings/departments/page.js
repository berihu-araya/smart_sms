'use strict';
'use client';

import { useState, useEffect, useMemo } from 'react';
import styles from './page.module.css';
import {
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getHodCandidates,
  getDepartment,
} from '@/services/departmentService';
import {
  HiPlus,
  HiMagnifyingGlass,
  HiBuildingOffice2,
  HiAcademicCap,
  HiUsers,
  HiPencilSquare,
  HiTrash,
  HiEye,
  HiCheckCircle,
  HiXMark,
  HiBanknotes,
} from 'react-icons/hi2';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [hodCandidates, setHodCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFacultyModalOpen, setIsFacultyModalOpen] = useState(false);
  const [selectedDeptFaculty, setSelectedDeptFaculty] = useState(null);
  const [editingDept, setEditingDept] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'ACADEMIC',
    hodTeacherId: '',
    budget: '',
    description: '',
    status: 'ACTIVE',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [deptData, candidates] = await Promise.all([
        listDepartments({ search, type: typeFilter, status: statusFilter }),
        getHodCandidates().catch(() => []),
      ]);
      setDepartments(deptData || []);
      setHodCandidates(candidates || []);
    } catch (err) {
      console.error('Failed to load departments:', err);
      setError('Unable to load institutional departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, typeFilter, statusFilter]);

  // Dynamic statistics
  const stats = useMemo(() => {
    const total = departments.length;
    const academic = departments.filter((d) => d.type === 'ACADEMIC').length;
    const administrative = departments.filter((d) => d.type === 'ADMINISTRATIVE').length;
    const teachersAssigned = departments.reduce((acc, d) => acc + (parseInt(d.teacher_count, 10) || 0), 0);
    return { total, academic, administrative, teachersAssigned };
  }, [departments]);

  const handleOpenCreateModal = () => {
    setEditingDept(null);
    setFormData({
      name: '',
      code: '',
      type: 'ACADEMIC',
      hodTeacherId: '',
      budget: '',
      description: '',
      status: 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (dept) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      code: dept.code,
      type: dept.type || 'ACADEMIC',
      hodTeacherId: dept.hod_teacher_id || '',
      budget: dept.budget || '',
      description: dept.description || '',
      status: dept.status || 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const handleViewFaculty = async (dept) => {
    try {
      const full = await getDepartment(dept.id);
      setSelectedDeptFaculty(full);
      setIsFacultyModalOpen(true);
    } catch (err) {
      setError(err.message || 'Failed to load faculty roster');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      if (editingDept) {
        await updateDepartment(editingDept.id, formData);
        setMessage(`Department '${formData.name}' updated successfully!`);
      } else {
        await createDepartment(formData);
        setMessage(`Department '${formData.name}' created successfully!`);
      }
      setIsModalOpen(false);
      loadData();
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      setError(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (dept) => {
    if (!confirm(`Are you sure you want to delete '${dept.name}'? Any assigned teachers will be unlinked.`)) {
      return;
    }

    try {
      await deleteDepartment(dept.id);
      setMessage(`Department '${dept.name}' deleted successfully.`);
      loadData();
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      setError(err.message || 'Failed to delete department');
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Academic & Operational Departments</h1>
          <p className={styles.subtitle}>
            Organize institutional faculties, appoint Heads of Department (HODs), and allocate resources.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.primaryBtn} onClick={handleOpenCreateModal}>
            <HiPlus /> Add Department
          </button>
        </div>
      </div>

      {message && <div className={`${styles.alert} ${styles.alertSuccess}`}>{message}</div>}
      {error && <div className={`${styles.alert} ${styles.alertError}`}>{error}</div>}

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#eff6ff', color: '#2563eb' }}>
            <HiBuildingOffice2 />
          </div>
          <div>
            <div className={styles.statValue}>{stats.total}</div>
            <div className={styles.statLabel}>Total Departments</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#f5f3ff', color: '#7c3aed' }}>
            <HiAcademicCap />
          </div>
          <div>
            <div className={styles.statValue}>{stats.academic}</div>
            <div className={styles.statLabel}>Academic Faculties</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#fffbeb', color: '#d97706' }}>
            <HiBanknotes />
          </div>
          <div>
            <div className={styles.statValue}>{stats.administrative}</div>
            <div className={styles.statLabel}>Administrative Units</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#ecfdf5', color: '#059669' }}>
            <HiUsers />
          </div>
          <div>
            <div className={styles.statValue}>{stats.teachersAssigned}</div>
            <div className={styles.statLabel}>Faculty Members Assigned</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={styles.filterCard}>
        <div className={styles.searchInputWrapper}>
          <HiMagnifyingGlass className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search departments by name, code, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className={styles.filterSelect}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="ALL">All Classifications</option>
          <option value="ACADEMIC">Academic Faculty</option>
          <option value="ADMINISTRATIVE">Administrative</option>
          <option value="SUPPORT">Support / Operational</option>
        </select>

        <select
          className={styles.filterSelect}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active Only</option>
          <option value="INACTIVE">Inactive Only</option>
        </select>
      </div>

      {/* Departments Table */}
      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.emptyState}>Loading institutional departments...</div>
        ) : departments.length === 0 ? (
          <div className={styles.emptyState}>
            <HiBuildingOffice2 className={styles.emptyStateIcon} />
            <p>No departments found matching your criteria.</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Code</th>
                <th>Department Name</th>
                <th>Classification</th>
                <th>Head of Department (HOD)</th>
                <th>Faculty</th>
                <th>Annual Budget</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept) => (
                <tr key={dept.id}>
                  <td>
                    <span className={styles.codeBadge}>{dept.code}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{dept.name}</div>
                    {dept.description && (
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                        {dept.description}
                      </div>
                    )}
                  </td>
                  <td>
                    <span
                      className={`${styles.typeBadge} ${
                        dept.type === 'ACADEMIC'
                          ? styles.typeAcademic
                          : dept.type === 'ADMINISTRATIVE'
                          ? styles.typeAdministrative
                          : styles.typeSupport
                      }`}
                    >
                      {dept.type}
                    </span>
                  </td>
                  <td>
                    {dept.hod_name ? (
                      <div className={styles.hodBox}>
                        <div className={styles.hodAvatar}>
                          {dept.hod_name
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{dept.hod_name}</div>
                          {dept.hod_email && (
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{dept.hod_email}</div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className={styles.hodUnassigned}>Unassigned</span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>
                      {dept.teacher_count || 0} teachers
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>
                      {Number(dept.budget || 0).toLocaleString()} ETB
                    </span>
                  </td>
                  <td>
                    <span
                      className={`${styles.statusPill} ${
                        dept.status === 'ACTIVE' ? styles.statusActive : styles.statusInactive
                      }`}
                    >
                      <HiCheckCircle /> {dept.status}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actionBtnGroup} style={{ justifyContent: 'flex-end' }}>
                      <button
                        className={styles.iconBtn}
                        title="View Faculty Roster"
                        onClick={() => handleViewFaculty(dept)}
                      >
                        <HiEye />
                      </button>
                      <button
                        className={styles.iconBtn}
                        title="Edit Department"
                        onClick={() => handleOpenEditModal(dept)}
                      >
                        <HiPencilSquare />
                      </button>
                      <button
                        className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                        title="Delete Department"
                        onClick={() => handleDelete(dept)}
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

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {editingDept ? 'Edit Institutional Department' : 'Create New Department'}
              </h2>
              <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}>
                <HiXMark />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Department Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Department of Natural Sciences"
                      className={styles.formInput}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Department Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SCI or MATH"
                      className={styles.formInput}
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Classification</label>
                    <select
                      className={styles.formSelect}
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    >
                      <option value="ACADEMIC">Academic Faculty</option>
                      <option value="ADMINISTRATIVE">Administrative</option>
                      <option value="SUPPORT">Support / Operations</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Status</label>
                    <select
                      className={styles.formSelect}
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Head of Department (HOD)</label>
                  <select
                    className={styles.formSelect}
                    value={formData.hodTeacherId}
                    onChange={(e) => setFormData({ ...formData, hodTeacherId: e.target.value })}
                  >
                    <option value="">-- No HOD Assigned --</option>
                    {hodCandidates.map((c) => (
                      <option key={c.teacher_id} value={c.teacher_id}>
                        {c.name} {c.specialization ? `(${c.specialization})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Allocated Budget (ETB)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 50000.00"
                    className={styles.formInput}
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Description & Scope</label>
                  <textarea
                    className={styles.formTextarea}
                    placeholder="Briefly describe the curriculum subjects or operational duties managed by this unit..."
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
                  {submitting ? 'Saving...' : editingDept ? 'Update Department' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Faculty Modal */}
      {isFacultyModalOpen && selectedDeptFaculty && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle}>{selectedDeptFaculty.name}</h2>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
                  Faculty Members & Assigned Teachers
                </p>
              </div>
              <button className={styles.closeBtn} onClick={() => setIsFacultyModalOpen(false)}>
                <HiXMark />
              </button>
            </div>

            <div className={styles.modalBody}>
              {selectedDeptFaculty.faculty && selectedDeptFaculty.faculty.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {selectedDeptFaculty.faculty.map((f) => (
                    <div
                      key={f.teacher_id}
                      style={{
                        padding: '0.85rem 1rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{f.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {f.email} • {f.specialization || 'General Faculty'}
                        </div>
                      </div>
                      {f.subjects_taught && (
                        <div
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.2rem 0.5rem',
                            background: '#f1f5f9',
                            borderRadius: '6px',
                            color: '#334155',
                          }}
                        >
                          {f.subjects_taught}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <HiUsers className={styles.emptyStateIcon} />
                  <p>No faculty members are currently assigned to this department.</p>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setIsFacultyModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
