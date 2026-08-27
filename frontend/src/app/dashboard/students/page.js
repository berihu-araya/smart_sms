"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import studentService from "@/services/studentService";
import gradeService from "@/services/gradeService";
import sectionService from "@/services/sectionService";
import {
  FaBan,
  FaCheckCircle,
  FaChevronDown,
  FaChevronRight,
  FaGraduationCap,
  FaLayerGroup,
  FaMars,
  FaQuestionCircle,
  FaUserGraduate,
  FaVenus,
  FaVenusMars,
} from "react-icons/fa";
import styles from "./page.module.css";

const GENDERS = ["MALE", "FEMALE", "OTHER"];
const STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED", "GRADUATED", "WITHDRAWN"];
const FILTER_OPTIONS = [
  { value: "gender", label: "Gender", icon: FaVenusMars },
  { value: "grade", label: "Grade", icon: FaGraduationCap },
  { value: "section", label: "Section", icon: FaLayerGroup },
  { value: "status", label: "Status", icon: FaCheckCircle },
];

const GROUP_ICONS = {
  MALE: FaMars,
  FEMALE: FaVenus,
  OTHER: FaVenusMars,
  ACTIVE: FaCheckCircle,
  INACTIVE: FaBan,
  SUSPENDED: FaQuestionCircle,
  GRADUATED: FaUserGraduate,
  WITHDRAWN: FaBan,
};

