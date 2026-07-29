"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import subjectGroupService from "@/services/subjectGroupService";
import styles from "./page.module.css";

export default function SubjectGroupListPage() {
  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadGroups() {
      try {
        setLoading(true);
        const data = await subjectGroupService.listGroups({ search, limit: 50, offset: 0 });
        setGroups(data.items || []);
        setError("");
      } catch (err) {
        setError(err.message || "Unable to load subject groups");
      } finally {
        setLoading(false);
      }
    }

    loadGroups();
  }, [search]);

  const groupCount = useMemo(() => groups.length, [groups]);

  if (loading) {
    return <div className={styles.loading}>Loading subject groups...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1>Subject Groups</h1>
          <p>Organise subjects into logical groups for curriculum planning.</p>
        </div>

        <Link href="/dashboard/subjects/groups/new" className={styles.primaryButton}>
          + Add Group
        </Link>
      </div>

      <div className={styles.summaryCard}>
        <div>
          <span className={styles.summaryLabel}>Total groups</span>
          <strong>{groupCount}</strong>
        </div>
        <div>
          <span className={styles.summaryLabel}>Search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by group name..."
            className={styles.searchInput}
          />
        </div>
      </div>

      {error ? <div className={styles.errorBox}>{error}</div> : null}

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Group Name</th>
              <th>Description</th>
              <th>Subjects</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr key={group.id}>
                <td>
                  <strong>{group.group_name}</strong>
                </td>
                <td>{group.description || "—"}</td>
                <td>
                  <span className={styles.countPill}>{group.subject_count || 0}</span>
                </td>
                <td>
                  <span
                    className={styles.statusPill}
                    style={{
                      background: group.status === "ACTIVE" ? "#dcfce7" : "#f3f4f6",
                      color: group.status === "ACTIVE" ? "#166534" : "#6b7280",
                    }}
                  >
                    {group.status}
                  </span>
                </td>
                <td>
                  <Link href={`/dashboard/subjects/groups/${group.id}`} className={styles.linkButton}>
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

