"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import styles from "./class.module.css";
import { useAuth } from "@/hooks/useAuth";
import timetableService from "@/services/timetableService";
import sectionService from "@/services/sectionService";
import periodService from "@/services/periodService";
import { exportToCSV } from "@/utils/csvExport";
import {
  HiUserGroup,
  HiCalendarDays,
  HiBuildingOffice,
  HiAcademicCap,
  HiCheckCircle,
  HiExclamationTriangle,
  HiBookOpen,
  HiIdentification,
  HiPrinter,
  HiArrowDownTray,
  HiArrowsRightLeft,
  HiDocumentChartBar,
} from "react-icons/hi2";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

export default function StudentClassTimetableViewPage() {
  const { user } = useAuth();
  const role = (user?.role || "").toLowerCase();
  const isStudent = role === "student";
  const isParent = role === "parent";

  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [parentChildren, setParentChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState("");

  const [timetable, setTimetable] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [entries, setEntries] = useState([]);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadSections = useCallback(async () => {
    try {
      const res = await sectionService.listSections({ status: "active", limit: 100 });
      const list = res.items || [];
      setSections(list);

      if (!isStudent && !isParent && list.length > 0 && !selectedSectionId) {
        setSelectedSectionId(list[0].id);
      }
    } catch (err) {
      console.warn("Could not load sections:", err.message);
    }
  }, [isStudent, isParent, selectedSectionId]);

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

      // 3. Resolve section based on role
      if (isStudent) {
        const myData = await timetableService.getMySchedule();
        if (myData && myData.student) {
          setSelectedSectionId(myData.student.section_id);
          setEntries(myData.entries || []);
          setLoading(false);
          return;
        }
      }

      if (isParent) {
        const myData = await timetableService.getMySchedule();
        if (myData && myData.children) {
          setParentChildren(myData.children);
          const activeChild = myData.children.find((c) => c.id === selectedChildId) || myData.children[0];
          if (activeChild) {
            setSelectedChildId(activeChild.id);
            setEntries(activeChild.entries || []);
          }
          setLoading(false);
          return;
        }
      }

      // Admin / Staff / Teacher viewing selected section
      if (selectedSectionId) {
        const entData = await timetableService.listTimetableEntries(activeData.timetable.id, {
          section_id: selectedSectionId,
        });
        setEntries(entData || []);
      }
    } catch (err) {
      showToast(err.message || "Failed to load class schedule", "error");
    } finally {
      setLoading(false);
    }
  }, [isStudent, isParent, selectedSectionId, selectedChildId]);

  useEffect(() => {
    loadSections();
  }, [loadSections]);

  useEffect(() => {
    loadSchedule();
  }, [selectedSectionId, selectedChildId, loadSchedule]);

  const handleChildChange = (childId) => {
    setSelectedChildId(childId);
    const child = parentChildren.find((c) => c.id === childId);
    if (child) {
      setEntries(child.entries || []);
    }
  };

  const handleExportCSV = () => {
    const data = entries.map((e) => ({
      dayOfWeek: e.day_of_week,
      periodName: e.period_name,
      time: `${e.start_time || ""} - ${e.end_time || ""}`,
      subjectName: e.subject_name,
      subjectCode: e.subject_code,
      teacherName: e.teacher_name,
      roomName: e.room_name || "Main Classroom",
    }));

    const columns = [
      { key: "dayOfWeek", label: "Day of Week" },
      { key: "periodName", label: "Period" },
      { key: "time", label: "Time" },
      { key: "subjectName", label: "Subject" },
      { key: "subjectCode", label: "Code" },
      { key: "teacherName", label: "Teacher" },
      { key: "roomName", label: "Room" },
    ];

    const targetName = isParent
      ? `child_schedule`
      : isStudent
      ? `my_class_schedule`
      : `class_${selectedSectionId}_schedule`;
    exportToCSV(data, columns, targetName);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1>
            <HiUserGroup color="#2563eb" /> Class & Student Schedule
          </h1>
          <p>
            {isStudent
              ? "Your daily class lesson schedule, teachers, classrooms, and break times."
              : isParent
              ? "Weekly class schedules for your enrolled children."
              : "View complete weekly lesson and classroom schedules by class section."}
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
        <Link href="/dashboard/timetable/teacher" className={styles.navTab}>
          <HiAcademicCap /> Teacher View
        </Link>
        <Link href="/dashboard/timetable/class" className={`${styles.navTab} ${styles.navTabActive}`}>
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

      {/* Filter / Selector Bar */}
      {isParent ? (
        <div className={styles.filterBar}>
          <div className={styles.filterGroup}>
            <label>Select Child:</label>
            <select
              className={styles.filterSelect}
              value={selectedChildId}
              onChange={(e) => handleChildChange(e.target.value)}
            >
              {parentChildren.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name} — Class {c.section_name} ({c.grade_name})
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : !isStudent ? (
        <div className={styles.filterBar}>
          <div className={styles.filterGroup}>
            <label>Select Class / Section:</label>
            <select
              className={styles.filterSelect}
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
            >
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.grade_name ? `(${s.grade_name})` : ""}
                </option>
              ))}
            </select>
          </div>
          {timetable && (
            <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
              Active Master Schedule: <strong>{timetable.name}</strong>
            </div>
          )}
        </div>
      ) : null}

      {/* Weekly Schedule Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>Loading class schedule...</div>
      ) : !timetable ? (
        <div style={{ textAlign: "center", padding: "3rem", background: "white", borderRadius: "0.75rem", border: "1px dashed #cbd5e1" }}>
          <HiCalendarDays style={{ fontSize: "3rem", color: "#94a3b8" }} />
          <h3 style={{ marginTop: "0.5rem" }}>No Active Timetable Published</h3>
          <p style={{ color: "#64748b", fontSize: "0.9rem" }}>A master timetable must be published and active to view class schedules.</p>
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
                            <div className={styles.lessonCard}>
                              <div>
                                <div className={styles.lessonSubject}>
                                  <HiBookOpen /> {entry.subject_name}
                                </div>
                                <div className={styles.lessonTeacher}>
                                  👤 {entry.teacher_name}
                                </div>
                              </div>
                              {entry.room_name && (
                                <div className={styles.lessonRoom}>
                                  🏫 {entry.room_name}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className={styles.freeSlot}>— Free Period —</div>
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
