"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import unitService from "@/services/unitService";
import styles from "../../page.module.css";
import { HiPencilSquare, HiArrowLeft, HiSquares2X2 } from "react-icons/hi2";

export default function ViewUnitPage() {
  const params = useParams();
  const unitId = params.id;

  const [unit, setUnit] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [unitData, classesData] = await Promise.all([
          unitService.getUnitById(unitId),
          unitService.getUnitClasses(unitId),
        ]);
        setUnit(unitData);
        setClasses(classesData.items || []);
      } catch (err) {
        setError(err.message || "Failed to load unit");
      } finally {
        setLoading(false);
      }
    }

    if (unitId) {
      loadData();
    }
  }, [unitId]);

  if (loading) {
    return <div className={styles.loading}>Loading unit...</div>;
  }

  if (!unit) {
    return <div className={styles.loading}>Unit not found</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1>{unit.name}</h1>
          <p style={{ color: "#667085" }}>{unit.description || "No description"}</p>
        </div>
        <Link href={`/dashboard/units/${unitId}/edit`} className={styles.btnPrimary}>
          <HiPencilSquare size={18} /> Edit
        </Link>
      </div>

      <div className={styles.formCard}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div>
            <div style={{ fontSize: "12px", color: "#667085", fontWeight: 600, marginBottom: "4px" }}>
              STATUS
            </div>
            <div style={{ fontSize: "16px", fontWeight: 600 }}>
              <span
                style={{
                  display: "inline-block",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  background: unit.status === "ACTIVE" ? "#dcfce7" : "#f3f4f6",
                  color: unit.status === "ACTIVE" ? "#166534" : "#6b7280",
                }}
              >
                {unit.status}
              </span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: "12px", color: "#667085", fontWeight: 600, marginBottom: "4px" }}>
              CLASSES ASSIGNED
            </div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#0f172a" }}>
              {classes.length}
            </div>
          </div>
        </div>
      </div>

      <div>
        <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <HiSquares2X2 /> Classes in This Unit ({classes.length})
          </h3>
          <Link href={`/dashboard/units/${unitId}/classes`} className={styles.btnSecondary}>
            Manage Classes
          </Link>
        </div>

        {classes.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No classes assigned to this unit yet.</p>
            <Link href={`/dashboard/units/${unitId}/classes`} className={styles.btnPrimary}>
              Assign Classes Now
            </Link>
          </div>
        ) : (
          <div className={styles.tableCard}>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Grade</th>
                    <th>Class</th>
                    <th>Academic Year</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((c) => (
                    <tr key={c.id}>
                      <td><strong>{c.grade_name}</strong></td>
                      <td>{c.section_name}</td>
                      <td>{c.academic_year_name}</td>
                      <td>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: 600,
                            background: c.status === "ACTIVE" ? "#dcfce7" : "#f3f4f6",
                            color: c.status === "ACTIVE" ? "#166534" : "#6b7280",
                          }}
                        >
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: "20px" }}>
        <Link href="/dashboard/units" className={styles.btnSecondary}>
          <HiArrowLeft size={16} /> Back to Units
        </Link>
      </div>
    </div>
  );
}
