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
        <span className={styles.current}>Details</span>
      </nav>

      <div className={styles.card}>
        {/* Header */}
        <div className={styles.cardHeader}>
          <div>
            <h1 className={styles.studentName}>
              {`${student.first_name} ${student.last_name}`}
            </h1>
            <p className={styles.admissionText}>
              Admission: {student.admission_number}
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
              <Field label="Date of Birth" value={student.date_of_birth || "—"} />
              <Field label="Admission Date" value={student.admission_date} />
            </div>
          </div>

          {/* Contact Details */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>📞 Contact Details</h3>
            <div className={styles.fieldList}>
              <Field label="Email" value={student.email || "—"} />
              <Field label="Phone" value={student.phone || "—"} />
              <Field label="Address" value={student.address || "—"} />
            </div>
          </div>

          {/* Academic Info */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>🏫 Academic Information</h3>
            <div className={styles.fieldList}>
              <Field label="Grade" value={academicInfo.gradeName || "—"} />
              <Field label="Section" value={academicInfo.section || "—"} />
              <Field label="Room" value={academicInfo.room || "—"} />
              <Field label="Status" value={academicInfo.currentStatus} />
            </div>
          </div>

          {/* Guardian */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>👪 Guardian</h3>
            <div className={styles.fieldList}>
              <Field label="Name" value={guardian.name || "—"} />
              <Field label="Phone" value={guardian.phone || "—"} />
              <Field label="Email" value={guardian.email || "—"} />
              <Field label="Address" value={guardian.address || "—"} />
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

