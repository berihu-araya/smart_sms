"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import subjectService from "@/services/subjectService";
import styles from "./page.module.css";
import {
  HiBookOpen,
  HiPencilSquare,
  HiTrash,
  HiArrowPath,
  HiCheckCircle,
  HiXMark,
  HiEye,
  HiMagnifyingGlass,
  HiPlus,
  HiChevronUpDown,
  HiChevronUp,
  HiChevronDown,
  HiChevronLeft,
  HiChevronRight,
  HiInbox,
  HiExclamationTriangle,
  HiAcademicCap,
} from "react-icons/hi2";

export default function SubjectListPage() {
  const [subjects, setSubjects] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [sortBy, setSortBy] = useState("subject_name");
  const [sortOrder, setSortOrder] = useState("ASC");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState(null);

  // Modal State (Add & Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [formData, setFormData] = useState({
    subject_code: "",
    subject_name: "",
    short_name: "",
    description: "",
    credit_hours: "",
    pass_mark: "",
    max_mark: "100",
    is_elective: false,
    is_lab: false,
    display_order: 0,
    status: "ACTIVE",
  });
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

  const loadSubjects = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await subjectService.listSubjects({
        search,
        status,
        sortBy,
        sortOrder,
        limit,
        offset: (page - 1) * limit,
      });

      setSubjects(res.items || []);
      setTotal(res.total || 0);
    } catch (err) {
      setError(err.message || "Failed to load subjects.");
      setSubjects([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, status, sortBy, sortOrder, page, limit]);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

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
    setEditingSubject(null);
    setFormData({
      subject_code: "",
      subject_name: "",
      short_name: "",
      description: "",
      credit_hours: "",
      pass_mark: "",
      max_mark: "100",
      is_elective: false,
      is_lab: false,
      display_order: 0,
      status: "ACTIVE",
    });
    setFormErrors({});
    setFormApiError("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sub) => {
    setEditingSubject(sub);
    setFormData({
      subject_code: sub.subject_code || "",
      subject_name: sub.subject_name || "",
      short_name: sub.short_name || "",
      description: sub.description || "",
      credit_hours: sub.credit_hours !== null && sub.credit_hours !== undefined ? String(sub.credit_hours) : "",
      pass_mark: sub.pass_mark !== null && sub.pass_mark !== undefined ? String(sub.pass_mark) : "",
      max_mark: sub.max_mark !== null && sub.max_mark !== undefined ? String(sub.max_mark) : "",
      is_elective: Boolean(sub.is_elective),
      is_lab: Boolean(sub.is_lab),
      display_order: sub.display_order || 0,
      status: sub.status || "ACTIVE",
    });
    setFormErrors({});
    setFormApiError("");
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.subject_code || !formData.subject_code.trim()) {
      errs.subject_code = "Subject code is required";
    }
    if (!formData.subject_name || !formData.subject_name.trim()) {
      errs.subject_name = "Subject name is required";
    }
    if (formData.credit_hours && (isNaN(Number(formData.credit_hours)) || Number(formData.credit_hours) < 0)) {
      errs.credit_hours = "Credit hours must be a positive number";
    }
    if (formData.pass_mark && formData.max_mark) {
      if (Number(formData.pass_mark) > Number(formData.max_mark)) {
        errs.pass_mark = "Pass mark cannot exceed max mark";
      }
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
      const payload = {
        subject_code: formData.subject_code.trim(),
        subject_name: formData.subject_name.trim(),
        short_name: formData.short_name?.trim() || null,
        description: formData.description?.trim() || null,
        credit_hours: formData.credit_hours ? Number(formData.credit_hours) : null,
        pass_mark: formData.pass_mark ? Number(formData.pass_mark) : null,
        max_mark: formData.max_mark ? Number(formData.max_mark) : null,
        is_elective: Boolean(formData.is_elective),
        is_lab: Boolean(formData.is_lab),
        display_order: Number(formData.display_order) || 0,
        status: formData.status || "ACTIVE",
      };

      if (editingSubject) {
        await subjectService.updateSubject(editingSubject.id, payload);
        showToast(`Subject "${formData.subject_name.trim()}" updated successfully!`);
      } else {
        await subjectService.createSubject(payload);
        showToast(`Subject "${formData.subject_name.trim()}" created successfully!`);
      }

      setIsModalOpen(false);
      loadSubjects();
    } catch (err) {
      setFormApiError(err.message || "Failed to save subject. Please check input.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleInitiateDelete = async (sub) => {
    try {
      setDeleteTarget(sub);
      setDeleteLoading(true);
      setIsConfirmOpen(true);

      const refData = await subjectService.checkSubjectReferences(sub.id);
      setDeleteReferences(refData);
    } catch (err) {
      console.error("Failed to check subject references:", err);
      setDeleteReferences(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      setDeleteLoading(true);
      await subjectService.deleteSubject(deleteTarget.id);
      setIsConfirmOpen(false);
      showToast(`Subject "${deleteTarget.subject_name}" deactivated successfully.`);
      loadSubjects();
    } catch (err) {
      alert(err.message || "Failed to deactivate subject.");
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  const handleRestore = async (sub) => {
    try {
      await subjectService.restoreSubject(sub.id);
      showToast(`Subject "${sub.subject_name}" restored to Active.`);
      loadSubjects();
    } catch (err) {
      alert(err.message || "Failed to restore subject.");
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
          <h1>Subject Management</h1>
          <p>Define academic subjects, credit weighting, passing benchmarks, and classification.</p>
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
              placeholder="Search subject by code, name, or short name..."
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
            onClick={loadSubjects}
            title="Refresh subjects list"
          >
            <HiArrowPath size={17} />
          </button>

          <button
            type="button"
            className={styles.btnPrimary}
            onClick={handleOpenAdd}
          >
            <HiPlus size={18} />
            <span>+ Add Subject</span>
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
                  onClick={() => handleSortClick("subject_code")}
                  style={{ width: "15%" }}
                >
                  <div className={styles.thContent}>
                    <span>Code</span>
                    {sortBy === "subject_code" ? (
                      sortOrder === "ASC" ? <HiChevronUp size={14} color="#2563eb" /> : <HiChevronDown size={14} color="#2563eb" />
                    ) : (
                      <HiChevronUpDown size={14} color="#94a3b8" />
                    )}
                  </div>
                </th>
                <th
                  className={`${styles.th} ${styles.thSortable}`}
                  onClick={() => handleSortClick("subject_name")}
                  style={{ width: "30%" }}
                >
                  <div className={styles.thContent}>
                    <span>Subject Name</span>
                    {sortBy === "subject_name" ? (
                      sortOrder === "ASC" ? <HiChevronUp size={14} color="#2563eb" /> : <HiChevronDown size={14} color="#2563eb" />
                    ) : (
                      <HiChevronUpDown size={14} color="#94a3b8" />
                    )}
                  </div>
                </th>
                <th
                  className={`${styles.th} ${styles.thSortable}`}
                  onClick={() => handleSortClick("credit_hours")}
                  style={{ textAlign: "center", width: "10%" }}
                >
                  <div className={styles.thContent} style={{ justifyContent: "center" }}>
                    <span>Credits</span>
                    {sortBy === "credit_hours" ? (
                      sortOrder === "ASC" ? <HiChevronUp size={14} color="#2563eb" /> : <HiChevronDown size={14} color="#2563eb" />
                    ) : (
                      <HiChevronUpDown size={14} color="#94a3b8" />
                    )}
                  </div>
                </th>
                <th className={styles.th} style={{ textAlign: "center", width: "12%" }}>
                  Pass / Max
                </th>
                <th className={styles.th} style={{ textAlign: "center", width: "13%" }}>
                  Curriculum Map
                </th>
                <th className={styles.th} style={{ width: "10%" }}>
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
                    <td className={styles.td} colSpan={7}>
                      <div className={styles.skeletonCell}></div>
                    </td>
                  </tr>
                ))
              ) : subjects.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.td}>
                    <div className={styles.emptyState}>
                      <HiInbox className={styles.emptyIcon} />
                      <h3 className={styles.emptyTitle}>No subjects found</h3>
                      <p className={styles.emptyText}>
                        No subjects match your active filters. Click &ldquo;+ Add Subject&rdquo; to create one.
                      </p>
                      <button
                        type="button"
                        className={styles.btnPrimary}
                        onClick={handleOpenAdd}
                        style={{ marginTop: "8px" }}
                      >
                        <HiPlus size={18} />
                        <span>+ Add Subject</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                subjects.map((sub) => (
                  <tr key={sub.id} className={styles.tr}>
                    <td className={styles.td}>
                      <strong
                        style={{
                          fontFamily: "monospace",
                          fontSize: "13px",
                          background: "#f1f5f9",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          color: "#0f172a",
                        }}
                      >
                        {sub.subject_code}
                      </strong>
                    </td>
                    <td className={styles.td}>
                      <strong style={{ color: "#0f172a", fontSize: "14px" }}>{sub.subject_name}</strong>
                      {sub.short_name && (
                        <span style={{ marginLeft: "8px", fontSize: "12px", color: "#64748b" }}>
                          ({sub.short_name})
                        </span>
                      )}
                      <div className={styles.tagGroup} style={{ marginTop: "4px" }}>
                        {sub.is_elective ? (
                          <span className={`${styles.pillTag} ${styles.pillElective}`}>Elective</span>
                        ) : (
                          <span className={`${styles.pillTag} ${styles.pillCore}`}>Core</span>
                        )}
                        {sub.is_lab && <span className={`${styles.pillTag} ${styles.pillLab}`}>Lab</span>}
                      </div>
                    </td>
                    <td className={styles.td} style={{ textAlign: "center", color: "#475569" }}>
                      {sub.credit_hours !== null && sub.credit_hours !== undefined ? `${sub.credit_hours} hrs` : "—"}
                    </td>
                    <td className={styles.td} style={{ textAlign: "center", color: "#475569" }}>
                      {sub.pass_mark !== null && sub.max_mark !== null
                        ? `${sub.pass_mark} / ${sub.max_mark}`
                        : sub.max_mark
                        ? `Max: ${sub.max_mark}`
                        : "—"}
                    </td>
                    <td className={styles.td} style={{ textAlign: "center" }}>
                      <Link
                        href={`/dashboard/grades/subjects?subject_id=${sub.id}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "12px",
                          color: "#2563eb",
                          textDecoration: "none",
                          fontWeight: 600,
                        }}
                        title="View grades teaching this subject"
                      >
                        <HiAcademicCap size={14} />
                        <span>{sub.grade_count || 0} grades</span>
                      </Link>
                    </td>
                    <td className={styles.td}>
                      <span
                        className={`${styles.statusPill} ${
                          sub.status === "ACTIVE" ? styles.statusActive : styles.statusInactive
                        }`}
                      >
                        <span className={styles.statusDot}></span>
                        {sub.status === "ACTIVE" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className={styles.td} style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "flex-end" }}>
                        <Link
                          href={`/dashboard/subjects/${sub.id}`}
                          className={styles.actionBtn}
                          title="View Subject Details"
                        >
                          <HiEye size={15} />
                        </Link>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => handleOpenEdit(sub)}
                          title="Edit Subject"
                        >
                          <HiPencilSquare size={15} />
                        </button>
                        {sub.status === "INACTIVE" || sub.deleted_at ? (
                          <button
                            type="button"
                            className={`${styles.actionBtn} ${styles.actionBtnRestore}`}
                            onClick={() => handleRestore(sub)}
                            title="Restore / Reactivate Subject"
                          >
                            <HiArrowPath size={15} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={`${styles.actionBtn} ${styles.actionBtnDelete}`}
                            onClick={() => handleInitiateDelete(sub)}
                            title="Deactivate Subject"
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
        {!loading && subjects.length > 0 && (
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

      {/* Add / Edit Subject Modal */}
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
                <h2>{editingSubject ? `Edit Subject: ${editingSubject.subject_name}` : "Create New Subject"}</h2>
                <p>
                  {editingSubject
                    ? "Modify subject curriculum parameters and grading criteria"
                    : "Define a subject offering in the school curriculum catalog"}
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

                <div className={styles.formFieldRow}>
                  <div className={styles.formField}>
                    <label className={styles.label}>
                      Subject Code <span className={styles.requiredStar}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. MATH-101, ENG-200"
                      value={formData.subject_code}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, subject_code: e.target.value.toUpperCase() }));
                        if (formErrors.subject_code) setFormErrors((prev) => ({ ...prev, subject_code: "" }));
                      }}
                      className={`${styles.input} ${formErrors.subject_code ? styles.inputError : ""}`}
                      autoFocus
                    />
                    {formErrors.subject_code && (
                      <span className={styles.errorMessage}>{formErrors.subject_code}</span>
                    )}
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.label}>
                      Subject Name <span className={styles.requiredStar}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Advanced Mathematics"
                      value={formData.subject_name}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, subject_name: e.target.value }));
                        if (formErrors.subject_name) setFormErrors((prev) => ({ ...prev, subject_name: "" }));
                      }}
                      className={`${styles.input} ${formErrors.subject_name ? styles.inputError : ""}`}
                    />
                    {formErrors.subject_name && (
                      <span className={styles.errorMessage}>{formErrors.subject_name}</span>
                    )}
                  </div>
                </div>

                <div className={styles.formFieldRow}>
                  <div className={styles.formField}>
                    <label className={styles.label}>Short Name / Abbr</label>
                    <input
                      type="text"
                      placeholder="e.g. Adv Math"
                      value={formData.short_name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, short_name: e.target.value }))
                      }
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.label}>Credit Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="e.g. 3.0"
                      value={formData.credit_hours}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, credit_hours: e.target.value }))
                      }
                      className={styles.input}
                    />
                  </div>
                </div>

                <div className={styles.formFieldRow}>
                  <div className={styles.formField}>
                    <label className={styles.label}>Pass Mark</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 50"
                      value={formData.pass_mark}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, pass_mark: e.target.value }));
                        if (formErrors.pass_mark) setFormErrors((prev) => ({ ...prev, pass_mark: "" }));
                      }}
                      className={`${styles.input} ${formErrors.pass_mark ? styles.inputError : ""}`}
                    />
                    {formErrors.pass_mark && (
                      <span className={styles.errorMessage}>{formErrors.pass_mark}</span>
                    )}
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.label}>Max Mark</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 100"
                      value={formData.max_mark}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, max_mark: e.target.value }))
                      }
                      className={styles.input}
                    />
                  </div>
                </div>

                <div className={styles.formField}>
                  <label className={styles.label}>Description / Syllabus Overview</label>
                  <textarea
                    placeholder="Optional overview of core topics covered in this subject"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    className={styles.textarea}
                    rows={2}
                  />
                </div>

                <div className={styles.formFieldRow} style={{ marginTop: "4px" }}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={formData.is_elective}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, is_elective: e.target.checked }))
                      }
                      className={styles.checkbox}
                    />
                    <span>Elective Subject</span>
                  </label>

                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={formData.is_lab}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, is_lab: e.target.checked }))
                      }
                      className={styles.checkbox}
                    />
                    <span>Has Practical / Lab</span>
                  </label>
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
                    ) : editingSubject ? (
                      "Update Subject"
                    ) : (
                      "Create Subject"
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
                <h2>Deactivate Subject</h2>
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
                Are you sure you want to deactivate subject{" "}
                <strong style={{ color: "#0f172a" }}>&ldquo;{deleteTarget?.subject_name}&rdquo;</strong>?
                This will soft-delete the subject and hide it from active selectors.
              </p>

              {deleteReferences && deleteReferences.hasReferences && (
                <div className={styles.warningCallout}>
                  <div className={styles.warningCalloutTitle}>
                    <HiExclamationTriangle size={17} />
                    <span>Active Dependencies Detected ({deleteReferences.totalReferences} records)</span>
                  </div>
                  <p style={{ margin: 0, fontSize: "12px", color: "#78350f" }}>
                    This subject is currently referenced by other active academic modules:
                  </p>
                  <div className={styles.refBadgeList}>
                    {deleteReferences.gradeSubjects > 0 && (
                      <span className={styles.refBadgeItem}>
                        <strong>{deleteReferences.gradeSubjects}</strong> Grade Mapping(s)
                      </span>
                    )}
                    {deleteReferences.teacherSubjects > 0 && (
                      <span className={styles.refBadgeItem}>
                        <strong>{deleteReferences.teacherSubjects}</strong> Teacher Assignment(s)
                      </span>
                    )}
                    {deleteReferences.marks > 0 && (
                      <span className={styles.refBadgeItem}>
                        <strong>{deleteReferences.marks}</strong> Student Mark(s)
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
