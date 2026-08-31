"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import gradeService from "@/services/gradeService";
import styles from "./page.module.css";
import {
  HiAcademicCap,
  HiPencilSquare,
  HiTrash,
  HiArrowPath,
  HiCheckCircle,
  HiXMark,
  HiEye,
  HiBookOpen,
  HiMagnifyingGlass,
  HiPlus,
  HiChevronUpDown,
  HiChevronUp,
  HiChevronDown,
  HiChevronLeft,
  HiChevronRight,
  HiInbox,
  HiExclamationTriangle,
} from "react-icons/hi2";

export default function GradeListPage() {
  const [grades, setGrades] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("ASC");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState(null);

  // Modal State (Add & Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [formErrors, setFormErrors] = useState({});
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formApiError, setFormApiError] = useState("");

  // Deactivation / Delete Confirm State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteReferences, setDeleteReferences] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const showToast = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadGrades = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await gradeService.listGrades({
        search,
        status,
        sortBy,
        sortOrder,
        limit,
        offset: (page - 1) * limit,
      });

      setGrades(res.items || []);
      setTotal(res.total || 0);
    } catch (err) {
      setError(err.message || "Failed to load grades.");
      setGrades([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, status, sortBy, sortOrder, page, limit]);

  useEffect(() => {
    loadGrades();
  }, [loadGrades]);

  // Lock body scroll and handle Escape key for modals
  useEffect(() => {
    if (!isModalOpen && !isConfirmOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsModalOpen(false);
        setIsConfirmOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isModalOpen, isConfirmOpen]);

  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(1);
  };

  const handleStatusChange = (val) => {
    setStatus(val);
    setPage(1);
  };

  const handleSortClick = (colKey) => {
    if (sortBy === colKey) {
      setSortOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"));
    } else {
      setSortBy(colKey);
      setSortOrder("ASC");
    }
    setPage(1);
  };

  const handleOpenAdd = () => {
    setEditingGrade(null);
    setFormData({ name: "", description: "" });
    setFormErrors({});
    setFormApiError("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (grade) => {
    setEditingGrade(grade);
    setFormData({
      name: grade.name || "",
      description: grade.description || "",
    });
    setFormErrors({});
    setFormApiError("");
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.name || !formData.name.trim()) {
      errs.name = "Grade name is required";
    } else if (formData.name.trim().length < 2) {
      errs.name = "Grade name must be at least 2 characters";
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormApiError("");

    if (!validateForm()) return;

    try {
      setFormSubmitting(true);
      if (editingGrade) {
        await gradeService.updateGrade(editingGrade.id, {
          name: formData.name.trim(),
          description: formData.description?.trim() || null,
        });
        showToast(`Grade "${formData.name.trim()}" updated successfully!`);
      } else {
        await gradeService.createGrade({
          name: formData.name.trim(),
          description: formData.description?.trim() || null,
        });
        showToast(`Grade "${formData.name.trim()}" created successfully!`);
      }

      setIsModalOpen(false);
      loadGrades();
    } catch (err) {
      setFormApiError(err.message || "Failed to save grade. Please check input.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleInitiateDelete = async (grade) => {
    try {
      setDeleteTarget(grade);
      setDeleteLoading(true);
      setIsConfirmOpen(true);

      const refData = await gradeService.checkGradeReferences(grade.id);
      setDeleteReferences(refData);
    } catch (err) {
      console.error("Failed to check grade references:", err);
      setDeleteReferences(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      setDeleteLoading(true);
      await gradeService.deleteGrade(deleteTarget.id);
      setIsConfirmOpen(false);
      showToast(`Grade "${deleteTarget.name}" deactivated successfully.`);
      loadGrades();
    } catch (err) {
      alert(err.message || "Failed to deactivate grade.");
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  const handleRestore = async (grade) => {
    try {
      await gradeService.restoreGrade(grade.id);
      showToast(`Grade "${grade.name}" restored to Active.`);
      loadGrades();
    } catch (err) {
      alert(err.message || "Failed to restore grade.");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const startRecord = total === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(total, page * limit);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1>Grade Management</h1>
          <p>Create, configure, and manage academic grade levels and their curriculum linkages.</p>
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div className={styles.alertSuccess}>
          <HiCheckCircle size={20} /> {notification.msg}
        </div>
      )}
      {error && (
        <div className={styles.alertError}>
          <HiXMark size={20} /> {error}
        </div>
      )}

      {/* Smart Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <div className={styles.searchWrapper}>
            <HiMagnifyingGlass className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search grade by name or description..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className={styles.searchInput}
            />
            {search && (
              <button
                type="button"
                className={styles.clearSearchBtn}
                onClick={() => handleSearchChange("")}
                title="Clear search"
              >
                <HiXMark size={16} />
              </button>
            )}
          </div>

          <div className={styles.statusTabs}>
            {[
              { label: "Active", value: "active" },
              { label: "Inactive", value: "inactive" },
              { label: "All", value: "all" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`${styles.statusTab} ${status === opt.value ? styles.statusTabActive : ""}`}
                onClick={() => handleStatusChange(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.toolbarRight}>
          <button
            type="button"
            className={styles.btnIcon}
            onClick={loadGrades}
            title="Refresh grades list"
          >
            <HiArrowPath size={17} />
          </button>

          <button
            type="button"
            className={styles.btnPrimary}
            onClick={handleOpenAdd}
          >
            <HiPlus size={18} />
            <span>+ Add Grade</span>
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th
                  className={`${styles.th} ${styles.thSortable}`}
                  onClick={() => handleSortClick("name")}
                  style={{ width: "30%" }}
                >
                  <div className={styles.thContent}>
                    <span>Grade Level</span>
                    {sortBy === "name" ? (
                      sortOrder === "ASC" ? <HiChevronUp size={14} color="#2563eb" /> : <HiChevronDown size={14} color="#2563eb" />
                    ) : (
                      <HiChevronUpDown size={14} color="#94a3b8" />
                    )}
                  </div>
                </th>
                <th
                  className={`${styles.th} ${styles.thSortable}`}
                  onClick={() => handleSortClick("section_count")}
                  style={{ textAlign: "center", width: "15%" }}
                >
                  <div className={styles.thContent} style={{ justifyContent: "center" }}>
                    <span>Sections</span>
                    {sortBy === "section_count" ? (
                      sortOrder === "ASC" ? <HiChevronUp size={14} color="#2563eb" /> : <HiChevronDown size={14} color="#2563eb" />
                    ) : (
                      <HiChevronUpDown size={14} color="#94a3b8" />
                    )}
                  </div>
                </th>
                <th className={styles.th} style={{ textAlign: "center", width: "15%" }}>
                  Enrolled Students
                </th>
                <th className={styles.th} style={{ textAlign: "center", width: "18%" }}>
                  Curriculum Subjects
                </th>
                <th className={styles.th} style={{ width: "12%" }}>
                  Status
                </th>
                <th className={styles.th} style={{ textAlign: "right", width: "10%" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx}>
                    <td className={styles.td} colSpan={6}>
                      <div className={styles.skeletonCell}></div>
                    </td>
                  </tr>
                ))
              ) : grades.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.td}>
                    <div className={styles.emptyState}>
                      <HiInbox className={styles.emptyIcon} />
                      <h3 className={styles.emptyTitle}>No grades found</h3>
                      <p className={styles.emptyText}>
                        No grade levels match your active filters. Click &ldquo;+ Add Grade&rdquo; to create one.
                      </p>
                      <button
                        type="button"
                        className={styles.btnPrimary}
                        onClick={handleOpenAdd}
                        style={{ marginTop: "8px" }}
                      >
                        <HiPlus size={18} />
                        <span>+ Add Grade</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                grades.map((grade) => (
                  <tr key={grade.id} className={styles.tr}>
                    <td className={styles.td}>
                      <strong style={{ color: "#0f172a", fontSize: "14px" }}>{grade.name}</strong>
                      {grade.description && (
                        <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                          {grade.description}
                        </p>
                      )}
                    </td>
                    <td className={styles.td} style={{ textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          padding: "3px 10px",
                          borderRadius: "999px",
                          background: "#eff6ff",
                          color: "#1d4ed8",
                          fontWeight: 700,
                          fontSize: "12px",
                        }}
                      >
                        {grade.section_count || 0} section(s)
                      </span>
                    </td>
                    <td className={styles.td} style={{ textAlign: "center", fontWeight: 600, color: "#475569" }}>
                      {grade.student_count || 0} students
                    </td>
                    <td className={styles.td} style={{ textAlign: "center" }}>
                      <Link
                        href={`/dashboard/grades/subjects?grade_id=${grade.id}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "13px",
                          color: "#2563eb",
                          textDecoration: "none",
                          fontWeight: 600,
                        }}
                        title="View & manage assigned curriculum"
                      >
                        <HiBookOpen size={15} />
                        <span>{grade.subject_count || 0} subjects</span>
                      </Link>
                    </td>
                    <td className={styles.td}>
                      <span
                        className={`${styles.statusPill} ${
                          grade.status === "ACTIVE" ? styles.statusActive : styles.statusInactive
                        }`}
                      >
                        <span className={styles.statusDot}></span>
                        {grade.status === "ACTIVE" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className={styles.td} style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "flex-end" }}>
                        <Link
                          href={`/dashboard/grades/${grade.id}`}
                          className={styles.actionBtn}
                          title="View Grade Details"
                        >
                          <HiEye size={15} />
                        </Link>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => handleOpenEdit(grade)}
                          title="Edit Grade"
                        >
                          <HiPencilSquare size={15} />
                        </button>
                        {grade.status === "INACTIVE" || grade.deleted_at ? (
                          <button
                            type="button"
                            className={`${styles.actionBtn} ${styles.actionBtnRestore}`}
                            onClick={() => handleRestore(grade)}
                            title="Restore / Reactivate Grade"
                          >
                            <HiArrowPath size={15} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={`${styles.actionBtn} ${styles.actionBtnDelete}`}
                            onClick={() => handleInitiateDelete(grade)}
                            title="Deactivate Grade"
                          >
                            <HiTrash size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && grades.length > 0 && (
          <div className={styles.paginationFooter}>
            <div className={styles.recordsInfo}>
              Showing <strong>{startRecord}</strong> to <strong>{endRecord}</strong> of{" "}
              <strong>{total}</strong> records
            </div>

            <div className={styles.paginationControls}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "13px", color: "#64748b" }}>Rows:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className={styles.pageSizeSelect}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <button
                type="button"
                className={styles.pageBtn}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <HiChevronLeft size={16} /> Prev
              </button>

              <span className={styles.pageIndicator}>
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                className={styles.pageBtn}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next <HiChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Grade Modal */}
      {isModalOpen && (
        <div
          className={styles.modalOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className={styles.modalDialog} role="dialog" aria-modal="true">
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleArea}>
                <h2>{editingGrade ? `Edit ${editingGrade.name}` : "Create New Grade"}</h2>
                <p>
                  {editingGrade
                    ? "Update grade level details and configuration"
                    : "Define a new grade level for the school roster"}
                </p>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setIsModalOpen(false)}
                aria-label="Close dialog"
              >
                <HiXMark size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <form onSubmit={handleFormSubmit} className={styles.form}>
                {formApiError && (
                  <div className={styles.alertError} style={{ margin: 0 }}>
                    <HiXMark size={18} />
                    <span>{formApiError}</span>
                  </div>
                )}

                <div className={styles.formField}>
                  <label className={styles.label}>
                    Grade Name <span className={styles.requiredStar}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Grade 9, Grade 10, Kindergarten"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, name: e.target.value }));
                      if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: "" }));
                    }}
                    className={`${styles.input} ${formErrors.name ? styles.inputError : ""}`}
                    autoFocus
                  />
                  {formErrors.name && (
                    <span className={styles.errorMessage}>{formErrors.name}</span>
                  )}
                </div>

                <div className={styles.formField}>
                  <label className={styles.label}>Description / Notes</label>
                  <textarea
                    placeholder="Optional overview or stage of education (e.g. Secondary Level)"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    className={styles.textarea}
                    rows={3}
                  />
                </div>

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={() => setIsModalOpen(false)}
                    disabled={formSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={styles.btnPrimary}
                    disabled={formSubmitting}
                  >
                    {formSubmitting ? (
                      <>
                        <span className={styles.spinner}></span> Saving...
                      </>
                    ) : editingGrade ? (
                      "Update Grade"
                    ) : (
                      "Create Grade"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Confirm Dialog with Reference Breakdown */}
      {isConfirmOpen && (
        <div
          className={styles.modalOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleteLoading) setIsConfirmOpen(false);
          }}
        >
          <div className={styles.modalDialog} role="dialog" aria-modal="true">
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleArea}>
                <h2>Deactivate Grade Level</h2>
                <p>Review dependency impact before deactivating</p>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setIsConfirmOpen(false)}
                disabled={deleteLoading}
              >
                <HiXMark size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p style={{ margin: "0 0 12px", fontSize: "14px", color: "#334155", lineHeight: 1.5 }}>
                Are you sure you want to deactivate grade{" "}
                <strong style={{ color: "#0f172a" }}>&ldquo;{deleteTarget?.name}&rdquo;</strong>?
                This will soft-delete the grade and hide it from active selectors.
              </p>

              {deleteReferences && deleteReferences.hasReferences && (
                <div className={styles.warningCallout}>
                  <div className={styles.warningCalloutTitle}>
                    <HiExclamationTriangle size={17} />
                    <span>Active Dependencies Detected ({deleteReferences.totalReferences} records)</span>
                  </div>
                  <p style={{ margin: 0, fontSize: "12px", color: "#78350f" }}>
                    This grade is currently referenced by other active academic modules:
                  </p>
                  <div className={styles.refBadgeList}>
                    {deleteReferences.sections > 0 && (
                      <span className={styles.refBadgeItem}>
                        <strong>{deleteReferences.sections}</strong> Section(s)
                      </span>
                    )}
                    {deleteReferences.students > 0 && (
                      <span className={styles.refBadgeItem}>
                        <strong>{deleteReferences.students}</strong> Student(s)
                      </span>
                    )}
                    {deleteReferences.gradeSubjects > 0 && (
                      <span className={styles.refBadgeItem}>
                        <strong>{deleteReferences.gradeSubjects}</strong> Subject Mapping(s)
                      </span>
                    )}
                    {deleteReferences.exams > 0 && (
                      <span className={styles.refBadgeItem}>
                        <strong>{deleteReferences.exams}</strong> Exam(s)
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setIsConfirmOpen(false)}
                  disabled={deleteLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.btnDanger}
                  onClick={handleConfirmDelete}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? (
                    <>
                      <span className={styles.spinner}></span> Deactivating...
                    </>
                  ) : (
                    "Confirm Deactivation"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
