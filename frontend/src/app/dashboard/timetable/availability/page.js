"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import styles from "./availability.module.css";
import teacherService from "@/services/teacherService";
import academicYearService from "@/services/academicYearService";
import periodService from "@/services/periodService";
import teacherAvailabilityService from "@/services/teacherAvailabilityService";
import Modal from "@/components/common/Modal";
import {
  HiUserGroup,
  HiCalendarDays,
  HiBuildingOffice,
  HiClock,
  HiCheckCircle,
  HiExclamationTriangle,
  HiCheck,
  HiXMark,
} from "react-icons/hi2";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

export default function TeacherAvailabilityPage() {
  const [teachers, setTeachers] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [periods, setPeriods] = useState([]);

  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedYearId, setSelectedYearId] = useState("");

  // Map: `${day_of_week}:${period_id}` -> { is_available: boolean, reason: string }
  const [availabilityMap, setAvailabilityMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Edit slot reason modal
  const [editingSlot, setEditingSlot] = useState(null);
  const [slotReason, setSlotReason] = useState("");

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadMetadata = useCallback(async () => {
    try {
      const [tchRes, ayRes] = await Promise.all([
        teacherService.listTeachers({ limit: 100 }),
        academicYearService.listAcademicYears({ limit: 100 }),
      ]);

      const tchList = tchRes.items || [];
      const ayList = ayRes.items || [];
      setTeachers(tchList);
      setAcademicYears(ayList);

      if (tchList.length > 0) setSelectedTeacherId(tchList[0].id);

      const active = ayList.find((y) => y.is_active);
      if (active) setSelectedYearId(active.id);
      else if (ayList.length > 0) setSelectedYearId(ayList[0].id);
    } catch (err) {
      console.warn("Error loading metadata:", err.message);
    }
  }, []);

  const loadPeriodsAndAvailability = useCallback(async () => {
    if (!selectedTeacherId || !selectedYearId) return;
    setLoading(true);
    try {
      const [prdData, availData] = await Promise.all([
        periodService.listPeriods({ academicYearId: selectedYearId }),
        teacherAvailabilityService.getTeacherAvailability(selectedTeacherId, selectedYearId),
      ]);

      setPeriods(prdData || []);

      const map = {};
      (availData || []).forEach((item) => {
        map[`${item.day_of_week}:${item.period_id}`] = {
          is_available: item.is_available,
          reason: item.reason || "",
        };
      });
      setAvailabilityMap(map);
    } catch (err) {
      showToast(err.message || "Failed to load availability data", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedTeacherId, selectedYearId]);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  useEffect(() => {
    loadPeriodsAndAvailability();
  }, [selectedTeacherId, selectedYearId, loadPeriodsAndAvailability]);

  const toggleSlot = (day, periodId) => {
    const key = `${day}:${periodId}`;
    const current = availabilityMap[key];
    const isCurrentlyAvailable = current ? current.is_available : true;

    if (isCurrentlyAvailable) {
      // Toggle to unavailable -> open reason dialog
      setEditingSlot({ day, periodId, key });
      setSlotReason(current?.reason || "");
    } else {
      // Toggle back to available
      setAvailabilityMap((prev) => ({
        ...prev,
        [key]: { is_available: true, reason: "" },
      }));
    }
  };

  const handleSaveSlotReason = () => {
    if (!editingSlot) return;
    setAvailabilityMap((prev) => ({
      ...prev,
      [editingSlot.key]: { is_available: false, reason: slotReason.trim() },
    }));
    setEditingSlot(null);
    setSlotReason("");
  };

  const handleSaveAllAvailability = async () => {
    if (!selectedTeacherId || !selectedYearId) return;
    setSaving(true);
    try {
      const slots = [];
      Object.entries(availabilityMap).forEach(([key, val]) => {
        const [day_of_week, period_id] = key.split(":");
        slots.push({
          day_of_week,
          period_id,
          is_available: val.is_available,
          reason: val.reason || null,
        });
      });

      await teacherAvailabilityService.updateTeacherAvailability({
        teacherId: selectedTeacherId,
        academicYearId: selectedYearId,
        slots,
      });

      showToast("Teacher availability matrix saved successfully");
    } catch (err) {
      showToast(err.message || "Failed to save availability", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1>
            <HiUserGroup color="#4f46e5" /> Teacher Availability Matrix
          </h1>
          <p>Define weekly teaching availability constraints, leaves, and time-off rules for teachers.</p>
        </div>
        <button
          className={styles.primaryBtn}
          onClick={handleSaveAllAvailability}
          disabled={saving}
        >
          {saving ? "Saving Matrix..." : "Save Availability Matrix"}
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
        <Link href="/dashboard/timetable/periods" className={styles.navTab}>
          <HiClock /> Bell Schedule (Periods)
        </Link>
        <Link href="/dashboard/timetable/availability" className={`${styles.navTab} ${styles.navTabActive}`}>
          <HiUserGroup /> Teacher Availability
        </Link>
      </div>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <label>Select Teacher:</label>
          <select
            className={styles.filterSelect}
            value={selectedTeacherId}
            onChange={(e) => setSelectedTeacherId(e.target.value)}
          >
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.first_name} {t.last_name} ({t.employee_number})
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>Academic Year:</label>
          <select
            className={styles.filterSelect}
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

        <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
          💡 Click any cell to toggle between <strong>Available (Green)</strong> and <strong>Unavailable (Red)</strong>.
        </div>
      </div>

      {/* Interactive Matrix */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>Loading availability matrix...</div>
      ) : (
        <div className={styles.gridWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.periodHeader}>Period / Time</th>
                {DAYS.map((day) => (
                  <th key={day}>{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map((period) => {
                if (period.is_break) {
                  return (
                    <tr key={period.id}>
                      <td style={{ background: "#fef3c7", fontWeight: 700, textAlign: "left" }}>
                        {period.name} ({period.start_time} - {period.end_time})
                      </td>
                      <td colSpan={DAYS.length} className={styles.breakRow}>
                        ☕ RECESS / BREAK (No teaching slots)
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={period.id}>
                    <td style={{ background: "#f8fafc", fontWeight: 600, textAlign: "left" }}>
                      {period.name}
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                        {period.start_time} - {period.end_time}
                      </div>
                    </td>

                    {DAYS.map((day) => {
                      const key = `${day}:${period.id}`;
                      const slot = availabilityMap[key];
                      const isAvailable = slot ? slot.is_available : true;

                      return (
                        <td key={day}>
                          <div
                            className={isAvailable ? styles.cellAvailable : styles.cellUnavailable}
                            onClick={() => toggleSlot(day, period.id)}
                          >
                            {isAvailable ? (
                              <>
                                <HiCheck style={{ fontSize: "1.1rem" }} />
                                <span>Available</span>
                              </>
                            ) : (
                              <>
                                <HiXMark style={{ fontSize: "1.1rem" }} />
                                <span>Unavailable</span>
                                {slot?.reason && (
                                  <span className={styles.reasonText} title={slot.reason}>
                                    {slot.reason}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
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

      {/* Reason Dialog Modal */}
      <Modal
        isOpen={Boolean(editingSlot)}
        onClose={() => setEditingSlot(null)}
        title="Set Unavailability Reason"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <p style={{ fontSize: "0.9rem", color: "#475569" }}>
            Marking teacher unavailable on <strong>{editingSlot?.day}</strong> during period.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Reason (Optional):</label>
            <input
              type="text"
              placeholder="e.g. Department Meeting, Admin Duty, Part-Time"
              value={slotReason}
              onChange={(e) => setSlotReason(e.target.value)}
              style={{ padding: "0.5rem", border: "1px solid #cbd5e1", borderRadius: "0.375rem" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
            <button
              type="button"
              style={{ padding: "0.55rem 1rem", border: "1px solid #cbd5e1", borderRadius: "0.375rem", background: "white" }}
              onClick={() => setEditingSlot(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={handleSaveSlotReason}
            >
              Set Unavailable
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
