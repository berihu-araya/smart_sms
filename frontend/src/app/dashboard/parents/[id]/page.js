"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  FaUserGraduate,
  FaPhoneAlt,
  FaEnvelope,
  FaBriefcase,
  FaMapMarkerAlt,
  FaEdit,
  FaArrowLeft,
  FaCheckCircle,
} from "react-icons/fa";
import parentService from "@/services/parentService";
import ParentFormModal from "@/components/parents/ParentFormModal";
import styles from "./details.module.css";

export default function ParentDetailsPage() {
  const params = useParams();
  const parentId = params?.id;

  const [parent, setParent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

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

  const handleEditSuccess = async (updatedData) => {
    try {
      const refreshed = await parentService.getParentById(parentId);
      setParent(refreshed);
    } catch {
      if (updatedData) {
        setParent((prev) => ({
          ...prev,
          full_name: updatedData.fullName || updatedData.full_name || prev.full_name,
          relationship: updatedData.relationship || prev.relationship,
          phone: updatedData.phone || prev.phone,
          email: updatedData.email || prev.email,
          occupation: updatedData.occupation || prev.occupation,
          address: updatedData.address || prev.address,
        }));
      }
    }
    setToastMessage("Guardian details updated successfully!");
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  if (loading) {
    return <div className={styles.loading}>Loading parent details...</div>;
  }

  if (error || !parent) {
    return (
      <div className={styles.page}>
        <div
          style={{
            color: "#dc2626",
            background: "#fef2f2",
            padding: "1rem",
            borderRadius: "0.5rem",
          }}
        >
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
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "#0f172a",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: "0.88rem",
            fontWeight: 600,
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25)",
            zIndex: 1100,
          }}
        >
          <FaCheckCircle color="#34d399" size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content (Dimmed when edit modal is open) */}
      <div className={`${styles.pageMain} ${isEditModalOpen ? styles.pageDimmed : ""}`}>
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
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className={styles.editButton}
            style={{ cursor: "pointer", border: "none" }}
          >
            <FaEdit /> Edit Guardian
          </button>
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

      {/* Edit Parent Modal */}
      <ParentFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleEditSuccess}
        initialData={parent}
      />
    </div>
  );
}
