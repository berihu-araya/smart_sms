"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FaUsers, FaUserGraduate, FaPhoneAlt, FaEnvelope, FaPlus, FaSearch } from "react-icons/fa";
import parentService from "@/services/parentService";
import styles from "./page.module.css";

export default function ParentsListPage() {
  const [parents, setParents] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadParents() {
      try {
        setLoading(true);
        const data = await parentService.listParents({ search, limit: 50, offset: 0 });
        if (!cancelled) {
          setParents(data.items || []);
          setTotal(data.total || 0);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load parents");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    const timer = setTimeout(() => {
      loadParents();
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, reloadTrigger]);

  async function handleDelete(parentId, parentName) {
    if (!confirm(`Are you sure you want to delete guardian "${parentName}"?`)) return;

    try {
      await parentService.deleteParent(parentId);
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      alert("Failed to delete guardian: " + (err.message || "Unknown error"));
    }
  }

  const totalStudentsLinked = parents.reduce(
    (acc, curr) => acc + Number(curr.students_count || 0),
    0
  );

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <Link href="/dashboard">Dashboard</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span style={{ color: "#111827", fontWeight: 500 }}>Parents & Guardians</span>
      </nav>

      {/* Header */}
      <div className={styles.headerRow}>
        <div>
          <h1>Parents & Guardians</h1>
          <p>Manage parent contact records, occupations, and linked students/wards.</p>
        </div>

        <Link href="/dashboard/parents/new" className={styles.primaryButton}>
          <FaPlus /> Add Parent
        </Link>
      </div>

      {/* Quick Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FaUsers />
          </div>
          <div className={styles.statInfo}>
            <h4>Total Guardians</h4>
            <div>{total}</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: "#ecfdf5", color: "#059669" }}>
            <FaUserGraduate />
          </div>
          <div className={styles.statInfo}>
            <h4>Linked Students</h4>
            <div>{totalStudentsLinked}</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbarCard}>
        <div className={styles.searchBox}>
          <FaSearch color="#9ca3af" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by parent name, phone, email, occupation..."
          />
        </div>
        <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
          Showing <strong>{parents.length}</strong> of <strong>{total}</strong> records
        </div>
      </div>

      {error ? <div className={styles.errorBox}>{error}</div> : null}

      {/* Table */}
      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.loading}>Loading parents & guardians...</div>
        ) : parents.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>👨‍👩‍👧‍👦</div>
            <h3>No Parents Found</h3>
            <p>
              {search
                ? `No guardian matching "${search}"`
                : "No parents registered yet. They will appear automatically when students are registered."}
            </p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Guardian Name</th>
                <th>Relationship</th>
                <th>Phone Number</th>
                <th>Email Address</th>
                <th>Occupation</th>
                <th>Linked Students</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {parents.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span className={styles.parentName}>{p.full_name}</span>
                    {p.address && (
                      <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>{p.address}</span>
                    )}
                  </td>
                  <td>
                    <span className={styles.parentRelation}>{p.relationship || "GUARDIAN"}</span>
                  </td>
                  <td>
                    {p.phone ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem" }}>
                        <FaPhoneAlt size={12} color="#6b7280" /> {p.phone}
                      </span>
                    ) : (
                      <span style={{ color: "#9ca3af" }}>—</span>
                    )}
                  </td>
                  <td>
                    {p.email ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem" }}>
                        <FaEnvelope size={12} color="#6b7280" /> {p.email}
                      </span>
                    ) : (
                      <span style={{ color: "#9ca3af" }}>—</span>
                    )}
                  </td>
                  <td>{p.occupation || <span style={{ color: "#9ca3af" }}>—</span>}</td>
                  <td>
                    <span
                      className={`${styles.studentBadge} ${
                        Number(p.students_count) === 0 ? styles.zeroBadge : ""
                      }`}
                    >
                      <FaUserGraduate size={11} /> {p.students_count || 0} Student
                      {Number(p.students_count) === 1 ? "" : "s"}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actionButtons}>
                      <Link href={`/dashboard/parents/${p.id}`} className={styles.viewBtn}>
                        View
                      </Link>
                      <Link href={`/dashboard/parents/${p.id}/edit`} className={styles.editBtn}>
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(p.id, p.full_name)}
                        className={styles.deleteBtn}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
