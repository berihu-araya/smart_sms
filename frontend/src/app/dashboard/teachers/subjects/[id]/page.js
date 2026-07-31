"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import teacherSubjectService from "@/services/teacherSubjectService";
import styles from "./details.module.css";

const STATUS_CONFIG = {
  ACTIVE: { bg: "#dcfce7", color: "#166534" },
  INACTIVE: { bg: "#f3f4f6", color: "#6b7280" },
};

export default function TeacherSubjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function loadAssignment() {
      try {
        setLoading(true);
        const data = await teacherSubjectService.getTeacherSubjectById(params.id);
        setAssignment(data);
      } catch (err) {
        setError(err.message || "Unable to load assignment");
      } finally {
        setLoading(false);
      }
    }

    if (params?.id) {
      loadAssignment();
    }
  }, [params]);

  async function handleDelete() {
    if (!window.confirm("Are you sure you want to remove this teacher-subject assignment?")) {
      return;
    }

    setDeleting(true);
    try {
      await teacherSubjectService.deleteTeacherSubject(params.id);
      router.push("/dashboard/teachers/subjects");
    } catch (err) {
      alert(err.message || "Failed to delete assignment");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return <div className={styles.loading}>Loading assignment details...</div>;
  }

  if (error) {
    return <div className={styles.errorBox}>{error}</div>;
  }

  if (!assignment) {
    return <div className={styles.loading}>Assignment not found.</div>;
  }

  const statusStyle = STATUS_CONFIG[assignment.status] || STATUS_CONFIG.INACTIVE;

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <Link href="/dashboard">Dashboard</Link>
        <span className={styles.separator}>/</span>
        <Link href="/dashboard/teachers/subjects">Teacher Subjects</Link>
        <span className={styles.separator}>/</span>
        <span className={styles.current}>Details</span>
      </nav>

      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.avatar}>
              {assignment.teacher_name?.[0]}
            </div>
            <div>
              <h1 className={styles.title}>{assignment.teacher_name}</h1>
              <p className={styles.subtitle}>
                {assignment.subject_name} &middot; {assignment.grade_name} - {assignment.section_name}
              </p>
            </div>
          </div>
          <div className={styles.headerActions}>
            <span
              className={styles.statusBadge}
              style={{ background: statusStyle.bg, color: statusStyle.color }}
            >
              {assignment.status}
            </span>
            <Link
              href={`/dashboard/teachers/subjects/${assignment.id}/edit`}
              className={styles.btnSecondary}
            >
              Edit
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className={styles.btnDanger}
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Assignment Information */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>📋 Assignment Information</h3>
            <div className={styles.infoGrid}>
              <Field label="Teacher" value={assignment.teacher_name} />
              <Field label="Subject" value={`${assignment.subject_name} (${assignment.subject_code})`} />
              <Field label="Grade" value={assignment.grade_name} />
              <Field label="Section" value={assignment.section_name} />
              <Field label="Academic Year" value={assignment.academic_year_name} />
              <Field label="Status" value={assignment.status} />
            </div>
          </div>

          {/* Dates */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>📅 Assignment Dates</h3>
            <div className={styles.infoGrid}>
              <Field
                label="Start Date"
                value={assignment.start_date ? new Date(assignment.start_date).toLocaleDateString() : "—"}
              />
              <Field
                label="End Date"
                value={assignment.end_date ? new Date(assignment.end_date).toLocaleDateString() : "—"}
              />
            </div>
          </div>

          {/* System Information */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>⚙️ System Information</h3>
            <div className={styles.infoGrid}>
              <Field
                label="Created"
                value={assignment.created_at ? new Date(assignment.created_at).toLocaleDateString() : "—"}
              />
              <Field
                label="Last Updated"
                value={assignment.updated_at ? new Date(assignment.updated_at).toLocaleDateString() : "—"}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <Link href="/dashboard/teachers/subjects" className={styles.backLink}>
            ← Back to Assignments
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
