"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import studentService from "@/services/studentService";
import styles from "./details.module.css";

export default function StudentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStudent() {
      try {
        setLoading(true);
        const data = await studentService.getStudentProfile(params.id);
        setProfile(data);
      } catch (err) {
        setError(err.message || "Unable to load student profile");
      } finally {
        setLoading(false);
      }
    }

    if (params?.id) {
      loadStudent();
    }
  }, [params]);

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this student?")) return;

    try {
      await studentService.deleteStudent(params.id);
      router.push("/dashboard/students");
    } catch (err) {
      alert("Failed to delete: " + (err.message || "Unknown error"));
    }
  }

  if (loading) {
    return <div className={styles.loading}>Loading student profile...</div>;
  }

  if (error) {
    return <div className={styles.errorBox}>{error}</div>;
  }

  if (!profile) {
    return <div className={styles.loading}>Student not found.</div>;
  }

  const { student, guardian, academicInfo } = profile;

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <Link href="/dashboard">Dashboard</Link>
        <span className={styles.separator}>/</span>
        <Link href="/dashboard/students">Students</Link>
        <span className={styles.separator}>/</span>
        <span className={styles.current}>{student.first_name} {student.last_name}</span>
      </nav>

      <div className={styles.card}>
        {/* Header */}
        <div className={styles.cardHeader}>
          <div>
            <h1 className={styles.studentName}>
              {`${student.first_name} ${student.last_name}`}
            </h1>
            <p className={styles.admissionText}>
              Admission: <strong>{student.admission_number}</strong>
            </p>
          </div>
          <div className={styles.headerActions}>
            <span className={`${styles.statusPill} ${styles[`status${student.status}`] || styles.statusDefault}`}>
              {student.status}
            </span>
            <Link href={`/dashboard/students/${params.id}/edit`} className={styles.editButton}>
              ✏️ Edit
            </Link>
            <button onClick={handleDelete} className={styles.deleteButton}>
              🗑️ Delete
            </button>
          </div>
        </div>

        {/* Content Grid */}
        <div className={styles.contentGrid}>
          {/* Personal Information */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>👤 Personal Information</h3>
            <div className={styles.fieldList}>
              <Field label="First Name" value={student.first_name} />
              <Field label="Last Name" value={student.last_name} />
              <Field label="Gender" value={student.gender} />
              <Field label="Date of Birth" value={student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : "—"} />
              <Field label="Admission Date" value={student.admission_date ? new Date(student.admission_date).toLocaleDateString() : "—"} />
            </div>
          </div>

          {/* Contact Details */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>📞 Contact Details</h3>
            <div className={styles.fieldList}>
              <Field label="Email" value={student.email || "—"} />
              <Field label="Phone" value={student.phone || "—"} />
              <Field label="Home Address" value={student.address || "—"} />
            </div>
          </div>

          {/* Academic Info */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>🏫 Academic Information</h3>
            <div className={styles.fieldList}>
              <Field label="Grade" value={academicInfo.gradeName || "—"} />
              <Field label="Section" value={academicInfo.sectionName || academicInfo.section || "—"} />
              <Field label="Room" value={academicInfo.roomNumber || academicInfo.room || "—"} />
              <Field label="Status" value={academicInfo.currentStatus} />
            </div>
          </div>

          {/* Guardian Information */}
          <div className={styles.section}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 className={styles.sectionTitle} style={{ margin: 0 }}>👨‍👩‍👧‍👦 Guardian Details</h3>
              {guardian?.id && (
                <Link
                  href={`/dashboard/parents/${guardian.id}`}
                  style={{
                    fontSize: "0.75rem",
                    color: "#2563eb",
                    textDecoration: "none",
                    fontWeight: 600,
                    background: "#eff6ff",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    border: "1px solid #bfdbfe",
                  }}
                >
                  View Guardian Profile →
                </Link>
              )}
            </div>
            <div className={styles.fieldList}>
              <Field label="Full Name" value={guardian?.name || "—"} />
              <Field label="Relationship" value={guardian?.relationship || "GUARDIAN"} />
              <Field label="Phone" value={guardian?.phone || "—"} />
              <Field label="Email" value={guardian?.email || "—"} />
              <Field label="Occupation" value={guardian?.occupation || "—"} />
              <Field label="Address" value={guardian?.address || "—"} />
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className={styles.cardFooter}>
          <Link href="/dashboard/students" className={styles.backLink}>
            ← Back to Students
          </Link>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <p className={styles.fieldValue}>{value}</p>
    </div>
  );
}
