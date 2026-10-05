"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import classTeacherService from "@/services/classTeacherService";
import teacherService from "@/services/teacherService";
import sectionService from "@/services/sectionService";
import academicYearService from "@/services/academicYearService";
import styles from "./page.module.css";

const STATUS_COLORS = {
  ACTIVE: { bg: "#dcfce7", color: "#166534" },
  INACTIVE: { bg: "#f3f4f6", color: "#6b7280" },
};

export default function ClassTeacherListPage() {
  const [assignments, setAssignments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [sections, setSections] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [filterTeacherId, setFilterTeacherId] = useState("");
  const [filterSectionId, setFilterSectionId] = useState("");
  const [filterAcademicYearId, setFilterAcademicYearId] = useState("");
  // This useEffect will fetch teacher, section and academic year data for the filters
  useEffect(() => {
    async function loadFilterOptions() {
      try {
        const [teachersData, sectionsData, yearsData] = await Promise.all([
          teacherService.listTeachers({ limit: 200 }),
          sectionService.listSections({ limit: 200 }),
          academicYearService.listAcademicYears({ limit: 200 }),
        ]);
        setTeachers(teachersData.items || []);
        setSections(sectionsData.items || []);
        setAcademicYears(yearsData.items || []);
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
        const data = await classTeacherService.listClassTeachers({
          search,
          teacher_id: filterTeacherId || undefined,
          section_id: filterSectionId || undefined,
          academic_year_id: filterAcademicYearId || undefined,
          status: "ACTIVE",
          limit: 100,
          offset: 0,
        });
        setAssignments(data.items || []);
        setError("");
        setHasLoaded(true);
      } catch (err) {
        setError(err.message || "Unable to load class teacher assignments");
        setHasLoaded(true);
      } finally {
        setLoading(false);
      }
    }

    loadAssignments();
  }, [search, filterTeacherId, filterSectionId, filterAcademicYearId]);

  const assignmentCount = useMemo(() => assignments.length, [assignments]);

  if (loading && !hasLoaded) {
    return <div className={styles.loading}>Loading assignments...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1>Class Teacher Assignments</h1>
          <p>Assign teachers as homeroom/class teachers for sections.</p>
        </div>

        <Link href="/dashboard/teachers/subjects/class-teachers/new" className={styles.primaryButton}>
          + New Assignment
        </Link>
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
            placeholder="Search by teacher or section name..."
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
          <span className={styles.summaryLabel}>Section</span>
          <select
            value={filterSectionId}
            onChange={(e) => setFilterSectionId(e.target.value)}
            className={styles.searchInput}
          >
            <option value="">All Sections</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
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
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Teacher</th>
              <th>Employee ID</th>
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
                <td>{a.employee_number}</td>
                <td>{a.grade_name || "—"}</td>
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
                  <Link
                    href={`/dashboard/teachers/subjects/class-teachers/${a.id}`}
                    className={styles.linkButton}
                  >
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
  );
}
