"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import styles from "./occupancy.module.css";
import timetableService from "@/services/timetableService";
import roomService from "@/services/roomService";
import periodService from "@/services/periodService";
import {
  HiBuildingOffice,
  HiCalendarDays,
  HiAcademicCap,
  HiUserGroup,
  HiClock,
  HiCheckCircle,
  HiExclamationTriangle,
  HiChartPie,
} from "react-icons/hi2";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

export default function RoomOccupancyViewPage() {
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [selectedRoom, setSelectedRoom] = useState(null);

  const [timetable, setTimetable] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [entries, setEntries] = useState([]);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadRooms = useCallback(async () => {
    try {
      const res = await roomService.listRooms({ is_active: true, limit: 100 });
      const list = res.items || [];
      setRooms(list);

      if (list.length > 0 && !selectedRoomId) {
        setSelectedRoomId(list[0].id);
        setSelectedRoom(list[0]);
      }
    } catch (err) {
      console.warn("Could not load rooms:", err.message);
    }
  }, [selectedRoomId]);

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Get active timetable
      const activeData = await timetableService.getActiveTimetable();
      if (!activeData || !activeData.timetable) {
        setTimetable(null);
        setEntries([]);
        setLoading(false);
        return;
      }

      setTimetable(activeData.timetable);

      // 2. Get periods
      const prdData = await periodService.listPeriods({
        academicYearId: activeData.timetable.academic_year_id,
        is_active: true,
      });
      setPeriods(prdData || []);

      // 3. Load entries for selected room
      if (selectedRoomId) {
        const entData = await timetableService.listTimetableEntries(activeData.timetable.id, {
          room_id: selectedRoomId,
        });
        setEntries(entData || []);
      }
    } catch (err) {
      showToast(err.message || "Failed to load room occupancy schedule", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedRoomId]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    loadSchedule();
  }, [selectedRoomId, loadSchedule]);

  const handleRoomChange = (roomId) => {
    setSelectedRoomId(roomId);
    const rm = rooms.find((r) => r.id === roomId);
    setSelectedRoom(rm || null);
  };

  // Metrics
  const lessonPeriods = periods.filter((p) => !p.is_break);
  const totalSlots = lessonPeriods.length * DAYS.length;
  const occupiedSlots = entries.length;
  const vacantSlots = Math.max(0, totalSlots - occupiedSlots);
  const utilizationRate = totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1>
            <HiBuildingOffice color="#db2777" /> Room & Facility Occupancy
          </h1>
          <p>Inspect weekly room utilization, scheduled classes, and find vacant time slots across all school facilities.</p>
        </div>
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
        <Link href="/dashboard/timetable/rooms/occupancy" className={`${styles.navTab} ${styles.navTabActive}`}>
          <HiBuildingOffice /> Room Occupancy
        </Link>
      </div>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <label>Select Facility / Room:</label>
          <select
            className={styles.filterSelect}
            value={selectedRoomId}
            onChange={(e) => handleRoomChange(e.target.value)}
          >
            {rooms.map((rm) => (
              <option key={rm.id} value={rm.id}>
                {rm.name} ({rm.room_type} — {rm.capacity} seats)
              </option>
            ))}
          </select>
        </div>
        {selectedRoom && (
          <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
            Location: <strong>{selectedRoom.building || "Main Building"}</strong> • Floor: <strong>{selectedRoom.floor || "1st"}</strong> • Capacity: <strong>{selectedRoom.capacity} seats</strong>
          </div>
        )}
      </div>

      {/* Stats Bar */}
      <div className={styles.statsBar}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: "#fdf2f8", color: "#db2777" }}>
            <HiClock />
          </div>
          <div>
            <div className={styles.statLabel}>Occupied Slots</div>
            <div className={styles.statValue}>{occupiedSlots} periods</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: "#ecfdf5", color: "#16a34a" }}>
            <HiCheckCircle />
          </div>
          <div>
            <div className={styles.statLabel}>Vacant Slots</div>
            <div className={styles.statValue}>{vacantSlots} periods</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: "#eef2ff", color: "#4f46e5" }}>
            <HiChartPie />
          </div>
          <div>
            <div className={styles.statLabel}>Utilization Rate</div>
            <div className={styles.statValue}>{utilizationRate}%</div>
          </div>
        </div>
      </div>

      {/* Weekly Schedule Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>Loading room occupancy...</div>
      ) : !timetable ? (
        <div style={{ textAlign: "center", padding: "3rem", background: "white", borderRadius: "0.75rem", border: "1px dashed #cbd5e1" }}>
          <HiCalendarDays style={{ fontSize: "3rem", color: "#94a3b8" }} />
          <h3 style={{ marginTop: "0.5rem" }}>No Active Timetable Published</h3>
          <p style={{ color: "#64748b", fontSize: "0.9rem" }}>A master timetable must be published and active to view room occupancy.</p>
        </div>
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
                    <tr key={period.id} className={styles.breakRow}>
                      <td style={{ textAlign: "left", fontWeight: 700, paddingLeft: "0.85rem" }}>
                        {period.name} ({period.start_time} - {period.end_time})
                      </td>
                      <td colSpan={DAYS.length}>
                        ☕ RECESS / BREAK ({period.start_time} - {period.end_time})
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={period.id}>
                    <td style={{ background: "#f8fafc", fontWeight: 600, textAlign: "left", paddingLeft: "0.85rem" }}>
                      <div style={{ color: "#1e293b" }}>{period.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.15rem" }}>
                        {period.start_time} - {period.end_time}
                      </div>
                    </td>

                    {DAYS.map((day) => {
                      const entry = entries.find(
                        (e) => e.period_id === period.id && e.day_of_week === day
                      );

                      return (
                        <td key={day}>
                          {entry ? (
                            <div className={styles.occupancyCard}>
                              <div>
                                <div className={styles.occupancyClass}>
                                  👥 Class {entry.section_name}
                                </div>
                                <div className={styles.occupancySubject}>
                                  📖 {entry.subject_name}
                                </div>
                              </div>
                              <div className={styles.occupancyTeacher}>
                                👤 {entry.teacher_name}
                              </div>
                            </div>
                          ) : (
                            <div className={styles.vacantSlot}>✓ Vacant</div>
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
