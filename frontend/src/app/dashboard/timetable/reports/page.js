"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import styles from "./reports.module.css";
import timetableService from "@/services/timetableService";
import roomService from "@/services/roomService";
import periodService from "@/services/periodService";
import { exportToCSV } from "@/utils/csvExport";
import {
  HiDocumentChartBar,
  HiCalendarDays,
  HiAcademicCap,
  HiUserGroup,
  HiBuildingOffice,
  HiArrowsRightLeft,
  HiArrowDownTray,
  HiPrinter,
  HiCheckCircle,
  HiExclamationTriangle,
  HiBookOpen,
} from "react-icons/hi2";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

export default function TimetableReportsPage() {
  const [timetables, setTimetables] = useState([]);
  const [selectedTimetableId, setSelectedTimetableId] = useState("");
  const [activeReportTab, setActiveReportTab] = useState("coverage"); // 'coverage' | 'workload' | 'rooms'

  const [validationReport, setValidationReport] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [entries, setEntries] = useState([]);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadTimetables = useCallback(async () => {
    try {
      const res = await timetableService.listTimetables({ limit: 100 });
      const list = res.items || [];
      setTimetables(list);

      const active = list.find((t) => t.is_active && t.status === "PUBLISHED");
      if (active) {
        setSelectedTimetableId(active.id);
      } else if (list.length > 0) {
        setSelectedTimetableId(list[0].id);
      }
    } catch (err) {
      console.warn("Could not load timetables list:", err.message);
    }
  }, []);

  const loadReportData = useCallback(async () => {
    if (!selectedTimetableId) return;
    setLoading(true);
    try {
      const [valReport, roomsRes, entRes] = await Promise.all([
        timetableService.validateTimetable(selectedTimetableId),
        roomService.listRooms({ is_active: true, limit: 100 }),
        timetableService.listTimetableEntries(selectedTimetableId),
      ]);

      setValidationReport(valReport);
      setRooms(roomsRes.items || []);
      setEntries(entRes || []);

      if (valReport && valReport.academic_year_id) {
        const prdRes = await periodService.listPeriods({
          academicYearId: valReport.academic_year_id,
        });
        setPeriods(prdRes || []);
      }
    } catch (err) {
      showToast(err.message || "Failed to generate timetable report", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedTimetableId]);

  useEffect(() => {
    loadTimetables();
  }, [loadTimetables]);

  useEffect(() => {
    loadReportData();
  }, [selectedTimetableId, loadReportData]);

  // CSV Exporter Handler
  const handleExportCSV = () => {
    if (activeReportTab === "coverage") {
      const data = validationReport?.subjectCoverage || [];
      const columns = [
        { key: "sectionName", label: "Class / Section" },
        { key: "gradeName", label: "Grade" },
        { key: "subjectName", label: "Subject" },
        { key: "subjectCode", label: "Code" },
        { key: "requiredPeriods", label: "Required Weekly Periods" },
        { key: "scheduledPeriods", label: "Scheduled Weekly Periods" },
        { key: "difference", label: "Variance" },
        { key: "status", label: "Allocation Status" },
      ];
      exportToCSV(data, columns, "curriculum_subject_coverage_report");
    } else if (activeReportTab === "workload") {
      const data = validationReport?.teacherWorkloads || [];
      const columns = [
        { key: "teacherName", label: "Teacher Name" },
        { key: "employeeNumber", label: "Employee Number" },
        { key: "scheduledPeriods", label: "Assigned Weekly Periods" },
        { key: "maxWeeklyPeriods", label: "Max Weekly Periods" },
        { key: "isOverAllocated", label: "Over-Allocated" },
      ];
      exportToCSV(data, columns, "faculty_workload_report");
    } else if (activeReportTab === "rooms") {
      const lessonPeriodCount = periods.filter((p) => !p.is_break).length || 7;
      const totalSlots = lessonPeriodCount * DAYS.length;

      const data = rooms.map((r) => {
        const roomEntries = entries.filter((e) => e.room_id === r.id);
        const occupied = roomEntries.length;
        const vacant = Math.max(0, totalSlots - occupied);
        const utilization = totalSlots > 0 ? Math.round((occupied / totalSlots) * 100) : 0;
        return {
          roomName: r.name,
          roomType: r.room_type,
          building: r.building || "Main Building",
          floor: r.floor || "1st",
          capacity: r.capacity,
          occupiedPeriods: occupied,
          vacantPeriods: vacant,
          utilizationRate: `${utilization}%`,
        };
      });

      const columns = [
        { key: "roomName", label: "Facility / Room" },
        { key: "roomType", label: "Type" },
        { key: "building", label: "Building" },
        { key: "floor", label: "Floor" },
        { key: "capacity", label: "Capacity (Seats)" },
        { key: "occupiedPeriods", label: "Occupied Periods" },
        { key: "vacantPeriods", label: "Vacant Periods" },
        { key: "utilizationRate", label: "Utilization %" },
      ];
      exportToCSV(data, columns, "room_facility_utilization_report");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Calculations for Rooms Report
  const lessonPeriodCount = periods.filter((p) => !p.is_break).length || 7;
  const totalSlotsPerRoom = lessonPeriodCount * DAYS.length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1>
            <HiDocumentChartBar color="#4f46e5" /> Timetable Reports & Analytics
          </h1>
          <p>Comprehensive analytics covering curriculum allocation, teacher workloads, and room utilization.</p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button className={styles.printBtn} onClick={handlePrint}>
            <HiPrinter /> Print Report
          </button>
          <button className={styles.exportBtn} onClick={handleExportCSV}>
            <HiArrowDownTray /> Export to CSV
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
        <Link href="/dashboard/timetable/class" className={styles.navTab}>
          <HiUserGroup /> Student / Class View
        </Link>
        <Link href="/dashboard/timetable/rooms/occupancy" className={styles.navTab}>
          <HiBuildingOffice /> Room Occupancy
        </Link>
        <Link href="/dashboard/timetable/substitutions" className={styles.navTab}>
          <HiArrowsRightLeft /> Substitutions
        </Link>
        <Link href="/dashboard/timetable/reports" className={`${styles.navTab} ${styles.navTabActive}`}>
          <HiDocumentChartBar /> Reports
        </Link>
      </div>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <label>Select Timetable Schedule:</label>
          <select
            className={styles.filterSelect}
            value={selectedTimetableId}
            onChange={(e) => setSelectedTimetableId(e.target.value)}
          >
            {timetables.map((tt) => (
              <option key={tt.id} value={tt.id}>
                {tt.name} ({tt.academic_year_name} - {tt.term}) {tt.is_active ? "• [Active]" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Report Types Tabs */}
      <div className={styles.reportTabs}>
        <button
          className={`${styles.reportTabBtn} ${activeReportTab === "coverage" ? styles.reportTabBtnActive : ""}`}
          onClick={() => setActiveReportTab("coverage")}
        >
          <HiBookOpen /> Curriculum Subject Coverage
        </button>
        <button
          className={`${styles.reportTabBtn} ${activeReportTab === "workload" ? styles.reportTabBtnActive : ""}`}
          onClick={() => setActiveReportTab("workload")}
        >
          <HiAcademicCap /> Faculty Workload Analytics
        </button>
        <button
          className={`${styles.reportTabBtn} ${activeReportTab === "rooms" ? styles.reportTabBtnActive : ""}`}
          onClick={() => setActiveReportTab("rooms")}
        >
          <HiBuildingOffice /> Room & Facility Utilization
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>Generating report analytics...</div>
      ) : activeReportTab === "coverage" ? (
        /* Report 1: Subject Coverage */
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Class / Section</th>
                <th>Grade</th>
                <th>Subject Name</th>
                <th>Code</th>
                <th>Required Periods</th>
                <th>Scheduled Periods</th>
                <th>Variance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(validationReport?.subjectCoverage || []).length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                    No subject requirements registered for this grade curriculum.
                  </td>
                </tr>
              ) : (
                validationReport?.subjectCoverage.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <strong>Class {item.sectionName}</strong>
                    </td>
                    <td>{item.gradeName}</td>
                    <td>{item.subjectName}</td>
                    <td>{item.subjectCode}</td>
                    <td>{item.requiredPeriods} periods/wk</td>
                    <td>
                      <strong>{item.scheduledPeriods} periods/wk</strong>
                    </td>
                    <td style={{ color: item.difference < 0 ? "#dc2626" : item.difference > 0 ? "#d97706" : "#16a34a" }}>
                      {item.difference > 0 ? `+${item.difference}` : item.difference}
                    </td>
                    <td>
                      <span
                        className={
                          item.status === "MET"
                            ? styles.badgeMet
                            : item.status === "UNDER_ALLOCATED"
                            ? styles.badgeUnder
                            : item.status === "OVER_ALLOCATED"
                            ? styles.badgeOver
                            : styles.badgeUnscheduled
                        }
                      >
                        {item.status.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : activeReportTab === "workload" ? (
        /* Report 2: Teacher Workload */
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Teacher Name</th>
                <th>Employee #</th>
                <th>Scheduled Periods</th>
                <th>Max Capacity</th>
                <th>Utilization</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(validationReport?.teacherWorkloads || []).length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                    No teachers scheduled in this timetable.
                  </td>
                </tr>
              ) : (
                validationReport?.teacherWorkloads.map((t, idx) => {
                  const pct = Math.min(100, Math.round((t.scheduledPeriods / t.maxWeeklyPeriods) * 100));
                  return (
                    <tr key={idx}>
                      <td>
                        <strong>{t.teacherName}</strong>
                      </td>
                      <td>{t.employeeNumber}</td>
                      <td>
                        <strong>{t.scheduledPeriods} periods/wk</strong>
                      </td>
                      <td>{t.maxWeeklyPeriods} periods/wk</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span>{pct}%</span>
                          <div className={styles.progressBarWrap}>
                            <div
                              className={styles.progressBarFill}
                              style={{
                                width: `${pct}%`,
                                background: t.isOverAllocated ? "#ef4444" : pct > 80 ? "#f59e0b" : "#10b981",
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={t.isOverAllocated ? styles.badgeUnder : styles.badgeMet}>
                          {t.isOverAllocated ? "Over-Allocated" : "Normal"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Report 3: Room Utilization */
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Facility / Room</th>
                <th>Type</th>
                <th>Location</th>
                <th>Capacity</th>
                <th>Occupied Periods</th>
                <th>Vacant Periods</th>
                <th>Utilization</th>
              </tr>
            </thead>
            <tbody>
              {rooms.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                    No room facilities registered.
                  </td>
                </tr>
              ) : (
                rooms.map((rm) => {
                  const roomEntries = entries.filter((e) => e.room_id === rm.id);
                  const occupied = roomEntries.length;
                  const vacant = Math.max(0, totalSlotsPerRoom - occupied);
                  const utilPct = totalSlotsPerRoom > 0 ? Math.round((occupied / totalSlotsPerRoom) * 100) : 0;

                  return (
                    <tr key={rm.id}>
                      <td>
                        <strong>{rm.name}</strong>
                      </td>
                      <td>{rm.room_type}</td>
                      <td>
                        {rm.building || "Main Building"} ({rm.floor || "1st"})
                      </td>
                      <td>{rm.capacity} seats</td>
                      <td>
                        <strong>{occupied} periods</strong>
                      </td>
                      <td>{vacant} periods</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span>{utilPct}%</span>
                          <div className={styles.progressBarWrap}>
                            <div
                              className={styles.progressBarFill}
                              style={{
                                width: `${utilPct}%`,
                                background: utilPct > 80 ? "#8b5cf6" : utilPct > 50 ? "#3b82f6" : "#10b981",
                              }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
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
