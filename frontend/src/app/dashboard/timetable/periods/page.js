"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import styles from "./periods.module.css";
import periodService from "@/services/periodService";
import academicYearService from "@/services/academicYearService";
import Modal from "@/components/common/Modal";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import {
  HiClock,
  HiCalendarDays,
  HiBuildingOffice,
  HiUserGroup,
  HiPlus,
  HiPencilSquare,
  HiTrash,
  HiCheckCircle,
  HiExclamationTriangle,
} from "react-icons/hi2";

export default function PeriodsPage() {
  const [periods, setPeriods] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYearId, setSelectedYearId] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState(null);
  const [formData, setFormData] = useState({
    academic_year_id: "",
    name: "",
    period_type: "LESSON",
    start_time: "08:00",
    end_time: "08:45",
    period_order: 1,
    is_break: false,
  });
  const [formErrors, setFormErrors] = useState({});
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Delete Confirm
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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
        setFormData((prev) => ({ ...prev, academic_year_id: active.id }));
      } else if (years.length > 0) {
        setSelectedYearId(years[0].id);
        setFormData((prev) => ({ ...prev, academic_year_id: years[0].id }));
      }
    } catch (err) {
      console.warn("Could not load academic years:", err.message);
    }
  }, []);

  const loadPeriods = useCallback(async () => {
    if (!selectedYearId) return;
    setLoading(true);
    try {
      const res = await periodService.listPeriods({ academicYearId: selectedYearId });
      setPeriods(res || []);
    } catch (err) {
      showToast(err.message || "Failed to load periods", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedYearId]);

  useEffect(() => {
    loadAcademicYears();
  }, [loadAcademicYears]);

  useEffect(() => {
    if (selectedYearId) {
      loadPeriods();
    }
  }, [selectedYearId, loadPeriods]);

  const handleOpenAddModal = () => {
    setEditingPeriod(null);
    setFormData({
      academic_year_id: selectedYearId,
      name: `Period ${periods.length + 1}`,
      period_type: "LESSON",
      start_time: "08:00",
      end_time: "08:45",
      period_order: periods.length + 1,
      is_break: false,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (period) => {
    setEditingPeriod(period);
    setFormData({
      academic_year_id: period.academic_year_id,
      name: period.name,
      period_type: period.period_type || (period.is_break ? "BREAK" : "LESSON"),
      start_time: period.start_time,
      end_time: period.end_time,
      period_order: period.period_order,
      is_break: period.is_break,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!formData.name.trim()) errors.name = "Period name is required";
    if (!formData.start_time) errors.start_time = "Start time is required";
    if (!formData.end_time) errors.end_time = "End time is required";
    if (formData.start_time >= formData.end_time) {
      errors.end_time = "End time must be after start time";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormSubmitting(true);
    try {
      const payload = {
        ...formData,
        is_break: formData.period_type === "BREAK" || formData.is_break,
      };

      if (editingPeriod) {
        await periodService.updatePeriod(editingPeriod.id, payload);
        showToast("Bell period updated successfully");
      } else {
        await periodService.createPeriod(payload);
        showToast("Bell period created successfully");
      }
      setIsModalOpen(false);
      loadPeriods();
    } catch (err) {
      showToast(err.message || "Failed to save period", "error");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await periodService.deletePeriod(deleteTarget.id);
      showToast(`Period "${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      loadPeriods();
    } catch (err) {
      showToast(err.message || "Failed to delete period", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1>
            <HiClock color="#4f46e5" /> Bell Schedule & Periods
          </h1>
          <p>Configure daily lesson periods, recesses, lunch breaks, and exact timetable slots.</p>
        </div>
        <button className={styles.primaryBtn} onClick={handleOpenAddModal}>
          <HiPlus /> Add Bell Period
        </button>
      </div>

      {/* Sub-Tabs */}
      <div className={styles.navTabs}>
        <Link href="/dashboard/timetable" className={styles.navTab}>
          <HiCalendarDays /> Master Timetables
        </Link>
        <Link href="/dashboard/timetable/rooms" className={styles.navTab}>
          <HiBuildingOffice /> Rooms & Facilities
        </Link>
        <Link href="/dashboard/timetable/periods" className={`${styles.navTab} ${styles.navTabActive}`}>
          <HiClock /> Bell Schedule (Periods)
        </Link>
        <Link href="/dashboard/timetable/availability" className={styles.navTab}>
          <HiUserGroup /> Teacher Availability
        </Link>
      </div>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>Academic Year:</span>
        <select
          value={selectedYearId}
          onChange={(e) => setSelectedYearId(e.target.value)}
          style={{
            padding: "0.5rem 0.75rem",
            border: "1px solid #cbd5e1",
            borderRadius: "0.5rem",
            background: "#f8fafc",
            color: "#1e293b",
          }}
        >
          {academicYears.map((ay) => (
            <option key={ay.id} value={ay.id}>
              {ay.name} {ay.is_active ? "(Active Year)" : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Periods Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>Loading bell schedule...</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: "80px" }}>Order</th>
                <th>Period Name</th>
                <th>Period Type</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th>Break / Recess</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span className={styles.badgeOrder}>#{p.period_order}</span>
                  </td>
                  <td>
                    <strong>{p.name}</strong>
                  </td>
                  <td>
                    <span
                      className={
                        p.period_type === "BREAK" || p.is_break
                          ? styles.badgeBreak
                          : p.period_type === "ASSEMBLY"
                          ? styles.badgeAssembly
                          : styles.badgeLesson
                      }
                    >
                      {p.period_type || (p.is_break ? "BREAK" : "LESSON")}
                    </span>
                  </td>
                  <td>{p.start_time}</td>
                  <td>{p.end_time}</td>
                  <td>{p.is_break ? "☕ Yes (No Lessons)" : "—"}</td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className={styles.actionBtn}
                      title="Edit Period"
                      onClick={() => handleOpenEditModal(p)}
                    >
                      <HiPencilSquare />
                    </button>
                    <button
                      className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                      title="Delete Period"
                      onClick={() => setDeleteTarget(p)}
                    >
                      <HiTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPeriod ? "Edit Bell Period" : "Add Bell Period"}
      >
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Period Name *</label>
            <input
              type="text"
              placeholder="e.g. Period 1, Morning Break, Period 2"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{ padding: "0.5rem", border: "1px solid #cbd5e1", borderRadius: "0.375rem" }}
            />
            {formErrors.name && <span style={{ color: "#ef4444", fontSize: "0.75rem" }}>{formErrors.name}</span>}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Period Type</label>
              <select
                value={formData.period_type}
                onChange={(e) => {
                  const type = e.target.value;
                  setFormData({
                    ...formData,
                    period_type: type,
                    is_break: type === "BREAK",
                  });
                }}
                style={{ padding: "0.5rem", border: "1px solid #cbd5e1", borderRadius: "0.375rem" }}
              >
                <option value="LESSON">Lesson Period</option>
                <option value="BREAK">Recess / Break</option>
                <option value="ASSEMBLY">Morning Assembly</option>
                <option value="HOMEROOM">Homeroom / Form Time</option>
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Order Sequence #</label>
              <input
                type="number"
                min="1"
                value={formData.period_order}
                onChange={(e) => setFormData({ ...formData, period_order: Number(e.target.value) })}
                style={{ padding: "0.5rem", border: "1px solid #cbd5e1", borderRadius: "0.375rem" }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Start Time *</label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                style={{ padding: "0.5rem", border: "1px solid #cbd5e1", borderRadius: "0.375rem" }}
              />
              {formErrors.start_time && <span style={{ color: "#ef4444", fontSize: "0.75rem" }}>{formErrors.start_time}</span>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>End Time *</label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                style={{ padding: "0.5rem", border: "1px solid #cbd5e1", borderRadius: "0.375rem" }}
              />
              {formErrors.end_time && <span style={{ color: "#ef4444", fontSize: "0.75rem" }}>{formErrors.end_time}</span>}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
            <button
              type="button"
              style={{ padding: "0.55rem 1rem", border: "1px solid #cbd5e1", borderRadius: "0.375rem", background: "white" }}
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.primaryBtn}
              disabled={formSubmitting}
            >
              {formSubmitting ? "Saving..." : editingPeriod ? "Update Period" : "Create Period"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Bell Period"
        message={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        confirmText={deleteLoading ? "Deleting..." : "Delete Period"}
        type="danger"
      />

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
