"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import unitService from "@/services/unitService";
import styles from "./page.module.css";
import {
  HiPlus,
  HiPencilSquare,
  HiTrash,
  HiEye,
  HiCheckCircle,
  HiXMark,
  HiMagnifyingGlass,
} from "react-icons/hi2";

export default function UnitsListPage() {
  const [units, setUnits] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function loadUnits() {
      try {
        setLoading(true);
        const data = await unitService.listUnits({ search, limit: 100 });
        setUnits(data.items || []);
        setError("");
      } catch (err) {
        setError(err.message || "Failed to load units");
      } finally {
        setLoading(false);
      }
    }

    loadUnits();
  }, [search]);

  const showToast = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete unit "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setActionLoading(true);
      await unitService.deleteUnit(id);
      showToast(`Unit "${name}" deleted successfully`);
      setUnits(units.filter((u) => u.id !== id));
    } catch (err) {
      alert(err.message || "Failed to delete unit");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading units...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1>Organizational Units</h1>
          <p>Manage groupings of classes (e.g., Primary Unit, Secondary Unit)</p>
        </div>
        <Link href="/dashboard/units/new" className={styles.btnPrimary}>
          <HiPlus size={18} /> Create Unit
        </Link>
      </div>

      {notification && (
        <div className={`${styles.alert} ${styles.alertSuccess}`}>
          <HiCheckCircle size={20} /> {notification.msg}
        </div>
      )}
      {error && (
        <div className={`${styles.alert} ${styles.alertError}`}>
          <HiXMark size={20} /> {error}
        </div>
      )}

      <div className={styles.controlCard}>
        <div className={styles.inputWrapper}>
          <HiMagnifyingGlass className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search units by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      {units.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No units created yet. Create one to organize your classes.</p>
          <Link href="/dashboard/units/new" className={styles.btnPrimary}>
            <HiPlus size={16} /> Create Your First Unit
          </Link>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Unit Name</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Classes Assigned</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {units.map((unit) => (
                  <tr key={unit.id}>
                    <td>
                      <strong>{unit.name}</strong>
                    </td>
                    <td style={{ color: "#64748b", fontSize: "14px" }}>
                      {unit.description || "—"}
                    </td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: 600,
                          background: unit.status === "ACTIVE" ? "#dcfce7" : "#f3f4f6",
                          color: unit.status === "ACTIVE" ? "#166534" : "#6b7280",
                        }}
                      >
                        {unit.status}
                      </span>
                    </td>
                    <td style={{ textAlign: "center", color: "#0f172a", fontWeight: 600 }}>
                      {unit.class_count || 0}
                    </td>
                    <td>
                      <div className={styles.actionsCell} style={{ justifyContent: "flex-end" }}>
                        <Link
                          href={`/dashboard/units/${unit.id}`}
                          className={styles.iconBtn}
                          title="View"
                        >
                          <HiEye size={15} />
                        </Link>
                        <Link
                          href={`/dashboard/units/${unit.id}/classes`}
                          className={styles.iconBtn}
                          title="Manage Classes"
                        >
                          <HiPencilSquare size={15} />
                        </Link>
                        <Link
                          href={`/dashboard/units/${unit.id}/edit`}
                          className={styles.iconBtn}
                          title="Edit"
                        >
                          <HiPencilSquare size={15} />
                        </Link>
                        <button
                          type="button"
                          className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                          onClick={() => handleDelete(unit.id, unit.name)}
                          disabled={actionLoading}
                          title="Delete"
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
