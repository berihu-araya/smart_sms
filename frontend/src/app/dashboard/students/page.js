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

  useEffect(() => {
    async function loadStudents() {
      try {
        setLoading(true);
        const data = await studentService.listStudents({ search, limit: 20, offset: 0 });
        setStudents(data.items || []);
        setError("");
      } catch (err) {
        setError(err.message || "Unable to load students");
      } finally {
        setLoading(false);
      }
    }

    loadStudents();
  }, [search]);

  const studentCount = useMemo(() => students.length, [students]);

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
              <th>Status</th>
              <th>Admission Date</th>
              <th>Action</th>
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
                <td>
                  <span className={styles.statusPill}>{student.status}</span>
                </td>
                <td>{student.admission_date}</td>
                <td>
                  <Link href={`/dashboard/students/${student.id}`} className={styles.linkButton}>
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
