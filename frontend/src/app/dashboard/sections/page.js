"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import sectionService from "@/services/sectionService";
import gradeService from "@/services/gradeService";
import { useAuth } from "@/hooks/useAuth";
import { SectionFormModal, SectionDeleteModal } from "@/components/sections";
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
} from "react-icons/hi2";

function SectionListContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const role = (user?.role || "").toLowerCase();
  const isStudent = role === "student";
  const isTeacher = role.includes("teacher") && !role.includes("admin");
  const canManage = !isStudent && !isTeacher;

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

  // Deactivation Confirm State
  const [deleteTarget, setDeleteTarget] = useState(null);
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

  // Support ?new=1 or ?new=true query param
  useEffect(() => {
    const isNewParam = searchParams.get("new");
    const gradeIdParam = searchParams.get("gradeId") || searchParams.get("grade_id");
    if (gradeIdParam) {
      setGradeFilter(gradeIdParam);
    }
    if (isNewParam === "1" || isNewParam === "true") {
      setEditingSection(null);
      setIsModalOpen(true);
    }
  }, [searchParams]);

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
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sec) => {
    setEditingSection(sec);
    setIsModalOpen(true);
  };

  const handleInitiateDelete = (sec) => {
    setDeleteTarget(sec);
    setIsConfirmOpen(true);
  };

  const handleRestore = async (sec) => {
    try {
      await sectionService.restoreSection(sec.id);
      showToast(`Section "${sec.name}" restored to Active.`);
      loadSections();
    } catch (err) {
      showToast(err.message || "Failed to restore section.", "error");
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
              ? "My Grade & Section"
              : isTeacher
              ? "My Assigned Sections"
              : "Section Management"}
          </h1>
          <p>
            {isStudent
              ? "Your current enrolled grade level, class section, and room assignment."
              : isTeacher
              ? "View details and student rosters for your assigned homeroom and subject class sections."
              : "Organize classes into sections, assign rooms, and manage student capacity."}
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={handleOpenAdd}
          >
            <HiPlus size={18} />
            <span>Add New Section</span>
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

          {!isStudent && (
            <>
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
            </>
          )}
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
                  onClick={() => handleSortClick("grade_name")}
                  style={{ width: "20%" }}
                >
                  <div className={styles.thContent}>
                    <span>Grade Level</span>
                    {sortBy === "grade_name" ? (
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
                <th className={styles.th} style={{ width: "15%" }}>
                  Room / Hall
                </th>
                <th
                  className={`${styles.th} ${styles.thSortable}`}
                  onClick={() => handleSortClick("capacity")}
                  style={{ textAlign: "center", width: "12%" }}
                >
                  <div
                    className={styles.thContent}
                    style={{ justifyContent: "center" }}
                  >
                    <span>Capacity</span>
                    {sortBy === "capacity" ? (
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
                  onClick={() => handleSortClick("student_count")}
                  style={{ textAlign: "center", width: "12%" }}
                >
                  <div
                    className={styles.thContent}
                    style={{ justifyContent: "center" }}
                  >
                    <span>Students</span>
                    {sortBy === "student_count" ? (
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
              ) : sections.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.td}>
                    <div className={styles.emptyState}>
                      <HiInbox className={styles.emptyIcon} />
                      <h3 className={styles.emptyTitle}>No sections found</h3>
                      <p className={styles.emptyText}>
                        {isTeacher
                          ? "You are not currently assigned as a Class Teacher or Subject Teacher to any active sections."
                          : 'No class sections match your active filters. Click "+ Add New Section" to create one.'}
                      </p>
                      {canManage && (
                        <button
                          type="button"
                          className={styles.btnPrimary}
                          onClick={handleOpenAdd}
                          style={{ marginTop: "8px" }}
                        >
                          <HiPlus size={18} />
                          <span>Add New Section</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                sections.map((sec) => (
                  <tr key={sec.id} className={styles.tr}>
                    <td className={styles.td}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "8px",
                            background: "#eff6ff",
                            color: "#2563eb",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "14px",
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          <HiBuildingOffice2 size={16} />
                        </div>
                        <strong style={{ color: "#0f172a", fontSize: "14px" }}>
                          {sec.name}
                        </strong>
                      </div>
                    </td>
                    <td className={styles.td}>
                      <span
                        style={{
                          display: "inline-flex",
                          padding: "3px 10px",
                          borderRadius: "8px",
                          background: "#f1f5f9",
                          color: "#1e293b",
                          fontWeight: 600,
                          fontSize: "13px",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        {sec.grade_name || "—"}
                      </span>
                    </td>
                    <td className={styles.td} style={{ color: "#475569" }}>
                      {sec.room_number || "—"}
                    </td>
                    <td
                      className={styles.td}
                      style={{ textAlign: "center", color: "#475569" }}
                    >
                      {sec.capacity ? `${sec.capacity} seats` : "—"}
                    </td>
                    <td
                      className={styles.td}
                      style={{
                        textAlign: "center",
                        fontWeight: 700,
                        color: "#0f172a",
                      }}
                    >
                      {sec.student_count || 0}
                    </td>
                    <td className={styles.td}>
                      <span
                        className={`${styles.statusPill} ${
                          sec.status === "ACTIVE"
                            ? styles.statusActive
                            : styles.statusInactive
                        }`}
                      >
                        <span className={styles.statusDot}></span>
                        {sec.status === "ACTIVE" ? "Active" : "Inactive"}
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
                          href={`/dashboard/sections/${sec.id}`}
                          className={styles.actionBtn}
                          title="View Section Details"
                        >
                          <HiEye size={15} />
                        </Link>
                        {canManage && (
                          <>
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
        {!loading && sections.length > 0 && (
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

      {/* Senior Section Form Modal (Create & Edit) */}
      {isModalOpen && (
        <SectionFormModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingSection(null);
          }}
          section={editingSection}
          defaultGradeId={gradeFilter}
          grades={grades}
          onSuccess={(msg) => {
            showToast(msg);
            loadSections();
          }}
        />
      )}

      {/* Senior Section Deactivate / Delete Confirm Modal */}
      {isConfirmOpen && (
        <SectionDeleteModal
          isOpen={isConfirmOpen}
          onClose={() => {
            setIsConfirmOpen(false);
            setDeleteTarget(null);
          }}
          section={deleteTarget}
          onSuccess={(msg) => {
            showToast(msg);
            loadSections();
          }}
        />
      )}
    </div>
  );
}

export default function SectionListPage() {
  return (
    <Suspense fallback={<div style={{ padding: "28px" }}>Loading sections...</div>}>
      <SectionListContent />
    </Suspense>
  );
}
