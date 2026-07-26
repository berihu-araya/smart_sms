"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import gradeService from "@/services/gradeService";
import styles from "./page.module.css";

export default function GradeListPage() {
  const [grades, setGrades] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadGrades() {
      try {
        setLoading(true);
        const data = await gradeService.listGrades({ search, limit: 50, offset: 0 });
        setGrades(data.items || []);
        setError("");
      } catch (err) {
        setError(err.message || "Unable to load grades");
      } finally {
        setLoading(false);
      }
    }

    loadGrades();
  }, [search]);

  const gradeCount = useMemo(() => grades.length, [grades]);

  if (loading) {
    return <div className={styles.loading}>Loading grades...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1>Grade Management</h1>
          <p>Create and manage grade levels for the school.</p>
        </div>

        <Link href="/dashboard/grades/new" className={styles.primaryButton}>
          + Add Grade
        </Link>
      </div>

      <div className={styles.summaryCard}>
        <div>
          <span className={styles.summaryLabel}>Total grades</span>
          <strong>{gradeCount}</strong>
        </div>
        <div>
          <span className={styles.summaryLabel}>Search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by grade name"
            className={styles.searchInput}
          />
        </div>
      </div>

      {error ? <div className={styles.errorBox}>{error}</div> : null}

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Grade Name</th>
              <th>Description</th>
              <th>Sections</th>
              <th>Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {grades.map((grade) => (
              <tr key={grade.id}>
                <td>
                  <strong>{grade.name}</strong>
                </td>
                <td>{grade.description || "—"}</td>
                <td>
                  <span className={styles.statusPill}>{grade.section_count || 0}</span>
                </td>
                <td>{new Date(grade.created_at).toLocaleDateString()}</td>
                <td>
                  <Link href={`/dashboard/grades/${grade.id}`} className={styles.linkButton}>
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

