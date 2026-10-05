"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import teacherSubjectService from "@/services/teacherSubjectService";
import classTeacherService from "@/services/classTeacherService";
import teacherService from "@/services/teacherService";
import gradeService from "@/services/gradeService";
import sectionService from "@/services/sectionService";
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
<<<<<<< HEAD
  const [activeTab, setActiveTab] = useState("subjects");

  // Teacher-Subject State
=======
  const { user } = useAuth();
  const role = (user?.role || "").toLowerCase();
  const isTeacher = role.includes("teacher") && !role.includes("admin");

  // State for Teacher Overview Mode
  const [overview, setOverview] = useState(null);
  const [activeTab, setActiveTab] = useState("teaching"); // 'teaching' | 'homeroom'

  // State for Admin / Management Mode
>>>>>>> Main
  const [assignments, setAssignments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [grades, setGrades] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState("");

<<<<<<< HEAD
  // Class Teacher State
  const [classTeachers, setClassTeachers] = useState([]);
  const [sections, setSections] = useState([]);
  const [classTeacherLoading, setClassTeacherLoading] = useState(true);
  const [classTeacherHasLoaded, setClassTeacherHasLoaded] = useState(false);
  const [classTeacherError, setClassTeacherError] = useState("");
  const [showClassTeacherForm, setShowClassTeacherForm] = useState(false);
  const [classTeacherForm, setClassTeacherForm] = useState({
    teacher_id: "",
    section_id: "",
    academic_year_id: "",
  });
  const [classTeacherFormErrors, setClassTeacherFormErrors] = useState({});
  const [classTeacherFormSaving, setClassTeacherFormSaving] = useState(false);

  // Teacher-Subject Filters
=======
  // Filters for Admin mode
>>>>>>> Main
  const [search, setSearch] = useState("");
  const [filterTeacherId, setFilterTeacherId] = useState("");
  const [filterGradeId, setFilterGradeId] = useState("");
  const [filterAcademicYearId, setFilterAcademicYearId] = useState("");

<<<<<<< HEAD
  // Class Teacher Filters
  const [classTeacherSearch, setClassTeacherSearch] = useState("");
  const [classTeacherFilterTeacherId, setClassTeacherFilterTeacherId] = useState("");
  const [classTeacherFilterAcademicYearId, setClassTeacherFilterAcademicYearId] = useState("");

  useEffect(() => {
    async function loadFilterOptions() {
      try {
        const [teachersData, gradesData, yearsData, sectionsData] = await Promise.all([
          teacherService.listTeachers({ limit: 300 }),
          gradeService.listGrades({ limit: 200 }),
          academicYearService.listAcademicYears({ limit: 200 }),
          sectionService.listSections({ limit: 300 }),
        ]);
        setTeachers(teachersData.items || []);
        setGrades(gradesData.items || []);
        setAcademicYears(yearsData.items || []);
        setSections(sectionsData.items || []);
      } catch (err) {
        console.error("Failed to load filter options", err);
      }
    }
    loadFilterOptions();
  }, []);

  useEffect(() => {
    async function loadAssignments() {
=======
  // Load Data based on role
  useEffect(() => {
    async function loadData() {
>>>>>>> Main
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

  // Load Class Teachers
  useEffect(() => {
    async function loadClassTeachers() {
      try {
        setClassTeacherLoading(true);
        const data = await classTeacherService.listClassTeachers({
          search: classTeacherSearch,
          teacher_id: classTeacherFilterTeacherId || undefined,
          academic_year_id: classTeacherFilterAcademicYearId || undefined,
          limit: 100,
          offset: 0,
        });
        setClassTeachers(data.items || []);
        setClassTeacherError("");
        setClassTeacherHasLoaded(true);
      } catch (err) {
        setClassTeacherError(err.message || "Unable to load class teacher assignments");
        setClassTeacherHasLoaded(true);
      } finally {
        setClassTeacherLoading(false);
      }
    }

<<<<<<< HEAD
    loadClassTeachers();
  }, [classTeacherSearch, classTeacherFilterTeacherId, classTeacherFilterAcademicYearId]);

  // Handle class teacher form
  const handleClassTeacherFormChange = (e) => {
    const { name, value } = e.target;
    setClassTeacherForm((prev) => ({ ...prev, [name]: value }));
    if (classTeacherFormErrors[name]) {
      setClassTeacherFormErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const validateClassTeacherForm = () => {
    const errs = {};
    if (!classTeacherForm.teacher_id) errs.teacher_id = "Teacher is required";
    if (!classTeacherForm.section_id) errs.section_id = "Section is required";
    if (!classTeacherForm.academic_year_id) errs.academic_year_id = "Academic year is required";
    return errs;
  };

  const handleAssignClassTeacher = async (e) => {
    e.preventDefault();
    setClassTeacherError("");

    const errs = validateClassTeacherForm();
    setClassTeacherFormErrors(errs);

    if (Object.keys(errs).length > 0) {
      return;
    }

    setClassTeacherFormSaving(true);

    try {
      await classTeacherService.assignClassTeacher({
        teacher_id: classTeacherForm.teacher_id,
        section_id: classTeacherForm.section_id,
        academic_year_id: classTeacherForm.academic_year_id,
      });

      // Reload the list
      const data = await classTeacherService.listClassTeachers({
        limit: 100,
        offset: 0,
      });
      setClassTeachers(data.items || []);

      // Reset form
      setClassTeacherForm({ teacher_id: "", section_id: "", academic_year_id: "" });
      setShowClassTeacherForm(false);
      setClassTeacherError("");
    } catch (err) {
      setClassTeacherError(err.message || "Unable to assign class teacher. Please try again.");
    } finally {
      setClassTeacherFormSaving(false);
    }
  };

  const handleDeactivateClassTeacher = async (id, teacherName, sectionName) => {
    if (!window.confirm(`Deactivate ${teacherName} as class teacher for ${sectionName}?`)) {
      return;
    }

    try {
      await classTeacherService.deactivateClassTeacher(id);
      setClassTeachers(classTeachers.filter((a) => a.id !== id));
    } catch (err) {
      alert(err.message || "Failed to deactivate");
    }
  };

  const assignmentCount = useMemo(() => assignments.length, [assignments]);
  const classTeacherCount = useMemo(() => classTeachers.length, [classTeachers]);
=======
  if (loading && !hasLoaded) {
    return <div className={styles.loading}>Loading information...</div>;
  }
>>>>>>> Main

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
<<<<<<< HEAD
          <h1>Teachers Management</h1>
          <p>Manage teacher subject assignments and class teacher (homeroom) assignments.</p>
=======
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
>>>>>>> Main
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={styles.tabContainer}>
        <button
          className={`${styles.tab} ${activeTab === "subjects" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("subjects")}
        >
          📚 Subject Assignments ({assignmentCount})
        </button>
        <button
          className={`${styles.tab} ${activeTab === "classTeachers" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("classTeachers")}
        >
          👥 Class Teachers ({classTeacherCount})
        </button>
      </div>

<<<<<<< HEAD
      {/* TAB 1: Teacher Subject Assignments */}
      {activeTab === "subjects" && (
        <>
          <div className={styles.tabButtonsRow}>
            <Link href="/dashboard/teachers/subjects/new" className={styles.primaryButton}>
              + New Subject Assignment
            </Link>
          </div>

          <div className={styles.summaryCard}>
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

          {loading && !hasLoaded ? (
            <div className={styles.loading}>Loading assignments...</div>
          ) : (
            <div className={styles.tableCard}>
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
          )}
        </>
      )}

      {/* TAB 2: Class Teacher Assignments */}
      {activeTab === "classTeachers" && (
        <>
          <div className={styles.tabButtonsRow}>
            <button
              onClick={() => setShowClassTeacherForm(!showClassTeacherForm)}
              className={styles.primaryButton}
            >
              {showClassTeacherForm ? "✕ Cancel" : "+ Assign Class Teacher"}
            </button>
          </div>

          {/* Modal Overlay */}
          {showClassTeacherForm && (
            <div className={styles.modalOverlay} onClick={() => setShowClassTeacherForm(false)}>
              <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <h2>Assign Class Teacher</h2>
                  <button
                    type="button"
                    className={styles.modalCloseBtn}
                    onClick={() => setShowClassTeacherForm(false)}
                  >
                    ✕
                  </button>
                </div>

                {classTeacherError && (
                  <div className={styles.errorBox} style={{ marginBottom: "16px" }}>
                    {classTeacherError}
                  </div>
                )}

                <form onSubmit={handleAssignClassTeacher} className={styles.modalForm}>
                  <div className={styles.formField}>
                    <label className={styles.label}>
                      Teacher <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <select
                      name="teacher_id"
                      value={classTeacherForm.teacher_id}
                      onChange={handleClassTeacherFormChange}
                      className={`${styles.select} ${classTeacherFormErrors.teacher_id ? styles.inputError : ""}`}
                    >
                      <option value="">-- Select Teacher --</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.first_name} {t.last_name}
                        </option>
                      ))}
                    </select>
                    {classTeacherFormErrors.teacher_id && (
                      <span style={{ color: "#ef4444", fontSize: "12px", display: "block", marginTop: "4px" }}>
                        {classTeacherFormErrors.teacher_id}
                      </span>
                    )}
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.label}>
                      Section <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <select
                      name="section_id"
                      value={classTeacherForm.section_id}
                      onChange={handleClassTeacherFormChange}
                      className={`${styles.select} ${classTeacherFormErrors.section_id ? styles.inputError : ""}`}
                    >
                      <option value="">-- Select Section --</option>
                      {sections.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.grade_name} - {s.name}
                        </option>
                      ))}
                    </select>
                    {classTeacherFormErrors.section_id && (
                      <span style={{ color: "#ef4444", fontSize: "12px", display: "block", marginTop: "4px" }}>
                        {classTeacherFormErrors.section_id}
                      </span>
                    )}
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.label}>
                      Academic Year <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <select
                      name="academic_year_id"
                      value={classTeacherForm.academic_year_id}
                      onChange={handleClassTeacherFormChange}
                      className={`${styles.select} ${classTeacherFormErrors.academic_year_id ? styles.inputError : ""}`}
                    >
                      <option value="">-- Select Year --</option>
                      {academicYears.map((y) => (
                        <option key={y.id} value={y.id}>
                          {y.name} {y.is_active ? "★ (Active)" : ""}
                        </option>
                      ))}
                    </select>
                    {classTeacherFormErrors.academic_year_id && (
                      <span style={{ color: "#ef4444", fontSize: "12px", display: "block", marginTop: "4px" }}>
                        {classTeacherFormErrors.academic_year_id}
                      </span>
                    )}
                  </div>

                  <div className={styles.modalFormActions}>
                    <button
                      type="button"
                      onClick={() => setShowClassTeacherForm(false)}
                      className={styles.secondaryButton}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={classTeacherFormSaving}
                      className={styles.primaryButton}
                    >
                      {classTeacherFormSaving ? "Assigning..." : "Assign Class Teacher"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className={styles.summaryCard}>
            <div>
              <span className={styles.summaryLabel}>Search</span>
              <input
                value={classTeacherSearch}
                onChange={(e) => setClassTeacherSearch(e.target.value)}
                placeholder="Search by teacher or class name..."
                className={styles.searchInput}
              />
            </div>
            <div>
              <span className={styles.summaryLabel}>Teacher</span>
              <select
                value={classTeacherFilterTeacherId}
                onChange={(e) => setClassTeacherFilterTeacherId(e.target.value)}
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
              <span className={styles.summaryLabel}>Academic Year</span>
              <select
                value={classTeacherFilterAcademicYearId}
                onChange={(e) => setClassTeacherFilterAcademicYearId(e.target.value)}
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

          {classTeacherError && !showClassTeacherForm && (
            <div className={styles.errorBox}>{classTeacherError}</div>
          )}

          {classTeacherLoading && !classTeacherHasLoaded ? (
            <div className={styles.loading}>Loading class teachers...</div>
          ) : classTeachers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#667085" }}>
              <p>No class teachers assigned yet.</p>
              <button
                onClick={() => setShowClassTeacherForm(true)}
                className={styles.primaryButton}
                style={{ marginTop: "16px" }}
              >
                Assign First Class Teacher
              </button>
            </div>
          ) : (
            <div className={styles.tableCard}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Teacher</th>
                    <th>Section</th>
                    <th>Grade</th>
                    <th>Academic Year</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {classTeachers.map((ct) => (
                    <tr key={ct.id}>
                      <td>
                        <strong>{ct.teacher_name}</strong>
                      </td>
                      <td>{ct.section_name}</td>
                      <td>{ct.grade_name}</td>
                      <td>{ct.academic_year_name}</td>
                      <td>
                        <span
                          className={styles.statusPill}
                          style={{
                            background: (STATUS_COLORS[ct.status] || STATUS_COLORS.INACTIVE).bg,
                            color: (STATUS_COLORS[ct.status] || STATUS_COLORS.INACTIVE).color,
                          }}
                        >
                          {ct.status}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() =>
                            handleDeactivateClassTeacher(ct.id, ct.teacher_name, ct.section_name)
                          }
                          className={styles.dangerButton}
                          style={{ fontSize: "12px", padding: "4px 8px" }}
                        >
                          Deactivate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
=======
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
>>>>>>> Main
    </div>
  );
}
