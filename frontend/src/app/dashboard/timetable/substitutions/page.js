"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import styles from "./substitutions.module.css";
import { useAuth } from "@/hooks/useAuth";
import substitutionService from "@/services/substitutionService";
import timetableService from "@/services/timetableService";
import teacherService from "@/services/teacherService";
import Modal from "@/components/common/Modal";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import {
  HiArrowsRightLeft,
  HiCalendarDays,
  HiAcademicCap,
  HiUserGroup,
  HiBuildingOffice,
  HiPlus,
  HiCheckCircle,
  HiXCircle,
  HiExclamationTriangle,
  HiClock,
} from "react-icons/hi2";

export default function SubstitutionsPage() {
  const { user } = useAuth();
  const isAdminOrStaff = ["school admin", "admin", "staff"].includes((user?.role || "").toLowerCase());

  const [substitutions, setSubstitutions] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [timetableEntries, setTimetableEntries] = useState([]);
  const [activeTimetable, setActiveTimetable] = useState(null);

  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Request Modal State
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [formData, setFormData] = useState({
    timetable_entry_id: "",
    substitute_teacher_id: "",
    substitution_date: new Date().toISOString().split("T")[0],
    reason: "",
    notes: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Action Target
  const [actionTarget, setActionTarget] = useState(null);
  const [actionType, setActionType] = useState(null); // 'approve' | 'reject' | 'cancel'
  const [actionLoading, setActionLoading] = useState(false);
  const [actionNotes, setActionNotes] = useState("");

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadMetadata = useCallback(async () => {
    try {
      const [tchRes, activeRes] = await Promise.all([
        teacherService.listTeachers({ limit: 100 }),
        timetableService.getActiveTimetable(),
      ]);

      setTeachers(tchRes.items || []);

      if (activeRes && activeRes.timetable) {
        setActiveTimetable(activeRes.timetable);
        const entriesRes = await timetableService.listTimetableEntries(activeRes.timetable.id);
        setTimetableEntries(entriesRes || []);
      }
    } catch (err) {
      console.warn("Could not load metadata:", err.message);
    }
  }, []);

  const loadSubstitutions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await substitutionService.listSubstitutions({
        status: statusFilter || undefined,
        date: dateFilter || undefined,
        limit: 100,
      });
      setSubstitutions(res.items || []);
    } catch (err) {
      showToast(err.message || "Failed to load substitutions", "error");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFilter]);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  useEffect(() => {
    loadSubstitutions();
  }, [loadSubstitutions]);

  const handleOpenRequestModal = () => {
    setFormData({
      timetable_entry_id: timetableEntries[0]?.id || "",
      substitute_teacher_id: teachers[0]?.id || "",
      substitution_date: new Date().toISOString().split("T")[0],
      reason: "",
      notes: "",
    });
    setFormErrors({});
    setIsRequestOpen(true);
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!formData.timetable_entry_id) errors.timetable_entry_id = "Lesson slot is required";
    if (!formData.substitute_teacher_id) errors.substitute_teacher_id = "Substitute teacher is required";
    if (!formData.substitution_date) errors.substitution_date = "Substitution date is required";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      await substitutionService.createSubstitution(formData);
      showToast("Substitute teacher requested successfully");
      setIsRequestOpen(false);
      loadSubstitutions();
    } catch (err) {
      showToast(err.message || "Failed to request substitution", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecuteAction = async () => {
    if (!actionTarget || !actionType) return;
    setActionLoading(true);
    try {
      if (actionType === "approve") {
        await substitutionService.approveSubstitution(actionTarget.id, { notes: actionNotes });
        showToast("Substitution request approved");
      } else if (actionType === "reject") {
        await substitutionService.rejectSubstitution(actionTarget.id, { notes: actionNotes });
        showToast("Substitution request rejected");
      } else if (actionType === "cancel") {
        await substitutionService.cancelSubstitution(actionTarget.id);
        showToast("Substitution request cancelled");
      }

      setActionTarget(null);
      setActionType(null);
      setActionNotes("");
      loadSubstitutions();
    } catch (err) {
      showToast(err.message || "Action failed", "error");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1>
            <HiArrowsRightLeft color="#4f46e5" /> Teacher Substitutions & Coverage
          </h1>
          <p>Manage absent teacher coverage, request substitute teachers, and track approval workflows.</p>
        </div>
        <button className={styles.primaryBtn} onClick={handleOpenRequestModal}>
          <HiPlus /> Request Substitution
        </button>
      </div>

      {/* Sub-Tabs */}
      <div className={styles.navTabs}>
        <Link href="/dashboard/timetable" className={styles.navTab}>
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
        <Link href="/dashboard/timetable/substitutions" className={`${styles.navTab} ${styles.navTabActive}`}>
          <HiArrowsRightLeft /> Substitutions
        </Link>
      </div>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <label>Status:</label>
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>Date:</label>
          <input
            type="date"
            className={styles.filterInput}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>Loading substitutions...</div>
      ) : substitutions.length === 0 ? (
        <div className={styles.emptyState}>
          <HiArrowsRightLeft style={{ fontSize: "3rem", color: "#94a3b8" }} />
          <h3 style={{ marginTop: "0.5rem" }}>No Substitution Requests Found</h3>
          <p style={{ color: "#64748b", fontSize: "0.9rem" }}>When a teacher is absent, request a qualified colleague to cover the lesson slot.</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Period & Time</th>
                <th>Class & Subject</th>
                <th>Absent Teacher</th>
                <th>Substitute Teacher</th>
                <th>Status</th>
                <th>Reason</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {substitutions.map((sub) => (
                <tr key={sub.id}>
                  <td>
                    <strong>{sub.substitution_date}</strong>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{sub.day_of_week}</div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{sub.period_name}</span>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                      {sub.start_time} - {sub.end_time}
                    </div>
                  </td>
                  <td>
                    <strong>Class {sub.section_name}</strong>
                    <div style={{ fontSize: "0.75rem", color: "#4f46e5" }}>{sub.subject_name}</div>
                  </td>
                  <td>{sub.original_teacher_name}</td>
                  <td>
                    <strong>{sub.substitute_teacher_name}</strong>
                  </td>
                  <td>
                    <span
                      className={
                        sub.status === "APPROVED"
                          ? styles.badgeApproved
                          : sub.status === "PENDING"
                          ? styles.badgePending
                          : sub.status === "REJECTED"
                          ? styles.badgeRejected
                          : styles.badgeCancelled
                      }
                    >
                      {sub.status}
                    </span>
                  </td>
                  <td style={{ fontSize: "0.85rem", color: "#475569" }}>{sub.reason || "—"}</td>
                  <td style={{ textAlign: "right" }}>
                    <div className={styles.actionBtnGroup}>
                      {sub.status === "PENDING" && isAdminOrStaff && (
                        <>
                          <button
                            className={`${styles.actionBtn} ${styles.actionBtnApprove}`}
                            onClick={() => {
                              setActionTarget(sub);
                              setActionType("approve");
                            }}
                          >
                            Approve
                          </button>
                          <button
                            className={`${styles.actionBtn} ${styles.actionBtnReject}`}
                            onClick={() => {
                              setActionTarget(sub);
                              setActionType("reject");
                            }}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {sub.status === "PENDING" && !isAdminOrStaff && (
                        <button
                          className={styles.actionBtn}
                          onClick={() => {
                            setActionTarget(sub);
                            setActionType("cancel");
                          }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Request Substitution Modal */}
      <Modal
        isOpen={isRequestOpen}
        onClose={() => setIsRequestOpen(false)}
        title="Request Substitute Teacher"
      >
        <form onSubmit={handleRequestSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Lesson to Cover *</label>
            <select
              value={formData.timetable_entry_id}
              onChange={(e) => setFormData({ ...formData, timetable_entry_id: e.target.value })}
              style={{ padding: "0.5rem", border: "1px solid #cbd5e1", borderRadius: "0.375rem" }}
            >
              <option value="">Select Scheduled Lesson</option>
              {timetableEntries.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.day_of_week} ({e.period_name}) — Class {e.section_name}: {e.subject_name} ({e.teacher_name})
                </option>
              ))}
            </select>
            {formErrors.timetable_entry_id && (
              <span style={{ color: "#ef4444", fontSize: "0.75rem" }}>{formErrors.timetable_entry_id}</span>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Substitution Date *</label>
              <input
                type="date"
                value={formData.substitution_date}
                onChange={(e) => setFormData({ ...formData, substitution_date: e.target.value })}
                style={{ padding: "0.5rem", border: "1px solid #cbd5e1", borderRadius: "0.375rem" }}
              />
              {formErrors.substitution_date && (
                <span style={{ color: "#ef4444", fontSize: "0.75rem" }}>{formErrors.substitution_date}</span>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Substitute Teacher *</label>
              <select
                value={formData.substitute_teacher_id}
                onChange={(e) => setFormData({ ...formData, substitute_teacher_id: e.target.value })}
                style={{ padding: "0.5rem", border: "1px solid #cbd5e1", borderRadius: "0.375rem" }}
              >
                <option value="">Select Substitute Teacher</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.first_name} {t.last_name} ({t.employee_number})
                  </option>
                ))}
              </select>
              {formErrors.substitute_teacher_id && (
                <span style={{ color: "#ef4444", fontSize: "0.75rem" }}>{formErrors.substitute_teacher_id}</span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Reason for Absence (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Medical leave, Emergency, Training"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              style={{ padding: "0.5rem", border: "1px solid #cbd5e1", borderRadius: "0.375rem" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
            <button
              type="button"
              style={{ padding: "0.55rem 1rem", border: "1px solid #cbd5e1", borderRadius: "0.375rem", background: "white" }}
              onClick={() => setIsRequestOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.primaryBtn}
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Action Dialog */}
      <Modal
        isOpen={Boolean(actionTarget)}
        onClose={() => setActionTarget(null)}
        title={`${actionType === "approve" ? "Approve" : actionType === "reject" ? "Reject" : "Cancel"} Substitution`}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <p style={{ fontSize: "0.9rem", color: "#475569" }}>
            Are you sure you want to {actionType} coverage for <strong>Class {actionTarget?.section_name}</strong> on <strong>{actionTarget?.substitution_date}</strong> by <strong>{actionTarget?.substitute_teacher_name}</strong>?
          </p>
          {(actionType === "approve" || actionType === "reject") && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Administrative Notes (Optional):</label>
              <input
                type="text"
                placeholder="e.g. Confirmed with department head"
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                style={{ padding: "0.5rem", border: "1px solid #cbd5e1", borderRadius: "0.375rem" }}
              />
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
            <button
              type="button"
              style={{ padding: "0.55rem 1rem", border: "1px solid #cbd5e1", borderRadius: "0.375rem", background: "white" }}
              onClick={() => setActionTarget(null)}
            >
              Back
            </button>
            <button
              type="button"
              className={styles.primaryBtn}
              style={{
                background: actionType === "approve" ? "#10b981" : actionType === "reject" ? "#ef4444" : "#64748b",
              }}
              onClick={handleExecuteAction}
              disabled={actionLoading}
            >
              {actionLoading ? "Processing..." : `Confirm ${actionType}`}
            </button>
          </div>
        </div>
      </Modal>

      {/* Toast */}
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
