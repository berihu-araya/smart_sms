"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import teacherSubjectService from "@/services/teacherSubjectService";
import teacherService from "@/services/teacherService";
import gradeService from "@/services/gradeService";
import academicYearService from "@/services/academicYearService";
import { useAuth } from "@/hooks/useAuth";
import styles from "./page.module.css";
import {
  HiAcademicCap,
  HiBookOpen,
  HiClipboardDocumentList,
  HiUserGroup,
  HiCheckCircle,
  HiClock,
  HiBuildingOffice2,
  HiUserCheck,
} from "react-icons/hi2";

const STATUS_COLORS = {
  ACTIVE: { bg: "#dcfce7", color: "#166534" },
  INACTIVE: { bg: "#f3f4f6", color: "#6b7280" },
};

export default function TeacherSubjectListPage() {
  const { user } = useAuth();
  const role = (user?.role || "").toLowerCase();
  const isTeacher = role.includes("teacher") && !role.includes("admin");

  // State for Teacher Overview Mode
  const [overview, setOverview] = useState(null);
  const [activeTab, setActiveTab] = useState("teaching"); // 'teaching' | 'homeroom'

  // State for Admin / Management Mode
  const [assignments, setAssignments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [grades, setGrades] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState("");

  // Filters for Admin mode
  const [search, setSearch] = useState("");
  const [filterTeacherId, setFilterTeacherId] = useState("");
  const [filterGradeId, setFilterGradeId] = useState("");
  const [filterAcademicYearId, setFilterAcademicYearId] = useState("");

  // Load Data based on role
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        if (isTeacher) {
          const overviewData = await teacherSubjectService.getMyOverview();
          setOverview(overviewData);
          if (overviewData?.homeroom_classes?.length > 0 && overviewData?.teaching_assignments?.length === 0) {
            setActiveTab("homeroom");
          }
        } else {
          // Load Admin Filters and Data
          const [teachersData, gradesData, yearsData, assignmentsData] = await Promise.all([
            teacherService.listTeachers({ limit: 200 }).catch(() => ({ items: [] })),
            gradeService.listGrades({ limit: 200 }).catch(() => ({ items: [] })),
            academicYearService.listAcademicYears({ limit: 200 }).catch(() => ({ items: [] })),
            teacherSubjectService.listTeacherSubjects({
              search,
              teacher_id: filterTeacherId || undefined,
              grade_id: filterGradeId || undefined,
              academic_year_id: filterAcademicYearId || undefined,
              limit: 100,
              offset: 0,
            }),
          ]);

          setTeachers(teachersData.items || []);
          setGrades(gradesData.items || []);
          setAcademicYears(yearsData.items || []);
          setAssignments(assignmentsData.items || []);
        }

        setHasLoaded(true);
      } catch (err) {
        setError(err.message || "Unable to load data.");
        setHasLoaded(true);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isTeacher, search, filterTeacherId, filterGradeId, filterAcademicYearId]);

  const assignmentCount = useMemo(() => assignments.length, [assignments]);

  if (loading && !hasLoaded) {
    return <div className={styles.loading}>Loading information...</div>;
  }

  // ==========================================
  // TEACHER VIEW: My Subjects & Homeroom Class
  // ==========================================
  if (isTeacher) {
    const teachingList = overview?.teaching_assignments || [];
    const homeroomList = overview?.homeroom_classes || [];
    const teacherProfile = overview?.teacher || {};

    return (
      <div className={styles.page}>
        {/* Teacher Profile Banner */}
        <div className={styles.teacherBanner}>
          <div className={styles.teacherBannerLeft}>
            <h2>Welcome, {teacherProfile.name || `${user?.first_name || ""} ${user?.last_name || ""}`}</h2>
            <p>
              {teacherProfile.designation || "Teacher"} • {teacherProfile.department || "Academic Faculty"} • ID: {teacherProfile.employee_number || "—"}
            </p>
          </div>
          <div className={styles.teacherBadgeContainer}>
            {overview?.isSubjectTeacher && (
              <span className={`${styles.roleBadge} ${styles.roleBadgeSubject}`}>
                📖 Subject Teacher ({teachingList.length} classes)
              </span>
            )}
            {overview?.isClassTeacher && (
              <span className={`${styles.roleBadge} ${styles.roleBadgeHomeroom}`}>
                ⭐ Homeroom Class Teacher ({homeroomList.length} section{homeroomList.length > 1 ? "s" : ""})
              </span>
            )}
          </div>
        </div>

        {/* Top Summary Stat Cards */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>My Teaching Subjects</span>
            <p className={styles.statValue}>{teachingList.length}</p>
            <span className={styles.statHint}>Assigned grade & section courses</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Homeroom Classes</span>
            <p className={styles.statValue}>{homeroomList.length}</p>
            <span className={styles.statHint}>
              {homeroomList.length > 0
                ? homeroomList.map((h) => `${h.grade_name} - ${h.section_name}`).join(", ")
                : "No homeroom class assigned"}
            </span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Active Academic Year</span>
            <p className={styles.statValue} style={{ fontSize: "20px" }}>
              {teachingList[0]?.academic_year_name || homeroomList[0]?.academic_year_name || "Current Year"}
            </p>
            <span className={styles.statHint}>Current teaching session</span>
          </div>
        </div>

        {/* Content Tabs */}
        <div className={styles.contentCard}>
          <div className={styles.navTabs}>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === "teaching" ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab("teaching")}
            >
              <HiBookOpen size={18} />
              <span>My Teaching Assignments ({teachingList.length})</span>
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === "homeroom" ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab("homeroom")}
            >
              <HiAcademicCap size={18} />
              <span>My Homeroom Class & Courses ({homeroomList.length})</span>
            </button>
          </div>

          {/* TAB 1: TEACHING ASSIGNMENTS */}
          {activeTab === "teaching" && (
            <div>
              <div className={styles.cardHeader}>
                <div>
                  <h3 className={styles.cardHeaderTitle}>
                    <HiBookOpen color="#2563eb" /> My Teaching Subjects (Grade & Section)
                  </h3>
                  <p className={styles.cardHeaderDesc}>
                    Classes where you teach and have full permission to enter/edit marks, record attendance, and manage assignments.
                  </p>
                </div>
              </div>

              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Grade & Section</th>
                      <th>Room</th>
                      <th>Students</th>
                      <th>Pass / Max Mark</th>
                      <th>Academic Year</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachingList.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.subject_name}</strong>
                          <div style={{ fontSize: "12px", color: "#667085" }}>{item.subject_code}</div>
                        </td>
                        <td>
                          <span className={`${styles.tagPill} ${styles.tagSelf}`}>
                            {item.grade_name} — {item.section_name}
                          </span>
                        </td>
                        <td>{item.room_number || "—"}</td>
                        <td>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <HiUserGroup color="#64748b" /> {item.student_count || 0} students
                          </span>
                        </td>
                        <td>
                          {item.pass_mark || 50} / {item.max_mark || 100}
                        </td>
                        <td>{item.academic_year_name || "—"}</td>
                        <td>
                          <span
                            className={styles.statusPill}
                            style={{
                              background: (STATUS_COLORS[item.status] || STATUS_COLORS.ACTIVE).bg,
                              color: (STATUS_COLORS[item.status] || STATUS_COLORS.ACTIVE).color,
                            }}
                          >
                            {item.status || "ACTIVE"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                            <Link
                              href={`/dashboard/marks?grade_id=${item.grade_id}&section_id=${item.section_id}&subject_id=${item.subject_id}`}
                              className={styles.linkButton}
                              title="Enter/Edit marks for this class"
                            >
                              Enter Marks
                            </Link>
                            <Link
                              href={`/dashboard/sections/${item.section_id}`}
                              className={styles.outlineButton}
                            >
                              Class View
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {teachingList.length === 0 && (
                      <tr>
                        <td colSpan={8}>
                          <div className={styles.emptyState}>
                            <HiBookOpen size={36} color="#94a3b8" />
                            <h4 className={styles.emptyTitle}>No teaching subjects assigned yet</h4>
                            <p className={styles.emptyText}>
                              Contact your School Administrator to assign you to courses and sections.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: HOMEROOM CLASS & ALL COURSES */}
          {activeTab === "homeroom" && (
            <div>
              {homeroomList.length > 0 ? (
                homeroomList.map((homeroom) => (
                  <div key={homeroom.section_id} style={{ paddingBottom: "24px" }}>
                    {/* Homeroom Banner Info */}
                    <div className={styles.homeroomBanner}>
                      <div className={styles.homeroomInfo}>
                        <h3>
                          🏫 Homeroom: {homeroom.grade_name} — {homeroom.section_name}
                        </h3>
                        <p>
                          Room: <strong>{homeroom.room_number || "—"}</strong> • Capacity: <strong>{homeroom.capacity || "—"}</strong> • Enrolled Students: <strong>{homeroom.student_count || 0}</strong> • Academic Year: <strong>{homeroom.academic_year_name || "—"}</strong>
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <Link
                          href={`/dashboard/results?sectionId=${homeroom.section_id}&gradeId=${homeroom.grade_id}`}
                          className={styles.primaryButton}
                        >
                          View Class Results & Rank
                        </Link>
                        <Link
                          href={`/dashboard/sections/${homeroom.section_id}`}
                          className={styles.secondaryButton}
                        >
                          Section Details
                        </Link>
                      </div>
                    </div>

                    <div style={{ padding: "0 24px 12px" }}>
                      <h4 style={{ margin: "0 0 4px", fontSize: "16px", color: "#101828" }}>
                        All Courses & Subject Teachers in this Homeroom Class
                      </h4>
                      <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#667085" }}>
                        As Class Teacher, you can monitor all subject courses, view all marks, and calculate total score / rankings for your homeroom students.
                      </p>
                    </div>

                    <div className={styles.tableWrapper}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Course / Subject</th>
                            <th>Code</th>
                            <th>Teacher</th>
                            <th>Periods/Wk</th>
                            <th>Pass / Max Mark</th>
                            <th>Type</th>
                            <th>Your Access</th>
                            <th style={{ textAlign: "right" }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(homeroom.courses || []).map((course, index) => (
                            <tr
                              key={`${course.grade_subject_id || course.subject_id || "course"}:${course.teacher_subject_id || course.teacher_id || "unassigned"}:${index}`}
                            >
                              <td>
                                <strong>{course.subject_name}</strong>
                              </td>
                              <td>{course.subject_code}</td>
                              <td>
                                {course.teacher_name ? (
                                  <div>
                                    <span style={{ fontWeight: 600 }}>{course.teacher_name}</span>
                                    {course.is_taught_by_me && (
                                      <span
                                        className={`${styles.tagPill} ${styles.tagSelf}`}
                                        style={{ marginLeft: "6px" }}
                                      >
                                        You
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span style={{ color: "#94a3b8", fontStyle: "italic" }}>
                                    Not Assigned
                                  </span>
                                )}
                              </td>
                              <td>{course.weekly_periods || "—"}</td>
                              <td>
                                {course.pass_mark || 50} / {course.max_mark || 100}
                              </td>
                              <td>
                                <span
                                  className={styles.tagPill}
                                  style={{
                                    background: course.is_compulsory ? "#f0f9ff" : "#fef3c7",
                                    color: course.is_compulsory ? "#0369a1" : "#92400e",
                                  }}
                                >
                                  {course.is_compulsory ? "Compulsory" : "Elective"}
                                </span>
                              </td>
                              <td>
                                {course.is_taught_by_me ? (
                                  <span className={`${styles.tagPill} ${styles.tagSelf}`}>
                                    Full (Enter Marks)
                                  </span>
                                ) : (
                                  <span className={`${styles.tagPill} ${styles.tagOther}`}>
                                    Read-Only (View Marks)
                                  </span>
                                )}
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                                  <Link
                                    href={`/dashboard/marks?grade_id=${homeroom.grade_id}&section_id=${homeroom.section_id}&subject_id=${course.subject_id}`}
                                    className={styles.linkButton}
                                  >
                                    {course.is_taught_by_me ? "Enter Marks" : "View Marks"}
                                  </Link>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {(homeroom.courses || []).length === 0 && (
                            <tr>
                              <td colSpan={8} style={{ textAlign: "center", padding: "20px", color: "#667085" }}>
                                No curriculum subjects mapped to this grade yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>
                  <HiAcademicCap size={44} color="#94a3b8" />
                  <h4 className={styles.emptyTitle}>You are not assigned as a Class Teacher</h4>
                  <p className={styles.emptyText}>
                    You are currently active as a Subject Teacher. If you are designated as a homeroom Class Teacher, your assigned grade and section courses will appear here.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // ADMIN / STAFF VIEW: Manage All Assignments
  // ==========================================
  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1>Teacher Subject Assignments</h1>
          <p>Assign teachers to subjects for specific grades, sections, and academic years.</p>
        </div>

        <div className={styles.headerActions}>
          <Link href="/dashboard/teachers/subjects/class-teachers" className={styles.secondaryButton}>
            Class Teacher Assignment
          </Link>
          <Link href="/dashboard/teachers/subjects/new" className={styles.primaryButton}>
            + New Assignment
          </Link>
        </div>
      </div>

      <div className={styles.summaryCard}>
        <div>
          <span className={styles.summaryLabel}>Total assignments</span>
          <strong>{assignmentCount}</strong>
        </div>
        <div>
          <span className={styles.summaryLabel}>Search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by teacher or subject name..."
            className={styles.searchInput}
          />
        </div>
        <div>
          <span className={styles.summaryLabel}>Teacher</span>
          <select
            value={filterTeacherId}
            onChange={(e) => setFilterTeacherId(e.target.value)}
            className={styles.searchInput}
          >
            <option value="">All Teachers</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.first_name} {t.last_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className={styles.summaryLabel}>Grade</span>
          <select
            value={filterGradeId}
            onChange={(e) => setFilterGradeId(e.target.value)}
            className={styles.searchInput}
          >
            <option value="">All Grades</option>
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className={styles.summaryLabel}>Academic Year</span>
          <select
            value={filterAcademicYearId}
            onChange={(e) => setFilterAcademicYearId(e.target.value)}
            className={styles.searchInput}
          >
            <option value="">All Years</option>
            {academicYears.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? <div className={styles.errorBox}>{error}</div> : null}

      <div className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Teacher</th>
                <th>Subject</th>
                <th>Grade</th>
                <th>Section</th>
                <th>Academic Year</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <tr key={a.id}>
                  <td>
                    <strong>{a.teacher_name}</strong>
                  </td>
                  <td>
                    {a.subject_name} ({a.subject_code})
                  </td>
                  <td>{a.grade_name}</td>
                  <td>{a.section_name}</td>
                  <td>{a.academic_year_name}</td>
                  <td>{a.start_date ? new Date(a.start_date).toLocaleDateString() : "—"}</td>
                  <td>{a.end_date ? new Date(a.end_date).toLocaleDateString() : "—"}</td>
                  <td>
                    <span
                      className={styles.statusPill}
                      style={{
                        background: (STATUS_COLORS[a.status] || STATUS_COLORS.INACTIVE).bg,
                        color: (STATUS_COLORS[a.status] || STATUS_COLORS.INACTIVE).color,
                      }}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td>
                    <Link href={`/dashboard/teachers/subjects/${a.id}`} className={styles.linkButton}>
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {assignments.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "24px", color: "#667085" }}>
                    No assignments found. Create a new assignment to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
