"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import sectionService from "@/services/sectionService";
import gradeService from "@/services/gradeService";
import styles from "./page.module.css";
import {
  HiBuildingOffice2,
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
} from "react-icons/hi2";

export default function SectionListPage() {
  const [sections, setSections] = useState([]);
  const [grades, setGrades] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [status, setStatus] = useState("active");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("ASC");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState(null);

  // Modal State (Add & Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    grade_id: "",
    room_number: "",
    capacity: "",
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

  const loadGrades = useCallback(async () => {
    try {
      const res = await gradeService.listGrades({ status: "active", limit: 100 });
      setGrades(res.items || []);
    } catch (err) {
      console.warn("Could not load grades list:", err.message);
    }
  }, []);

  useEffect(() => {
    loadGrades();
  }, [loadGrades]);

  const loadSections = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await sectionService.listSections({
        search,
        gradeId: gradeFilter,
        status,
        sortBy,
        sortOrder,
        limit,
        offset: (page - 1) * limit,
      });

      setSections(res.items || []);
      setTotal(res.total || 0);
    } catch (err) {
      setError(err.message || "Failed to load sections.");
      setSections([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, gradeFilter, status, sortBy, sortOrder, page, limit]);

  useEffect(() => {
    loadSections();
  }, [loadSections]);

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

  const handleGradeFilterChange = (val) => {
    setGradeFilter(val);
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
    setEditingSection(null);
    setFormData({
      name: "",
      grade_id: gradeFilter || (grades[0]?.id || ""),
      room_number: "",
      capacity: "",
    });
    setFormErrors({});
    setFormApiError("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sec) => {
    setEditingSection(sec);
    setFormData({
      name: sec.name || "",
      grade_id: sec.grade_id || "",
      room_number: sec.room_number || "",
      capacity: sec.capacity !== null && sec.capacity !== undefined ? String(sec.capacity) : "",
    });
    setFormErrors({});
    setFormApiError("");
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.name || !formData.name.trim()) {
      errs.name = "Section name is required";
    }
    if (!formData.grade_id) {
      errs.grade_id = "Please select a grade level";
    }
    if (formData.capacity && (isNaN(Number(formData.capacity)) || Number(formData.capacity) <= 0)) {
      errs.capacity = "Capacity must be a positive number";
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
        name: formData.name.trim(),
        grade_id: formData.grade_id,
        room_number: formData.room_number?.trim() || null,
        capacity: formData.capacity ? Number(formData.capacity) : null,
      };

      if (editingSection) {
        await sectionService.updateSection(editingSection.id, payload);
        showToast(`Section "${formData.name.trim()}" updated successfully!`);
      } else {
        await sectionService.createSection(payload);
        showToast(`Section "${formData.name.trim()}" created successfully!`);
      }

      setIsModalOpen(false);
      loadSections();
    } catch (err) {
      setFormApiError(err.message || "Failed to save section. Please check input.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleInitiateDelete = async (sec) => {
    try {
      setDeleteTarget(sec);
      setDeleteLoading(true);
      setIsConfirmOpen(true);

      const refData = await sectionService.checkSectionReferences(sec.id);
      setDeleteReferences(refData);
    } catch (err) {
      console.error("Failed to check section references:", err);
      setDeleteReferences(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      setDeleteLoading(true);
      await sectionService.deleteSection(deleteTarget.id);
      setIsConfirmOpen(false);
      showToast(`Section "${deleteTarget.name}" deactivated successfully.`);
      loadSections();
    } catch (err) {
      alert(err.message || "Failed to deactivate section.");
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  const handleRestore = async (sec) => {
    try {
      await sectionService.restoreSection(sec.id);
      showToast(`Section "${sec.name}" restored to Active.`);
      loadSections();
    } catch (err) {
      alert(err.message || "Failed to restore section.");
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
          <h1>Section Management</h1>
          <p>Organize classes into sections, assign rooms, and manage student capacity.</p>
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
              placeholder="Search by section, room, or grade..."
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

          <select
            value={gradeFilter}
            onChange={(e) => handleGradeFilterChange(e.target.value)}
            className={styles.gradeSelectFilter}
            title="Filter by Grade Level"
          >
            <option value="">All Grades</option>
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.toolbarRight}>
          <button
            type="button"
            className={styles.btnIcon}
            onClick={loadSections}
            title="Refresh sections list"
          >
            <HiArrowPath size={17} />
          </button>

          <button
            type="button"
            className={styles.btnPrimary}
            onClick={handleOpenAdd}
          >
            <HiPlus size={18} />
            <span>+ Add Section</span>
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
                  style={{ width: "25%" }}
                >
                  <div className={styles.thContent}>
                    <span>Section</span>
                    {sortBy === "name" ? (
                      sortOrder === "ASC" ? <HiChevronUp size={14} color="#2563eb" /> : <HiChevronDown size={14} color="#2563eb" />
                    ) : (
                      <HiChevronUpDown size={14} color="#94a3b8" />
                    )}
                  </div>
                </th>
                <th
                  className={`${styles.th} ${styles.thSortable}`}
                  onClick={() => handleSortClick("grade_name")}
                  style={{ width: "20%" }}
                >
                  <div className={styles.thContent}>
                    <span>Grade Level</span>
                    {sortBy === "grade_name" ? (
                      sortOrder === "ASC" ? <HiChevronUp size={14} color="#2563eb" /> : <HiChevronDown size={14} color="#2563eb" />
                    ) : (
                      <HiChevronUpDown size={14} color="#94a3b8" />
                    )}
                  </div>
                </th>
                <th className={styles.th} style={{ width: "15%" }}>
                  Room / Hall
                </th>
                <th
                  className={`${styles.th} ${styles.thSortable}`}
                  onClick={() => handleSortClick("capacity")}
                  style={{ textAlign: "center", width: "12%" }}
                >
                  <div className={styles.thContent} style={{ justifyContent: "center" }}>
                    <span>Capacity</span>
                    {sortBy === "capacity" ? (
                      sortOrder === "ASC" ? <HiChevronUp size={14} color="#2563eb" /> : <HiChevronDown size={14} color="#2563eb" />
                    ) : (
                      <HiChevronUpDown size={14} color="#94a3b8" />
                    )}
                  </div>
                </th>
                <th
                  className={`${styles.th} ${styles.thSortable}`}
                  onClick={() => handleSortClick("student_count")}
                  style={{ textAlign: "center", width: "12%" }}
                >
                  <div className={styles.thContent} style={{ justifyContent: "center" }}>
                    <span>Students</span>
                    {sortBy === "student_count" ? (
                      sortOrder === "ASC" ? <HiChevronUp size={14} color="#2563eb" /> : <HiChevronDown size={14} color="#2563eb" />
                    ) : (
                      <HiChevronUpDown size={14} color="#94a3b8" />
                    )}
                  </div>
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
              ) : sections.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.td}>
                    <div className={styles.emptyState}>
                      <HiInbox className={styles.emptyIcon} />
                      <h3 className={styles.emptyTitle}>No sections found</h3>
                      <p className={styles.emptyText}>
                        No class sections match your active filters. Click &ldquo;+ Add Section&rdquo; to create one.
                      </p>
                      <button
                        type="button"
                        className={styles.btnPrimary}
                        onClick={handleOpenAdd}
                        style={{ marginTop: "8px" }}
                      >
                        <HiPlus size={18} />
                        <span>+ Add Section</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                sections.map((sec) => (
                  <tr key={sec.id} className={styles.tr}>
                    <td className={styles.td}>
                      <strong style={{ color: "#0f172a", fontSize: "14px" }}>{sec.name}</strong>
                    </td>
                    <td className={styles.td}>
                      <span
                        style={{
                          display: "inline-flex",
                          padding: "3px 10px",
                          borderRadius: "8px",
                          background: "#eff6ff",
                          color: "#1d4ed8",
                          fontWeight: 600,
                          fontSize: "13px",
                        }}
                      >
                        {sec.grade_name || "—"}
                      </span>
                    </td>
                    <td className={styles.td} style={{ color: "#475569" }}>
                      {sec.room_number || "—"}
                    </td>
                    <td className={styles.td} style={{ textAlign: "center", color: "#475569" }}>
                      {sec.capacity ? `${sec.capacity} seats` : "—"}
                    </td>
                    <td className={styles.td} style={{ textAlign: "center", fontWeight: 700, color: "#0f172a" }}>
                      {sec.student_count || 0}
                    </td>
                    <td className={styles.td}>
                      <span
                        className={`${styles.statusPill} ${
                          sec.status === "ACTIVE" ? styles.statusActive : styles.statusInactive
                        }`}
                      >
                        <span className={styles.statusDot}></span>
                        {sec.status === "ACTIVE" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className={styles.td} style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "flex-end" }}>
                        <Link
                          href={`/dashboard/sections/${sec.id}`}
                          className={styles.actionBtn}
                          title="View Section Details"
                        >
                          <HiEye size={15} />
                        </Link>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => handleOpenEdit(sec)}
                          title="Edit Section"
                        >
                          <HiPencilSquare size={15} />
                        </button>
                        {sec.status === "INACTIVE" || sec.deleted_at ? (
                          <button
                            type="button"
                            className={`${styles.actionBtn} ${styles.actionBtnRestore}`}
                            onClick={() => handleRestore(sec)}
                            title="Restore / Reactivate Section"
                          >
                            <HiArrowPath size={15} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={`${styles.actionBtn} ${styles.actionBtnDelete}`}
                            onClick={() => handleInitiateDelete(sec)}
                            title="Deactivate Section"
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
        {!loading && sections.length > 0 && (
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

      {/* Add / Edit Section Modal */}
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
                <h2>{editingSection ? `Edit Section: ${editingSection.name}` : "Create New Section"}</h2>
                <p>
                  {editingSection
                    ? "Update section parameters and room assignment"
                    : "Define a class section under an academic grade level"}
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
                      Section Name <span className={styles.requiredStar}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Section A, Blue, Rose"
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
                    <label className={styles.label}>
                      Grade Level <span className={styles.requiredStar}>*</span>
                    </label>
                    <select
                      value={formData.grade_id}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, grade_id: e.target.value }));
                        if (formErrors.grade_id) setFormErrors((prev) => ({ ...prev, grade_id: "" }));
                      }}
                      className={`${styles.select} ${formErrors.grade_id ? styles.inputError : ""}`}
                    >
                      <option value="">Select Grade</option>
                      {grades.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                    {formErrors.grade_id && (
                      <span className={styles.errorMessage}>{formErrors.grade_id}</span>
                    )}
                  </div>
                </div>

                <div className={styles.formFieldRow}>
                  <div className={styles.formField}>
                    <label className={styles.label}>Room Number / Hall</label>
                    <input
                      type="text"
                      placeholder="e.g. Room 102, Lab B"
                      value={formData.room_number}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, room_number: e.target.value }))
                      }
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.label}>Student Capacity</label>
                    <input
                      type="number"
                      placeholder="e.g. 35"
                      min="1"
                      value={formData.capacity}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, capacity: e.target.value }));
                        if (formErrors.capacity) setFormErrors((prev) => ({ ...prev, capacity: "" }));
                      }}
                      className={`${styles.input} ${formErrors.capacity ? styles.inputError : ""}`}
                    />
                    {formErrors.capacity && (
                      <span className={styles.errorMessage}>{formErrors.capacity}</span>
                    )}
                  </div>
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
                    ) : editingSection ? (
                      "Update Section"
                    ) : (
                      "Create Section"
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
                <h2>Deactivate Section</h2>
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
                Are you sure you want to deactivate section{" "}
                <strong style={{ color: "#0f172a" }}>&ldquo;{deleteTarget?.name}&rdquo;</strong>?
                This will soft-delete the section and hide it from active selectors.
              </p>

              {deleteReferences && deleteReferences.hasReferences && (
                <div className={styles.warningCallout}>
                  <div className={styles.warningCalloutTitle}>
                    <HiExclamationTriangle size={17} />
                    <span>Active Dependencies Detected ({deleteReferences.totalReferences} records)</span>
                  </div>
                  <p style={{ margin: 0, fontSize: "12px", color: "#78350f" }}>
                    This section is currently referenced by other active academic modules:
                  </p>
                  <div className={styles.refBadgeList}>
                    {deleteReferences.students > 0 && (
                      <span className={styles.refBadgeItem}>
                        <strong>{deleteReferences.students}</strong> Student(s)
                      </span>
                    )}
                    {deleteReferences.teacherSubjects > 0 && (
                      <span className={styles.refBadgeItem}>
                        <strong>{deleteReferences.teacherSubjects}</strong> Teacher Assignment(s)
                      </span>
                    )}
                    {deleteReferences.attendance > 0 && (
                      <span className={styles.refBadgeItem}>
                        <strong>{deleteReferences.attendance}</strong> Attendance Record(s)
                      </span>
                    )}
                    {deleteReferences.marks > 0 && (
                      <span className={styles.refBadgeItem}>
                        <strong>{deleteReferences.marks}</strong> Mark(s)
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
