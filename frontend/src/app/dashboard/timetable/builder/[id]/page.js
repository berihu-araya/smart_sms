"use client";

import { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import styles from "./builder.module.css";
import timetableService from "@/services/timetableService";
import periodService from "@/services/periodService";
import sectionService from "@/services/sectionService";
import subjectService from "@/services/subjectService";
import teacherService from "@/services/teacherService";
import roomService from "@/services/roomService";
import Modal from "@/components/common/Modal";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import {
  HiArrowLeft,
  HiPlus,
  HiShieldCheck,
  HiCheckCircle,
  HiExclamationTriangle,
  HiPencilSquare,
  HiTrash,
  HiClock,
  HiBuildingOffice,
  HiAcademicCap,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiSparkles,
  HiArrowPath,
} from "react-icons/hi2";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

export default function TimetableBuilderPage({ params }) {
  const resolvedParams = use(params);
  const timetableId = resolvedParams.id;

  const [timetable, setTimetable] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [entries, setEntries] = useState([]);

  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Auto-Generate Timetable State
  const [isAutoGenModalOpen, setIsAutoGenModalOpen] = useState(false);
  const [autoGenOptions, setAutoGenOptions] = useState({
    clearExisting: true,
    enforceAvailability: true,
    matchRoomTypes: true,
  });
  const [autoGenLoading, setAutoGenLoading] = useState(false);
  const [autoGenReport, setAutoGenReport] = useState(null);

  // Add / Edit Entry Modal
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [entryForm, setEntryForm] = useState({
    section_id: "",
    subject_id: "",
    teacher_id: "",
    room_id: "",
    period_id: "",
    day_of_week: "MONDAY",
  });
  const [formErrors, setFormErrors] = useState({});
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Pre-flight conflict state
  const [preflightConflict, setPreflightConflict] = useState(null);
  const [preflightChecking, setPreflightChecking] = useState(false);

  // Delete entry confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Validation report modal
  const [validationReport, setValidationReport] = useState(null);
  const [validationLoading, setValidationLoading] = useState(false);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load Initial Metadata
  const loadTimetableData = useCallback(async () => {
    setLoading(true);
    try {
      const [ttData, secData, subData, tchData, rmData] = await Promise.all([
        timetableService.getTimetableById(timetableId),
        sectionService.listSections({ status: "active", limit: 100 }),
        subjectService.listSubjects({ status: "ACTIVE", limit: 100 }),
        teacherService.listTeachers({ limit: 100 }),
        roomService.listRooms({ is_active: true, limit: 100 }),
      ]);

      setTimetable(ttData);
      setSections(secData.items || []);
      setSubjects(subData.items || []);
      setTeachers(tchData.items || []);
      setRooms(rmData.items || []);

      if (secData.items && secData.items.length > 0 && !selectedSectionId) {
        setSelectedSectionId(secData.items[0].id);
      }

      // Load periods for this timetable's academic year
      const prdData = await periodService.listPeriods({
        academicYearId: ttData.academic_year_id,
        is_active: true,
      });
      setPeriods(prdData || []);

      // Load all timetable entries
      const entData = await timetableService.listTimetableEntries(timetableId);
      setEntries(entData || []);
    } catch (err) {
      showToast(err.message || "Failed to load timetable builder data", "error");
    } finally {
      setLoading(false);
    }
  }, [timetableId, selectedSectionId]);

  useEffect(() => {
    loadTimetableData();
  }, [loadTimetableData]);

  // Pre-flight conflict check runner
  const runPreflightCheck = useCallback(
    async (formState, excludeId = null) => {
      if (
        !formState.section_id ||
        !formState.teacher_id ||
        !formState.period_id ||
        !formState.day_of_week
      ) {
        setPreflightConflict(null);
        return;
      }

      setPreflightChecking(true);
      try {
        const result = await timetableService.checkEntryConflict(timetableId, {
          section_id: formState.section_id,
          teacher_id: formState.teacher_id,
          room_id: formState.room_id || null,
          period_id: formState.period_id,
          day_of_week: formState.day_of_week,
          exclude_entry_id: excludeId,
        });
        setPreflightConflict(result);
      } catch (err) {
        console.warn("Pre-flight check error:", err.message);
      } finally {
        setPreflightChecking(false);
      }
    },
    [timetableId]
  );

  const handleOpenAddModal = (day = "MONDAY", periodId = "") => {
    setEditingEntry(null);
    const initialForm = {
      section_id: selectedSectionId || (sections[0]?.id ?? ""),
      subject_id: subjects[0]?.id ?? "",
      teacher_id: teachers[0]?.id ?? "",
      room_id: "",
      period_id: periodId || (periods[0]?.id ?? ""),
      day_of_week: day,
    };
    setEntryForm(initialForm);
    setFormErrors({});
    setPreflightConflict(null);
    setIsEntryModalOpen(true);
    runPreflightCheck(initialForm);
  };

  const handleOpenEditModal = (entry) => {
    setEditingEntry(entry);
    const formValues = {
      section_id: entry.section_id,
      subject_id: entry.subject_id,
      teacher_id: entry.teacher_id,
      room_id: entry.room_id || "",
      period_id: entry.period_id,
      day_of_week: entry.day_of_week,
    };
    setEntryForm(formValues);
    setFormErrors({});
    setPreflightConflict(null);
    setIsEntryModalOpen(true);
    runPreflightCheck(formValues, entry.id);
  };

  const handleFormChange = (field, value) => {
    const updated = { ...entryForm, [field]: value };
    setEntryForm(updated);
    runPreflightCheck(updated, editingEntry?.id);
  };

  const handleEntrySubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!entryForm.section_id) errors.section_id = "Section is required";
    if (!entryForm.subject_id) errors.subject_id = "Subject is required";
    if (!entryForm.teacher_id) errors.teacher_id = "Teacher is required";
    if (!entryForm.period_id) errors.period_id = "Period is required";
    if (!entryForm.day_of_week) errors.day_of_week = "Day of week is required";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (preflightConflict?.hasConflict) {
      showToast("Cannot save: Critical conflict detected", "error");
      return;
    }

    setFormSubmitting(true);
    try {
      if (editingEntry) {
        await timetableService.updateTimetableEntry(editingEntry.id, entryForm);
        showToast("Lesson updated successfully");
      } else {
        await timetableService.createTimetableEntry(timetableId, entryForm);
        showToast("Lesson scheduled successfully");
      }
      setIsEntryModalOpen(false);
      // Refresh entries
      const entData = await timetableService.listTimetableEntries(timetableId);
      setEntries(entData || []);
    } catch (err) {
      showToast(err.message || "Failed to save lesson", "error");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteEntryConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await timetableService.deleteTimetableEntry(deleteTarget.id);
      showToast("Lesson removed from schedule");
      setDeleteTarget(null);
      const entData = await timetableService.listTimetableEntries(timetableId);
      setEntries(entData || []);
    } catch (err) {
      showToast(err.message || "Failed to delete lesson", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRunValidation = async () => {
    setValidationLoading(true);
    try {
      const report = await timetableService.validateTimetable(timetableId);
      setValidationReport(report);
    } catch (err) {
      showToast(err.message || "Validation failed", "error");
    } finally {
      setValidationLoading(false);
    }
  };

  const handlePublishTimetable = async () => {
    try {
      const report = await timetableService.validateTimetable(timetableId);
      if (report.hasConflict) {
        setValidationReport(report);
        showToast("Cannot publish: Timetable has blocking conflicts", "error");
        return;
      }

      await timetableService.updateTimetable(timetableId, {
        status: "PUBLISHED",
        is_active: true,
      });
      showToast("Timetable successfully published and set active!");
      loadTimetableData();
    } catch (err) {
      showToast(err.message || "Failed to publish timetable", "error");
    }
  };

  const handleExecuteAutoGen = async () => {
    setAutoGenLoading(true);
    setAutoGenReport(null);
    try {
      const result = await timetableService.autoGenerateTimetable(timetableId, autoGenOptions);
      setAutoGenReport(result);
      showToast(
        `Auto-generation completed: ${result.totalLessonsPlaced}/${result.totalLessonsRequired} lessons scheduled (${result.coveragePercentage}% coverage)!`
      );
      await loadTimetableData();
    } catch (err) {
      showToast(err.message || "Failed to auto-generate timetable", "error");
    } finally {
      setAutoGenLoading(false);
    }
  };

  // Filter entries for currently selected section
  const sectionEntries = entries.filter((e) => e.section_id === selectedSectionId);

  return (
    <div className={styles.container}>
      {/* Top Header Bar */}
      <div className={styles.topBar}>
        <div className={styles.titleArea}>
          <Link href="/dashboard/timetable" className={styles.backBtn}>
            <HiArrowLeft /> All Timetables
          </Link>
          <div className={styles.titleText}>
            <h1>{timetable?.name || "Interactive Schedule Builder"}</h1>
            <p>
              {timetable?.academic_year_name} • {timetable?.term} (Version {timetable?.version}) • Status:{" "}
              <strong>{timetable?.status}</strong>
            </p>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.autoGenerateBtn}
            onClick={() => setIsAutoGenModalOpen(true)}
            title="Automatically generate conflict-free schedule using CSP Solver"
          >
            <HiSparkles /> Auto-Generate
          </button>
          <button className={styles.validateBtn} onClick={handleRunValidation}>
            <HiShieldCheck /> Validate Schedule
          </button>
          {timetable?.status !== "PUBLISHED" && (
            <button className={styles.publishBtn} onClick={handlePublishTimetable}>
              <HiCheckCircle /> Publish Timetable
            </button>
          )}
          <button
            className={styles.primaryBtn}
            onClick={() => handleOpenAddModal("MONDAY", periods[0]?.id)}
          >
            <HiPlus /> Add Lesson
          </button>
        </div>
      </div>

      {/* Filter Strip */}
      <div className={styles.filterStrip}>
        <div className={styles.filterItem}>
          <label>Viewing Section / Class:</label>
          <select
            className={styles.filterSelect}
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value)}
          >
            {sections.map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.name} {sec.grade_name ? `(${sec.grade_name})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
          Showing <strong>{sectionEntries.length}</strong> scheduled lessons for selected class.
        </div>
      </div>

      {/* Weekly Matrix Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>
          Loading interactive timetable grid...
        </div>
      ) : (
        <div className={styles.gridWrapper}>
          <table className={styles.timetableTable}>
            <thead>
              <tr>
                <th className={styles.periodColHeader}>Period / Time</th>
                {DAYS.map((day) => (
                  <th key={day}>{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map((period) => {
                if (period.is_break) {
                  return (
                    <tr key={period.id} className={styles.breakRow}>
                      <td className={styles.periodHeaderCell}>
                        <div className={styles.periodName}>{period.name}</div>
                        <div className={styles.periodTime}>
                          {period.start_time} - {period.end_time}
                        </div>
                      </td>
                      <td colSpan={DAYS.length}>
                        ☕ RECESS / {period.name.toUpperCase()} ({period.start_time} - {period.end_time})
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={period.id}>
                    <td className={styles.periodHeaderCell}>
                      <div className={styles.periodName}>
                        <HiClock style={{ color: "#6366f1" }} /> {period.name}
                      </div>
                      <div className={styles.periodTime}>
                        {period.start_time} - {period.end_time}
                      </div>
                    </td>

                    {DAYS.map((day) => {
                      const entry = sectionEntries.find(
                        (e) => e.period_id === period.id && e.day_of_week === day
                      );

                      return (
                        <td key={day}>
                          {entry ? (
                            <div className={styles.lessonCard}>
                              <div>
                                <div className={styles.lessonSubject}>
                                  <HiAcademicCap color="#4f46e5" />
                                  {entry.subject_name}
                                </div>
                                <div className={styles.lessonTeacher}>
                                  👤 {entry.teacher_name}
                                </div>
                                {entry.room_name && (
                                  <div className={styles.lessonRoom}>
                                    🏫 {entry.room_name}
                                  </div>
                                )}
                              </div>

                              <div className={styles.lessonActions}>
                                <button
                                  className={styles.miniBtn}
                                  title="Edit Lesson"
                                  onClick={() => handleOpenEditModal(entry)}
                                >
                                  <HiPencilSquare />
                                </button>
                                <button
                                  className={`${styles.miniBtn} ${styles.miniBtnDanger}`}
                                  title="Delete Lesson"
                                  onClick={() => setDeleteTarget(entry)}
                                >
                                  <HiTrash />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className={styles.emptyCellWrap}>
                              <button
                                className={styles.addSlotBtn}
                                onClick={() => handleOpenAddModal(day, period.id)}
                              >
                                <HiPlus /> Assign
                              </button>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Lesson Modal */}
      <Modal
        isOpen={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        title={editingEntry ? "Edit Scheduled Lesson" : "Schedule New Lesson"}
      >
        <form onSubmit={handleEntrySubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Pre-flight Conflict Warning Banner */}
          {preflightChecking ? (
            <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Checking slot availability...</div>
          ) : preflightConflict ? (
            preflightConflict.hasConflict ? (
              <div className={`${styles.conflictBanner} ${styles.conflictBannerError}`}>
                <HiExclamationTriangle style={{ fontSize: "1.2rem", flexShrink: 0 }} />
                <div>
                  <strong>Blocking Conflict Detected:</strong>
                  {preflightConflict.conflicts
                    .filter((c) => c.severity === "BLOCK")
                    .map((c, i) => (
                      <div key={i} style={{ fontSize: "0.8rem", marginTop: "0.2rem" }}>
                        • {c.message}
                      </div>
                    ))}
                </div>
              </div>
            ) : preflightConflict.hasWarnings ? (
              <div className={`${styles.conflictBanner} ${styles.conflictBannerWarning}`}>
                <HiExclamationTriangle style={{ fontSize: "1.2rem", flexShrink: 0 }} />
                <div>
                  <strong>Schedule Warning:</strong>
                  {preflightConflict.conflicts
                    .filter((c) => c.severity === "WARNING")
                    .map((c, i) => (
                      <div key={i} style={{ fontSize: "0.8rem", marginTop: "0.2rem" }}>
                        • {c.message}
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div className={`${styles.conflictBanner} ${styles.conflictBannerSuccess}`}>
                <HiCheckCircle style={{ fontSize: "1.2rem", flexShrink: 0 }} />
                <span>Slot is available with zero conflicts.</span>
              </div>
            )
          ) : null}

          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label>Section / Class *</label>
              <select
                value={entryForm.section_id}
                onChange={(e) => handleFormChange("section_id", e.target.value)}
              >
                <option value="">Select Section</option>
                {sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name} {sec.grade_name ? `(${sec.grade_name})` : ""}
                  </option>
                ))}
              </select>
              {formErrors.section_id && <span style={{ color: "#ef4444", fontSize: "0.75rem" }}>{formErrors.section_id}</span>}
            </div>

            <div className={styles.formField}>
              <label>Subject *</label>
              <select
                value={entryForm.subject_id}
                onChange={(e) => handleFormChange("subject_id", e.target.value)}
              >
                <option value="">Select Subject</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.subject_name} ({sub.subject_code})
                  </option>
                ))}
              </select>
              {formErrors.subject_id && <span style={{ color: "#ef4444", fontSize: "0.75rem" }}>{formErrors.subject_id}</span>}
            </div>

            <div className={styles.formField}>
              <label>Teacher *</label>
              <select
                value={entryForm.teacher_id}
                onChange={(e) => handleFormChange("teacher_id", e.target.value)}
              >
                <option value="">Select Teacher</option>
                {teachers.map((tch) => (
                  <option key={tch.id} value={tch.id}>
                    {tch.first_name} {tch.last_name} ({tch.employee_number})
                  </option>
                ))}
              </select>
              {formErrors.teacher_id && <span style={{ color: "#ef4444", fontSize: "0.75rem" }}>{formErrors.teacher_id}</span>}
            </div>

            <div className={styles.formField}>
              <label>Room / Facility (Optional)</label>
              <select
                value={entryForm.room_id}
                onChange={(e) => handleFormChange("room_id", e.target.value)}
              >
                <option value="">No Room Assigned</option>
                {rooms.map((rm) => (
                  <option key={rm.id} value={rm.id}>
                    {rm.name} ({rm.room_type} - {rm.capacity} seats)
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formField}>
              <label>Day of Week *</label>
              <select
                value={entryForm.day_of_week}
                onChange={(e) => handleFormChange("day_of_week", e.target.value)}
              >
                {DAYS.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formField}>
              <label>Period *</label>
              <select
                value={entryForm.period_id}
                onChange={(e) => handleFormChange("period_id", e.target.value)}
              >
                <option value="">Select Period</option>
                {periods
                  .filter((p) => !p.is_break)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.start_time} - {p.end_time})
                    </option>
                  ))}
              </select>
              {formErrors.period_id && <span style={{ color: "#ef4444", fontSize: "0.75rem" }}>{formErrors.period_id}</span>}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => setIsEntryModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.primaryBtn}
              disabled={formSubmitting || preflightConflict?.hasConflict}
            >
              {formSubmitting ? "Saving..." : editingEntry ? "Update Lesson" : "Schedule Lesson"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Auto-Generate Timetable Modal */}
      <Modal
        isOpen={isAutoGenModalOpen}
        onClose={() => {
          setIsAutoGenModalOpen(false);
          setAutoGenReport(null);
        }}
        title="Auto-Generate Conflict-Free Schedule"
      >
        {!autoGenReport ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div
              style={{
                padding: "0.85rem 1rem",
                borderRadius: "0.5rem",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                fontSize: "0.875rem",
                color: "#166534",
                lineHeight: 1.5,
              }}
            >
              The intelligent Constraint-Satisfaction (CSP) solver distributes curriculum requirements across available teachers, class sections, and specialized classrooms while preventing double-bookings.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: "0.65rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  style={{ marginTop: "0.25rem", width: "16px", height: "16px", accentColor: "#4f46e5" }}
                  checked={autoGenOptions.clearExisting}
                  onChange={(e) =>
                    setAutoGenOptions((prev) => ({ ...prev, clearExisting: e.target.checked }))
                  }
                />
                <div>
                  <strong style={{ fontSize: "0.9rem", color: "#1e293b" }}>Clear Existing Lessons</strong>
                  <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                    Wipes existing draft timetable entries and generates a fresh schedule from scratch.
                  </div>
                </div>
              </label>

              <label style={{ display: "flex", alignItems: "flex-start", gap: "0.65rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  style={{ marginTop: "0.25rem", width: "16px", height: "16px", accentColor: "#4f46e5" }}
                  checked={autoGenOptions.enforceAvailability}
                  onChange={(e) =>
                    setAutoGenOptions((prev) => ({ ...prev, enforceAvailability: e.target.checked }))
                  }
                />
                <div>
                  <strong style={{ fontSize: "0.9rem", color: "#1e293b" }}>Respect Teacher Availability</strong>
                  <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                    Prevents placing lessons in time periods where a teacher is marked unavailable.
                  </div>
                </div>
              </label>

              <label style={{ display: "flex", alignItems: "flex-start", gap: "0.65rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  style={{ marginTop: "0.25rem", width: "16px", height: "16px", accentColor: "#4f46e5" }}
                  checked={autoGenOptions.matchRoomTypes}
                  onChange={(e) =>
                    setAutoGenOptions((prev) => ({ ...prev, matchRoomTypes: e.target.checked }))
                  }
                />
                <div>
                  <strong style={{ fontSize: "0.9rem", color: "#1e293b" }}>Match Specialized Room Types</strong>
                  <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                    Allocates Science Labs, Computer Labs, or Art Rooms to subjects that require them.
                  </div>
                </div>
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
              <button
                type="button"
                className={styles.backBtn}
                onClick={() => setIsAutoGenModalOpen(false)}
                disabled={autoGenLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.autoGenerateBtn}
                onClick={handleExecuteAutoGen}
                disabled={autoGenLoading}
              >
                {autoGenLoading ? (
                  <>
                    <HiArrowPath className={styles.spinIcon} /> Solving Constraints...
                  </>
                ) : (
                  <>
                    <HiSparkles /> Run Auto-Generator
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div
              style={{
                padding: "1rem",
                borderRadius: "0.5rem",
                background: autoGenReport.coveragePercentage === 100 ? "#ecfdf5" : "#fffbeb",
                border: `1px solid ${autoGenReport.coveragePercentage === 100 ? "#6ee7b7" : "#fcd34d"}`,
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              {autoGenReport.coveragePercentage === 100 ? (
                <HiCheckCircle color="#059669" style={{ fontSize: "2rem", flexShrink: 0 }} />
              ) : (
                <HiExclamationTriangle color="#d97706" style={{ fontSize: "2rem", flexShrink: 0 }} />
              )}
              <div>
                <strong style={{ color: autoGenReport.coveragePercentage === 100 ? "#065f46" : "#92400e", fontSize: "1rem" }}>
                  {autoGenReport.coveragePercentage === 100
                    ? "100% Curriculum Scheduled Successfully"
                    : `Partial Schedule Generated (${autoGenReport.coveragePercentage}% Coverage)`}
                </strong>
                <div style={{ fontSize: "0.85rem", color: "#475569" }}>
                  Successfully placed <strong>{autoGenReport.totalLessonsPlaced}</strong> of{" "}
                  <strong>{autoGenReport.totalLessonsRequired}</strong> required curriculum lessons.
                </div>
              </div>
            </div>

            {/* Unscheduled details if any */}
            {autoGenReport.unscheduledLessons && autoGenReport.unscheduledLessons.length > 0 && (
              <div>
                <h4 style={{ fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.5rem", color: "#b91c1c" }}>
                  Unscheduled Lessons ({autoGenReport.unscheduledLessons.length}):
                </h4>
                <div style={{ maxHeight: "200px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {autoGenReport.unscheduledLessons.map((u, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "0.5rem 0.75rem",
                        borderRadius: "0.375rem",
                        background: "#fef2f2",
                        borderLeft: "3px solid #ef4444",
                        fontSize: "0.8rem",
                        color: "#334155",
                      }}
                    >
                      <strong>{u.section}</strong> — {u.subject}: {u.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => {
                  setIsAutoGenModalOpen(false);
                  setAutoGenReport(null);
                }}
              >
                Done & View Timetable
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Entry Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteEntryConfirm}
        title="Remove Scheduled Lesson"
        message={`Are you sure you want to remove ${deleteTarget?.subject_name} (${deleteTarget?.teacher_name}) on ${deleteTarget?.day_of_week}?`}
        confirmText={deleteLoading ? "Removing..." : "Remove Lesson"}
        type="danger"
      />

      {/* Validation Report Modal */}
      <Modal
        isOpen={Boolean(validationReport)}
        onClose={() => setValidationReport(null)}
        title="Comprehensive Timetable Validation Report"
      >
        {validationReport && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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
                    : "Schedule is Clean & Valid for Publishing"}
                </strong>
                <div style={{ fontSize: "0.85rem", color: "#475569" }}>
                  {validationReport.summary.totalErrors} blocking error(s), {validationReport.summary.totalWarnings} warning(s) across {validationReport.summary.totalEntries} scheduled lesson(s).
                </div>
              </div>
            </div>

            {/* List of issues */}
            {validationReport.conflicts.length > 0 && (
              <div>
                <h4 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.5rem", color: "#1e293b" }}>
                  Detailed Diagnostic Findings:
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
        )}
      </Modal>

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
