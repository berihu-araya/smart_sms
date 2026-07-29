"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import subjectService from "@/services/subjectService";
import styles from "./page.module.css";

const STATUS_COLORS = {
  ACTIVE: { bg: "#dcfce7", color: "#166534" },
  INACTIVE: { bg: "#f3f4f6", color: "#6b7280" },
  ARCHIVED: { bg: "#fee2e2", color: "#991b1b" },
};

export default function SubjectListPage() {
  const [subjects, setSubjects] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSubjects() {
      try {
        setLoading(true);
        const data = await subjectService.listSubjects({ search, limit: 50, offset: 0 });
        setSubjects(data.items || []);
        setError("");
      } catch (err) {
        setError(err.message || "Unable to load subjects");
      } finally {
        setLoading(false);
      }
    }

    loadSubjects();
  }, [search]);

  const subjectCount = useMemo(() => subjects.length, [subjects]);

  if (loading) {
    return <div className={styles.loading}>Loading subjects...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1>Subject Management</h1>
          <p>Create and manage subjects offered in the school.</p>
        </div>

        <Link href="/dashboard/subjects/new" className={styles.primaryButton}>
          + Add Subject
        </Link>
      </div>

      <div className={styles.summaryCard}>
        <div>
          <span className={styles.summaryLabel}>Total subjects</span>
          <strong>{subjectCount}</strong>
        </div>
        <div>
          <span className={styles.summaryLabel}>Search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, code, short name..."
            className={styles.searchInput}
          />
        </div>
      </div>

      {error ? <div className={styles.errorBox}>{error}</div> : null}

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Subject Code</th>
              <th>Subject Name</th>
              <th>Short Name</th>
              <th>Credit Hours</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((subject) => (
              <tr key={subject.id}>
                <td>
                  <strong>{subject.subject_code}</strong>
                </td>
                <td>{subject.subject_name}</td>
                <td>{subject.short_name || "—"}</td>
                <td>{subject.credit_hours ?? "—"}</td>
                <td>
                  <span
                    className={styles.statusPill}
                    style={{
                      background: (STATUS_COLORS[subject.status] || STATUS_COLORS.INACTIVE).bg,
                      color: (STATUS_COLORS[subject.status] || STATUS_COLORS.INACTIVE).color,
                    }}
                  >
                    {subject.status}
                  </span>
                </td>
                <td>
                  <Link href={`/dashboard/subjects/${subject.id}`} className={styles.linkButton}>
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

