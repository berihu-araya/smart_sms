"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import gradeSubjectService from "@/services/gradeSubjectService";
import gradeService from "@/services/gradeService";
import styles from "./page.module.css";

export default function GradeSubjectListPage() {
  const [assignments, setAssignments] = useState([]);
  const [grades, setGrades] = useState([]);
  const [selectedGrade, setSelectedGrade] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadGrades() {
      try {
        const data = await gradeService.listGrades({ limit: 100 });
        setGrades(data.items || []);
      } catch (err) {
        console.error("Failed to load grades", err);
      }
    }
    loadGrades();
  }, []);

  useEffect(() => {
    async function loadAssignments() {
      try {
        setLoading(true);
        const data = await gradeSubjectService.listGradeSubjects({
          grade_id: selectedGrade || undefined,
          search,
          limit: 100,
          offset: 0,
        });
        setAssignments(data.items || []);
        setError("");
      } catch (err) {
        setError(err.message || "Unable to load grade-subject assignments");
      } finally {
        setLoading(false);
      }
    }

    loadAssignments();
  }, [selectedGrade, search]);

  const assignmentCount = useMemo(() => assignments.length, [assignments]);

  if (loading) {
    return <div className={styles.loading}>Loading grade-subject assignments...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1>Grade Subjects</h1>
          <p>Assign subjects to grades for each academic year.</p>
        </div>

        <Link href="/dashboard/grades/subjects/new" className={styles.primaryButton}>
          + New Assignment
        </Link>
      </div>

      <div className={styles.summaryCard}>
        <div>
          <span className={styles.summaryLabel}>Total assignments</span>
          <strong>{assignmentCount}</strong>
        </div>
        <div>
          <span className={styles.summaryLabel}>Grade</span>
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className={styles.select}
          >
            <option value="">All Grades</option>
            {grades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className={styles.summaryLabel}>Search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by subject name..."
            className={styles.searchInput}
          />
        </div>
      </div>

      {error ? <div className={styles.errorBox}>{error}</div> : null}

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Grade</th>
              <th>Subject</th>
              <th>Academic Year</th>
              <th>Compulsory</th>
              <th>Periods/Week</th>
              <th>Total Marks</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.grade_name}</strong>
                </td>
                <td>{item.subject_name} ({item.subject_code})</td>
                <td>{item.academic_year_name}</td>
                <td>
                  <span
                    className={styles.statusPill}
                    style={{
                      background: item.is_compulsory ? "#dcfce7" : "#f3f4f6",
                      color: item.is_compulsory ? "#166534" : "#6b7280",
                    }}
                  >
                    {item.is_compulsory ? "Yes" : "No"}
                  </span>
                </td>
                <td>{item.weekly_periods ?? "—"}</td>
                <td>{item.total_marks ?? "—"}</td>
                <td>
                  <Link href={`/dashboard/grades/subjects/${item.id}`} className={styles.linkButton}>
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

