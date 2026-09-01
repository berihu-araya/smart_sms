"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import teacherSubjectService from "@/services/teacherSubjectService";
import classTeacherService from "@/services/classTeacherService";
import teacherService from "@/services/teacherService";
import gradeService from "@/services/gradeService";
import sectionService from "@/services/sectionService";
import academicYearService from "@/services/academicYearService";
import styles from "./page.module.css";

const STATUS_COLORS = {
  ACTIVE: { bg: "#dcfce7", color: "#166534" },
  INACTIVE: { bg: "#f3f4f6", color: "#6b7280" },
};

export default function TeacherSubjectListPage() {
  const [activeTab, setActiveTab] = useState("subjects");

  // Teacher-Subject State
  const [assignments, setAssignments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [grades, setGrades] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState("");

  // Class Teacher State
  const [classTeachers, setClassTeachers] = useState([]);
  const [sections, setSections] = useState([]);
  const [classTeacherLoading, setClassTeacherLoading] = useState(true);
  const [classTeacherHasLoaded, setClassTeacherHasLoaded] = useState(false);
  const [classTeacherError, setClassTeacherError] = useState("");

  // Teacher-Subject Filters
  const [search, setSearch] = useState("");
  const [filterTeacherId, setFilterTeacherId] = useState("");
  const [filterGradeId, setFilterGradeId] = useState("");
  const [filterAcademicYearId, setFilterAcademicYearId] = useState("");

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
      try {
        setLoading(true);
        const data = await teacherSubjectService.listTeacherSubjects({
          search,
          teacher_id: filterTeacherId || undefined,
          grade_id: filterGradeId || undefined,
          academic_year_id: filterAcademicYearId || undefined,
          limit: 100,
          offset: 0,
        });
        setAssignments(data.items || []);
        setError("");
        setHasLoaded(true);
      } catch (err) {
        setError(err.message || "Unable to load teacher-subject assignments");
        setHasLoaded(true);
      } finally {
        setLoading(false);
      }
    }

    loadAssignments();
  }, [search, filterTeacherId, filterGradeId, filterAcademicYearId]);

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

    loadClassTeachers();
  }, [classTeacherSearch, classTeacherFilterTeacherId, classTeacherFilterAcademicYearId]);

  const assignmentCount = useMemo(() => assignments.length, [assignments]);
  const classTeacherCount = useMemo(() => classTeachers.length, [classTeachers]);

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1>Teachers Management</h1>
          <p>Manage teacher subject assignments and class teacher (homeroom) assignments.</p>
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
            <Link href="/dashboard/class-teachers/new" className={styles.primaryButton}>
              + Assign Class Teacher
            </Link>
          </div>

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

          {classTeacherError ? <div className={styles.errorBox}>{classTeacherError}</div> : null}

          {classTeacherLoading && !classTeacherHasLoaded ? (
            <div className={styles.loading}>Loading class teachers...</div>
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
                        <strong>{ct.teacher_first_name} {ct.teacher_last_name}</strong>
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
                        <Link href={`/dashboard/class-teachers/${ct.id}`} className={styles.linkButton}>
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {classTeachers.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "24px", color: "#667085" }}>
                        No class teachers assigned. Assign a class teacher to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
