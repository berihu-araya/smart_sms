"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import gradeSubjectService from "@/services/gradeSubjectService";
import gradeService from "@/services/gradeService";
import subjectService from "@/services/subjectService";
import academicYearService from "@/services/academicYearService";
import teacherService from "@/services/teacherService";
import {
  GradeSubjectFormModal,
  GradeSubjectDeleteModal,
} from "@/components/grades";
import styles from "./details.module.css";
import { HiCheckCircle, HiPencilSquare, HiTrash } from "react-icons/hi2";

export default function GradeSubjectDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const [item, setItem] = useState(null);
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState(null);

  // Modal States
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const showToast = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = useCallback(async () => {
    if (!params?.id) return;
    try {
      setLoading(true);
      setError("");

      const [data, gradesData, subjectsData, yearsData, teachersData] =
        await Promise.all([
          gradeSubjectService.getGradeSubjectById(params.id),
          gradeService.listGrades({ limit: 100 }).catch(() => ({ items: [] })),
          subjectService.listSubjects({ limit: 200 }).catch(() => ({ items: [] })),
          academicYearService.listAcademicYears({ limit: 100 }).catch(() => ({ items: [] })),
          teacherService.listTeachers({ limit: 200 }).catch(() => ({ items: [] })),
        ]);

      setItem(data);
      setGrades(gradesData.items || gradesData.data?.items || []);
      setSubjects(subjectsData.items || subjectsData.data?.items || []);
      setAcademicYears(yearsData.items || yearsData.data?.items || []);
      setTeachers(teachersData.items || teachersData.data?.items || (Array.isArray(teachersData) ? teachersData : []));
    } catch (err) {
      setError(err.message || "Unable to load assignment details");
    } finally {
      setLoading(false);
    }
  }, [params?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

      {/* Notification Toast */}
      {notification && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            color: "#166534",
            padding: "12px 16px",
            borderRadius: "10px",
            marginBottom: "16px",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          <HiCheckCircle size={20} />
          <span>{notification.msg}</span>
        </div>
      )}

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
            <button
              type="button"
              onClick={() => setIsEditOpen(true)}
              className={styles.btnSecondary}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <HiPencilSquare size={16} /> Edit Settings
            </button>
            <button
              type="button"
              onClick={() => setIsDeleteOpen(true)}
              className={styles.btnDanger}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <HiTrash size={16} /> Remove Subject
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={styles.content}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>📋 Assignment Details</h3>
            <div className={styles.infoGrid}>
              <Field label="Grade" value={item.grade_name} />
              <Field
                label="Subject"
                value={`${item.subject_name} (${item.subject_code})`}
              />
              <Field label="Academic Year" value={item.academic_year_name} />
              <Field
                label="Is Compulsory"
                value={item.is_compulsory ? "Yes (Core)" : "No (Elective)"}
              />
              <Field
                label="Assigned Teacher"
                value={item.teacher_name ? `👨‍🏫 ${item.teacher_name}` : "Not Assigned"}
              />
              <Field
                label="Weekly Periods"
                value={item.weekly_periods ? `${item.weekly_periods} periods/wk` : "—"}
              />
              <Field
                label="Total Marks"
                value={item.total_marks ? `${item.total_marks} pts` : "100 pts"}
              />
              <Field
                label="Pass Benchmark"
                value={item.pass_marks ? `${item.pass_marks} pts` : "40 pts"}
              />
              <Field label="Display Order" value={item.display_order ?? "1"} />
              <Field label="Status" value={item.status || "ACTIVE"} />
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>⚙️ System Information</h3>
            <div className={styles.infoGrid}>
              <Field
                label="Created"
                value={
                  item.created_at
                    ? new Date(item.created_at).toLocaleDateString()
                    : "—"
                }
              />
              <Field
                label="Last Updated"
                value={
                  item.updated_at
                    ? new Date(item.updated_at).toLocaleDateString()
                    : "—"
                }
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <Link href="/dashboard/grades/subjects" className={styles.backLink}>
            ← Back to Subject Assignments
          </Link>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditOpen && (
        <GradeSubjectFormModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          assignment={item}
          grades={grades}
          subjects={subjects}
          academicYears={academicYears}
          teachers={teachers}
          onSuccess={(msg) => {
            showToast(msg);
            loadData();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteOpen && (
        <GradeSubjectDeleteModal
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          assignment={item}
          onSuccess={() => {
            router.push("/dashboard/grades/subjects");
          }}
        />
      )}
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
