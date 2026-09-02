"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import timetableService from "@/services/timetableService";
import academicYearService from "@/services/academicYearService";
import Modal from "@/components/common/Modal";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import {
  HiCalendarDays,
  HiPlus,
  HiCheckCircle,
  HiExclamationTriangle,
  HiBuildingOffice,
  HiClock,
  HiUserGroup,
  HiPencilSquare,
  HiTrash,
  HiDocumentDuplicate,
  HiShieldCheck,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiArrowRight,
  HiAcademicCap,
  HiArrowsRightLeft,
  HiDocumentChartBar,
} from "react-icons/hi2";

export default function TimetableDashboardPage() {
  const [timetables, setTimetables] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYearId, setSelectedYearId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    academic_year_id: "",
    term: "Semester 1",
    name: "",
  });
  const [createErrors, setCreateErrors] = useState({});
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Validation Report Modal
  const [validationTarget, setValidationTarget] = useState(null);
  const [validationReport, setValidationReport] = useState(null);
  const [validationLoading, setValidationLoading] = useState(false);

  // Delete Target
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Clone Target
  const [cloneTarget, setCloneTarget] = useState(null);
  const [cloneName, setCloneName] = useState("");
  const [cloneLoading, setCloneLoading] = useState(false);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadAcademicYears = useCallback(async () => {
    try {
      const res = await academicYearService.listAcademicYears({ limit: 100 });
      const years = res.items || [];
      setAcademicYears(years);

      const active = years.find((y) => y.is_active);
      if (active) {
        setSelectedYearId(active.id);
        setCreateForm((prev) => ({ ...prev, academic_year_id: active.id }));
      } else if (years.length > 0) {
        setSelectedYearId(years[0].id);
        setCreateForm((prev) => ({ ...prev, academic_year_id: years[0].id }));
      }
    } catch (err) {
      console.warn("Could not load academic years:", err.message);
    }
  }, []);

  const loadTimetables = useCallback(async () => {
    setLoading(true);
    try {
      const res = await timetableService.listTimetables({
        academicYearId: selectedYearId || undefined,
        status: selectedStatus || undefined,
        limit: 100,
      });
      setTimetables(res.items || []);
    } catch (err) {
      showToast(err.message || "Failed to load timetables", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedYearId, selectedStatus]);

  useEffect(() => {
    loadAcademicYears();
  }, [loadAcademicYears]);

  useEffect(() => {
    if (selectedYearId) {
      loadTimetables();
    }
  }, [selectedYearId, selectedStatus, loadTimetables]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!createForm.name.trim()) errors.name = "Timetable name is required";
    if (!createForm.academic_year_id) errors.academic_year_id = "Academic year is required";
    if (!createForm.term.trim()) errors.term = "Term is required";

    if (Object.keys(errors).length > 0) {
      setCreateErrors(errors);
      return;
    }

    setCreateSubmitting(true);
    try {
      await timetableService.createTimetable(createForm);
      showToast("Master Timetable created successfully");
      setIsCreateOpen(false);
      setCreateForm({
        academic_year_id: selectedYearId,
        term: "Semester 1",
        name: "",
      });
      setCreateErrors({});
      loadTimetables();
    } catch (err) {
      showToast(err.message || "Failed to create timetable", "error");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleRunValidation = async (tt) => {
    setValidationTarget(tt);
    setValidationLoading(true);
    try {
      const report = await timetableService.validateTimetable(tt.id);
      setValidationReport(report);
    } catch (err) {
      showToast(err.message || "Validation failed", "error");
    } finally {
      setValidationLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await timetableService.deleteTimetable(deleteTarget.id);
      showToast(`Timetable "${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      loadTimetables();
    } catch (err) {
      showToast(err.message || "Failed to delete timetable", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCloneConfirm = async () => {
    if (!cloneTarget) return;
    setCloneLoading(true);
    try {
      await timetableService.cloneTimetable(cloneTarget.id, { name: cloneName || undefined });
      showToast(`Timetable cloned successfully to new version`);
      setCloneTarget(null);
      setCloneName("");
      loadTimetables();
    } catch (err) {
      showToast(err.message || "Failed to clone timetable", "error");
    } finally {
      setCloneLoading(false);
    }
  };

  // Summary stats
  const totalTimetables = timetables.length;
  const publishedCount = timetables.filter((t) => t.status === "PUBLISHED").length;
  const draftCount = timetables.filter((t) => t.status === "DRAFT").length;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1>
            <HiCalendarDays color="#4f46e5" /> Timetable & Master Scheduling
          </h1>
          <p>Design, validate, and manage conflict-free school timetables and room allocations.</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.primaryBtn} onClick={() => setIsCreateOpen(true)}>
            <HiPlus /> New Timetable
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className={styles.navTabs}>
        <Link href="/dashboard/timetable" className={`${styles.navTab} ${styles.navTabActive}`}>
          <HiCalendarDays /> Master Timetables
        </Link>
        <Link href="/dashboard/timetable/teacher" className={styles.navTab}>
          <HiAcademicCap /> Teacher View
        </Link>
        <Link href="/dashboard/timetable/class" className={styles.navTab}>
          <HiUserGroup /> Student / Class View
        </Link>
        <Link href="/dashboard/timetable/rooms/occupancy" className={styles.navTab}>
          <HiBuildingOffice /> Room Occupancy
        </Link>
        <Link href="/dashboard/timetable/substitutions" className={styles.navTab}>
          <HiArrowsRightLeft /> Substitutions
        </Link>
        <Link href="/dashboard/timetable/reports" className={styles.navTab}>
          <HiDocumentChartBar /> Reports
        </Link>
        <Link href="/dashboard/timetable/rooms" className={styles.navTab}>
          <HiBuildingOffice /> Rooms & Facilities
        </Link>
        <Link href="/dashboard/timetable/periods" className={styles.navTab}>
          <HiClock /> Bell Schedule
        </Link>
        <Link href="/dashboard/timetable/availability" className={styles.navTab}>
          <HiUserGroup /> Availability Matrix
        </Link>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIconWrap} style={{ background: "#eef2ff", color: "#4f46e5" }}>
            <HiCalendarDays />
          </div>
          <div className={styles.statInfo}>
            <h4>Total Timetables</h4>
            <div className={styles.statValue}>{totalTimetables}</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIconWrap} style={{ background: "#ecfdf5", color: "#10b981" }}>
            <HiCheckCircle />
          </div>
          <div className={styles.statInfo}>
            <h4>Published Schedules</h4>
            <div className={styles.statValue}>{publishedCount}</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIconWrap} style={{ background: "#fffbeb", color: "#f59e0b" }}>
            <HiExclamationTriangle />
          </div>
          <div className={styles.statInfo}>
            <h4>Working Drafts</h4>
            <div className={styles.statValue}>{draftCount}</div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Academic Year:</span>
          <select
            className={styles.selectInput}
            value={selectedYearId}
            onChange={(e) => setSelectedYearId(e.target.value)}
          >
            {academicYears.map((ay) => (
              <option key={ay.id} value={ay.id}>
                {ay.name} {ay.is_active ? "(Active Year)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Status:</span>
          <select
            className={styles.selectInput}
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      {/* Timetables Grid */}
      {loading ? (
        <div className={styles.loadingWrap}>Loading timetables...</div>
      ) : timetables.length === 0 ? (
        <div className={styles.emptyState}>
          <HiCalendarDays style={{ fontSize: "3rem", color: "#94a3b8" }} />
          <h3>No Timetables Found</h3>
          <p>Get started by creating your first timetable draft for this academic year.</p>
          <button
            className={styles.primaryBtn}
            style={{ marginTop: "1rem" }}
            onClick={() => setIsCreateOpen(true)}
          >
            <HiPlus /> Create Master Timetable
          </button>
        </div>
      ) : (
        <div className={styles.timetableGrid}>
          {timetables.map((tt) => (
            <div key={tt.id} className={styles.timetableCard}>
              <div>
                <div className={styles.cardHeader}>
                  <div>
                    <div className={styles.cardTitle}>{tt.name}</div>
                    <div className={styles.cardSubtitle}>
                      {tt.academic_year_name} • {tt.term} (v{tt.version})
                    </div>
                  </div>
                  <span
                    className={
                      tt.status === "PUBLISHED"
                        ? styles.badgePublished
                        : tt.status === "DRAFT"
                        ? styles.badgeDraft
                        : styles.badgeArchived
                    }
                  >
                    {tt.status}
                  </span>
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.cardMetaItem}>
                    <div className={styles.cardMetaLabel}>Scheduled Lessons</div>
                    <strong>{tt.total_entries_count || 0} slots</strong>
                  </div>
                  <div className={styles.cardMetaItem}>
                    <div className={styles.cardMetaLabel}>Active Version</div>
                    <strong>{tt.is_active ? "Yes (Live)" : "No"}</strong>
                  </div>
                </div>
              </div>

              <div className={styles.cardFooter}>
                <Link
                  href={`/dashboard/timetable/builder/${tt.id}`}
                  className={styles.openBuilderBtn}
                >
                  Open Builder <HiArrowRight />
                </Link>
                <div style={{ display: "flex", gap: "0.35rem" }}>
                  <button
                    className={styles.iconBtn}
                    title="Validate Conflicts"
                    onClick={() => handleRunValidation(tt)}
                  >
                    <HiShieldCheck color="#6366f1" />
                  </button>
                  <button
                    className={styles.iconBtn}
                    title="Clone to New Draft Version"
                    onClick={() => {
                      setCloneTarget(tt);
                      setCloneName(`${tt.name} (Copy v${tt.version + 1})`);
                    }}
                  >
                    <HiDocumentDuplicate />
                  </button>
                  {tt.status !== "PUBLISHED" && (
                    <button
                      className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                      title="Delete Timetable Draft"
                      onClick={() => setDeleteTarget(tt)}
                    >
                      <HiTrash />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Master Timetable"
      >
        <form onSubmit={handleCreateSubmit} className={styles.modalForm}>
          <div className={styles.formRow}>
            <label>Academic Year *</label>
            <select
              value={createForm.academic_year_id}
              onChange={(e) => setCreateForm({ ...createForm, academic_year_id: e.target.value })}
            >
              <option value="">Select Academic Year</option>
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name}
                </option>
              ))}
            </select>
            {createErrors.academic_year_id && (
              <span className={styles.errorText}>{createErrors.academic_year_id}</span>
            )}
          </div>

          <div className={styles.formRow}>
            <label>Term / Semester *</label>
            <input
              type="text"
              placeholder="e.g. Semester 1, Term 1"
              value={createForm.term}
              onChange={(e) => setCreateForm({ ...createForm, term: e.target.value })}
            />
            {createErrors.term && <span className={styles.errorText}>{createErrors.term}</span>}
          </div>

          <div className={styles.formRow}>
            <label>Timetable Name *</label>
            <input
              type="text"
              placeholder="e.g. 2026/2027 Term 1 Master Schedule"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
            />
            {createErrors.name && <span className={styles.errorText}>{createErrors.name}</span>}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className={styles.primaryBtn} disabled={createSubmitting}>
              {createSubmitting ? "Creating..." : "Create Draft"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Clone Modal */}
      <Modal
        isOpen={Boolean(cloneTarget)}
        onClose={() => setCloneTarget(null)}
        title="Clone Timetable Version"
      >
        <div className={styles.modalForm}>
          <p style={{ fontSize: "0.9rem", color: "#64748b" }}>
            This will duplicate all lessons and assignments from <strong>{cloneTarget?.name}</strong> into a new working draft version.
          </p>
          <div className={styles.formRow}>
            <label>New Timetable Name</label>
            <input
              type="text"
              value={cloneName}
              onChange={(e) => setCloneName(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => setCloneTarget(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={handleCloneConfirm}
              disabled={cloneLoading}
            >
              {cloneLoading ? "Cloning..." : "Create Clone"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Validation Diagnostics Modal */}
      <Modal
        isOpen={Boolean(validationTarget)}
        onClose={() => {
          setValidationTarget(null);
          setValidationReport(null);
        }}
        title={`Validation Report — ${validationTarget?.name || ""}`}
      >
        {validationLoading ? (
          <div style={{ textAlign: "center", padding: "2rem" }}>Running diagnostic conflict engine...</div>
        ) : validationReport ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Status overview */}
            <div
              style={{
                padding: "1rem",
                borderRadius: "0.5rem",
                background: validationReport.hasConflict ? "#fee2e2" : "#ecfdf5",
                border: `1px solid ${validationReport.hasConflict ? "#f87171" : "#34d399"}`,
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              {validationReport.hasConflict ? (
                <HiOutlineXCircle color="#b91c1c" style={{ fontSize: "1.75rem" }} />
              ) : (
                <HiOutlineCheckCircle color="#047857" style={{ fontSize: "1.75rem" }} />
              )}
              <div>
                <strong style={{ color: validationReport.hasConflict ? "#991b1b" : "#065f46" }}>
                  {validationReport.hasConflict
                    ? "Blocking Conflicts Detected"
                    : "Validation Passed Cleanly"}
                </strong>
                <div style={{ fontSize: "0.85rem", color: "#475569" }}>
                  {validationReport.summary.totalErrors} blocking error(s), {validationReport.summary.totalWarnings} warning(s) across {validationReport.summary.totalEntries} scheduled lesson(s).
                </div>
              </div>
            </div>

            {/* List of conflicts */}
            {validationReport.conflicts.length > 0 && (
              <div>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.5rem", color: "#1e293b" }}>
                  Issues & Warnings:
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "250px", overflowY: "auto" }}>
                  {validationReport.conflicts.map((c, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "0.6rem 0.85rem",
                        borderRadius: "0.375rem",
                        fontSize: "0.85rem",
                        background: c.severity === "BLOCK" ? "#fff1f2" : "#fffbeb",
                        borderLeft: `4px solid ${c.severity === "BLOCK" ? "#e11d48" : "#f59e0b"}`,
                        color: "#334155",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: "0.75rem",
                          padding: "0.15rem 0.4rem",
                          borderRadius: "4px",
                          background: c.severity === "BLOCK" ? "#fda4af" : "#fde68a",
                          color: c.severity === "BLOCK" ? "#881337" : "#78350f",
                          marginRight: "0.5rem",
                        }}
                      >
                        {c.type}
                      </span>
                      {c.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Timetable Draft"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? All scheduled entries in this timetable will be removed.`}
        confirmText={deleteLoading ? "Deleting..." : "Delete Timetable"}
        type="danger"
      />

      {/* Notification Toast */}
      {toast && (
        <div
          className={`${styles.toast} ${
            toast.type === "error" ? styles.toastError : styles.toastSuccess
          }`}
        >
          {toast.type === "error" ? <HiExclamationTriangle /> : <HiCheckCircle />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
