"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import subjectGroupService from "@/services/subjectGroupService";
import subjectService from "@/services/subjectService";
import styles from "./details.module.css";

export default function SubjectGroupDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [group, setGroup] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [assigning, setAssigning] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      const [groupData, subjectsData, groupSubjectsData] = await Promise.all([
        subjectGroupService.getGroupById(params.id),
        subjectService.listSubjects({ limit: 100, offset: 0 }),
        subjectGroupService.listGroupSubjects(params.id),
      ]);

      setGroup(groupData);
      setSubjects(groupSubjectsData || []);

      // Filter out subjects already in the group
      const assignedIds = new Set((groupSubjectsData || []).map((s) => s.id));
      const available = (subjectsData.items || []).filter((s) => !assignedIds.has(s.id));
      setAvailableSubjects(available);
    } catch (err) {
      setError(err.message || "Unable to load group");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (params?.id) {
      loadData();
    }
  }, [params]);

  async function handleDelete() {
    if (!window.confirm("Are you sure you want to delete this subject group?")) {
      return;
    }

    setDeleting(true);
    try {
      await subjectGroupService.deleteGroup(params.id);
      router.push("/dashboard/subjects/groups");
    } catch (err) {
      alert(err.message || "Failed to delete group");
    } finally {
      setDeleting(false);
    }
  }

  async function handleAssignSubject() {
    if (!selectedSubjectId) return;

    setAssigning(true);
    try {
      await subjectGroupService.assignSubject(params.id, selectedSubjectId);
      setSelectedSubjectId("");
      await loadData();
    } catch (err) {
      alert(err.message || "Failed to assign subject");
    } finally {
      setAssigning(false);
    }
  }

  async function handleRemoveSubject(subjectId) {
    if (!window.confirm("Remove this subject from the group?")) return;

    try {
      await subjectGroupService.removeSubject(params.id, subjectId);
      await loadData();
    } catch (err) {
      alert(err.message || "Failed to remove subject");
    }
  }

  if (loading) {
    return <div className={styles.loading}>Loading group details...</div>;
  }

  if (error) {
    return <div className={styles.errorBox}>{error}</div>;
  }

  if (!group) {
    return <div className={styles.loading}>Group not found.</div>;
  }

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <Link href="/dashboard">Dashboard</Link>
        <span className={styles.separator}>/</span>
        <Link href="/dashboard/subjects">Subjects</Link>
        <span className={styles.separator}>/</span>
        <Link href="/dashboard/subjects/groups">Groups</Link>
        <span className={styles.separator}>/</span>
        <span className={styles.current}>Details</span>
      </nav>

      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.avatar}>{group.group_name?.[0]}</div>
            <div>
              <h1 className={styles.title}>{group.group_name}</h1>
              <p className={styles.subtitle}>
                {group.subject_count || 0} subject(s) &middot; {group.status}
              </p>
            </div>
          </div>
          <div className={styles.headerActions}>
            <Link
              href={`/dashboard/subjects/groups/${group.id}/edit`}
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
          {/* Group Information */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>📁 Group Information</h3>
            <div className={styles.infoGrid}>
              <Field label="Group Name" value={group.group_name} />
              <Field label="Description" value={group.description || "—"} />
              <Field label="Status" value={group.status} />
              <Field label="Display Order" value={group.display_order ?? "—"} />
            </div>
          </div>

          {/* Assigned Subjects */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>📚 Assigned Subjects</h3>

            {/* Assign Subject Form */}
            <div className={styles.assignRow}>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className={styles.select}
              >
                <option value="">-- Select a subject to assign --</option>
                {availableSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.subject_code} - {s.subject_name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAssignSubject}
                disabled={!selectedSubjectId || assigning}
                className={styles.btnPrimary}
              >
                {assigning ? "Assigning..." : "Assign"}
              </button>
            </div>

            {subjects.length === 0 ? (
              <p className={styles.emptyText}>No subjects assigned to this group yet.</p>
            ) : (
              <table className={styles.subjectsTable}>
                <thead>
                  <tr>
                    <th>Subject Code</th>
                    <th>Subject Name</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((subject) => (
                    <tr key={subject.id}>
                      <td>
                        <strong>{subject.subject_code}</strong>
                      </td>
                      <td>{subject.subject_name}</td>
                      <td>
                        <span
                          className={styles.statusPill}
                          style={{
                            background: subject.status === "ACTIVE" ? "#dcfce7" : "#f3f4f6",
                            color: subject.status === "ACTIVE" ? "#166534" : "#6b7280",
                          }}
                        >
                          {subject.status}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleRemoveSubject(subject.id)}
                          className={styles.btnRemove}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <Link href="/dashboard/subjects/groups" className={styles.backLink}>
            ← Back to Groups
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

