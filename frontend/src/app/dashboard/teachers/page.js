"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import teacherService from "@/services/teacherService";
import styles from "./page.module.css";

const STATUS_COLORS = {
  ACTIVE: { bg: "#dcfce7", color: "#166534" },
  INACTIVE: { bg: "#f3f4f6", color: "#6b7280" },
  TERMINATED: { bg: "#fee2e2", color: "#991b1b" },
  ON_LEAVE: { bg: "#fef3c7", color: "#92400e" },
};

export default function TeacherListPage() {
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTeachers() {
      try {
        setLoading(true);
        const data = await teacherService.listTeachers({ search, limit: 50, offset: 0 });
        setTeachers(data.items || []);
        setError("");
        setHasLoaded(true);
      } catch (err) {
        setError(err.message || "Unable to load teachers");
        setHasLoaded(true);
      } finally {
        setLoading(false);
      }
    }

    loadTeachers();
  }, [search]);

  const teacherCount = useMemo(() => teachers.length, [teachers]);

  if (loading && !hasLoaded) {
    return <div className={styles.loading}>Loading teachers...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1>Teacher Management</h1>
          <p>Manage teaching staff, profiles, and employment details.</p>
        </div>

        <Link href="/dashboard/teachers/new" className={styles.primaryButton}>
          + Add Teacher
        </Link>
      </div>

      <div className={styles.summaryCard}>
        <div>
          <span className={styles.summaryLabel}>Total teachers</span>
          <strong>{teacherCount}</strong>
        </div>
        <div>
          <span className={styles.summaryLabel}>Search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, employee ID, department..."
            className={styles.searchInput}
          />
        </div>
      </div>

      {error ? <div className={styles.errorBox}>{error}</div> : null}

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Employee #</th>
              <th>Name</th>
              <th>Department</th>
              <th>Designation</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((teacher) => (
              <tr key={teacher.id}>
                <td>
                  <strong>{teacher.employee_number}</strong>
                </td>
                <td>
                  {teacher.first_name} {teacher.last_name}
                </td>
                <td>{teacher.department || "—"}</td>
                <td>{teacher.designation || "—"}</td>
                <td>{teacher.phone || "—"}</td>
                <td>
                  <span
                    className={styles.statusPill}
                    style={{
                      background: (STATUS_COLORS[teacher.status] || STATUS_COLORS.INACTIVE).bg,
                      color: (STATUS_COLORS[teacher.status] || STATUS_COLORS.INACTIVE).color,
                    }}
                  >
                    {teacher.status}
                  </span>
                </td>
                <td>
                  <Link href={`/dashboard/teachers/${teacher.id}`} className={styles.linkButton}>
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

