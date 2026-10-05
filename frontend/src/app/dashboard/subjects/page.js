"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import subjectService from "@/services/subjectService";
import { useAuth } from "@/hooks/useAuth";
import { SubjectFormModal, SubjectDeleteModal } from "@/components/subjects";
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
  HiAcademicCap,
} from "react-icons/hi2";

function SubjectListContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const role = (user?.role || "").toLowerCase();
  const isStudent = role === "student";
  const isTeacher = role.includes("teacher") && !role.includes("admin");
  const canManage = !isStudent && !isTeacher;

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

  // Deactivation Confirm State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const showToast = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Support ?new=1 or ?new=true query param
  useEffect(() => {
    const isNewParam = searchParams.get("new");
    if (isNewParam === "1" || isNewParam === "true") {
      setEditingSubject(null);
      setIsModalOpen(true);
    }
  }, [searchParams]);

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
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sub) => {
    setEditingSubject(sub);
    setIsModalOpen(true);
  };

  const handleInitiateDelete = (sub) => {
    setDeleteTarget(sub);
    setIsConfirmOpen(true);
  };

  const handleRestore = async (sub) => {
    try {
      await subjectService.restoreSubject(sub.id);
      showToast(`Subject "${sub.subject_name}" restored to Active.`);
      loadSubjects();
    } catch (err) {
      showToast(err.message || "Failed to restore subject.", "error");
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
          <h1>
            {isStudent
              ? "My Enrolled Subjects"
              : isTeacher
              ? "My Assigned Subjects"
              : "Subject Management"}
          </h1>
          <p>
            {isStudent
              ? "Your enrolled academic subjects, credit weighting, pass criteria, and course syllabus."
              : isTeacher
              ? "Curriculum and course parameters for your assigned teaching subjects."
              : "Define academic subjects, credit weighting, passing benchmarks, and classification."}
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={handleOpenAdd}
          >
            <HiPlus size={18} />
            <span>Add New Subject</span>
          </button>
        )}
      </div>

      {/* Toast Notification */}
      {notification && (
        <div
          className={
            notification.type === "error" ? styles.alertError : styles.alertSuccess
          }
        >
          {notification.type === "error" ? (
            <HiXMark size={20} />
          ) : (
            <HiCheckCircle size={20} />
          )}
          <span>{notification.msg}</span>
        </div>
      )}

      {error && (
        <div className={styles.alertError}>
          <HiXMark size={20} />
          <span>{error}</span>
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

          {canManage && (
            <div className={styles.statusTabs}>
              {[
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
                { label: "All", value: "all" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`${styles.statusTab} ${
                    status === opt.value ? styles.statusTabActive : ""
                  }`}
                  onClick={() => handleStatusChange(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
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
                      sortOrder === "ASC" ? (
                        <HiChevronUp size={14} color="#2563eb" />
                      ) : (
                        <HiChevronDown size={14} color="#2563eb" />
                      )
                    ) : (
                      <HiChevronUpDown size={14} color="#94a3b8" />
                    )}
                  </div>
                </th>
                <th
                  className={`${styles.th} ${styles.thSortable}`}
                  onClick={() => handleSortClick("subject_name")}
                  style={{ width: "28%" }}
                >
                  <div className={styles.thContent}>
                    <span>Subject Name</span>
                    {sortBy === "subject_name" ? (
                      sortOrder === "ASC" ? (
                        <HiChevronUp size={14} color="#2563eb" />
                      ) : (
                        <HiChevronDown size={14} color="#2563eb" />
                      )
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
                  <div
                    className={styles.thContent}
                    style={{ justifyContent: "center" }}
                  >
                    <span>Credits</span>
                    {sortBy === "credit_hours" ? (
                      sortOrder === "ASC" ? (
                        <HiChevronUp size={14} color="#2563eb" />
                      ) : (
                        <HiChevronDown size={14} color="#2563eb" />
                      )
                    ) : (
                      <HiChevronUpDown size={14} color="#94a3b8" />
                    )}
                  </div>
                </th>
                <th
                  className={styles.th}
                  style={{ textAlign: "center", width: "14%" }}
                >
                  Pass / Max
                </th>
                <th
                  className={styles.th}
                  style={{ textAlign: "center", width: "13%" }}
                >
                  Curriculum Map
                </th>
                <th className={styles.th} style={{ width: "10%" }}>
                  Status
                </th>
                <th
                  className={styles.th}
                  style={{ textAlign: "right", width: "10%" }}
                >
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
                        {isTeacher
                          ? "You are not currently assigned to teach any subjects."
                          : 'No subjects match your active search or filter. Click "+ Add New Subject" to create one.'}
                      </p>
                      {canManage && (
                        <button
                          type="button"
                          className={styles.btnPrimary}
                          onClick={handleOpenAdd}
                          style={{ marginTop: "8px" }}
                        >
                          <HiPlus size={18} />
                          <span>Add New Subject</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                subjects.map((sub) => (
                  <tr key={sub.id} className={styles.tr}>
                    <td className={styles.td}>
                      <span
                        style={{
                          display: "inline-flex",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          background: "#eff6ff",
                          color: "#1d4ed8",
                          fontWeight: 700,
                          fontSize: "12px",
                          fontFamily: "monospace",
                          border: "1px solid #dbeafe",
                        }}
                      >
                        {sub.subject_code}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "8px",
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            color: "#2563eb",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "14px",
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          <HiBookOpen size={16} />
                        </div>
                        <div>
                          <strong
                            style={{
                              color: "#0f172a",
                              fontSize: "14px",
                              display: "block",
                            }}
                          >
                            {sub.subject_name}
                          </strong>
                          {sub.short_name && (
                            <span
                              style={{
                                fontSize: "12px",
                                color: "#64748b",
                                display: "block",
                              }}
                            >
                              {sub.short_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td
                      className={styles.td}
                      style={{ textAlign: "center", color: "#475569" }}
                    >
                      {sub.credit_hours !== null && sub.credit_hours !== undefined
                        ? `${sub.credit_hours} hrs`
                        : "—"}
                    </td>
                    <td
                      className={styles.td}
                      style={{ textAlign: "center", color: "#475569" }}
                    >
                      <span style={{ fontWeight: 600, color: "#166534" }}>
                        {sub.pass_mark ?? 50}
                      </span>{" "}
                      / {sub.max_mark ?? 100}
                    </td>
                    <td className={styles.td} style={{ textAlign: "center" }}>
                      <Link
                        href={`/dashboard/grades/subjects?subject_id=${sub.id}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "13px",
                          color: "#2563eb",
                          textDecoration: "none",
                          fontWeight: 600,
                        }}
                        title="View grade curriculum mappings"
                      >
                        <HiAcademicCap size={15} />
                        <span>Mappings</span>
                      </Link>
                    </td>
                    <td className={styles.td}>
                      <span
                        className={`${styles.statusPill} ${
                          sub.status === "ACTIVE"
                            ? styles.statusActive
                            : styles.statusInactive
                        }`}
                      >
                        <span className={styles.statusDot}></span>
                        {sub.status === "ACTIVE" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className={styles.td} style={{ textAlign: "right" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          justifyContent: "flex-end",
                        }}
                      >
                        <Link
                          href={`/dashboard/subjects/${sub.id}`}
                          className={styles.actionBtn}
                          title="View Subject Details"
                        >
                          <HiEye size={15} />
                        </Link>
                        {canManage && (
                          <>
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
                          </>
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
              Showing <strong>{startRecord}</strong> to{" "}
              <strong>{endRecord}</strong> of <strong>{total}</strong> records
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

      {/* Senior Subject Form Modal (Create & Edit) */}
      {isModalOpen && (
        <SubjectFormModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingSubject(null);
          }}
          subject={editingSubject}
          onSuccess={(msg) => {
            showToast(msg);
            loadSubjects();
          }}
        />
      )}

      {/* Senior Subject Deactivate / Delete Confirm Modal */}
      {isConfirmOpen && (
        <SubjectDeleteModal
          isOpen={isConfirmOpen}
          onClose={() => {
            setIsConfirmOpen(false);
            setDeleteTarget(null);
          }}
          subject={deleteTarget}
          onSuccess={(msg) => {
            showToast(msg);
            loadSubjects();
          }}
        />
      )}
    </div>
  );
}

export default function SubjectListPage() {
  return (
    <Suspense
      fallback={<div style={{ padding: "28px" }}>Loading subjects...</div>}
    >
      <SubjectListContent />
    </Suspense>
  );
}
