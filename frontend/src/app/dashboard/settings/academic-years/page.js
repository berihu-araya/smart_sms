"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import academicYearService from "@/services/academicYearService";
import styles from "./page.module.css";

export default function AcademicYearListPage() {
  const [years, setYears] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadYears() {
      try {
        setLoading(true);
        const data = await academicYearService.listAcademicYears({ search, limit: 50, offset: 0 });
        setYears(data.items || []);
        setError("");
      } catch (err) {
        setError(err.message || "Unable to load academic years");
      } finally {
        setLoading(false);
      }
    }

    loadYears();
  }, [search]);

  const yearCount = useMemo(() => years.length, [years]);

  async function handleSetActive(id) {
    try {
      await academicYearService.setActiveAcademicYear(id);
      // Reload list to reflect changes
      const data = await academicYearService.listAcademicYears({ search, limit: 50, offset: 0 });
      setYears(data.items || []);
    } catch (err) {
      setError(err.message || "Failed to set active academic year");
    }
  }

  async function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this academic year?")) return;

    try {
      await academicYearService.deleteAcademicYear(id);
      setYears((prev) => prev.filter((y) => y.id !== id));
    } catch (err) {
      setError(err.message || "Failed to delete academic year");
    }
  }

  if (loading) {
    return <div className={styles.loading}>Loading academic years...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1>Academic Years</h1>
          <p>Manage school academic years and set the active year.</p>
        </div>

        <Link href="/dashboard/settings/academic-years/new" className={styles.primaryButton}>
          + Add Academic Year
        </Link>
      </div>

      <div className={styles.summaryCard}>
        <div>
          <span className={styles.summaryLabel}>Total academic years</span>
          <strong>{yearCount}</strong>
        </div>
        <div>
          <span className={styles.summaryLabel}>Search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by year name"
            className={styles.searchInput}
          />
        </div>
      </div>

      {error ? <div className={styles.errorBox}>{error}</div> : null}

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Status</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {years.map((year) => (
              <tr key={year.id}>
                <td>
                  <strong>{year.name}</strong>
                  {year.is_active ? (
                    <span className={styles.activeBadge}>Active</span>
                  ) : null}
                </td>
                <td>{new Date(year.start_date).toLocaleDateString()}</td>
                <td>{new Date(year.end_date).toLocaleDateString()}</td>
                <td>
                  <span
                    className={styles.statusPill}
                    style={{
                      background: year.status === "ACTIVE" ? "#dcfce7" : "#f3f4f6",
                      color: year.status === "ACTIVE" ? "#166534" : "#6b7280",
                    }}
                  >
                    {year.status}
                  </span>
                </td>
                <td>{year.description || "—"}</td>
                <td>
                  <div className={styles.actionGroup}>
                    {!year.is_active ? (
                      <button
                        onClick={() => handleSetActive(year.id)}
                        className={styles.actionBtn}
                        title="Set as active year"
                      >
                        Activate
                      </button>
                    ) : (
                      <span className={styles.actionDisabled}>Active</span>
                    )}
                    <button
                      onClick={() => handleDelete(year.id)}
                      className={`${styles.actionBtn} ${styles.deleteBtn}`}
                      disabled={year.is_active}
                      title={year.is_active ? "Cannot delete active year" : "Delete year"}
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

