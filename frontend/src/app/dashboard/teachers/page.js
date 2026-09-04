"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import teacherService from "@/services/teacherService";
import TeacherFormModal from "@/components/teachers/TeacherFormModal";
import styles from "./page.module.css";

const STATUS_COLORS = {
  ACTIVE: { bg: "#dcfce7", color: "#166534" },
  INACTIVE: { bg: "#f3f4f6", color: "#6b7280" },
  TERMINATED: { bg: "#fee2e2", color: "#991b1b" },
  ON_LEAVE: { bg: "#fef3c7", color: "#92400e" },
};

export default function TeacherListPage() {
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState(null);

  useEffect(() => {
    async function loadTeachers() {
      try {
        setLoading(true);
        const data = await teacherService.listTeachers({ search, limit: 50, offset: 0 });
        setTeachers(data.items || []);
        setError("");
        setHasLoaded(true);
      } catch (err) {
        setError(err.message || "Unable to load teachers");
        setHasLoaded(true);
      } finally {
        setLoading(false);
      }
    }

    loadTeachers();
  }, [search, reloadTrigger]);

  const teacherCount = useMemo(() => teachers.length, [teachers]);

  const handleOpenCreate = () => {
    setEditingTeacherId(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (teacherId) => {
    setEditingTeacherId(teacherId);
    setIsModalOpen(true);
  };

  const handleTeacherSaved = (savedTeacher) => {
    const tName = savedTeacher?.first_name
      ? `${savedTeacher.first_name} ${savedTeacher.last_name}`
      : "Teacher";
    setSuccessMsg(
      editingTeacherId
        ? `Teacher "${tName}" profile updated successfully!`
        : `Teacher "${tName}" registered successfully!`
    );
    setReloadTrigger((prev) => prev + 1);
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  if (loading && !hasLoaded) {
    return <div className={styles.loading}>Loading teachers...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1>Teacher Management</h1>
          <p>Manage teaching staff, profiles, and employment details.</p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className={styles.primaryButton}
        >
          + Add Teacher
        </button>
      </div>

      {successMsg ? <div className={styles.successBox}>{successMsg}</div> : null}

      <div className={styles.summaryCard}>
        <div>
          <span className={styles.summaryLabel}>Total teachers</span>
          <strong>{teacherCount}</strong>
        </div>
        <div>
          <span className={styles.summaryLabel}>Search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, employee ID, department..."
            className={styles.searchInput}
          />
        </div>
      </div>

      {error ? <div className={styles.errorBox}>{error}</div> : null}

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Employee #</th>
              <th>Name</th>
              <th>Department</th>
              <th>Designation</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((teacher) => (
              <tr key={teacher.id}>
                <td>
                  <strong>{teacher.employee_number}</strong>
                </td>
                <td>
                  {teacher.first_name} {teacher.last_name}
                </td>
                <td>{teacher.department || "—"}</td>
                <td>{teacher.designation || "—"}</td>
                <td>{teacher.phone || "—"}</td>
                <td>
                  <span
                    className={styles.statusPill}
                    style={{
                      background: (STATUS_COLORS[teacher.status] || STATUS_COLORS.INACTIVE).bg,
                      color: (STATUS_COLORS[teacher.status] || STATUS_COLORS.INACTIVE).color,
                    }}
                  >
                    {teacher.status}
                  </span>
                </td>
                <td>
                  <div className={styles.actionButtons}>
                    <Link href={`/dashboard/teachers/${teacher.id}`} className={styles.linkButton}>
                      View
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(teacher.id)}
                      className={styles.editLink}
                    >
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reusable Teacher Form Modal (Create & Edit) */}
      <TeacherFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        teacherId={editingTeacherId}
        onSuccess={handleTeacherSaved}
      />
    </div>
  );
}

