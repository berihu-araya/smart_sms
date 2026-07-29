"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import gradeSubjectService from "@/services/gradeSubjectService";
import styles from "./details.module.css";

export default function GradeSubjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await gradeSubjectService.getGradeSubjectById(params.id);
        setItem(data);
      } catch (err) {
        setError(err.message || "Unable to load assignment");
      } finally {
        setLoading(false);
      }
    }

    if (params?.id) {
      load();
    }
  }, [params]);

  async function handleDelete() {
    if (!window.confirm("Are you sure you want to delete this grade-subject assignment?")) {
      return;
    }

    setDeleting(true);
    try {
      await gradeSubjectService.deleteGradeSubject(params.id);
      router.push("/dashboard/grades/subjects");
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

  if (!item) {
    return <div className={styles.loading}>Assignment not found.</div>;
  }

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <Link href="/dashboard">Dashboard</Link>
        <span className={styles.separator}>/</span>
        <Link href="/dashboard/grades">Grades</Link>
        <span className={styles.separator}>/</span>
        <Link href="/dashboard/grades/subjects">Subject Assignments</Link>
        <span className={styles.separator}>/</span>
        <span className={styles.current}>Details</span>
      </nav>

      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div>
              <h1 className={styles.title}>
                {item.subject_name} — {item.grade_name}
              </h1>
              <p className={styles.subtitle}>
                {item.subject_code} &middot; {item.academic_year_name}
              </p>
            </div>
          </div>
          <div className={styles.headerActions}>
            <Link
              href={`/dashboard/grades/subjects/${item.id}/edit`}
              className={styles.btnSecondary}
            >
              Edit
            </Link>
            <button onClick={handleDelete} disabled={deleting} className={styles.btnDanger}>
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={styles.content}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>📋 Assignment Details</h3>
            <div className={styles.infoGrid}>
              <Field label="Grade" value={item.grade_name} />
              <Field label="Subject" value={`${item.subject_name} (${item.subject_code})`} />
              <Field label="Academic Year" value={item.academic_year_name} />
              <Field label="Is Compulsory" value={item.is_compulsory ? "Yes" : "No"} />
              <Field label="Weekly Periods" value={item.weekly_periods ?? "—"} />
              <Field label="Total Marks" value={item.total_marks ?? "—"} />
              <Field label="Pass Marks" value={item.pass_marks ?? "—"} />
              <Field label="Display Order" value={item.display_order ?? "—"} />
              <Field label="Status" value={item.status} />
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>⚙️ System Information</h3>
            <div className={styles.infoGrid}>
              <Field label="Created" value={item.created_at ? new Date(item.created_at).toLocaleDateString() : "—"} />
              <Field label="Last Updated" value={item.updated_at ? new Date(item.updated_at).toLocaleDateString() : "—"} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <Link href="/dashboard/grades/subjects" className={styles.backLink}>
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

