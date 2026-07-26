"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import sectionService from "@/services/sectionService";
import gradeService from "@/services/gradeService";
import styles from "./page.module.css";

export default function SectionListPage() {
  const [sections, setSections] = useState([]);
  const [grades, setGrades] = useState([]);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadGrades() {
      try {
        const data = await gradeService.listGrades({ limit: 100 });
        setGrades(data.items || []);
      } catch (err) {
        console.warn("Could not load grades for filter:", err.message);
      }
    }
    loadGrades();
  }, []);

  useEffect(() => {
    async function loadSections() {
      try {
        setLoading(true);
        const data = await sectionService.listSections({
          search,
          gradeId: gradeFilter,
          limit: 50,
          offset: 0,
        });
        setSections(data.items || []);
        setError("");
      } catch (err) {
        setError(err.message || "Unable to load sections");
      } finally {
        setLoading(false);
      }
    }

    loadSections();
  }, [search, gradeFilter]);

  const sectionCount = useMemo(() => sections.length, [sections]);

  if (loading) {
    return <div className={styles.loading}>Loading sections...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1>Section Management</h1>
          <p>Organize classes into sections with grade and capacity details.</p>
        </div>

        <Link href="/dashboard/sections/new" className={styles.primaryButton}>
          + Add Section
        </Link>
      </div>

      <div className={styles.summaryCard}>
        <div>
          <span className={styles.summaryLabel}>Total visible</span>
          <strong>{sectionCount}</strong>
        </div>
        <div>
          <span className={styles.summaryLabel}>Search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, room, or grade"
            className={styles.searchInput}
          />
        </div>
        <div>
          <span className={styles.summaryLabel}>Grade</span>
          <select
            value={gradeFilter}
            onChange={(event) => setGradeFilter(event.target.value)}
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
      </div>

      {error ? <div className={styles.errorBox}>{error}</div> : null}

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Section</th>
              <th>Grade</th>
              <th>Room</th>
              <th>Capacity</th>
              <th>Students</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((section) => (
              <tr key={section.id}>
                <td>
                  <strong>{section.name}</strong>
                </td>
                <td>{section.grade_name || "—"}</td>
                <td>{section.room_number || "—"}</td>
                <td>{section.capacity || "—"}</td>
                <td>{section.student_count || 0}</td>
                <td>
                  <Link href={`/dashboard/sections/${section.id}`} className={styles.linkButton}>
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

