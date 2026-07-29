"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import subjectService from "@/services/subjectService";
import styles from "./details.module.css";

const STATUS_CONFIG = {
  ACTIVE: { bg: "#dcfce7", color: "#166534" },
  INACTIVE: { bg: "#f3f4f6", color: "#6b7280" },
  ARCHIVED: { bg: "#fee2e2", color: "#991b1b" },
};

export default function SubjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function loadSubject() {
      try {
        setLoading(true);
        const data = await subjectService.getSubjectById(params.id);
        setSubject(data);
      } catch (err) {
        setError(err.message || "Unable to load subject");
      } finally {
        setLoading(false);
      }
    }

    if (params?.id) {
      loadSubject();
    }
  }, [params]);

  async function handleDelete() {
    if (!window.confirm("Are you sure you want to delete this subject?")) {
      return;
    }

    setDeleting(true);
    try {
      await subjectService.deleteSubject(params.id);
      router.push("/dashboard/subjects");
    } catch (err) {
      alert(err.message || "Failed to delete subject");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return <div className={styles.loading}>Loading subject details...</div>;
  }

  if (error) {
    return <div className={styles.errorBox}>{error}</div>;
  }

  if (!subject) {
    return <div className={styles.loading}>Subject not found.</div>;
  }

  const statusStyle = STATUS_CONFIG[subject.status] || STATUS_CONFIG.INACTIVE;

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <Link href="/dashboard">Dashboard</Link>
        <span className={styles.separator}>/</span>
        <Link href="/dashboard/subjects">Subjects</Link>
        <span className={styles.separator}>/</span>
        <span className={styles.current}>Details</span>
      </nav>

      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.avatar}>
              {subject.subject_name?.[0]}
            </div>
            <div>
              <h1 className={styles.title}>{subject.subject_name}</h1>
              <p className={styles.subtitle}>{subject.subject_code}</p>
            </div>
          </div>
          <div className={styles.headerActions}>
            <span
              className={styles.statusBadge}
              style={{ background: statusStyle.bg, color: statusStyle.color }}
            >
              {subject.status}
            </span>
            <Link
              href={`/dashboard/subjects/${subject.id}/edit`}
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
          {/* Basic Information */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>📘 Basic Information</h3>
            <div className={styles.infoGrid}>
              <Field label="Subject Code" value={subject.subject_code} />
              <Field label="Subject Name" value={subject.subject_name} />
              <Field label="Short Name" value={subject.short_name || "—"} />
              <Field label="Description" value={subject.description || "—"} />
              <Field label="Display Order" value={subject.display_order ?? "—"} />
              <Field label="Status" value={subject.status} />
            </div>
          </div>

          {/* Academic Details */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>📊 Academic Details</h3>
            <div className={styles.infoGrid}>
              <Field label="Credit Hours" value={subject.credit_hours ?? "—"} />
              <Field label="Pass Mark" value={subject.pass_mark ?? "—"} />
              <Field label="Maximum Mark" value={subject.max_mark ?? "—"} />
              <Field label="Is Elective" value={subject.is_elective ? "Yes" : "No"} />
              <Field label="Is Lab" value={subject.is_lab ? "Yes" : "No"} />
            </div>
          </div>

          {/* System Information */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>⚙️ System Information</h3>
            <div className={styles.infoGrid}>
              <Field label="Created" value={subject.created_at ? new Date(subject.created_at).toLocaleDateString() : "—"} />
              <Field label="Last Updated" value={subject.updated_at ? new Date(subject.updated_at).toLocaleDateString() : "—"} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <Link href="/dashboard/subjects" className={styles.backLink}>
            ← Back to Subjects
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

