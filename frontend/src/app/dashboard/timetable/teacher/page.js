"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import styles from "./teacher.module.css";
import { useAuth } from "@/hooks/useAuth";
import timetableService from "@/services/timetableService";
import teacherService from "@/services/teacherService";
import periodService from "@/services/periodService";
import { exportToCSV } from "@/utils/csvExport";
import {
  HiUserGroup,
  HiCalendarDays,
  HiBuildingOffice,
  HiClock,
  HiAcademicCap,
  HiCheckCircle,
  HiExclamationTriangle,
  HiBookOpen,
  HiPrinter,
  HiArrowDownTray,
  HiArrowsRightLeft,
  HiDocumentChartBar,
} from "react-icons/hi2";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

export default function TeacherTimetableViewPage() {
  const { user } = useAuth();
  const isTeacherRole = (user?.role || "").toLowerCase() === "teacher";

  const [teachers, setTeachers] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  const [timetable, setTimetable] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [entries, setEntries] = useState([]);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load teacher list for admin switcher
  const loadTeachersList = useCallback(async () => {
    try {
      const res = await teacherService.listTeachers({ limit: 100 });
      const list = res.items || [];
      setTeachers(list);

      if (!isTeacherRole && list.length > 0 && !selectedTeacherId) {
        setSelectedTeacherId(list[0].id);
        setSelectedTeacher(list[0]);
      }
    } catch (err) {
      console.warn("Could not load teachers list:", err.message);
    }
  }, [isTeacherRole, selectedTeacherId]);

  // Load schedule
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

      // 3. Resolve teacher ID
      let targetTeacherId = selectedTeacherId;
      if (isTeacherRole) {
        const myData = await timetableService.getMySchedule();
        if (myData && myData.teacher) {
          targetTeacherId = myData.teacher.id;
          setSelectedTeacherId(myData.teacher.id);
          setSelectedTeacher(myData.teacher);
          setEntries(myData.entries || []);
          setLoading(false);
          return;
        }
      }

      // If admin selected a teacher
      if (targetTeacherId) {
        const entData = await timetableService.listTimetableEntries(activeData.timetable.id, {
          teacher_id: targetTeacherId,
        });
        setEntries(entData || []);
      }
    } catch (err) {
      showToast(err.message || "Failed to load teacher schedule", "error");
    } finally {
      setLoading(false);
    }
  }, [isTeacherRole, selectedTeacherId]);

  useEffect(() => {
    loadTeachersList();
  }, [loadTeachersList]);

  useEffect(() => {
    loadSchedule();
  }, [selectedTeacherId, loadSchedule]);

  const handleTeacherChange = (id) => {
    setSelectedTeacherId(id);
    const tch = teachers.find((t) => t.id === id);
    setSelectedTeacher(tch || null);
  };

  // Metrics
  const totalLessons = entries.length;
  const distinctSections = new Set(entries.map((e) => e.section_name)).size;
  const distinctSubjects = new Set(entries.map((e) => e.subject_name)).size;

  const handleExportCSV = () => {
    const data = entries.map((e) => ({
      dayOfWeek: e.day_of_week,
      periodName: e.period_name,
      time: `${e.start_time || ""} - ${e.end_time || ""}`,
      sectionName: `Class ${e.section_name}`,
      subjectName: e.subject_name,
      subjectCode: e.subject_code,
      roomName: e.room_name || "Unassigned",
    }));

    const columns = [
      { key: "dayOfWeek", label: "Day of Week" },
      { key: "periodName", label: "Period" },
      { key: "time", label: "Time" },
      { key: "sectionName", label: "Class / Section" },
      { key: "subjectName", label: "Subject" },
      { key: "subjectCode", label: "Code" },
      { key: "roomName", label: "Room / Facility" },
    ];

    const teacherName = selectedTeacher
      ? `${selectedTeacher.first_name}_${selectedTeacher.last_name}`
      : "teacher_schedule";
    exportToCSV(data, columns, `${teacherName}_schedule`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1>
            <HiAcademicCap color="#16a34a" /> Teacher Teaching Schedule
          </h1>
          <p>
            {isTeacherRole
              ? "Your personalized weekly teaching timetable, room allocations, and class periods."
              : "View weekly teaching allocations, assigned rooms, and workload per faculty member."}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={handlePrint}
            style={{
              background: "#ffffff",
              color: "#334155",
              border: "1px solid #cbd5e1",
              padding: "0.6rem 1rem",
              borderRadius: "0.5rem",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
            }}
          >
            <HiPrinter /> Print
          </button>
          <button
            onClick={handleExportCSV}
            style={{
              background: "#10b981",
              color: "white",
              border: "none",
              padding: "0.6rem 1.15rem",
              borderRadius: "0.5rem",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
            }}
          >
            <HiArrowDownTray /> Export CSV
          </button>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className={styles.navTabs}>
        <Link href="/dashboard/timetable" className={styles.navTab}>
          <HiCalendarDays /> Master Timetables
        </Link>
        <Link href="/dashboard/timetable/teacher" className={`${styles.navTab} ${styles.navTabActive}`}>
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
      </div>

      {/* Teacher Switcher for Admins */}
      {!isTeacherRole && (
        <div className={styles.filterBar}>
          <div className={styles.filterGroup}>
            <label>Select Faculty Member:</label>
            <select
              className={styles.filterSelect}
              value={selectedTeacherId}
              onChange={(e) => handleTeacherChange(e.target.value)}
            >
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.first_name} {t.last_name} ({t.employee_number})
                </option>
              ))}
            </select>
          </div>
          {timetable && (
            <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
              Active Schedule: <strong>{timetable.name}</strong> ({timetable.term})
            </div>
          )}
        </div>
      )}

      {/* Stats Bar */}
      <div className={styles.statsBar}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: "#ecfdf5", color: "#16a34a" }}>
            <HiClock />
          </div>
          <div>
            <div className={styles.statLabel}>Weekly Lessons</div>
            <div className={styles.statValue}>{totalLessons} periods</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: "#eef2ff", color: "#4f46e5" }}>
            <HiUserGroup />
          </div>
          <div>
            <div className={styles.statLabel}>Classes Taught</div>
            <div className={styles.statValue}>{distinctSections} sections</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: "#fef3c7", color: "#d97706" }}>
            <HiBookOpen />
          </div>
          <div>
            <div className={styles.statLabel}>Subjects Covered</div>
            <div className={styles.statValue}>{distinctSubjects} subjects</div>
          </div>
        </div>
      </div>

      {/* Weekly Schedule Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>Loading teacher schedule...</div>
      ) : !timetable ? (
        <div style={{ textAlign: "center", padding: "3rem", background: "white", borderRadius: "0.75rem", border: "1px dashed #cbd5e1" }}>
          <HiCalendarDays style={{ fontSize: "3rem", color: "#94a3b8" }} />
          <h3 style={{ marginTop: "0.5rem" }}>No Active Timetable Published</h3>
          <p style={{ color: "#64748b", fontSize: "0.9rem" }}>A master timetable must be published and active to view teaching schedules.</p>
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
                            <div className={styles.teachingCard}>
                              <div>
                                <div className={styles.teachingSubject}>
                                  <HiBookOpen /> {entry.subject_name}
                                </div>
                                <div className={styles.teachingSection}>
                                  👥 Class {entry.section_name}
                                </div>
                              </div>
                              {entry.room_name && (
                                <div className={styles.teachingRoom}>
                                  🏫 {entry.room_name}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className={styles.freeSlot}>— Free —</div>
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
