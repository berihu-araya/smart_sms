"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { FaUserTie, FaUserGraduate, FaPhoneAlt, FaEnvelope, FaBriefcase, FaMapMarkerAlt, FaEdit, FaArrowLeft } from "react-icons/fa";
import parentService from "@/services/parentService";
import styles from "./details.module.css";

export default function ParentDetailsPage() {
  const params = useParams();
  const parentId = params?.id;

  const [parent, setParent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!parentId) return;

    async function loadParent() {
      try {
        setLoading(true);
        const data = await parentService.getParentById(parentId);
        setParent(data);
      } catch (err) {
        setError(err.message || "Failed to load parent details");
      } finally {
        setLoading(false);
      }
    }

    loadParent();
  }, [parentId]);

  if (loading) {
    return <div className={styles.loading}>Loading parent details...</div>;
  }

  if (error || !parent) {
    return (
      <div className={styles.page}>
        <div style={{ color: "#dc2626", background: "#fef2f2", padding: "1rem", borderRadius: "0.5rem" }}>
          {error || "Parent not found"}
        </div>
        <div style={{ marginTop: "1rem" }}>
          <Link href="/dashboard/parents" className={styles.backButton}>
            ← Back to Parents
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <Link href="/dashboard">Dashboard</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <Link href="/dashboard/parents">Parents</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span style={{ color: "#111827", fontWeight: 500 }}>{parent.full_name}</span>
      </nav>

      {/* Header */}
      <div className={styles.headerRow}>
        <div>
          <h1>{parent.full_name}</h1>
          <p>Guardian Profile & Linked Students/Wards</p>
        </div>

        <div className={styles.headerActions}>
          <Link href={`/dashboard/parents/${parent.id}/edit`} className={styles.editButton}>
            <FaEdit /> Edit Guardian
          </Link>
          <Link href="/dashboard/parents" className={styles.backButton}>
            <FaArrowLeft /> Back
          </Link>
        </div>
      </div>

      {/* Profile Layout */}
      <div className={styles.grid}>
        {/* Left Card: Guardian Info */}
        <div className={styles.card}>
          <div className={styles.avatarBox}>
            <div className={styles.avatar}>
              {parent.full_name?.charAt(0)?.toUpperCase() || "P"}
            </div>
            <div className={styles.avatarInfo}>
              <h3>{parent.full_name}</h3>
              <span className={styles.relationTag}>{parent.relationship || "GUARDIAN"}</span>
            </div>
          </div>

          <div className={styles.infoList}>
            <div className={styles.infoItem}>
              <label>Phone Number</label>
              <span>
                {parent.phone ? (
                  <a href={`tel:${parent.phone}`} style={{ color: "#2563eb", textDecoration: "none" }}>
                    <FaPhoneAlt size={12} style={{ marginRight: 6 }} /> {parent.phone}
                  </a>
                ) : (
                  <span style={{ color: "#9ca3af" }}>Not provided</span>
                )}
              </span>
            </div>

            <div className={styles.infoItem}>
              <label>Email Address</label>
              <span>
                {parent.email ? (
                  <a href={`mailto:${parent.email}`} style={{ color: "#2563eb", textDecoration: "none" }}>
                    <FaEnvelope size={12} style={{ marginRight: 6 }} /> {parent.email}
                  </a>
                ) : (
                  <span style={{ color: "#9ca3af" }}>Not provided</span>
                )}
              </span>
            </div>

            <div className={styles.infoItem}>
              <label>Occupation</label>
              <span>
                <FaBriefcase size={12} style={{ marginRight: 6, color: "#6b7280" }} />
                {parent.occupation || "Not provided"}
              </span>
            </div>

            <div className={styles.infoItem}>
              <label>Home Address</label>
              <span>
                <FaMapMarkerAlt size={12} style={{ marginRight: 6, color: "#6b7280" }} />
                {parent.address || "Not provided"}
              </span>
            </div>

            <div className={styles.infoItem}>
              <label>Registered Date</label>
              <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                {parent.created_at ? new Date(parent.created_at).toLocaleDateString() : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Right Card: Linked Students */}
        <div>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>
              <FaUserGraduate color="#2563eb" /> Linked Students ({parent.students?.length || 0})
            </h3>

            {parent.students && parent.students.length > 0 ? (
              parent.students.map((st) => (
                <div key={st.id} className={styles.studentCard}>
                  <div className={styles.studentInfo}>
                    <h4>{`${st.first_name} ${st.last_name}`}</h4>
                    <div className={styles.studentMeta}>
                      <span>
                        <strong>Adm:</strong> {st.admission_number}
                      </span>
                      <span>
                        <strong>Grade:</strong> {st.grade_name || "—"}
                      </span>
                      <span>
                        <strong>Section:</strong> {st.section_name || "—"}
                      </span>
                      <span>
                        <strong>Status:</strong> {st.status}
                      </span>
                    </div>
                  </div>

                  <Link href={`/dashboard/students/${st.id}`} className={styles.studentLink}>
                    View Student →
                  </Link>
                </div>
              ))
            ) : (
              <div className={styles.emptyStudents}>
                <p>No students currently linked to this guardian record.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