export default function StudentListPage() {
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState([]);
  const [sections, setSections] = useState([]);
  const [name, setName] = useState("");
  const [filterBy, setFilterBy] = useState("");
  const [expandedGroup, setExpandedGroup] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState("");
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    async function loadFilterOptions() {
      try {
        const [gradesData, sectionsData] = await Promise.all([
          gradeService.listGrades({ limit: 100, offset: 0 }),
          sectionService.listSections({ limit: 200, offset: 0 }),
        ]);
        setGrades(gradesData.items || []);
        setSections(sectionsData.items || []);
      } catch (err) {
        setError(err.message || "Unable to load filter options");
      }
    }

    loadFilterOptions();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadStudents() {
      try {
        setLoading(true);
        const data = await studentService.listStudents({
          name,
          limit: 1000,
          offset: 0,
        });
        if (!cancelled) {
          setStudents(data.items || []);
          setError("");
          setHasLoaded(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load students");
          setHasLoaded(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadStudents();

    return () => {
      cancelled = true;
    };
  }, [name, reloadTrigger]);

  const studentCount = useMemo(() => students.length, [students]);

  const groups = useMemo(() => {
    if (filterBy === "gender") {
      return GENDERS.map((gender) => ({
        key: `gender-${gender}`,
        label: gender,
        icon: GROUP_ICONS[gender],
        students: students.filter((student) => student.gender === gender),
      }));
    }

    if (filterBy === "status") {
      return STATUSES.map((status) => ({
        key: `status-${status}`,
        label: status,
        icon: GROUP_ICONS[status],
        students: students.filter((student) => student.status === status),
      }));
    }

    if (filterBy === "section") {
      return sections.map((section) => ({
        key: `section-${section.id}`,
        label: section.name,
        detail: section.grade_name || "",
        icon: FaLayerGroup,
        students: students.filter((student) => student.section_id === section.id),
      }));
    }

    if (filterBy === "grade") {
      return grades.map((grade) => ({
        key: `grade-${grade.id}`,
        label: grade.name,
        icon: FaGraduationCap,
        sections: sections
          .filter((section) => section.grade_id === grade.id)
          .map((section) => ({
            ...section,
            students: students.filter((student) => student.section_id === section.id),
          })),
        students: students.filter((student) => student.grade_id === grade.id),
      }));
    }

    return [];
  }, [filterBy, grades, sections, students]);

  async function handleDelete(studentId, studentName) {
    if (!confirm(`Are you sure you want to delete "${studentName}"?`)) return;

    try {
      await studentService.deleteStudent(studentId);
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      alert("Failed to delete: " + (err.message || "Unknown error"));
    }
  }

  function renderStudentTable(groupStudents) {
    return (
      <table className={styles.groupTable}>
        <thead>
          <tr>
            <th>Admission</th>
            <th>Student</th>
            <th>Gender</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {groupStudents.map((student) => (
            <tr key={student.id}>
              <td>{student.admission_number}</td>
              <td><strong>{`${student.first_name} ${student.last_name}`}</strong></td>
              <td>{student.gender}</td>
              <td><span className={`${styles.statusPill} ${styles[`status${student.status}`] || ""}`}>{student.status}</span></td>
              <td>
                <div className={styles.actionButtons}>
                  <Link href={`/dashboard/students/${student.id}`} className={styles.linkButton}>View</Link>
                  <Link href={`/dashboard/students/${student.id}/edit`} className={styles.editLink}>Edit</Link>
                  <button onClick={() => handleDelete(student.id, `${student.first_name} ${student.last_name}`)} className={styles.deleteLink}>Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (loading && !hasLoaded) {
    return <div className={styles.loading}>Loading students...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1>Student Management</h1>
          <p>Manage admission, profile, status, and academic records.</p>
        </div>

        <Link href="/dashboard/students/new" className={styles.primaryButton}>
          + Add Student
        </Link>
      </div>

      <div className={styles.summaryCard}>
        <div>
          <span className={styles.summaryLabel}>Total visible</span>
          <strong>{studentCount}</strong>
        </div>
        <label className={styles.filterField}>
          <span className={styles.summaryLabel}>Name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name or admission number" className={styles.searchInput} />
        </label>
        <label className={styles.filterField}>
          <span className={styles.summaryLabel}>Filter by</span>
          <span className={styles.selectShell}>
            {(() => {
              const FilterIcon = FILTER_OPTIONS.find((option) => option.value === filterBy)?.icon;
              return FilterIcon ? <FilterIcon className={styles.selectIcon} aria-hidden="true" /> : null;
            })()}
            <select value={filterBy} onChange={(event) => { setFilterBy(event.target.value); setExpandedGroup(""); }} className={`${styles.searchInput} ${styles.iconSelect}`}>
              <option value="">Choose a filter</option>
              {FILTER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </span>
        </label>
      </div>

      {error ? <div className={styles.errorBox}>{error}</div> : null}

      {filterBy ? (
        <div className={styles.groupsCard}>
          <div className={styles.groupsHeader}>
            <strong>{FILTER_OPTIONS.find((option) => option.value === filterBy)?.label} groups</strong>
            <span>Click a group to view its students</span>
          </div>
          <div className={styles.groupList}>
            {groups.map((group) => (
              <div className={styles.groupItem} key={group.key}>
                <button type="button" className={styles.groupButton} onClick={() => setExpandedGroup(expandedGroup === group.key ? "" : group.key)} aria-expanded={expandedGroup === group.key}>
                  <span className={styles.groupTitle}>
                    <span className={styles.groupIcon} aria-hidden="true">
                      <group.icon />
                    </span>
                    <span>
                    <strong>{group.label}</strong>
                    {group.detail ? <small>{group.detail}</small> : null}
                    </span>
                  </span>
                  <span className={styles.groupMeta}>
                    <span>{group.students.length} students</span>
                    {expandedGroup === group.key ? <FaChevronDown aria-hidden="true" /> : <FaChevronRight aria-hidden="true" />}
                  </span>
                </button>
                {expandedGroup === group.key ? (
                  <div className={styles.groupContent}>
                    {filterBy === "grade" ? (
                      group.sections.length ? group.sections.map((section) => (
                        <div className={styles.nestedGroup} key={section.id}>
                          <div className={styles.nestedHeader}>
                            <span className={styles.nestedTitle}><FaLayerGroup aria-hidden="true" /><strong>{section.name}</strong></span>
                            <span>{section.students.length} students</span>
                          </div>
                          {section.students.length ? renderStudentTable(section.students) : <p className={styles.emptyGroup}>No students in this section.</p>}
                        </div>
                      )) : <p className={styles.emptyGroup}>No sections configured for this grade.</p>
                    ) : group.students.length ? renderStudentTable(group.students) : <p className={styles.emptyGroup}>No students in this group.</p>}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Admission</th>
              <th>Student</th>
              <th>Gender</th>
              <th>Grade</th>
              <th>Section</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td>{student.admission_number}</td>
                <td>
                  <strong>{`${student.first_name} ${student.last_name}`}</strong>
                </td>
                <td>{student.gender}</td>
                <td>{student.grade_name || "—"}</td>
                <td>{student.section_name || "—"}</td>
                <td>
                  <span className={`${styles.statusPill} ${styles[`status${student.status}`] || ""}`}>
                    {student.status}
                  </span>
                </td>
                <td>
                  <div className={styles.actionButtons}>
                    <Link href={`/dashboard/students/${student.id}`} className={styles.linkButton}>
                      View
                    </Link>
                    <Link href={`/dashboard/students/${student.id}/edit`} className={styles.editLink}>
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(student.id, `${student.first_name} ${student.last_name}`)}
                      className={styles.deleteLink}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>}
    </div>
  );
}

