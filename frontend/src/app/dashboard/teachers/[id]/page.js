"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import teacherService from "@/services/teacherService";
import teacherSubjectService from "@/services/teacherSubjectService";
import styles from "./details.module.css";

const STATUS_CONFIG = {
  ACTIVE: { bg: "#dcfce7", color: "#166534" },
  INACTIVE: { bg: "#f3f4f6", color: "#6b7280" },
  TERMINATED: { bg: "#fee2e2", color: "#991b1b" },
  ON_LEAVE: { bg: "#fef3c7", color: "#92400e" },
};

export default function TeacherDetailsPage() {
  const params = useParams();
  const router = useRouter();
const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [assignments, setAssignments] = useState([]);

useEffect(() => {
    async function loadTeacher() {
      try {
        setLoading(true);
        const data = await teacherService.getTeacherById(params.id);
        setTeacher(data);

        // Load teacher's subject assignments
        try {
          const assignmentsData = await teacherSubjectService.listTeacherSubjects({
            teacher_id: params.id,
            limit: 50,
          });
          setAssignments(assignmentsData.items || []);
        } catch (err) {
          console.error("Failed to load assignments", err);
        }
      } catch (err) {
        setError(err.message || "Unable to load teacher");
      } finally {
        setLoading(false);
      }
    }

    if (params?.id) {
      loadTeacher();
    }
  }, [params]);

  async function handleDelete() {
    if (!window.confirm("Are you sure you want to delete this teacher?")) {
      return;
    }

    setDeleting(true);
    try {
      await teacherService.deleteTeacher(params.id);
      router.push("/dashboard/teachers");
    } catch (err) {
      alert(err.message || "Failed to delete teacher");
    } finally {
      setDeleting(false);
    }
  }

  async function handleStatusChange(newStatus) {
    try {
      if (newStatus === "ACTIVE") {
        await teacherService.activateTeacher(params.id);
      } else if (newStatus === "TERMINATED") {
        await teacherService.terminateTeacher(params.id);
      }
      const data = await teacherService.getTeacherById(params.id);
      setTeacher(data);
    } catch (err) {
      alert(err.message || "Failed to update status");
    }
  }

  if (loading) {
    return <div style={{ padding: 24 }}>Loading teacher details...</div>;
  }

  if (error) {
    return <div style={{ padding: 24, color: "#9a5b00" }}>{error}</div>;
  }

  if (!teacher) {
    return <div style={{ padding: 24 }}>Teacher not found.</div>;
  }

 const statusStyle =
  STATUS_CONFIG[teacher.status] || STATUS_CONFIG.INACTIVE;

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <Link href="/dashboard">Dashboard</Link>
        <span className={styles.separator}>/</span>
        <Link href="/dashboard/teachers">Teachers</Link>
        <span className={styles.separator}>/</span>
        <span className={styles.current}>Details</span>
      </nav>

      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.avatar}>
              {teacher.first_name?.[0]}{teacher.last_name?.[0]}
            </div>
            <div>
              <h1 className={styles.title}>
                {teacher.first_name} {teacher.last_name}
              </h1>
              <p className={styles.subtitle}>
                {teacher.designation || "Staff"} &middot; {teacher.employee_number}
              </p>
            </div>
          </div>
          <div className={styles.headerActions}>
            <span
              className={styles.statusBadge}
              style={{ background: statusStyle.bg, color: statusStyle.color }}
            >
              {teacher.status}
            </span>
            <Link
              href={`/dashboard/teachers/${teacher.id}/edit`}
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
          {/* Personal Information */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>👤 Personal Information</h3>
            <div className={styles.infoGrid}>
              <Field label="First Name" value={teacher.first_name} />
              <Field label="Last Name" value={teacher.last_name} />
              <Field label="Gender" value={teacher.gender} />
              <Field label="Date of Birth" value={teacher.date_of_birth ? new Date(teacher.date_of_birth).toLocaleDateString() : "—"} />
              <Field label="Phone" value={teacher.phone || "—"} />
              <Field label="Email" value={teacher.email || "—"} />
              <Field label="Address" value={teacher.address || "—"} />
            </div>
          </div>

          {/* Employment Information */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>💼 Employment Information</h3>
            <div className={styles.infoGrid}>
              <Field label="Employee Number" value={teacher.employee_number} />
              <Field label="Department" value={teacher.department || "—"} />
              <Field label="Designation" value={teacher.designation || "—"} />
              <Field label="Qualification" value={teacher.qualification || "—"} />
              <Field label="Joining Date" value={teacher.joining_date ? new Date(teacher.joining_date).toLocaleDateString() : "—"} />
              <Field label="Status" value={teacher.status} />
            </div>
          </div>

          {/* Status Actions */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>⚡ Status Actions</h3>
            <div className={styles.statusActions}>
              {teacher.status !== "ACTIVE" && (
                <button
                  onClick={() => handleStatusChange("ACTIVE")}
                  className={styles.btnSuccess}
                >
                  Activate
                </button>
              )}
              {teacher.status !== "TERMINATED" && (
                <button
                  onClick={() => handleStatusChange("TERMINATED")}
                  className={styles.btnDanger}
                >
                  Terminate
                </button>
              )}
            </div>
          </div>

          {/* Assigned Subjects */}
          <div className={styles.section}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 className={styles.sectionTitle} style={{ margin: 0 }}>📚 Assigned Subjects</h3>
              <Link
                href={`/dashboard/teachers/subjects/new?teacher_id=${teacher.id}`}
                className={styles.btnSecondary}
                style={{ padding: "6px 14px", fontSize: 13 }}
              >
                + Assign Subject
              </Link>
            </div>
            {assignments.length === 0 ? (
              <p style={{ color: "#667085", fontSize: 14, margin: 0 }}>
                No subjects assigned yet.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <th style={{ textAlign: "left", padding: "8px 10px", color: "#344054", fontWeight: 600 }}>Subject</th>
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
                        <td style={{ padding: "8px 10px" }}>{a.subject_name}</td>
                        <td style={{ padding: "8px 10px" }}>{a.grade_name}</td>
                        <td style={{ padding: "8px 10px" }}>{a.section_name}</td>
                        <td style={{ padding: "8px 10px" }}>{a.academic_year_name}</td>
                        <td style={{ padding: "8px 10px" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              padding: "2px 8px",
                              borderRadius: 999,
                              fontSize: 11,
                              fontWeight: 700,
                              background: a.status === "ACTIVE" ? "#dcfce7" : "#f3f4f6",
                              color: a.status === "ACTIVE" ? "#166534" : "#6b7280",
                            }}
                          >
                            {a.status}
                          </span>
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
          <Link href="/dashboard/teachers" className={styles.backLink}>
            ← Back to Teachers
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

