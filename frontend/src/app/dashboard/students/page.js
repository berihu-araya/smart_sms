"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import studentService from "@/services/studentService";
import styles from "./page.module.css";

export default function StudentListPage() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadStudents() {
      try {
        setLoading(true);
        const data = await studentService.listStudents({ search, limit: 20, offset: 0 });
        if (!cancelled) {
          setStudents(data.items || []);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load students");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadStudents();

    return () => {
      cancelled = true;
    };
  }, [search, reloadTrigger]);

  const studentCount = useMemo(() => students.length, [students]);

  async function handleDelete(studentId, studentName) {
    if (!confirm(`Are you sure you want to delete "${studentName}"?`)) return;

    try {
      await studentService.deleteStudent(studentId);
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      alert("Failed to delete: " + (err.message || "Unknown error"));
    }
  }

  if (loading) {
    return <div className={styles.loading}>Loading students...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1>Student Management</h1>
          <p>Manage admission, profile, status, and academic records.</p>
        </div>

        <Link href="/dashboard/students/new" className={styles.primaryButton}>
          + Add Student
        </Link>
      </div>

      <div className={styles.summaryCard}>
        <div>
          <span className={styles.summaryLabel}>Total visible</span>
          <strong>{studentCount}</strong>
        </div>
        <div>
          <span className={styles.summaryLabel}>Search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or admission"
            className={styles.searchInput}
          />
        </div>
      </div>

      {error ? <div className={styles.errorBox}>{error}</div> : null}

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Admission</th>
              <th>Student</th>
              <th>Gender</th>
              <th>Grade</th>
              <th>Section</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td>{student.admission_number}</td>
                <td>
                  <strong>{`${student.first_name} ${student.last_name}`}</strong>
                </td>
                <td>{student.gender}</td>
                <td>{student.grade_name || "—"}</td>
                <td>{student.section_name || "—"}</td>
                <td>
                  <span className={`${styles.statusPill} ${styles[`status${student.status}`] || ""}`}>
                    {student.status}
                  </span>
                </td>
                <td>
                  <div className={styles.actionButtons}>
                    <Link href={`/dashboard/students/${student.id}`} className={styles.linkButton}>
                      View
                    </Link>
                    <Link href={`/dashboard/students/${student.id}/edit`} className={styles.editLink}>
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(student.id, `${student.first_name} ${student.last_name}`)}
                      className={styles.deleteLink}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

