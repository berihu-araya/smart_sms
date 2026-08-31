"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import subjectService from "@/services/subjectService";
import teacherSubjectService from "@/services/teacherSubjectService";
import StatusBadge from "@/components/common/StatusBadge";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import styles from "./details.module.css";
import {
  HiBookOpen,
  HiAcademicCap,
  HiPencilSquare,
  HiTrash,
  HiArrowLeft,
  HiUserPlus,
} from "react-icons/hi2";

export default function SubjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [assignments, setAssignments] = useState([]);

  // Deactivation confirm state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deleteReferences, setDeleteReferences] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function loadSubject() {
      try {
        setLoading(true);
        const [subjectData, assignmentsData] = await Promise.all([
          subjectService.getSubjectById(params.id),
          teacherSubjectService.listTeacherSubjects({
            subject_id: params.id,
            limit: 50,
          }).catch(() => ({ items: [] })),
        ]);
        setSubject(subjectData);
        setAssignments(assignmentsData.items || []);
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

  const handleInitiateDelete = async () => {
    try {
      setDeleting(true);
      setIsConfirmOpen(true);
      const refData = await subjectService.checkSubjectReferences(params.id);
      setDeleteReferences(refData);
    } catch (err) {
      console.error("Failed to check subject references:", err);
      setDeleteReferences(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await subjectService.deleteSubject(params.id);
      setIsConfirmOpen(false);
      router.push("/dashboard/subjects");
    } catch (err) {
      alert(err.message || "Failed to deactivate subject");
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading subject details...</div>;
  }

  if (error) {
    return <div className={styles.errorBox}>{error}</div>;
  }

  if (!subject) {
    return <div className={styles.loading}>Subject not found.</div>;
  }

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <Link href="/dashboard">Dashboard</Link>
        <span className={styles.separator}>/</span>
        <Link href="/dashboard/subjects">Subjects</Link>
        <span className={styles.separator}>/</span>
        <span className={styles.current}>{subject.subject_name}</span>
      </nav>

      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.avatar}>
              {subject.subject_name?.[0]}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h1 className={styles.title}>{subject.subject_name}</h1>
                <StatusBadge status={subject.status} />
              </div>
              <p className={styles.subtitle}>{subject.subject_code}</p>
            </div>
          </div>
          <div className={styles.headerActions}>
            <Link
              href={`/dashboard/grades/subjects?subject_id=${subject.id}`}
              className={styles.btnSecondary}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <HiAcademicCap size={16} /> Curriculum Map
            </Link>
            <button
              type="button"
              onClick={handleInitiateDelete}
              disabled={deleting}
              className={styles.btnDanger}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <HiTrash size={16} /> Deactivate
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
              <Field label="Credit Hours" value={subject.credit_hours !== null && subject.credit_hours !== undefined ? `${subject.credit_hours} hrs` : "—"} />
              <Field label="Pass Mark" value={subject.pass_mark ?? "—"} />
              <Field label="Maximum Mark" value={subject.max_mark ?? "—"} />
              <Field label="Is Elective" value={subject.is_elective ? "Yes (Elective)" : "No (Core)"} />
              <Field label="Is Lab" value={subject.is_lab ? "Yes (Practical Lab)" : "No (Theory Only)"} />
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

          {/* Assigned Teachers */}
          <div className={styles.section}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 className={styles.sectionTitle} style={{ margin: 0 }}>👨‍🏫 Assigned Teachers</h3>
              <Link
                href={`/dashboard/teachers/subjects/new`}
                className={styles.btnSecondary}
                style={{ padding: "6px 14px", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <HiUserPlus size={15} /> Assign Teacher
              </Link>
            </div>
            {assignments.length === 0 ? (
              <p style={{ color: "#667085", fontSize: 14, margin: 0 }}>
                No teachers assigned to this subject yet.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <th style={{ textAlign: "left", padding: "8px 10px", color: "#344054", fontWeight: 600 }}>Teacher</th>
                      <th style={{ textAlign: "left", padding: "8px 10px", color: "#344054", fontWeight: 600 }}>Grade</th>
                      <th style={{ textAlign: "left", padding: "8px 10px", color: "#344054", fontWeight: 600 }}>Section</th>
                      <th style={{ textAlign: "left", padding: "8px 10px", color: "#344054", fontWeight: 600 }}>Academic Year</th>
                      <th style={{ textAlign: "left", padding: "8px 10px", color: "#344054", fontWeight: 600 }}>Status</th>
                      <th style={{ textAlign: "left", padding: "8px 10px", color: "#344054", fontWeight: 600 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((a) => (
                      <tr key={a.id} style={{ borderBottom: "1px solid #f0f1f3" }}>
                        <td style={{ padding: "8px 10px" }}><strong>{a.teacher_name}</strong></td>
                        <td style={{ padding: "8px 10px" }}>{a.grade_name}</td>
                        <td style={{ padding: "8px 10px" }}>{a.section_name}</td>
                        <td style={{ padding: "8px 10px" }}>{a.academic_year_name}</td>
                        <td style={{ padding: "8px 10px" }}>
                          <StatusBadge status={a.status} />
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          <Link
                            href={`/dashboard/teachers/subjects/${a.id}`}
                            style={{ color: "#2563eb", textDecoration: "none", fontWeight: 600, fontSize: 13 }}
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <Link href="/dashboard/subjects" className={styles.backLink}>
            <HiArrowLeft size={16} /> Back to Subjects
          </Link>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Deactivate Subject"
        itemName={subject?.subject_name}
        itemType="subject"
        references={deleteReferences}
        loading={deleting}
        confirmText="Confirm Deactivation"
      />
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
