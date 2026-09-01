"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import staffRoleService from "@/services/staffRoleService";
import academicYearService from "@/services/academicYearService";
import styles from "./page.module.css";
import {
  HiPlus,
  HiCheckCircle,
  HiXMark,
  HiTrash,
  HiMagnifyingGlass,
} from "react-icons/hi2";

export default function StaffRolesListPage() {
  const [assignments, setAssignments] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const yearsData = await academicYearService.listAcademicYears({ limit: 100 });
        setAcademicYears(yearsData.items || []);
        const activeYear = yearsData.items?.find((y) => y.is_active);
        setSelectedYear(activeYear?.id || "");
      } catch (err) {
        console.error("Failed to load years", err);
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    async function loadAssignments() {
      try {
        setLoading(true);
        const data = await staffRoleService.listRoleAssignments({
          search,
          limit: 200,
          academicYearId: selectedYear,
        });
        setAssignments(data.items || []);
        setError("");
      } catch (err) {
        setError(err.message || "Failed to load role assignments");
      } finally {
        setLoading(false);
      }
    }

    const timeout = setTimeout(() => loadAssignments(), 300);
    return () => clearTimeout(timeout);
  }, [search, selectedYear]);

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleDeactivate = async (id, roleName, teacherName) => {
    if (!window.confirm(`Deactivate ${roleName} assignment for ${teacherName}?`)) {
      return;
    }

    try {
      setActionLoading(true);
      await staffRoleService.deactivateRoleAssignment(id);
      showToast(`Deactivated ${roleName}`);
      setAssignments(assignments.filter((a) => a.id !== id));
    } catch (err) {
      alert(err.message || "Failed to deactivate");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading staff roles...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1>Leadership & Staff Roles</h1>
          <p>Manage school director, vice director, unit leaders, and class teachers</p>
        </div>
        <Link href="/dashboard/staff-roles/new" className={styles.btnPrimary}>
          <HiPlus size={18} /> Assign Role
        </Link>
      </div>

      {notification && (
        <div className={`${styles.alert} ${styles.alertSuccess}`}>
          <HiCheckCircle size={20} /> {notification}
        </div>
      )}
      {error && (
        <div className={`${styles.alert} ${styles.alertError}`}>
          <HiXMark size={20} /> {error}
        </div>
      )}

      <div className={styles.controlCard}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: "16px", alignItems: "end" }}>
          <div className={styles.inputWrapper}>
            <HiMagnifyingGlass className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search by teacher or role name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className={styles.select}
          >
            <option value="">All Academic Years</option>
            {academicYears.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name} {y.is_active ? "★" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {assignments.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No staff role assignments found.</p>
          <Link href="/dashboard/staff-roles/new" className={styles.btnPrimary}>
            <HiPlus size={16} /> Assign First Role
          </Link>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Teacher Name</th>
                  <th>Role</th>
                  <th>Scope</th>
                  <th>Assigned To</th>
                  <th>Academic Year</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id}>
                    <td><strong>{a.teacher_name}</strong></td>
                    <td>{a.role_name}</td>
                    <td>
                      <span style={{ fontSize: "12px", background: "#f3f4f6", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>
                        {a.scope_type?.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {a.scope_type === "school" ? "School" : a.scope_type === "unit" ? a.unit_name || "—" : a.section_name || "—"}
                    </td>
                    <td>{a.academic_year_name}</td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: 600,
                          background: a.status === "ACTIVE" ? "#dcfce7" : "#f3f4f6",
                          color: a.status === "ACTIVE" ? "#166534" : "#6b7280",
                        }}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actionsCell} style={{ justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                          onClick={() => handleDeactivate(a.id, a.role_name, a.teacher_name)}
                          disabled={actionLoading}
                          title="Deactivate"
                        >
                          <HiTrash size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
